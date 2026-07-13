/**
 * Matter Score — overall posture (Epic 4.2).
 * Derives one categorical Matter Posture from the resolved dimensions using
 * transparent precedence — NOT an average. A single critical blocked dimension
 * dominates; a failed engine degrades; low coverage yields insufficient_data.
 * A blocked legal/deadline dimension can never be hidden by healthy others.
 */
import type { BlockingCondition } from "../state-machine.ts";
import type { MatterState } from "../intelligence.ts";
import { REQUIRED_DIMENSIONS, type DimensionState, type MatterPosture, type MatterScoreSummary, type ScoreDimension, type ScoreDimensionId } from "./types.ts";
import { PERF_RANK } from "./resolver.ts";

const USABLE = (s: DimensionState) => s !== "unknown" && s !== "unavailable" && s !== "not_applicable";
const COVERAGE_FLOOR = 0.6;

export function derivePosture(dimensions: ScoreDimension[], state: MatterState): MatterScoreSummary {
  const required = dimensions.filter((d) => REQUIRED_DIMENSIONS.includes(d.id));
  const has = (s: DimensionState) => required.some((d) => d.state === s);

  const usableCount = required.filter((d) => USABLE(d.state)).length;
  const assessmentCoverage = required.length === 0 ? 0 : usableCount / required.length;

  // precedence (most-concerning first)
  let posture: MatterPosture;
  if (has("blocked")) posture = "blocked";
  else if (has("unavailable")) posture = "degraded";
  else if (has("requires_review")) posture = "requires_review";
  else if (has("at_risk")) posture = "at_risk";
  else if (assessmentCoverage < COVERAGE_FLOOR) posture = "insufficient_data";
  else if (has("attention") || has("stale") || has("unknown")) posture = "needs_attention";
  else posture = "on_track";

  // strongest / weakest by performance rank (only performance states)
  const perf = required.filter((d) => USABLE(d.state) && d.state !== "stale");
  let strongestDimension: ScoreDimensionId | null = null;
  let weakestDimension: ScoreDimensionId | null = null;
  if (perf.length > 0) {
    strongestDimension = perf.reduce((a, b) => (PERF_RANK[a.state] <= PERF_RANK[b.state] ? a : b)).id;
    weakestDimension = perf.reduce((a, b) => (PERF_RANK[a.state] >= PERF_RANK[b.state] ? a : b)).id;
  }

  // top blockers — global blocking conditions, most impactful kind first
  const kindRank: Record<string, number> = { policy: 4, deadline: 3, missing_evidence: 2, missing_document: 2, missing_fact: 1 };
  const topBlockers: BlockingCondition[] = [...state.questions.blocking]
    .sort((a, b) => (kindRank[b.kind] ?? 0) - (kindRank[a.kind] ?? 0))
    .slice(0, 3);

  // opportunities — strong dimensions + a clear advance option when unblocked
  const topOpportunitiesHe: string[] = [];
  for (const d of required) if (d.state === "strong") topOpportunitiesHe.push(`${d.labelHe} במצב חזק`);
  if (state.questions.blocking.length === 0 && state.stage.nextOptionsHe.length > 0) {
    topOpportunitiesHe.push(`ניתן לקדם לשלב הבא: ${state.stage.nextOptionsHe.map((n) => n.toTitleHe).join(" / ")}`);
  }

  // dominant concern — weakest dimension's top finding, else posture phrase
  let dominantConcernHe: string | null = null;
  if (weakestDimension) {
    const wd = required.find((d) => d.id === weakestDimension)!;
    if (wd.state !== "healthy" && wd.state !== "strong") {
      dominantConcernHe = wd.findings[0]?.messageHe ?? `${wd.labelHe}: ${wd.state}`;
    }
  }
  if (!dominantConcernHe && topBlockers.length > 0) dominantConcernHe = topBlockers[0].messageHe;

  const unavailableDimensions = required.filter((d) => d.state === "unavailable").map((d) => d.id);
  const staleDimensions = required.filter((d) => d.state === "stale").map((d) => d.id);
  const requiresHumanReview = state.requiresHumanReview || dimensions.some((d) => d.reviewRoute !== null);

  return {
    posture,
    dominantConcernHe,
    strongestDimension,
    weakestDimension,
    topBlockers,
    topOpportunitiesHe,
    unavailableDimensions,
    staleDimensions,
    assessmentCoverage: Math.round(assessmentCoverage * 100) / 100,
    requiresHumanReview,
  };
}
