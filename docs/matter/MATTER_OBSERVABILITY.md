# Matter Observability (Epic 4 Architecture Review)

Telemetry and performance budgets for the Matter Intelligence Engine. Consistent
with Dino observability: structured telemetry, one safe line per material
decision, warnings never swallowed, and a strict never-log list.

## Required telemetry (per engine run)

- `engine`, `engineVersion`
- `inputsHash` / inputs version (so a result is traceable to its inputs)
- `event` that triggered the recompute (or `on_demand`)
- `cacheHit` (bool) / `staleAgeMs` when served stale
- `durationMs`
- `status` and completeness `state` (complete/partial/stale/unavailable/blocked)
- `findingsCount`, `actionsCount`
- `requiresHumanReview` and, later, the `ReviewRoute` primary target
- `tenantId`, `matterId`, `correlationId` (one id threads a whole assessment)
- `warnings[]` (surfaced, never dropped)

For an `assessMatter` run, also: total duration, number of engines run vs cached,
overall status, overall Score dimensions, and the worst-status engine.

## Never log

- Secrets or service-role credentials (they never reach these engines anyway).
- Full private/raw documents.
- Privileged legal content or client narrative beyond coded findings.
- Unnecessary client facts — log **counts and statuses**, not fact values
  (e.g. "3 required facts unconfirmed", not the facts themselves).
- Any cross-tenant data in a shared log stream.

The rule: telemetry carries **structure and metadata**, never private substance.
A finding's code and severity are loggable; the Hebrew message may reference a
field name but must not embed privileged detail.

## Performance budgets (server-side, target)

| Path | Budget | How it's met |
|---|---|---|
| Single Matter view (one matter, cached) | ~150–250 ms | read current-state rows + recompute only dirty engines |
| Single Matter full recompute (17 engines, hydrated) | < ~50 ms CPU | pure functions; the cost is loading, not computing |
| Morning-Workspace summary (N matters) | ~300–500 ms | read **materialized** Health/Score snapshots only — never run engines in the list path |
| Batch recompute (per matter, worker) | < ~50 ms CPU | same engines, off the request path, priority-queued |
| Event handling (invalidate → enqueue) | < ~10 ms | map event → dirty engines, mark stale, enqueue |
| Narrative generation (deterministic) | < ~20 ms | template composition over an existing `MatterState` |

The engines themselves are microsecond-to-millisecond (verified: the full
17-engine `assessMatter` over the test fixtures runs in well under the test
suite's budget). Every real-world budget above is dominated by **I/O and
fan-out**, which is why materialization and caching (not engine optimization) are
the levers.

## Decision log & warnings

- One safe line per material decision (stage advance blocked, coverage
  insufficient, strict deadline overdue, policy block) — coded, not prose.
- Warnings (stale inputs, partial assessment, degraded dependency) are always
  emitted and surfaced to the read model; they are never swallowed to make a
  matter look green.

## Correlation & audit tie-in

`correlationId` links an assessment's engine runs, its persisted snapshots, and
any human-review routing into one auditable trace — the same spine as Dino's run
audit, so a matter's history and a Dino answer about that matter can be
cross-referenced without joining private content.
