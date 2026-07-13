/**
 * Matter Score (Epic 4.2) — public surface.
 * Turns a MatterState into a decomposed, categorical-first MatterScore.
 * Deterministic; consumes assessments only.
 */
import type { MatterState } from "../intelligence.ts";
import { resolveDimensions, type ScoreResolveOptions } from "./resolver.ts";
import { derivePosture } from "./posture.ts";
import { MATTER_SCORE_VERSION, type MatterScore } from "./types.ts";

export * from "./types.ts";
export { DIMENSION_SPECS, dimensionSpec } from "./dimensions.ts";
export { resolveDimensions } from "./resolver.ts";
export type { ScoreResolveOptions } from "./resolver.ts";
export { derivePosture } from "./posture.ts";
export { computeTrend, MATTER_TREND_VERSION } from "./trend.ts";
export type { ScoreTrend, TrendDirection, DimensionChange } from "./trend.ts";

export function computeMatterScore(state: MatterState, opts: ScoreResolveOptions = {}): MatterScore {
  const dimensions = resolveDimensions(state, opts);
  const summary = derivePosture(dimensions, state);
  const stale = dimensions.some((d) => d.freshness.stale);
  return {
    matterId: state.matterId,
    asOf: state.asOf,
    summary,
    dimensions,
    freshness: { computedAt: state.asOf, stale },
    version: MATTER_SCORE_VERSION,
  };
}
