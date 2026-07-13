# Matter Score — Implementation (Epic 4.2)

`src/modules/matter/score/` · version `matter-score-1.0.0`

## What it is

A decomposed, categorical-first score derived from the already-computed
`MatterState`. It is **not** one opaque percentage and **never** a legal-outcome
probability. The score layer *consumes* engine assessments — it does not recompute
any domain fact.

## Pipeline position

```
Matter → 17 engines → failure isolation → MatterState → computeMatterScore(state) → MatterScore
```

`computeMatterScore(state, opts?)` runs `resolveDimensions` then `derivePosture`.
It is deterministic (everything relative to `state.asOf`), side-effect-free, and
additive — the original `MatterState` is untouched.

## Structure

- `types.ts` — `MatterScore`, `ScoreDimension`, `DimensionState`, `MatterPosture`,
  `MatterScoreSummary`, `Freshness`.
- `dimensions.ts` — the dimension registry: which engine each dimension consumes
  and whether a numeric score is meaningful.
- `resolver.ts` — deterministic state + numeric resolution (see
  MATTER_SCORE_DIMENSIONS + MATTER_SCORE_NUMERIC_POLICY).
- `posture.ts` — overall posture (see MATTER_POSTURE_MODEL).
- `trend.ts` — deterministic comparison of two scores (see MATTER_SCORE_TREND).
- `index.ts` — `computeMatterScore`.

## A ScoreDimension carries

`id`, `labelHe`, `state`, `numericScore` (0..100 or null), `confidence`,
`freshness` (computedAt + stale + reason), `sourceAssessmentIds`, `findings`,
`blockers`, `warningsHe`, `requiredActions`, `reviewRoute`, `unavailableReasonHe`,
`staleReasonHe`, `generatedAt`.

Every dimension answers the product questions: what is healthy, what is at risk,
what is missing, what blocks, who should act, by when, why, which findings support
it, whether it is stale/unavailable, and where human review is required.

## Guarantees (test- and benchmark-enforced)

- 12 required dimensions + 1 optional (`outcomeReadiness`) always present.
- A failed engine → dimension `unavailable`, never `healthy`; posture `degraded`.
- Unavailable/unknown data is never scored as `0`.
- Stale data may not read as `strong`.
- A blocked legal/deadline dimension can never be hidden by averaging healthy
  dimensions (there is no average).
- No opaque overall percentage exists on the object.
