# Matter Engine Execution Model (Epic 4 Architecture Review)

How each of the 17 engines should be *computed* at product scale — trigger,
inputs, invalidation, cost, cacheability, persistence, staleness tolerance.

Today every engine is a pure synchronous function of `(Matter, asOf)`. That is
correct for the POC and for testing, but running all 17 synchronously on every
page load will not scale (see the Scale Model). This table defines the target
computation class per engine.

## Computation classes

- **SYNC** — cheap, run on demand every view.
- **CACHED** — run on demand, memoize by input-hash; serve cached until an
  invalidating event.
- **EVENT** — recompute incrementally when a specific event fires.
- **BATCH** — recompute on a schedule (e.g. nightly) and/or in a queue.
- **SNAPSHOT** — persist an immutable point-in-time record for trend/audit.

Most engines are **CACHED + EVENT**: cache the result, invalidate on the events
listed, recompute lazily on next read or eagerly in a worker for priority
matters.

## Per-engine model

| Engine | Class | Triggering events (invalidation) | Key inputs | Recompute cost | Acceptable staleness | Persist |
|---|---|---|---|---|---|---|
| Deadline | EVENT + SYNC | deadline created/changed, day rollover (asOf change) | deadlines, asOf | trivial | **0 for strict overdue** — must be live | snapshot on change |
| Readiness | CACHED + EVENT | fact confirmed, evidence collected, document present, stage changed, policy changed | stage reqs, facts, evidence, docs | low | minutes | current-state row |
| Missing-Information | CACHED + EVENT | fact added/confirmed, stage changed | facts, stage reqs | low | minutes | current-state row |
| Evidence | CACHED + EVENT | evidence collected/added | evidence | low | minutes | current-state row |
| Document | CACHED + EVENT | document uploaded/reviewed, stage changed | documents, stage | low | minutes | current-state row |
| Risk | CACHED + EVENT | any of: deadline, evidence, fact, client, finance change | broad | low-med | minutes | snapshot (trend) |
| Legal | CACHED + EVENT | corpus/triad change, topic change, facts confirmed, **new legal authority detected** | triad coverage, refIds, facts | med (triad eval) | hours (law changes slowly) | snapshot on coverage change |
| Strategy | CACHED + EVENT | stage change, evidence/fact/deadline change | stage, signals | low | minutes-hours | current-state row |
| Next-Action | CACHED + EVENT | recompute when ANY component invalidates (it aggregates) | state machine, deadlines, blocks | low | minutes | current-state row |
| Timeline | CACHED + EVENT | communication logged, stage change, day rollover | comms, stage, asOf | trivial | hours | ephemeral |
| Progress | CACHED + EVENT | stage change, day rollover | stage index, openedAt | trivial | hours | snapshot (trend) |
| Client | CACHED + EVENT | client message, policy change, contact logged | client dims | trivial | hours | current-state row |
| Team | CACHED + EVENT | assignment changed, task completed, load change | team | trivial | hours | current-state row |
| Financial | CACHED + EVENT | invoice paid, billing change, write-off flag | financials | trivial | hours-days | current-state row |
| Communication | CACHED + EVENT | client message received/sent | comms | trivial | minutes-hours | ephemeral |
| Outcome | CACHED + EVENT | recompute when legal/evidence/fact/deadline change | legal, evidence, facts, deadlines | med (triad eval) | hours | snapshot (trend) |
| **Health** (roll-up) | CACHED + EVENT | recompute when ANY component invalidates | all component assessments | trivial (aggregation) | minutes | **snapshot (primary trend metric)** |

## Notes that drive the design

- **Deadline is the only always-live engine.** A strict deadline that flips to
  overdue at midnight must never be served stale. Everything else tolerates
  minutes-to-hours of staleness with an explicit freshness stamp.
- **Health and Next-Action are pure aggregators** — they must be recomputed
  whenever *any* component they summarize is invalidated. Cheapest to keep them
  as the last step of a single recompute pass rather than caching independently.
- **Legal and Outcome are the expensive engines** (they call `evaluateTriad`).
  They should be CACHED hard and invalidated only on corpus/fact/topic change —
  never recomputed per keystroke.
- **`asOf` (day rollover) is an invalidation event.** Because engines are
  `asOf`-relative and deterministic, "the clock advanced a day" is modeled as a
  new input, not hidden wall-clock drift. A daily tick invalidates the
  time-sensitive engines (Deadline, Timeline, Progress, Client-recency).
- **The event bus is the invalidation source.** Each event names the engines it
  dirties. The recompute worker re-runs only dirty engines + the two aggregators.

## Recommended execution pattern

1. Domain events (document uploaded, deadline changed, message received, stage
   changed, day rollover, corpus updated) publish to a per-tenant event stream.
2. A mapping `event → dirty engines` marks cached engine outputs stale.
3. On read (matter view) OR on a worker tick, recompute only dirty engines, then
   re-run Health + Next-Action, then persist current-state rows and (for
   trend-bearing engines) an immutable snapshot.
4. Every served result carries `computedAt` + `inputsHash` + `stale: boolean` so
   the UI can show freshness honestly.

This keeps a single matter view O(dirty engines), not O(17), and makes the
Morning-Workspace fan-out (many matters) a batch/queue problem rather than a
synchronous storm.
