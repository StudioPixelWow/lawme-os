# Matter Strategy Model (Epic 4)

Engine: `matter-strategy` · `src/modules/matter/engines/strategy.ts`

## Question

Given where the matter stands, what posture should the firm take? Strategy
proposes weighted options with explicit rationale — it never asserts an outcome
and always requires human decision.

## Signals

- missing mandatory evidence count
- unknown stage-required facts count
- strict deadlines overdue / imminent
- the current stage `kind` (pre-litigation, interim-relief, etc.)

## Option space

`StrategyOption.key` ∈ `stabilize_deadlines | gather_evidence | seek_settlement
| prepare_filing | seek_interim_relief | proceed`. Each option carries a Hebrew
label, a rationale, and a `weight`. Rules (illustrative):

- deadline pressure present → `stabilize_deadlines` (weight 5, highest — you
  do not litigate strategy while a strict clock is expiring).
- missing evidence / unknown facts → `gather_evidence` (weight 4).
- `pre_litigation` stage → `seek_settlement`; and `prepare_filing` once the
  evidentiary/factual base is complete.
- `interim_relief` stage → `seek_interim_relief`.
- otherwise, when unblocked → `proceed`.

Options are sorted by weight; the top option is the recommendation, emitted as a
`what_next` finding plus a partner-level adopt/reject action. `requiresHumanReview`
is always true — Strategy advises, the partner decides.
