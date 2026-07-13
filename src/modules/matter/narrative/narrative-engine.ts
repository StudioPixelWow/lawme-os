/**
 * Matter Narrative Engine (Epic 4.2) — deterministic templates, NO LLM.
 * Converts MatterState + MatterScore into a concise, source-traceable
 * professional briefing. Every sentence is backed by structured evidence and
 * added to sentenceEvidenceMap. Priority order and caps are deterministic.
 * It never personifies the matter, never states an outcome probability, and
 * never claims "no risk" when an engine is unavailable.
 */
import type { Finding } from "../types.ts";
import type { MatterState } from "../intelligence.ts";
import type { MatterScore, ScoreDimension, ScoreDimensionId } from "../score/types.ts";
import { prioritizeActions } from "./prioritizer.ts";
import {
  actionSentence, blockerSentence, dimensionStatusSentence,
  findingSentence, headlineSentence, stageSentence,
} from "./templates.ts";
import type { MatterNarrative, NarrativeVariant, SentenceEvidence } from "./types.ts";
import { MATTER_NARRATIVE_VERSION } from "./types.ts";

const SEV_RANK: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

interface Caps { urgent: number; blockers: number; missing: number; actions: number; limitations: number; statusFields: boolean; }

const CAPS: Record<NarrativeVariant, Caps> = {
  compact: { urgent: 1, blockers: 0, missing: 1, actions: 1, limitations: 1, statusFields: false },
  standard: { urgent: 3, blockers: 3, missing: 3, actions: 3, limitations: 1, statusFields: false },
  detailed: { urgent: 3, blockers: 3, missing: 3, actions: 3, limitations: 2, statusFields: true },
};

function dimIndex(score: MatterScore): Map<ScoreDimensionId, ScoreDimension> {
  return new Map(score.dimensions.map((d) => [d.id, d]));
}

/** findings on an engine assessment sorted by severity desc. */
function engineFindings(state: MatterState, engine: string): { engine: string; f: Finding }[] {
  const a = state.engines.find((e) => e.engine === engine);
  if (!a) return [];
  return [...a.findings].sort((x, y) => SEV_RANK[y.severity] - SEV_RANK[x.severity]).map((f) => ({ engine, f }));
}

export interface NarrativeOptions { variant?: NarrativeVariant; }

export function buildNarrative(state: MatterState, score: MatterScore, opts: NarrativeOptions = {}): MatterNarrative {
  const variant = opts.variant ?? "standard";
  const caps = CAPS[variant];
  const dims = dimIndex(score);
  const prioritized = prioritizeActions(state);

  const map: SentenceEvidence[] = [];
  const cite = (se: SentenceEvidence | null): string | null => {
    if (!se) return null;
    map.push(se);
    return se.sentenceHe;
  };
  const citeMany = (list: SentenceEvidence[], cap: number): string[] => {
    const out: string[] = [];
    for (const se of list.slice(0, cap)) { map.push(se); out.push(se.sentenceHe); }
    return out;
  };

  // headline + current state
  const headlineHe = cite(headlineSentence(state, score))!;
  const currentStateHe = cite(stageSentence(state)) ?? "שלב התיק אינו מזוהה.";

  // --- URGENT items in narrative priority order (Phase 9) ---
  const urgentCandidates: SentenceEvidence[] = [];
  // 1. critical/overdue deadlines
  for (const { f } of engineFindings(state, "matter-deadline")) {
    if (f.severity === "critical" || f.severity === "high") urgentCandidates.push(findingSentence("matter-deadline", f));
  }
  // 2. blocking procedural — policy/deadline blockers
  for (const b of state.questions.blocking.filter((x) => x.kind === "policy" || x.kind === "deadline")) {
    urgentCandidates.push(blockerSentence(b));
  }
  // 3. missing mandatory evidence/documents (high)
  for (const eng of ["matter-evidence", "matter-document"]) {
    for (const { f } of engineFindings(state, eng)) if (f.severity === "high") urgentCandidates.push(findingSentence(eng, f));
  }
  // 4. high legal risk
  for (const { f } of engineFindings(state, "matter-legal")) if (f.severity === "high") urgentCandidates.push(findingSentence("matter-legal", f));
  const urgentItemsHe = citeMany(dedupeSE(urgentCandidates), caps.urgent);

  // --- blockers ---
  const blockersHe = citeMany(state.questions.blocking.map(blockerSentence), caps.blockers);

  // --- missing items (what_is_missing findings) ---
  const missingCandidates = state.engines
    .flatMap((e) => e.findings.filter((f) => f.dimension === "what_is_missing").map((f) => ({ engine: e.engine, f })))
    .sort((a, b) => SEV_RANK[b.f.severity] - SEV_RANK[a.f.severity])
    .map(({ engine, f }) => findingSentence(engine, f));
  const missingItemsHe = citeMany(dedupeSE(missingCandidates), caps.missing);

  // --- next actions ---
  const nextActionsHe = citeMany(prioritized.map(actionSentence), caps.actions);

  // --- per-dimension status lines ---
  const statusFor = (id: ScoreDimensionId): string | null => {
    const d = dims.get(id);
    if (!d) return null;
    if (!caps.statusFields && d.state !== "at_risk" && d.state !== "blocked" && d.state !== "requires_review" && d.state !== "unavailable") {
      // in compact/standard, only surface a status line when it's noteworthy
      if (id !== "deadlines" && id !== "legal" && id !== "client") return null;
    }
    return cite(dimensionStatusSentence(d));
  };
  const deadlineStatusHe = statusFor("deadlines");
  const clientStatusHe = statusFor("client");
  const legalStatusHe = statusFor("legal");
  const evidenceStatusHe = caps.statusFields ? statusFor("evidence") : null;
  const documentStatusHe = caps.statusFields ? statusFor("documents") : null;
  const teamStatusHe = caps.statusFields ? statusFor("team") : null;
  const financialStatusHe = caps.statusFields ? statusFor("finance") : null;

  // --- opportunities (traceable) ---
  const oppSE: SentenceEvidence[] = [];
  for (const d of score.dimensions) {
    if (d.state === "strong") oppSE.push({ sentenceHe: `${d.labelHe} במצב חזק.`, findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: d.sourceAssessmentIds });
  }
  if (state.questions.blocking.length === 0 && state.stage.nextOptionsHe.length > 0) {
    oppSE.push({ sentenceHe: `ניתן לקדם לשלב הבא: ${state.stage.nextOptionsHe.map((n) => n.toTitleHe).join(" / ")}.`, findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: ["matter-readiness"] });
  }
  const opportunitiesHe = citeMany(oppSE, variant === "compact" ? 0 : 2);

  // --- limitations (Phase 15 disclosures) ---
  const limSE: SentenceEvidence[] = [];
  for (const d of score.dimensions) {
    if (d.state === "unavailable") limSE.push({ sentenceHe: `לא ניתן להעריך את ${d.labelHe} — ${d.unavailableReasonHe ?? "נתונים חסרים"}.`, findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: d.sourceAssessmentIds });
  }
  if (dims.get("legal")?.state === "requires_review") limSE.push({ sentenceHe: "הכיסוי המשפטי חלקי — נדרשת בדיקת מומחה לפני הסתמכות.", findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: ["matter-legal"] });
  if (dims.get("team")?.state === "blocked") limSE.push({ sentenceHe: "לא הוקצה גורם אחראי לתיק.", findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: ["matter-team"] });
  const missingInfo = state.engines.find((e) => e.engine === "matter-missing-information");
  const missingFacts = (missingInfo?.data?.missingRequired as string[] | undefined) ?? [];
  if (missingFacts.length > 0) limSE.push({ sentenceHe: `עובדות חסרות לאימות: ${missingFacts.join(", ")}.`, findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: ["matter-missing-information"] });
  if (score.summary.staleDimensions.length > 0) limSE.push({ sentenceHe: `נתונים לא עדכניים בממדים: ${score.summary.staleDimensions.join(", ")}.`, findingCodes: [], blockerCodes: [], actionIds: [], assessmentIds: ["matter-health"] });
  const limitationsHe = citeMany(limSE, caps.limitations);

  // confidence = min over cited assessments' confidence (honest, conservative)
  const citedEngines = new Set(map.flatMap((s) => s.assessmentIds));
  const confidences = state.engines.filter((e) => citedEngines.has(e.engine)).map((e) => e.confidence);
  const confidence = confidences.length ? Math.min(...confidences) : (state.engines[0]?.confidence ?? 0.5);

  // review route — weakest dimension's route, else any dimension requiring review
  const weakest = score.summary.weakestDimension ? dims.get(score.summary.weakestDimension) : undefined;
  const reviewRoute = weakest?.reviewRoute ?? score.dimensions.find((d) => d.reviewRoute)?.reviewRoute ?? null;

  const sourceAssessmentIds = Array.from(citedEngines);

  return {
    variant,
    headlineHe,
    currentStateHe,
    currentStageHe: state.stage.currentStageTitleHe,
    urgentItemsHe,
    blockersHe,
    missingItemsHe,
    nextActionsHe,
    deadlineStatusHe,
    clientStatusHe,
    legalStatusHe,
    evidenceStatusHe,
    documentStatusHe,
    teamStatusHe,
    financialStatusHe,
    opportunitiesHe,
    limitationsHe,
    confidence: Math.round(confidence * 100) / 100,
    reviewRoute,
    generatedAt: state.asOf,
    sourceAssessmentIds,
    sentenceEvidenceMap: map,
    version: MATTER_NARRATIVE_VERSION,
  };
}

/** de-duplicate sentence-evidence by sentence text, preserving order. */
function dedupeSE(list: SentenceEvidence[]): SentenceEvidence[] {
  const seen = new Set<string>();
  const out: SentenceEvidence[] = [];
  for (const s of list) { if (!seen.has(s.sentenceHe)) { seen.add(s.sentenceHe); out.push(s); } }
  return out;
}

/* ---- rendering helpers (Phase 11 output forms) ---- */

/** join sentences into a paragraph, dropping empties and repeated sentences. */
function paragraph(parts: (string | null)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const t = p.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(" ");
}

/** one-line status: headline + the most useful NON-repeating follow-up. */
export function oneLineHe(n: MatterNarrative): string {
  const tail = n.nextActionsHe.find((s) => s !== n.headlineHe)
    ?? n.urgentItemsHe.find((s) => s !== n.headlineHe)
    ?? "";
  return paragraph([n.headlineHe, tail]);
}

/** morning-workspace briefing paragraph. */
export function morningBriefingHe(n: MatterNarrative): string {
  return paragraph([n.currentStateHe, ...n.urgentItemsHe, n.missingItemsHe[0] ?? null, n.nextActionsHe[0] ?? null]);
}

/** full briefing paragraph. */
export function fullBriefingHe(n: MatterNarrative): string {
  return paragraph([
    n.headlineHe, n.currentStateHe,
    ...n.urgentItemsHe, ...n.blockersHe, ...n.missingItemsHe,
    ...n.nextActionsHe, ...n.limitationsHe,
  ]);
}
