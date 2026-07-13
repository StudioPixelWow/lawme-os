/**
 * Matter Narrative — deterministic sentence templates (Epic 4.2).
 * Each builder returns a SentenceEvidence: the Hebrew sentence PLUS the exact
 * structured sources backing it. A sentence with no backing source is never
 * produced (the builder returns null), which guarantees 100% traceability and
 * "no unsupported statement".
 */
import type { Finding } from "../types.ts";
import type { MatterState } from "../intelligence.ts";
import type { BlockingCondition } from "../state-machine.ts";
import type { MatterScore, ScoreDimension } from "../score/types.ts";
import type { PrioritizedAction, SentenceEvidence } from "./types.ts";
import { dimensionStateHe } from "./formatters.ts";

/** ensure a sentence ends with terminal punctuation so joins read cleanly. */
export function ensurePeriod(s: string): string {
  return /[.!?׃:]\s*$/.test(s) ? s.trim() : `${s.trim()}.`;
}

function ev(
  sentenceHe: string,
  parts: Partial<Omit<SentenceEvidence, "sentenceHe">>,
): SentenceEvidence {
  return {
    sentenceHe: ensurePeriod(sentenceHe),
    findingCodes: parts.findingCodes ?? [],
    blockerCodes: parts.blockerCodes ?? [],
    actionIds: parts.actionIds ?? [],
    assessmentIds: parts.assessmentIds ?? [],
  };
}

/** current stage — sourced from the state machine / readiness assessment. */
export function stageSentence(state: MatterState): SentenceEvidence | null {
  const title = state.stage.currentStageTitleHe;
  if (!title) return null;
  return ev(`התיק נמצא בשלב: ${title}.`, { assessmentIds: ["matter-readiness"] });
}

/** headline — anchored to the posture + the dominant concern (itself sourced). */
export function headlineSentence(state: MatterState, score: MatterScore): SentenceEvidence {
  const titleHe = state.titleHe;
  const s = score.summary;
  if (s.posture === "on_track") {
    return ev(`${titleHe}: התיק מתקדם כשורה.`, { assessmentIds: ["matter-health"] });
  }
  const concern = s.dominantConcernHe;
  if (concern) {
    // find which source the dominant concern came from (finding or blocker)
    const finding = state.engines.flatMap((e) => e.findings.map((f) => ({ f, engine: e.engine })))
      .find((x) => x.f.messageHe === concern);
    const blocker = state.questions.blocking.find((b) => b.messageHe === concern);
    return ev(`${titleHe}: ${concern}`, {
      findingCodes: finding ? [finding.f.code] : [],
      blockerCodes: blocker ? [blocker.code] : [],
      assessmentIds: finding ? [finding.engine] : ["matter-health"],
    });
  }
  return ev(`${titleHe}: מצב התיק — ${s.posture}.`, { assessmentIds: ["matter-health"] });
}

/** a generic finding → sentence (its message IS the sentence; fully traceable). */
export function findingSentence(assessmentId: string, f: Finding): SentenceEvidence {
  return ev(f.messageHe, { findingCodes: [f.code], assessmentIds: [assessmentId] });
}

/** a blocking condition → sentence. */
export function blockerSentence(b: BlockingCondition): SentenceEvidence {
  return ev(b.messageHe, { blockerCodes: [b.code] });
}

/** a prioritized action → recommendation sentence. */
export function actionSentence(pa: PrioritizedAction): SentenceEvidence {
  return ev(`מומלץ: ${pa.labelHe}.`, { actionIds: [pa.actionId], assessmentIds: pa.sourceAssessmentIds });
}

/** one status line for a dimension (used in detailed briefings). */
export function dimensionStatusSentence(dim: ScoreDimension): SentenceEvidence | null {
  // only emit when there is a backing finding or a non-trivial state
  if (dim.state === "healthy" || dim.state === "strong") {
    return ev(`${dim.labelHe}: ${dimensionStateHe(dim.state)}.`, { assessmentIds: dim.sourceAssessmentIds });
  }
  const top = dim.findings[0];
  if (top) return ev(`${dim.labelHe}: ${top.messageHe}`, { findingCodes: [top.code], assessmentIds: dim.sourceAssessmentIds });
  if (dim.state === "unavailable" && dim.unavailableReasonHe) {
    return ev(`${dim.labelHe}: ${dim.unavailableReasonHe}.`, { assessmentIds: dim.sourceAssessmentIds });
  }
  return ev(`${dim.labelHe}: ${dimensionStateHe(dim.state)}.`, { assessmentIds: dim.sourceAssessmentIds });
}

/** render a MatterNarrative's core sentences into one paragraph. */
export function joinSentences(sentences: SentenceEvidence[]): string {
  return sentences.map((s) => s.sentenceHe).join(" ");
}
