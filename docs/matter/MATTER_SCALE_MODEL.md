# Matter Scale Model (Epic 4 Architecture Review)

Evaluates the Matter Intelligence Engine from 100 to 100,000 matters across many
tenants, and defines the practical scaling strategy.

## The honest starting point

The Epic 4 engines are pure, deterministic, in-memory functions. There is **no
database access, no N+1, no network** inside any engine — cost is pure CPU over
data already in the `Matter` object. That is a strong foundation: the engines
themselves are cheap and embarrassingly parallel. The scale question is
therefore **not** "are the engines fast" but "how is matter data loaded, how
often are engines run, and what is stored".

## Scale bands

| Matters | Shape | Dominant cost | Verdict |
|---|---|---|---|
| 100 | single firm | negligible | run everything on demand; no caching needed |
| 1,000 | single firm, active caseload | matter data loading | cache engine outputs; load matters by id |
| 10,000 | firm + history, or several tenants | Morning-Workspace fan-out, recompute volume | event-driven invalidation + queue required |
| 100,000 | many tenants | event volume, recompute storms, isolation | per-tenant partitioning, backpressure, priority queue mandatory |

## The two workloads

1. **Single-matter view** — a lawyer opens one matter. Must be fast (< ~200 ms
   server budget). With cached engine outputs this is a few row reads + a
   recompute of only stale engines. Fine to 100k.
2. **Morning-Workspace summary** — "show me the state of my 40 matters this
   morning." This is the dangerous one: naively it is 40 × 17 engine runs, each
   needing the full matter graph loaded. This must be **materialized**, not
   computed live.

## Answers to the scale questions

- **Can all 17 engines run synchronously on every page load?** For a *single*
  matter, yes at every band (they are cheap once the matter is loaded). For a
  *list/dashboard* of matters, **no** beyond ~a few dozen — that path must read
  materialized summaries.
- **Which engines must never run synchronously in the list path?** The two that
  call `evaluateTriad` (Legal, Outcome) and the aggregators that depend on them
  (Health, Next-Action). In the list path these come from the last snapshot.
- **Which summaries should be materialized?** The **Matter Health snapshot** and
  the **Matter Score dimensions** (see Score Model) per matter — that is what
  every list/dashboard reads. Materialize on event, read O(1).
- **Which results should be snapshots (immutable)?** Health, Risk, Legal
  coverage, Outcome band, Progress — anything used for trend/audit over time.
- **Which results should be derived live?** Deadline status (always live), and
  any engine whose inputs changed since the last snapshot (recompute-on-read).
- **How should stale results be signaled?** Every result carries `computedAt`,
  `inputsHash`, and `stale`. The UI shows a freshness indicator; a stale result
  is never silently presented as current.
- **How should priority matters be recomputed first?** The recompute queue is
  **priority-ordered**: matters with imminent strict deadlines, blocked matters,
  and matters opened in the Morning Workspace jump the queue. Cold history
  recomputes lazily.

## Practical scaling strategy

1. **Load discipline.** A matter is loaded through a repository that fetches its
   sub-collections in a bounded number of queries (no per-item lookups). Engines
   receive a fully-hydrated `Matter`; they never query.
2. **Cache + event invalidation.** Engine outputs are cached per matter and
   invalidated by the `event → dirty engines` map (see Execution Model).
3. **Materialized summaries.** Health snapshot + Score dimensions are written on
   every recompute; all list/dashboard reads hit these, never the engines.
4. **Queue + priority.** Recomputes run in a per-tenant, priority-ordered queue
   with concurrency caps to prevent recompute storms when a bulk event lands
   (e.g. a corpus update dirties Legal for every matter — process by priority,
   with backpressure, not all at once).
5. **Tenant isolation.** Every read/write is RLS-scoped by tenant. Recompute
   workers carry the tenant context; no cross-tenant batch touches two tenants'
   data in one unit.
6. **Observability + backpressure.** Queue depth, recompute latency, stale-age
   distribution, and event volume are monitored (see Observability). A corpus-
   wide invalidation is rate-limited so it degrades freshness gracefully rather
   than saturating CPU.

## Recompute-storm scenario (worked)

A new legal authority is ingested → Legal + Outcome are dirtied for **every**
matter on the relevant topic. At 100k matters this is the worst case.

- Do **not** recompute synchronously.
- Enqueue invalidations, priority-order by (imminent deadline, blocked, recently
  viewed), process with a concurrency cap and backpressure.
- Until a matter is recomputed, its Legal/Outcome results are served with
  `stale: true` and a "law updated — reassessment pending" freshness note.

This bounds the blast radius of the single most expensive event to background
work with honest staleness signaling, rather than a CPU spike or a stale answer
presented as fresh.

## Conclusion

The engine layer scales well because it is pure and DB-free. The scaling burden
is entirely in **loading, caching, materialization, and queueing** — none of
which Epic 4 needs to build now, but all of which the current design *permits*
because the engines are side-effect-free functions of a hydrated `Matter`. No
structural change to the engines is required to reach 100k; the work is the
surrounding application layer, added when a real datastore lands.
