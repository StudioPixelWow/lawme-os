/**
 * DinoRunResult — the typed final output of every pipeline run.
 * Either a completed structured research product, or a USEFUL structured
 * stop state (never a generic error, never a confident answer after a
 * failure).
 */
import type { DinoStageRecord, StopCondition } from "./pipeline-types.ts";
import type { DinoArtifacts } from "./pipeline-context.ts";
import type { DinoRequest } from "./request.ts";

export type DinoRunOutcome =
  | "completed"                 // full pipeline, human-review route attached
  | "stopped_clarification"     // waiting for answers to specific questions
  | "stopped_domain_mismatch"
  | "stopped_insufficient_evidence"
  | "stopped_policy"
  | "stopped_citation_failure"
  | "stopped_qa_failure"
  | "stopped_red_team"
  | "stopped_unsupported_intent"
  | "stopped_internal_failure";

export interface DinoRunResult {
  runId: string;
  correlationId: string;
  engineVersion: string;
  mode: string;
  request: DinoRequest;
  outcome: DinoRunOutcome;
  /** every stage record, in execution order — the audit trail */
  stages: DinoStageRecord[];
  /** all safe reasoning artifacts produced before stopping */
  artifacts: DinoArtifacts;
  stopConditions: StopCondition[];
  decisionLog: { at: string; stageId: string; decisionHe: string }[];
  /** mandatory Hebrew status line for any surface that shows the result */
  statusLineHe: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  warnings: string[];
}
