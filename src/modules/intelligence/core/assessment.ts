/**
 * Shared intelligence primitive — Assessment Envelope (Epic 4.1).
 * The neutral envelope every engine/stage can emit. It is GENERIC over a typed
 * domain payload `TData` — deliberately NOT `data: any` — so each domain keeps
 * its structured payload typed and owned while sharing the outer contract.
 */
import type { Finding } from "./finding.ts";
import type { RecommendedAction } from "./recommended-action.ts";
import type { Warning } from "./warning.ts";
import type { BlockingCondition } from "./blocking-condition.ts";
import type { ConfidenceReport } from "./confidence.ts";
import type { ReviewRoute } from "./review-route.ts";
import type { Provenance } from "./provenance.ts";

/** Neutral engine/stage status — the health of one assessment. */
export type EngineStatus = "healthy" | "attention" | "at_risk" | "blocked" | "unknown";

/**
 * Completeness/liveness of an assessment run. A failed engine is `unavailable`
 * — never `healthy`. This is what makes silent failure impossible.
 */
export type ExecutionState =
  | "complete"
  | "partial"
  | "stale"
  | "unavailable"
  | "blocked"
  | "requires_review";

export interface AssessmentEnvelope<TData = Record<string, unknown>> {
  assessmentId?: string;
  engine: string;
  engineVersion: string;
  status: EngineStatus;
  executionState: ExecutionState;
  findings: Finding[];
  actions: RecommendedAction[];
  warnings: Warning[];
  blockers: BlockingCondition[];
  /** decomposed report OR a bare score during incremental migration */
  confidence?: ConfidenceReport | number | null;
  reviewRoute?: ReviewRoute | null;
  provenance?: Provenance | null;
  /** typed, domain-owned payload — never `any` */
  data: TData;
  generatedAt?: string;
  inputsHash?: string;
  durationMs?: number;
}
