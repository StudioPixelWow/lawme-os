# Matter Score — Dimensions & State Rules (Epic 4.2)

`src/modules/matter/score/dimensions.ts` · `resolver.ts`

## Dimension → engine mapping

| Dimension | Consumes (engine / source) | Numeric? |
|---|---|---|
| legal | `matter-legal` (triad coverage, verification, specialist routing) | no (categorical certainty) |
| procedure | state machine + `matter-readiness` (stage, blocked transitions) | no |
| evidence | `matter-evidence` (mandatory completeness, missing proof) | yes |
| documents | `matter-document` (stage-required docs present) | yes |
| deadlines | `matter-deadline` (overdue / imminent / disputed) | no (categorical) |
| readiness | `matter-readiness` (mandatory prerequisites, blockers) | yes |
| progress | `matter-progress` (stage advancement, stalled) | yes |
| client | `matter-client` (waiting, policy, responsiveness) | no (sentiment) |
| communication | `matter-communication` (unanswered, freshness) | no |
| team | `matter-team` (ownership, workload, availability) | yes |
| finance | `matter-financial` (arrangement, collection, write-off) | yes (if available) |
| risk | `matter-risk` (five risk sub-dimensions) | yes |
| outcomeReadiness (opt) | `matter-outcome` (rule-based position band) | no |

The score layer never re-derives these facts; it reads each engine's assessment.

## Categorical states

`strong · healthy · attention · at_risk · blocked · unknown · unavailable ·
stale · requires_review · not_applicable`.

## Resolution order (deterministic, per dimension)

1. **Unavailable first.** If the backing engine is in
   `MatterState.degraded.failedEngines` (or emitted a `failed` payload), or no
   assessment exists → `unavailable`, `numericScore = null`, an unavailable reason,
   and a human-review route. A failed engine is never `healthy`.
2. **Base state** from the engine's `EngineStatus`
   (`blocked→blocked`, `at_risk→at_risk`, `attention→attention`,
   `healthy→healthy`, else `unknown`).
3. **Dimension-specific hard rules** (worst wins):
   - deadlines: strict overdue → `blocked`; overdue → `at_risk`; imminent → `attention`.
   - legal: `canRecommend === false` (partial/insufficient coverage) → `requires_review`.
   - evidence: any mandatory evidence missing → at least `at_risk`.
   - documents: any stage-required document missing → at least `at_risk`.
   - team: no responsible owner (size 0) → `blocked`.
   - risk: top risk `critical` → at least `at_risk`.
4. **Strong upgrade**: a `healthy` dimension becomes `strong` only when confidence
   ≥ 0.75, no finding above `info`, and (if numeric) score ≥ 90.
5. **Stale cap**: if the dimension's data is stale and the state would be
   `strong`/`healthy`, it is capped to `stale` (stale never reads as strong).

## State precedence (most → least concerning)

`blocked > requires_review > at_risk > attention > unknown > healthy > strong`,
with `unavailable`/`stale`/`not_applicable` handled as data-quality states outside
the performance comparison. This precedence is used both to pick a dimension's
dominant state and to rank strongest/weakest dimensions.
