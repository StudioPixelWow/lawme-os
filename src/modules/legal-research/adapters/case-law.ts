/**
 * Case-law adapter (Slice 3.1.0). PURE + DETERMINISTIC. No AI, no DB.
 * Wraps the in-memory employment case-law catalog + the authority assessor, and
 * normalizes every hit into a CanonicalSource. In the current POC corpus all
 * records are discovery-only (unverified) — the adapter reports that honestly.
 */
import { EMPLOYMENT_CASE_LAW, assessAuthority, rankJudgments } from "../../legal-knowledge/case-law/index.ts";
import type { JudgmentRecord, CourtInstance } from "../../legal-knowledge/case-law/types.ts";
import type {
  KnowledgeSourceAdapter, SearchPlan, AdapterSearchResult, CanonicalSource,
  AuthorityLevel, SourceStatus, VerificationStatus,
} from "../types.ts";

const MAX_RESULTS = 12;

const COURT_LEVEL: Record<CourtInstance, AuthorityLevel> = {
  supreme: "supreme",
  national_labor: "national_labor",
  regional_labor: "regional",
  other: "secondary",
};

function statusOf(rec: JudgmentRecord): SourceStatus {
  if (rec.laterTreatment.some((t) => t.kind === "overruled")) return "overruled";
  if (rec.laterTreatment.some((t) => t.kind === "limited")) return "limited";
  return "unknown";
}

function verificationOf(rec: JudgmentRecord): VerificationStatus {
  if (rec.verification === "verified_official") return "verified";
  if (rec.caseNumberStatus === "to_verify" || rec.verification === "number_to_verify") return "to_verify";
  return "unverified";
}

function matchTerms(rec: JudgmentRecord, plan: SearchPlan): string[] {
  const matched = new Set<string>();
  for (const t of plan.topics) if (rec.legalTopics.includes(t)) matched.add(t);
  const hay = `${rec.titleHe} ${rec.doctrineHe} ${rec.legalTopics.join(" ")}`;
  for (const q of plan.queryTerms) if (q.length >= 2 && hay.includes(q)) matched.add(q);
  return [...matched];
}

function toCanonical(rec: JudgmentRecord, matched: string[]): CanonicalSource {
  const authority = assessAuthority(rec);
  return {
    sourceId: "case_law",
    sourceKind: "case_law",
    recordId: rec.id,
    citationHe: rec.titleHe,
    titleHe: rec.titleHe,
    authorityLevel: COURT_LEVEL[rec.court],
    bindingClass: authority.authorityClass,
    court: rec.instanceLabelHe,
    dateISO: rec.judgmentDate,
    sectionHe: null,
    url: rec.canonicalSourceUrl,
    verification: verificationOf(rec),
    usableForClaim: authority.usableForClaim,
    status: statusOf(rec),
    topics: rec.legalTopics,
    matchedTerms: matched,
    citationFrequency: rec.laterTreatment.length + rec.relatedProceedings.length,
    publisherHe: rec.publisherHe,
    provenanceHe: authority.currentnessHe,
    limitationsHe: [...rec.limitationsHe, ...authority.reasonsHe],
  };
}

export const caseLawAdapter: KnowledgeSourceAdapter = {
  id: "case_law",
  kind: "case_law",
  labelHe: "פסיקה",
  available: true,
  async search(plan: SearchPlan): Promise<AdapterSearchResult> {
    const courtFilter = new Set(plan.filters.courtLevels);
    const hits: { rec: JudgmentRecord; matched: string[] }[] = [];
    for (const rec of rankJudgments(EMPLOYMENT_CASE_LAW)) {
      if (courtFilter.size > 0 && !courtFilter.has(rec.court)) continue;
      const matched = matchTerms(rec, plan);
      if (matched.length > 0) hits.push({ rec, matched });
    }
    const sources = hits.slice(0, MAX_RESULTS).map((h) => toCanonical(h.rec, h.matched));
    const notesHe: string[] = [];
    if (sources.length === 0) notesHe.push("לא אותרה פסיקה תואמת בקורפוס");
    if (sources.length > 0 && sources.every((s) => !s.usableForClaim)) {
      notesHe.push("כל הפסיקה שאותרה היא לגילוי בלבד וטעונה אימות מספר הליך מול המקור הרשמי");
    }
    return { sourceId: "case_law", sourceKind: "case_law", matchedCount: hits.length, sources, notesHe };
  },
};
