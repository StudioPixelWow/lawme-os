# Matter Risk Model (Epic 4)

Engine: `matter-risk` · `src/modules/matter/engines/risk.ts`

## Question

Where is this matter exposed, and how badly? Risk builds a structured **risk
register** across five dimensions and inverts it into a score.

## Dimensions

- **procedural** — strict deadlines overdue/imminent, or strict deadlines with
  no scheduled date.
- **evidentiary** — mandatory evidence not yet collected.
- **factual** — stage-required facts that are `unknown`, `disputed`, or entirely
  absent.
- **client** — unreachable or slow client.
- **financial** — a disclosed write-off risk, or an open balance ≥ 50% of the
  amount billed.

Each `RiskItem` carries a `dimension`, a `severity`, and a Hebrew explanation.
Every risk item is also emitted as a `why`-dimension `Finding`.

## Scoring

A risk index sums per-item severity weights (`critical 1.0, high 0.5, medium
0.25, low 0.1`), saturated at 1.0. `score = 1 − riskIndex`. `data.byDimension`
gives the count per dimension; `data.topRisk` is the worst severity present.

When the top risk is `high` or `critical`, Risk emits a partner-level
`risk-mitigation-review` action and flags `requiresHumanReview`.

## Not a prediction

Risk describes *current exposure* from matter-internal signals. It does not
forecast the verdict — that boundary is kept in the Outcome model, which is
explicitly rule-based and separate.
