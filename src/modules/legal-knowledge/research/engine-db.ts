/**
 * DB-backed research vertical slice (Epic 2, Phases 10-11).
 * Same contract and honesty rules as the in-memory engine: controlled
 * Hebrew expansion, hybrid weighting with full score decomposition, exact
 * anchors, warnings, missing-source notice, extractive-only downstream.
 * Embedding note: MockEmbeddingProvider (deterministic trigram-hash) —
 * NOT production semantic quality, and labeled as such in every output.
 */
import { randomUUID } from "node:crypto";
import { normalizeText } from "../extraction/normalize-text.ts";
import { expandQuery } from "./expansion.ts";
import { ENGINE_VERSION } from "./engine.ts";
import { MockEmbeddingProvider, cosineSimilarity } from "../embeddings/mock-provider.ts";
import { formatCitation } from "../citations/anchors.ts";
import type { CitationAnchor } from "../citations/anchors.ts";
import { normalizeCaseNumber } from "../../../lib/legal/case-number/index.ts";
import { recordRun } from "../observability/run-log.ts";
import {
  runRelevanceGate, contentTokens, absoluteLexicalCoverage, NO_ANSWER_MESSAGE_HE,
} from "./relevance-gate.ts";
import type { GateReport, GateCandidate } from "./relevance-gate.ts";
import type {
  LegalDocumentRow, OrgContext, Repositories, SectionSearchFilters, SectionSearchHit,
} from "../repositories/types.ts";

export const DB_ENGINE_VERSION = `${ENGINE_VERSION}+db`;

const WEIGHTS = { lexical: 0.40, vector: 0.25, authority: 0.18, trust: 0.10, freshness: 0.07 };

function authorityWeight(doc: LegalDocumentRow): number {
  const court = doc.court ?? "";
  if (["legislation", "regulation", "order"].includes(doc.documentType)) return 1.0;
  if (court.includes("העליון")) return 1.0;
  if (court.includes("הארצי")) return 0.85;
  if (court.includes("האזורי") || court.includes("מחוזי")) return 0.6;
  if (["guidance", "circular", "regulator_decision"].includes(doc.documentType)) return 0.55;
  if (doc.documentType === "academic_article") return 0.3;
  return 0.4;
}
function trustWeight(doc: LegalDocumentRow): number {
  switch (doc.documentType) {
    case "legislation": case "regulation": case "order": return 1.0;
    case "judgment": case "decision": return 0.9;
    case "guidance": case "circular": case "regulator_decision": return 0.8;
    case "academic_article": return 0.5;
    default: return 0.6;
  }
}
function freshnessWeight(doc: LegalDocumentRow): number {
  const d = doc.documentDate ?? doc.versionDate ?? doc.effectiveDate;
  if (!d) return 0.5;
  const ageYears = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears <= 2) return 1.0;
  if (ageYears <= 5) return 0.85;
  if (ageYears <= 10) return 0.7;
  if (ageYears <= 20) return 0.55;
  return 0.4;
}
function authorityClass(doc: LegalDocumentRow): string {
  if (["legislation", "regulation", "order"].includes(doc.documentType)) return "legislation";
  const c = doc.court ?? "";
  if (c.includes("העליון")) return "supreme";
  if (c.includes("הארצי")) return "national_labor";
  if (c.includes("האזורי")) return "regional";
  if (["guidance", "circular", "regulator_decision"].includes(doc.documentType)) return "guidance";
  if (doc.documentType === "academic_article") return "secondary";
  return "unknown";
}

export interface DbResearchRequest {
  question: string;
  organizationId?: string | null;   // optional org context (persists session when set)
  actorProfileId?: string | null;
  legalDomain?: string;
  dateFrom?: string;
  dateTo?: string;
  authorityPreference?: "binding_first" | "recent_first" | "balanced";
  limit?: number;
}

export interface DbEvidenceItem {
  documentId: string;
  versionId: string;
  title: string;
  documentType: string;
  court: string | null;
  caseNumberDisplay: string | null;
  authorityClass: string;
  verificationStatus: string;
  passage: string;
  anchor: CitationAnchor;
  citation: string;
  sourceUrl: string | null;
  scoreBreakdown: {
    lexical: number; vector: number; authority: number; trust: number; freshness: number; final: number;
    weights?: Record<string, number>;
    /** ABSOLUTE signals — do not depend on the best result in the set.
     * Normalized scores rank; raw scores decide whether an answer exists. */
    raw: { lexicalRank: number; lexicalCoverage: number; vectorCosine: number };
  };
  warnings: string[];
}

export interface CorpusCoverage {
  activeDomainHe: string;
  indexedDocuments: number;
  documentsByType: Record<string, number>;
  latestVerifiedUpdate: string | null;   // no verified docs yet → null
  latestDocumentDate: string | null;
  caseLawAvailable: boolean;
  missingCategoriesHe: string[];
  noticeHe: string;
}

export interface DbResearchResult {
  engineVersion: string;
  correlationId: string;
  repositoryKind: "in-memory" | "supabase";
  normalizedQuery: string;
  expansions: string[];
  /** answered → citable evidence. no_answer → empty; weak passages (if
   * any) are in weakEvidence, clearly marked non-authoritative. */
  answerState: "answered" | "no_answer";
  evidence: DbEvidenceItem[];
  /** below-threshold passages — NEVER presented as answering the question */
  weakEvidence: DbEvidenceItem[];
  gate: GateReport;
  corpusCoverage: CorpusCoverage;
  retrievalExplanation: string;
  warnings: string[];
  missingSourceNotice: string | null;
  durationMs: number;
  persisted: { sessionId: string; queryId: string } | null;
}

async function computeCorpusCoverage(repos: Repositories, ctx: OrgContext): Promise<CorpusCoverage> {
  const byType: Record<string, number> = {};
  let latestDoc: string | null = null;
  let total = 0;
  const res = await repos.documents.listDocuments(ctx, {}, { limit: 100, offset: 0 });
  if (res.ok) {
    total = res.data.length;
    for (const d of res.data) {
      byType[d.documentType] = (byType[d.documentType] ?? 0) + 1;
      const dd = d.documentDate ?? d.versionDate ?? null;
      if (dd && (!latestDoc || dd > latestDoc)) latestDoc = dd;
    }
  }
  const caseLaw = (byType["judgment"] ?? 0) + (byType["decision"] ?? 0) > 0;
  return {
    activeDomainHe: "דיני עבודה",
    indexedDocuments: total,
    documentsByType: byType,
    latestVerifiedUpdate: null, // the POC corpus is synthetic — nothing is verified
    latestDocumentDate: latestDoc,
    caseLawAvailable: caseLaw,
    missingCategoriesHe: [
      "פסיקה אמיתית של בתי הדין לעבודה (הקורפוס סינתטי)",
      "חקיקה עדכנית מאומתת",
      "צווי הרחבה מלאים",
      "כל תחום משפטי שאינו דיני עבודה",
    ],
    noticeHe:
      "הקורפוס הפעיל סינתטי וכולל דוגמאות בדיני עבודה בלבד; " +
      "אין בו עדיין כיסוי אמיתי של חקיקה או פסיקת בתי הדין.",
  };
}

export async function runDbResearch(repos: Repositories, request: DbResearchRequest): Promise<DbResearchResult> {
  const started = Date.now();
  const correlationId = randomUUID();
  const ctx: OrgContext = {
    organizationId: request.organizationId ?? null,
    actorProfileId: request.actorProfileId ?? null,
    correlationId,
  };
  const warnings: string[] = [
    "הקורפוס סינתטי (POC) — אין להסתמך על התוצאות משפטית",
    "דירוג וקטורי: MockEmbeddingProvider — אינו איכות פרודקשן",
  ];

  const normalizedQuery = normalizeText(request.question);
  const expanded = expandQuery(normalizedQuery);
  const queryTerms = [normalizedQuery, ...expanded.expansions];

  const filters: SectionSearchFilters = {
    legalDomain: request.legalDomain,
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
  };
  const limit = request.limit ?? 8;

  const corpusCoverage = await computeCorpusCoverage(repos, ctx);

  const search = await repos.documents.searchSections(queryTerms, filters, limit * 4, ctx);
  if (!search.ok) {
    const gate = await runRelevanceGate({ normalizedQuery, candidates: [], normalizedLexicalTop: 0 });
    return {
      engineVersion: DB_ENGINE_VERSION, correlationId, repositoryKind: repos.kind,
      normalizedQuery, expansions: expanded.expansions,
      answerState: "no_answer", evidence: [], weakEvidence: [], gate, corpusCoverage,
      retrievalExplanation: "האחזור נכשל", warnings: [...warnings, search.error.message],
      missingSourceNotice: "שגיאת אחזור — לא ניתן לאשר או לשלול קיום מקורות",
      durationMs: Date.now() - started, persisted: null,
    };
  }

  // hybrid scoring on the candidate set (mock vector over section content)
  const provider = new MockEmbeddingProvider();
  const [qVec] = await provider.embed([queryTerms.join(" ")]);
  const maxLex = search.data[0]?.lexicalScore || 1;
  // ABSOLUTE coverage uses the user's own query tokens — expansions help
  // ranking but must not manufacture relevance:
  const qContent = contentTokens(normalizedQuery);

  const scored = await Promise.all(search.data.map(async (hit: SectionSearchHit) => {
    const [sVec] = await provider.embed([hit.section.content]);
    const vector = Math.max(0, cosineSimilarity(qVec, sVec));
    const breakdown = {
      // normalized RANKING scores (relative to the best in this set):
      lexical: hit.lexicalScore / maxLex,
      vector,
      authority: authorityWeight(hit.document),
      trust: trustWeight(hit.document),
      freshness: freshnessWeight(hit.document),
      final: 0,
      // raw ABSOLUTE signals (independent of the result set):
      raw: {
        lexicalRank: Number(hit.lexicalScore.toFixed(6)),
        lexicalCoverage: Number(absoluteLexicalCoverage(qContent, hit.section.content).toFixed(4)),
        vectorCosine: Number(vector.toFixed(4)),
      },
    };
    breakdown.final =
      WEIGHTS.lexical * breakdown.lexical + WEIGHTS.vector * breakdown.vector +
      WEIGHTS.authority * breakdown.authority + WEIGHTS.trust * breakdown.trust +
      WEIGHTS.freshness * breakdown.freshness;
    return { hit, breakdown };
  }));

  scored.sort((a, b) => b.breakdown.final - a.breakdown.final || a.hit.section.id.localeCompare(b.hit.section.id));

  // diversification: max 2 passages per document
  const perDoc = new Map<string, number>();
  const top: typeof scored = [];
  for (const s of scored) {
    const n = perDoc.get(s.hit.document.id) ?? 0;
    if (n >= 2) continue;
    perDoc.set(s.hit.document.id, n + 1);
    top.push(s);
    if (top.length >= limit) break;
  }

  const evidence: DbEvidenceItem[] = top.map(({ hit, breakdown }) => {
    const caseNo = hit.document.caseNumberRaw ? normalizeCaseNumber(hit.document.caseNumberRaw) : null;
    const anchor: CitationAnchor = {
      documentId: hit.document.id,
      versionHash: "db", // full hash available via version row; kept light in the slice
      anchorKey: hit.section.anchorKey,
      pageNumber: hit.section.pageNumber,
      charStart: hit.section.charStart,
      charEnd: hit.section.charEnd,
      sourceUrl: hit.document.canonicalSourceUrl,
      retrievedAt: new Date().toISOString(),
      verificationStatus: "unverified",
    };
    const itemWarnings = ["fixture content — not legal authority"];
    if (hit.document.verificationStatus === "unverified") itemWarnings.push("source unverified");
    return {
      documentId: hit.document.id,
      versionId: hit.section.versionId,
      title: hit.document.title,
      documentType: hit.document.documentType,
      court: hit.document.court,
      caseNumberDisplay: caseNo?.display ?? null,
      authorityClass: authorityClass(hit.document),
      verificationStatus: hit.document.verificationStatus,
      passage: hit.section.content,
      anchor,
      citation: formatCitation({ displayName: caseNo?.display ?? hit.document.title, anchor }),
      sourceUrl: hit.document.canonicalSourceUrl,
      scoreBreakdown: { ...breakdown, weights: WEIGHTS },
      warnings: itemWarnings,
    };
  });

  if (request.authorityPreference === "binding_first") {
    const rank: Record<string, number> = { legislation: 0, supreme: 1, national_labor: 2, guidance: 3, regional: 4, secondary: 5, unknown: 6 };
    evidence.sort((a, b) => (rank[a.authorityClass] ?? 9) - (rank[b.authorityClass] ?? 9) || b.scoreBreakdown.final - a.scoreBreakdown.final);
  }

  /* ---------------- RELEVANCE GATE (fail closed) ------------------- */
  const gateCandidates: GateCandidate[] = evidence.map((e) => ({
    documentId: e.documentId,
    passage: e.passage,
    authorityClass: e.authorityClass,
    verificationStatus: e.verificationStatus,
    rawLexicalRank: e.scoreBreakdown.raw.lexicalRank,
    rawSemantic: e.scoreBreakdown.raw.vectorCosine,
    anchorValid:
      typeof e.anchor.charStart === "number" && typeof e.anchor.charEnd === "number" &&
      e.anchor.charEnd > e.anchor.charStart && e.anchor.anchorKey.length > 0 &&
      e.passage.length === e.anchor.charEnd - e.anchor.charStart,
  }));
  const gate = await runRelevanceGate({
    normalizedQuery,
    candidates: gateCandidates,
    normalizedLexicalTop: evidence[0]?.scoreBreakdown.lexical ?? 0,
  });

  let finalEvidence: DbEvidenceItem[] = evidence;
  let weakEvidence: DbEvidenceItem[] = [];
  if (gate.status === "fail") {
    // no answer — weak passages may be shown ONLY as non-authoritative
    weakEvidence = evidence.map((e) => ({
      ...e,
      warnings: [...e.warnings, "מתחת לסף הרלוונטיות — אינו עונה על השאלה"],
    }));
    finalEvidence = [];
  }

  // conflicting-source surfacing (answered results only)
  const hasConflictMarker = finalEvidence.some((e) => e.passage.includes("בניגוד לגישה") || e.title.includes("מנוגדת"));
  if (hasConflictMarker) warnings.push("אותר מקור עם עמדה מנוגדת בסט התוצאות — ראה סעיף הסתירות");

  // optional persistence (org-scoped, only with a real org context;
  // no_answer runs persist the query with zero results — an honest trace)
  let persisted: DbResearchResult["persisted"] = null;
  if (ctx.organizationId && ctx.actorProfileId) {
    const session = await repos.research.createResearchSession({
      organizationId: ctx.organizationId, createdBy: ctx.actorProfileId,
      matterRef: null, title: normalizedQuery.slice(0, 120),
    }, ctx);
    if (session.ok) {
      const query = await repos.research.addResearchQuery({
        sessionId: session.data.id, queryText: request.question,
        normalizedQuery, expansion: expanded.expansions,
        filters: filters as Record<string, unknown>, engineVersion: DB_ENGINE_VERSION,
      }, ctx);
      if (query.ok) {
        await repos.research.saveResearchResults(finalEvidence.map((e, i) => ({
          queryId: query.data.id, documentId: e.documentId, versionId: e.versionId,
          rank: i + 1, score: e.scoreBreakdown.final,
          scoreBreakdown: e.scoreBreakdown, passageAnchor: e.anchor.anchorKey,
          passageText: e.passage, authorityType: "unknown", warnings: e.warnings,
        })), ctx);
        persisted = { sessionId: session.data.id, queryId: query.data.id };
      }
    }
  }

  const missingSourceNotice =
    gate.status === "fail"
      ? NO_ANSWER_MESSAGE_HE
      : finalEvidence.length === 0
        ? "לא אותר מקור תומך בקורפוס. היעדר מקור הוא תשובה לגיטימית — אין להשלים טענה ללא אסמכתה."
        : null;

  const result: DbResearchResult = {
    engineVersion: DB_ENGINE_VERSION,
    correlationId,
    repositoryKind: repos.kind,
    normalizedQuery,
    expansions: expanded.expansions,
    answerState: gate.answerState,
    evidence: finalEvidence,
    weakEvidence,
    gate,
    corpusCoverage,
    retrievalExplanation:
      `מאגר: ${repos.kind === "supabase" ? "Supabase (פיתוח)" : "זיכרון מקומי"} · ` +
      `${finalEvidence.length} קטעים מ-${new Set(finalEvidence.map((e) => e.documentId)).size} מסמכים · ` +
      `שקלול: לקסיקלי 40% · וקטורי-mock ‏25% · סמכות 18% · אמינות 10% · עדכניות 7% · גיוון עד 2 למסמך · ` +
      `שער רלוונטיות: ${gate.status === "pass" ? "עבר" : "נכשל (fail-closed)"}`,
    warnings,
    missingSourceNotice,
    durationMs: Date.now() - started,
    persisted,
  };

  try {
    recordRun({
      kind: "research", timestamp: new Date().toISOString(),
      engineVersion: DB_ENGINE_VERSION, modelProvider: "mock/trigram-hash@1.0.0",
      parserVersion: "poc-seed-0.2.0",
      query: request.question, sourceAdapters: [repos.kind],
      documentsRetrieved: finalEvidence.length,
      rankScores: finalEvidence.map((e) => Number(e.scoreBreakdown.final.toFixed(4))),
      citationsReturned: finalEvidence.length,
      verificationStatus: [...new Set(finalEvidence.map((e) => e.verificationStatus))],
      warnings: result.warnings,
      failures: gate.status === "fail" ? gate.failureReasons.map((r) => r.code) : [],
      benchmarkResult: null,
      correlationId,
      durationMs: result.durationMs,
    });
  } catch { /* observability must never break research */ }

  return result;
}
