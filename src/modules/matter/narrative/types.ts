/**
 * Matter Narrative — types (Epic 4.2).
 * A deterministic, source-traceable briefing derived from MatterState +
 * MatterScore. NOT a chatbot, NOT prose invention, NOT an LLM. Every sentence
 * maps to structured evidence (finding codes / blocker codes / action ids /
 * assessment engine ids). No unsupported sentence may appear.
 */
import type { ReviewRoute } from "../../intelligence/core/index.ts";

export type NarrativeVariant = "compact" | "standard" | "detailed";

/** A single narrative sentence with the structured evidence backing it. */
export interface SentenceEvidence {
  sentenceHe: string;
  findingCodes: string[];
  blockerCodes: string[];
  actionIds: string[];
  assessmentIds: string[];
}

export interface PrioritizedAction {
  rank: number;
  actionId: string;
  labelHe: string;
  reasonHe: string;
  ownerRoleHe: string;         // "לא ידוע" when unknown — never invented
  dueHe: string;               // "לא ידוע" when unknown
  priority: string;            // severity
  dependencies: string[];
  blockerCodes: string[];
  requiresHumanApproval: boolean;
  expectedEffectHe: string;
  sourceAssessmentIds: string[];
}

export interface MatterNarrative {
  variant: NarrativeVariant;
  headlineHe: string;
  currentStateHe: string;
  currentStageHe: string | null;
  urgentItemsHe: string[];
  blockersHe: string[];
  missingItemsHe: string[];
  nextActionsHe: string[];
  deadlineStatusHe: string | null;
  clientStatusHe: string | null;
  legalStatusHe: string | null;
  evidenceStatusHe: string | null;
  documentStatusHe: string | null;
  teamStatusHe: string | null;
  financialStatusHe: string | null;
  opportunitiesHe: string[];
  limitationsHe: string[];
  confidence: number;          // 0..1 (min across cited dimensions)
  reviewRoute: ReviewRoute | null;
  generatedAt: string;         // = asOf
  sourceAssessmentIds: string[];
  /** every sentence in the briefing, with its evidence — 100% traceable */
  sentenceEvidenceMap: SentenceEvidence[];
  version: string;
}

export const MATTER_NARRATIVE_VERSION = "matter-narrative-1.0.0";
