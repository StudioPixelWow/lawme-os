# Matter Readiness Model (Epic 4)

Engine: `matter-readiness` · `src/modules/matter/engines/readiness.ts`

## Question

Is the matter ready to advance out of its current stage? Readiness turns the
State Machine's blocking analysis into a single, scored answer.

## Inputs

Derived entirely from `blockingConditions(matter)` and the current stage's
requirements (required facts + mandatory evidence). This keeps "ready to
advance" a single, auditable computation shared with the state machine.

## Scoring

- Gates = stage-required facts + mandatory evidence items.
- `score` = satisfied gates / total gates.
- Any **hard block** (`policy` or `deadline`) caps the score at 0.2 regardless
  of the gate ratio — a matter that is administratively barred is not "80%
  ready" just because its facts are in.

## Status

- `blocked` — a policy/deadline hard block is present.
- `at_risk` — other blocks (missing facts/evidence/documents) are present.
- `healthy` — no blocks and a next stage exists → emits an `advance-stage`
  action naming the option(s) from the graph.
- `attention` — no blocks but the stage is terminal (nothing to advance to).

Each blocking condition becomes a `Finding` on the matching dimension
(`what_is_missing` for facts/evidence/documents, `when` for deadlines,
`blocking` for policy).
