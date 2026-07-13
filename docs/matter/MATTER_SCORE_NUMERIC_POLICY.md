# Matter Score — Numeric Scoring Policy (Epic 4.2)

`src/modules/matter/score/resolver.ts`

## Principle: bands over decimals, never false precision

A numeric score appears **only** where inputs are measurable operational
completeness, and **always** alongside a categorical state. A number never stands
alone, and is never a legal-outcome probability.

## Where numeric is allowed

Integer `0..100` (rounded from the engine's `0..1` score) for the measurable
dimensions: **evidence, documents, readiness, progress, team, finance
(when available), risk**.

## Where numeric is forbidden (categorical only)

**legal** (legal certainty), **deadlines** (overdue/imminent is categorical),
**client** (sentiment/policy), **procedure** (stage position), **outcomeReadiness**
(rule-based band, never a probability). These carry `numericScore = null`.

## Hard rules

- **Unknown ≠ zero.** A dimension whose state is `unknown` or `unavailable` gets
  `numericScore = null`, never `0`. Missing data is not poor performance.
- **Unavailable integrations do not lower the score.** A failed finance engine
  yields `finance = unavailable`, `numericScore = null` — it does not push the
  number toward 0 or drag an average down (there is no average).
- **A number always has a state.** `numericScore` is emitted next to `state`; UIs
  must show the state, not the number alone.
- **No blended overall percentage.** The `MatterScore` object exposes no single
  0..100 figure. Overall health is the categorical posture.
- **Rounding.** Integers only (`Math.round(score01 * 100)`), so no misleading
  decimals.
- **Trend comparison** uses per-dimension state changes and posture concern-rank,
  not numeric deltas (see MATTER_SCORE_TREND).

## Confidence

Each dimension carries the engine's `confidence` (0..1). A high numeric score with
low confidence is still low-trust; the `strong` upgrade requires confidence ≥ 0.75,
so a number computed from thin data cannot present as `strong`.
