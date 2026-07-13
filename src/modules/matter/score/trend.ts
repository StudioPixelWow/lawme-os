/**
 * Matter Score — trend contract (Epic 4.2).
 * Compares two MatterScores deterministically. NO persistence — the caller
 * supplies previous and current scores (e.g. fixtures). Direction is derived
 * from posture concern-rank and per-dimension state changes.
 */
import type { DimensionState, MatterPosture, MatterScore, ScoreDimensionId } from "./types.ts";

export type TrendDirection = "improving" | "stable" | "deteriorating" | "unknown";

export interface DimensionChange {
  id: ScoreDimensionId;
  from: DimensionState;
  to: DimensionState;
}

export interface ScoreTrend {
  previousPosture: MatterPosture;
  currentPosture: MatterPosture;
  direction: TrendDirection;
  changedDimensions: DimensionChange[];
  improvementReasonsHe: string[];
  deteriorationReasonsHe: string[];
  timestamp: string;          // = current.asOf
  sourceEventsHe: string[];   // reserved; empty without an event stream
  version: string;
}

export const MATTER_TREND_VERSION = "matter-score-trend-1.0.0";

/** concern rank — higher = more concerning */
const POSTURE_RANK: Record<MatterPosture, number> = {
  on_track: 0,
  insufficient_data: 1,
  needs_attention: 2,
  requires_review: 3,
  at_risk: 3,
  degraded: 4,
  blocked: 5,
};

/** dimension-state concern rank */
const DSTATE_RANK: Record<DimensionState, number> = {
  strong: 0, healthy: 1, not_applicable: 1, stale: 2, unknown: 2,
  attention: 3, unavailable: 3, at_risk: 4, requires_review: 5, blocked: 6,
};

export function computeTrend(previous: MatterScore, current: MatterScore): ScoreTrend {
  const prevP = previous.summary.posture;
  const curP = current.summary.posture;

  const changed: DimensionChange[] = [];
  const improvementReasonsHe: string[] = [];
  const deteriorationReasonsHe: string[] = [];

  for (const cur of current.dimensions) {
    const prev = previous.dimensions.find((d) => d.id === cur.id);
    if (!prev || prev.state === cur.state) continue;
    changed.push({ id: cur.id, from: prev.state, to: cur.state });
    if (DSTATE_RANK[cur.state] < DSTATE_RANK[prev.state]) {
      improvementReasonsHe.push(`${cur.labelHe}: ${prev.state} → ${cur.state}`);
    } else {
      deteriorationReasonsHe.push(`${cur.labelHe}: ${prev.state} → ${cur.state}`);
    }
  }

  let direction: TrendDirection;
  if (POSTURE_RANK[curP] < POSTURE_RANK[prevP]) direction = "improving";
  else if (POSTURE_RANK[curP] > POSTURE_RANK[prevP]) direction = "deteriorating";
  else if (changed.length === 0) direction = "stable";
  else {
    // same posture but dimensions moved — net direction from dimension deltas
    const netImprove = improvementReasonsHe.length - deteriorationReasonsHe.length;
    direction = netImprove > 0 ? "improving" : netImprove < 0 ? "deteriorating" : "stable";
  }

  return {
    previousPosture: prevP,
    currentPosture: curP,
    direction,
    changedDimensions: changed,
    improvementReasonsHe,
    deteriorationReasonsHe,
    timestamp: current.asOf,
    sourceEventsHe: [],
    version: MATTER_TREND_VERSION,
  };
}
