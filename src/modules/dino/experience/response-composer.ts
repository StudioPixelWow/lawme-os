/**
 * Grounded-response composer (Slice 3.2.0). PURE + DETERMINISTIC.
 * Sections 3–8 (legislation, case law, conflicts, confidence, sources,
 * follow-ups) are projected directly from the verified LegalResearchResult —
 * source attribution is inherent. Sections 1–2 (summary + analysis) are the
 * prose passed in (from a provider or a failure-mode text). The result is
 * deep-frozen.
 */
import type { LegalResearchResult, ConfidenceLevel } from "../../legal-research/types.ts";
import type { ClarificationQuestion } from "../conversation/types.ts";
import type {
  GroundedResponse, DinoResponseMode, DinoContextKind,
  LegislationRef, CaseRef, ConflictRef, ConfidenceView, SourceRef, FollowUpQuestion,
} from "./types.ts";

export const DINO_EXPERIENCE_VERSION = "dino-experience-v1";

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "גבוה", moderate: "בינוני", low: "נמוך", none: "לא ניתן לקבוע",
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function buildFollowUps(clarifications: readonly ClarificationQuestion[], research: LegalResearchResult): FollowUpQuestion[] {
  const out: FollowUpQuestion[] = [];
  const seen = new Set<string>();
  const add = (code: string, questionHe: string, reasonHe: string) => {
    if (seen.has(code)) return;
    seen.add(code);
    out.push({ code, questionHe, reasonHe });
  };
  for (const c of clarifications) add(c.code, c.questionHe, c.reasonHe);
  for (const m of research.missingInformation) {
    if (m.code === "TOPIC_UNRESOLVED") add(m.code, "מהו הנושא המשפטי המדויק שברצונך לברר?", m.detailHe);
    else if (m.code === "FACTS_UNCONFIRMED") add(m.code, "האם עובדות התיק אומתו? נדרש אימות כדי לבסס מסקנה.", m.detailHe);
  }
  return out;
}

export interface ComposeParams {
  readonly question: string;
  readonly contextKind: DinoContextKind;
  readonly matterId: string | null;
  readonly mode: DinoResponseMode;
  readonly grounded: boolean;
  readonly summaryHe: string;
  readonly analysisHe: string;
  readonly proseProvider: string;
  readonly noticeHe: string | null;
  readonly legalResearch: LegalResearchResult;
  readonly clarifications: readonly ClarificationQuestion[];
  /** Surface the legal sources? False for out-of-scope / needs-facts, where the
   *  matter-injected sources are not relevant to the (unanswered) question. */
  readonly includeSources: boolean;
  readonly nowISO: string;
}

export function composeGroundedResponse(p: ComposeParams): GroundedResponse {
  const r = p.legalResearch;

  const legislation: LegislationRef[] = p.includeSources ? r.matchedLegislation.map((s) => ({
    recordId: s.recordId, citationHe: s.citationHe, sectionHe: s.sectionHe, url: s.url,
    binding: s.bindingClass === "binding", verification: s.verification,
  })) : [];

  const caseLaw: CaseRef[] = p.includeSources ? r.matchedCases.map((s) => ({
    recordId: s.recordId, citationHe: s.citationHe, court: s.court, dateISO: s.dateISO,
    authorityLevel: s.authorityLevel, bindingClass: s.bindingClass, url: s.url,
    verification: s.verification, usableForClaim: s.usableForClaim,
    caveatHe: s.usableForClaim ? null : "לגילוי בלבד — טעון אימות מספר הליך מול המקור הרשמי",
  })) : [];

  const conflicts: ConflictRef[] = p.includeSources ? r.conflicts.map((c) => ({ kind: c.kind, severity: c.severity, descriptionHe: c.descriptionHe, recordIds: c.recordIds })) : [];

  const confidence: ConfidenceView = p.includeSources
    ? { level: r.confidence.level, score: r.confidence.score, labelHe: CONFIDENCE_LABEL[r.confidence.level], reasonsHe: r.confidence.reasonsHe }
    : { level: "none", score: 0, labelHe: CONFIDENCE_LABEL.none, reasonsHe: [] };

  const sources: SourceRef[] = p.includeSources ? r.sourceMetadata.map((s) => ({
    recordId: s.recordId, sourceKind: s.sourceKind, citationHe: r.matchedLegislation.concat(r.matchedCases).find((x) => x.recordId === s.recordId)?.citationHe ?? s.recordId,
    url: s.url, verification: s.verification, publisherHe: s.publisherHe,
  })) : [];

  const followUpQuestions = buildFollowUps(p.clarifications, r);

  const response: GroundedResponse = {
    meta: { version: DINO_EXPERIENCE_VERSION, engine: "dino-experience", generatedAtISO: p.nowISO, proseProvider: p.proseProvider },
    mode: p.mode,
    grounded: p.grounded,
    contextKind: p.contextKind,
    matterId: p.matterId,
    question: p.question,
    executiveSummaryHe: p.summaryHe,
    legalAnalysisHe: p.analysisHe,
    legislation,
    caseLaw,
    conflicts,
    confidence,
    sources,
    followUpQuestions,
    noticeHe: p.noticeHe,
  };
  return deepFreeze(response);
}
