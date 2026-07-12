/** Confidence model (Epic 3A, Phase 23). Never one unexplained number. */

export type ConfidenceBand =
  | "high_within_poc"
  | "moderate"
  | "low"
  | "insufficient_evidence"
  | "domain_mismatch"
  | "human_review_required";

export interface ConfidenceFactor {
  key: string;
  labelHe: string;
  score: number;         // 0..1
  weight: number;
  contribution: number;  // score * weight
  notesHe: string;
}

export interface ConfidenceReport {
  band: ConfidenceBand;
  /** decomposed — the sum is derived from factors, never asserted alone */
  overallScore: number;
  factors: ConfidenceFactor[];
  blockingUncertaintyHe: string[];
  requiresHumanReview: boolean;
  reasonsConfidenceCannotBeHigherHe: string[];
  /** explicit non-goal: NO numerical legal-outcome probability */
  disclaimerHe: string;
  engineVersion: string;
}
