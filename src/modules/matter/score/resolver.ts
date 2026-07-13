/**
 * Matter Score — dimension resolver (Epic 4.2).
 * Deterministic rules that turn engine assessments (inside a MatterState) into
 * categorical dimension states + optional numeric scores. No engine logic is
 * duplicated here; the resolver only reads assessments and applies transparent
 * precedence rules.
 */
import type { EngineAssessment, Finding, Severity } from "../types.ts";
import type { MatterState } from "../intelligence.ts";
import type { BlockingCondition } from "../state-machine.ts";
import { reviewRouteFromFlag, worstSeverity, type ReviewRoute, type ReviewRouteTarget } from "../../intelligence/core/index.ts";
import { DIMENSION_SPECS, type DimensionSpec } from "./dimensions.ts";
import type { DimensionState, Freshness, ScoreDimension, ScoreDimensionId } from "./types.ts";

export interface ScoreResolveOptions {
  /** dimensions whose backing data is known to be stale (deterministic input) */
  staleDimensions?: ScoreDimensionId[];
}

/** performance-state severity (higher = more concerning); data-quality states handled separately */
const PERF_RANK: Record<DimensionState, number> = {
  blocked: 6, requires_review: 5, at_risk: 4, attention: 3,
  unknown: 2, healthy: 1, strong: 0,
  unavailable: 0, stale: 0, not_applicable: 0, // handled outside the perf comparison
};

function worstPerf(a: DimensionState, b: DimensionState): DimensionState {
  return PERF_RANK[a] >= PERF_RANK[b] ? a : b;
}

function baseFromStatus(s: EngineAssessment["status"]): DimensionState {
  switch (s) {
    case "blocked": return "blocked";
    case "at_risk": return "at_risk";
    case "attention": return "attention";
    case "healthy": return "healthy";
    default: return "unknown";
  }
}

function topSeverity(findings: Finding[]): Severity {
  return findings.reduce<Severity>((s, f) => worstSeverity(s, f.severity), "info");
}

/** which blocking conditions belong to a given dimension */
function blockersFor(id: ScoreDimensionId, all: BlockingCondition[]): BlockingCondition[] {
  switch (id) {
    case "readiness": return all;
    case "procedure": return all.filter((b) => b.kind === "policy" || b.kind === "deadline");
    case "evidence": return all.filter((b) => b.kind === "missing_evidence" || b.kind === "missing_fact");
    case "documents": return all.filter((b) => b.kind === "missing_document");
    case "deadlines": return all.filter((b) => b.kind === "deadline");
    case "client": return all.filter((b) => b.kind === "policy");
    default: return [];
  }
}

function reviewTargetFor(id: ScoreDimensionId, state: DimensionState): ReviewRouteTarget {
  if (state === "requires_review" && id === "legal") return "specialist_review";
  if (id === "finance") return "finance_review";
  if (id === "team") return "partner_review";
  if (id === "legal") return "senior_lawyer_review";
  return "lawyer_review";
}

/** Apply dimension-specific hard rules on top of the base status. */
function applyHardRules(id: ScoreDimensionId, base: DimensionState, a: EngineAssessment): DimensionState {
  const d = a.data as Record<string, unknown>;
  let state = base;
  switch (id) {
    case "deadlines": {
      if ((d.strictOverdue as number) > 0) state = worstPerf(state, "blocked");
      else if ((d.overdue as number) > 0) state = worstPerf(state, "at_risk");
      else if ((d.imminent as number) > 0) state = worstPerf(state, "attention");
      break;
    }
    case "legal": {
      // insufficient/partial legal coverage → requires_review (never silently healthy)
      if (d.canRecommend === false) state = worstPerf(state, "requires_review");
      break;
    }
    case "evidence": {
      const missing = (d.mandatoryMissing as string[] | undefined)?.length ?? 0;
      if (missing > 0) state = worstPerf(state, "at_risk");
      break;
    }
    case "documents": {
      const missing = (d.missingForStage as string[] | undefined)?.length ?? 0;
      if (missing > 0) state = worstPerf(state, "at_risk");
      break;
    }
    case "team": {
      if ((d.size as number) === 0) state = worstPerf(state, "blocked"); // no responsible owner
      break;
    }
    case "risk": {
      if (d.topRisk === "critical") state = worstPerf(state, "at_risk");
      break;
    }
    default: break;
  }
  return state;
}

/** Can this dimension be upgraded to `strong`? */
function qualifiesStrong(spec: DimensionSpec, a: EngineAssessment, numeric: number | null): boolean {
  if (a.confidence < 0.75) return false;
  if (topSeverity(a.findings) !== "info") return false;
  if (spec.numericEligible) return numeric !== null && numeric >= 90;
  return true; // categorical dimension, perfectly healthy + confident
}

function resolveOne(
  spec: DimensionSpec,
  state: MatterState,
  opts: ScoreResolveOptions,
): ScoreDimension {
  const asOf = state.asOf;
  const engineName = spec.engines[0];
  const assessment = state.engines.find((e) => e.engine === engineName);
  const failed = state.degraded.failedEngines.some((f) => f.engine === engineName)
    || (assessment?.data?.failed === true);
  const stale = (opts.staleDimensions ?? []).includes(spec.id);

  // --- unavailable: a failed engine is NEVER healthy
  if (failed || !assessment) {
    const reasonHe = !assessment
      ? `אין הערכה זמינה מהמנוע ${engineName}`
      : `המנוע ${engineName} נכשל — נתוני הממד אינם זמינים`;
    return {
      id: spec.id, labelHe: spec.labelHe, state: "unavailable",
      numericScore: null, confidence: 0,
      freshness: { computedAt: asOf, stale: false },
      sourceAssessmentIds: [engineName],
      findings: assessment?.findings ?? [],
      blockers: [], warningsHe: [reasonHe], requiredActions: [],
      reviewRoute: reviewRouteFromFlag(true, reviewTargetFor(spec.id, "requires_review"), "high", [reasonHe]),
      unavailableReasonHe: reasonHe, staleReasonHe: null, generatedAt: asOf,
    };
  }

  // --- performance state
  let dstate = applyHardRules(spec.id, baseFromStatus(assessment.status), assessment);

  // --- numeric score (only where measurable, never for unknown/unavailable)
  const numeric: number | null = spec.numericEligible && assessment.score !== null
    ? Math.round(assessment.score * 100)
    : null;

  // --- strong upgrade (before stale cap)
  if (dstate === "healthy" && qualifiesStrong(spec, assessment, numeric)) dstate = "strong";

  // --- stale cap: stale data may not read as strong/healthy
  let staleReasonHe: string | null = null;
  const freshness: Freshness = { computedAt: asOf, stale };
  if (stale && (dstate === "strong" || dstate === "healthy")) {
    staleReasonHe = `נתוני הממד ${spec.labelHe} אינם עדכניים`;
    dstate = "stale";
    freshness.staleReasonHe = staleReasonHe;
  }

  const sev = topSeverity(assessment.findings);
  const needsReview = assessment.requiresHumanReview || dstate === "requires_review" || dstate === "blocked";
  const reviewRoute: ReviewRoute | null = needsReview
    ? reviewRouteFromFlag(true, reviewTargetFor(spec.id, dstate), sev, assessment.findings.map((f) => f.messageHe).slice(0, 3))
    : null;

  return {
    id: spec.id, labelHe: spec.labelHe, state: dstate,
    numericScore: numeric,
    confidence: assessment.confidence,
    freshness,
    sourceAssessmentIds: [engineName],
    findings: assessment.findings,
    blockers: blockersFor(spec.id, state.questions.blocking),
    warningsHe: [],
    requiredActions: assessment.actions,
    reviewRoute,
    unavailableReasonHe: null,
    staleReasonHe,
    generatedAt: asOf,
  };
}

/** Resolve every dimension deterministically from a MatterState. */
export function resolveDimensions(state: MatterState, opts: ScoreResolveOptions = {}): ScoreDimension[] {
  return DIMENSION_SPECS.map((spec) => resolveOne(spec, state, opts));
}

export { PERF_RANK };
