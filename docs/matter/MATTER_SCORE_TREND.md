# Matter Score — Trend Contract (Epic 4.2)

`src/modules/matter/score/trend.ts` · version `matter-score-trend-1.0.0`

## Purpose

Compare two `MatterScore`s deterministically. **No persistence** — the caller
supplies previous and current scores (fixtures today; a datastore later). This is
the forward-looking contract, not a stored history.

## Contract

```ts
interface ScoreTrend {
  previousPosture: MatterPosture;
  currentPosture: MatterPosture;
  direction: "improving" | "stable" | "deteriorating" | "unknown";
  changedDimensions: { id; from; to }[];
  improvementReasonsHe: string[];
  deteriorationReasonsHe: string[];
  timestamp: string;          // = current.asOf
  sourceEventsHe: string[];   // reserved; empty without an event stream
  version: string;
}
```

## Direction rules

- Compare posture **concern rank** (`on_track` < `insufficient_data` <
  `needs_attention` < `requires_review`/`at_risk` < `degraded` < `blocked`):
  lower current rank → `improving`; higher → `deteriorating`.
- Same posture: derive from per-dimension state changes — net improvements vs
  deteriorations (using a dimension-state concern rank). Ties → `stable`; no
  changes → `stable`.

## Changed dimensions

Every dimension whose `state` differs between the two scores is reported with
`from`/`to`, and classified as an improvement or a deterioration by concern rank.
This is what a UI trend indicator renders ("evidence: at_risk → healthy").

## Not persisted

Persistence of trends is explicitly deferred (Epic 4.2 constraint). When a
datastore lands, snapshots feed this same function; the contract does not change.
