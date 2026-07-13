/**
 * Matter Score — types (Epic 4.2).
 * A decomposed, categorical-first score. NOT one opaque percentage, and NEVER a
 * legal-outcome probability. Each dimension is derived from the already-computed
 * MatterState engine assessments (the score layer consumes assessments; it does
 * not recompute domain facts). Numeric values appear only where measurable, and
 * always alongside a categorical state.
 */
import type { ReviewRoute } from "../../intelligence/core/index.ts";
import type { Finding, RecommendedAction } from "../types.ts";
import type { BlockingCondition } from "../state-machine.ts";

export type ScoreDimensionId =
  | "legal" | "procedure" | "evidence" | "documents" | "deadlines"
  | "readiness" | "progress" | "client" | "communication" | "team"
  | "finance" | "risk"
  | "outcomeReadiness"; // optional

export const REQUIRED_DIMENSIONS: ScoreDimensionId[] = [
  "legal", "procedure", "evidence", "documents", "deadlines",
  "readiness", "progress", "client", "communication", "team", "finance", "risk",
];

/** Categorical state of a single dimension. Categorical-FIRST. */
export type DimensionState =
  | "strong"
  | "healthy"
  | "attention"
  | "at_risk"
  | "blocked"
  | "unknown"
  | "unavailable"
  | "stale"
  | "requires_review"
  | "not_applicable";

export interface Freshness {
  computedAt: string;   // = matter.asOf (deterministic)
  stale: boolean;
  staleReasonHe?: string | null;
}

export interface ScoreDimension {
  id: ScoreDimensionId;
  labelHe: string;
  state: DimensionState;
  /** integer 0..100 — present ONLY where measurable; null otherwise. */
  numericScore: number | null;
  confidence: number;          // 0..1
  freshness: Freshness;
  /** engine identifiers whose assessments this dimension was derived from */
  sourceAssessmentIds: string[];
  /** finding codes supporting this dimension's state */
  findings: Finding[];
  blockers: BlockingCondition[];
  warningsHe: string[];
  requiredActions: RecommendedAction[];
  reviewRoute: ReviewRoute | null;
  unavailableReasonHe: string | null;
  staleReasonHe: string | null;
  generatedAt: string;
}

/** Overall posture — deliberately NOT a single average. */
export type MatterPosture =
  | "on_track"
  | "needs_attention"
  | "at_risk"
  | "blocked"
  | "degraded"
  | "requires_review"
  | "insufficient_data";

export interface MatterScoreSummary {
  posture: MatterPosture;
  dominantConcernHe: string | null;
  strongestDimension: ScoreDimensionId | null;
  weakestDimension: ScoreDimensionId | null;
  topBlockers: BlockingCondition[];
  topOpportunitiesHe: string[];
  /** dimensions whose data was stale/unavailable — coverage transparency */
  unavailableDimensions: ScoreDimensionId[];
  staleDimensions: ScoreDimensionId[];
  /** fraction of required dimensions with a usable (non unknown/unavailable) state */
  assessmentCoverage: number; // 0..1
  requiresHumanReview: boolean;
}

export interface MatterScore {
  matterId: string;
  asOf: string;
  summary: MatterScoreSummary;
  dimensions: ScoreDimension[];
  freshness: Freshness;
  version: string;
}

export const MATTER_SCORE_VERSION = "matter-score-1.0.0";
