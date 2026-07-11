/**
 * Research engine — POC vertical slice (server-side, no UI).
 * Pipeline: normalize → controlled Hebrew expansion → lexical retrieval →
 * mock vector retrieval → filters → authority/trust weighting →
 * diversification → ranked evidence set with exact citations, provenance,
 * explanations, warnings and an explicit missing-source notice.
 */
import { normalizeText } from "../extraction/normalize-text.ts";
import { expandQuery } from "./expansion.ts";
import { hybridSearch } from "../retrieval/hybrid.ts";
import type { RetrievalFilters, RankedPassage } from "../retrieval/hybrid.ts";
import { LexicalIndex } from "../retrieval/lexical.ts";
import { createAnchor, formatCitation } from "../citations/anchors.ts";
import type { CitationAnchor } from "../citations/anchors.ts";
import type { Corpus } from "../corpus/load.ts";
import { normalizeCaseNumber } from "../../../lib/legal/case-number/index.ts";

export interface ResearchRequest {
  question: string;                 // Hebrew legal question
  matterContext?: string | null;    // optional matter description
  legalDomain?: string;             // e.g. "labor"
  dateFrom?: string;
  dateTo?: string;
  authorityPreference?: "binding_first" | "recent_first" | "balanced";
  limit?: number;
}

export interface EvidenceItem {
  documentId: string;
  title: string;
  documentType: string;
  court: string | null;
  caseNumberDisplay: string | null;
  authorityClass: "legislation" | "supreme" | "national_labor" | "regional" | "guidance" | "secondary" | "unknown";
  reliability: number;              // trust weight 0..1
  passage: string;
  citation: string;                 // formatted Hebrew citation
  anchor: CitationAnchor;
  sourceUrl: string | null;
  retrievedAt: string;
  scoreBreakdown: RankedPassage["score"];
  warnings: string[];
}

export interface ResearchResult {
  engineVersion: string;
  request: ResearchRequest;
  normalizedQuery: string;
  expansions: string[];
  expansionNotes: string[];
  filtersApplied: RetrievalFilters;
  evidence: EvidenceItem[];
  retrievalExplanation: string;
  warnings: string[];
  missingSourceNotice: string | null;
  ranAt: string;
}

export const ENGINE_VERSION = "poc-research-0.1.0";

function authorityClass(item: { court: string | null; documentType: string }): EvidenceItem["authorityClass"] {
  if (["legislation", "regulation", "order"].includes(item.documentType)) return "legislation";
  const c = item.court ?? "";
  if (c.includes("העליון")) return "supreme";
  if (c.includes("הארצי")) return "national_labor";
  if (c.includes("האזורי")) return "regional";
  if (["guidance", "circular", "regulator_decision"].includes(item.documentType)) return "guidance";
  if (item.documentType === "academic_article") return "secondary";
  return "unknown";
}

export async function runResearch(corpus: Corpus, request: ResearchRequest): Promise<ResearchResult> {
  const warnings: string[] = [];

  // 1. normalize
  const normalizedQuery = normalizeText(request.question);
  if (!normalizedQuery) {
    return {
      engineVersion: ENGINE_VERSION, request, normalizedQuery: "",
      expansions: [], expansionNotes: [], filtersApplied: {},
      evidence: [], retrievalExplanation: "שאילתה ריקה — לא בוצע אחזור",
      warnings: ["שאילתה ריקה"], missingSourceNotice: "לא סופקה שאלה",
      ranAt: new Date().toISOString(),
    };
  }

  // 2. controlled expansion
  const expanded = expandQuery(normalizedQuery);
  const queryTerms = [normalizedQuery, ...expanded.expansions];
  if (request.matterContext) queryTerms.push(normalizeText(request.matterContext));

  // 3-7. retrieval + weighting (hybridSearch applies filters/authority/trust)
  const filters: RetrievalFilters = {
    legalDomain: request.legalDomain,
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
  };
  const index = LexicalIndex.build(corpus);
  const ranked = await hybridSearch({
    corpus, index, queryTerms, filters,
    limit: request.limit ?? 8,
    maxPerDocument: 2,
  });

  // 8-10. evidence set with exact citations
  const byDoc = new Map(corpus.documents.map((d) => [d.id, d]));
  const evidence: EvidenceItem[] = [];
  for (const r of ranked) {
    const doc = byDoc.get(r.documentId)!;
    const caseNo = doc.doc.caseNumberRaw ? normalizeCaseNumber(doc.doc.caseNumberRaw) : null;
    const anchor = createAnchor({
      documentId: r.documentId,
      versionHash: doc.doc.provenance.sha256,
      anchorKey: r.anchorKey,
      extraction: doc.extraction,
      sourceUrl: doc.doc.canonicalSourceUrl,
      retrievedAt: doc.doc.provenance.retrievedAt,
      isFixture: doc.doc.provenance.isFixture,
    });
    evidence.push({
      documentId: r.documentId,
      title: doc.doc.title,
      documentType: doc.doc.documentType,
      court: doc.doc.court,
      caseNumberDisplay: caseNo?.display ?? null,
      authorityClass: authorityClass({ court: doc.doc.court, documentType: doc.doc.documentType }),
      reliability: r.score.trust,
      passage: r.passage,
      citation: formatCitation({ displayName: caseNo?.display ?? doc.doc.title, anchor }),
      anchor,
      sourceUrl: doc.doc.canonicalSourceUrl,
      retrievedAt: doc.doc.provenance.retrievedAt,
      scoreBreakdown: r.score,
      warnings: r.warnings,
    });
  }

  // authority preference re-sort (post-diversification, stable)
  if (request.authorityPreference === "binding_first") {
    const rank: Record<string, number> = { legislation: 0, supreme: 1, national_labor: 2, guidance: 3, regional: 4, secondary: 5, unknown: 6 };
    evidence.sort((a, b) => rank[a.authorityClass] - rank[b.authorityClass] || b.scoreBreakdown.final - a.scoreBreakdown.final);
  }

  if (corpus.documents.every((d) => d.doc.provenance.isFixture)) {
    warnings.push("הקורפוס כולו סינתטי (POC) — אין להסתמך על תוצאות אלו משפטית");
  }

  const missingSourceNotice =
    evidence.length === 0
      ? "לא אותר מקור תומך בקורפוס הנוכחי. היעדר מקור הוא תשובה לגיטימית — אין להשלים טענה ללא אסמכתה."
      : null;

  const retrievalExplanation =
    `אוחזרו ${evidence.length} קטעים מ-${new Set(evidence.map((e) => e.documentId)).size} מסמכים. ` +
    `הרחבות מילון (${expanded.matchedNotes.join(", ") || "ללא"}): ${expanded.expansions.join(" · ") || "—"}. ` +
    `שקלול: לקסיקלי 40% · וקטורי (mock) 25% · סמכות 18% · אמינות מקור 10% · עדכניות 7%. ` +
    `גיוון: עד 2 קטעים למסמך.`;

  return {
    engineVersion: ENGINE_VERSION,
    request,
    normalizedQuery,
    expansions: expanded.expansions,
    expansionNotes: expanded.matchedNotes,
    filtersApplied: filters,
    evidence,
    retrievalExplanation,
    warnings,
    missingSourceNotice,
    ranAt: new Date().toISOString(),
  };
}
