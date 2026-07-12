/**
 * Stage runner — uniform execution wrapper for every pipeline stage:
 * timing, status, warnings, errors, stop conditions, provenance, audit.
 * A stage NEVER throws out of the pipeline; failures become structured
 * records and (when blocking) structured stop states.
 */
import type {
  DinoStageId, DinoStageRecord, DinoStageStatus, StageProvenance, StopCondition,
} from "./pipeline-types.ts";
import { BLOCKING_STATUSES } from "./pipeline-types.ts";
import type { DinoPipelineContext } from "./pipeline-context.ts";

export interface StageOutcome {
  status: DinoStageStatus;
  confidence?: number | null;
  warnings?: string[];
  errors?: { code: string; messageHe: string; detail?: string }[];
  stopConditions?: Omit<StopCondition, "stageId">[];
  artifactType?: string | null;
  outputSummaryHe: string;
}

export interface StageSpec {
  stageId: DinoStageId;
  purposeHe: string;
  provenance: StageProvenance;
  inputSummaryHe: string;
  run: (ctx: DinoPipelineContext) => Promise<StageOutcome> | StageOutcome;
}

export const DETERMINISTIC_PROVENANCE = (
  rules: { name: string; version: string }[],
  policyIds: string[] = [],
): StageProvenance => ({
  provider: "deterministic",
  providerVersion: "n/a",
  deterministicRules: rules,
  policyIds,
});

/** Execute one stage, append its record, propagate stop conditions. */
export async function executeStage(ctx: DinoPipelineContext, spec: StageSpec): Promise<DinoStageRecord> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  let outcome: StageOutcome;
  try {
    outcome = await spec.run(ctx);
  } catch (e) {
    outcome = {
      status: "failed",
      outputSummaryHe: "כשל פנימי בשלב",
      errors: [{ code: "stage_exception", messageHe: "חריגה בלתי צפויה בשלב", detail: e instanceof Error ? e.message : String(e) }],
      stopConditions: [{
        code: "internal_stage_failure",
        messageHe: `שלב ${spec.stageId} נכשל באופן בלתי צפוי`,
        recommendedActionHe: "בדיקת מפתחים נדרשת — אין להמשיך בצינור",
      }],
    };
  }
  const completedAt = new Date().toISOString();
  const record: DinoStageRecord = {
    stageId: spec.stageId,
    purposeHe: spec.purposeHe,
    status: outcome.status,
    startedAt,
    completedAt,
    durationMs: Date.now() - t0,
    confidence: outcome.confidence ?? null,
    warnings: outcome.warnings ?? [],
    errors: outcome.errors ?? [],
    stopConditions: (outcome.stopConditions ?? []).map((s) => ({ ...s, stageId: spec.stageId })),
    provenance: spec.provenance,
    artifactType: outcome.artifactType ?? null,
    audit: {
      correlationId: ctx.correlationId,
      inputSummaryHe: spec.inputSummaryHe,
      outputSummaryHe: outcome.outputSummaryHe,
    },
  };
  ctx.stageRecords.push(record);
  ctx.stopConditions.push(...record.stopConditions);
  return record;
}

export function isBlocking(record: DinoStageRecord): boolean {
  return BLOCKING_STATUSES.has(record.status) || record.stopConditions.length > 0;
}

/** Emit a `skipped` record for a stage the orchestrator chose not to run. */
export function skippedStage(ctx: DinoPipelineContext, stageId: DinoStageId, purposeHe: string, reasonHe: string): DinoStageRecord {
  const now = new Date().toISOString();
  const record: DinoStageRecord = {
    stageId, purposeHe, status: "skipped",
    startedAt: now, completedAt: now, durationMs: 0,
    confidence: null, warnings: [reasonHe], errors: [], stopConditions: [],
    provenance: DETERMINISTIC_PROVENANCE([{ name: "stage-skip", version: "1.0" }]),
    artifactType: null,
    audit: { correlationId: ctx.correlationId, inputSummaryHe: "—", outputSummaryHe: `דולג: ${reasonHe}` },
  };
  ctx.stageRecords.push(record);
  return record;
}
