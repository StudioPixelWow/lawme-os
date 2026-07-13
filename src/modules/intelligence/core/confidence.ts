/**
 * Shared intelligence primitive — Confidence contract (Epic 4.1).
 *
 * Shares the OUTPUT SHAPE, not any domain's calculation. Two invariants every
 * domain must honour: confidence is DECOMPOSED (never one unexplained number),
 * and it is NEVER a legal-outcome probability. Domains keep their own scoring;
 * they emit this shape.
 */

export type ConfidenceBand =
  | "high"
  | "moderate"
  | "low"
  | "insufficient_evidence"
  | "not_applicable"
  | "human_review_required";

export interface ConfidenceFactor {
  key: string;
  labelHe: string;
  score: number;        // 0..1
  weight: number;
  contribution: number; // score * weight
  notesHe?: string;
}

export interface ConfidenceReport {
  band: ConfidenceBand;
  /** derived from factors — never asserted alone */
  overallScore: number; // 0..1
  factors: ConfidenceFactor[];
  blockingUncertaintyHe: string[];
  reasonsHe: string[];
  requiresHumanReview: boolean;
  /** optional enrichments */
  freshness?: { computedAt: string; stale?: boolean } | null;
  sourceCoverage?: number | null; // 0..1
  /** explicit non-goal: NO numeric legal-outcome probability */
  disclaimerHe?: string;
  engineVersion?: string;
}

/**
 * Dino's confidence report (POC bands) → shared contract. Dino keeps its own
 * richer POC type; this adapter lets it emit the neutral shape when composed
 * across domains. Mapping is total and tested.
 */
export type DinoConfidenceBandLegacy =
  | "high_within_poc" | "moderate" | "low"
  | "insufficient_evidence" | "domain_mismatch" | "human_review_required";

const DINO_BAND_TO_SHARED: Record<DinoConfidenceBandLegacy, ConfidenceBand> = {
  high_within_poc: "high",
  moderate: "moderate",
  low: "low",
  insufficient_evidence: "insufficient_evidence",
  domain_mismatch: "not_applicable",
  human_review_required: "human_review_required",
};

export function dinoConfidenceBandToShared(b: DinoConfidenceBandLegacy): ConfidenceBand {
  return DINO_BAND_TO_SHARED[b];
}
