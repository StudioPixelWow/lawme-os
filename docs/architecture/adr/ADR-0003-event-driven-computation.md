# ADR-0003 — Event-driven computation

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

Engines are pure `(Matter, asOf)` functions — cheap, but running all 17 for many
matters synchronously (Morning Workspace, dashboards) will not scale. Inputs
change via discrete domain events (document uploaded, deadline changed, message
received, stage changed, day rollover, corpus updated).

## Decision

Adopt **cache + event-driven invalidation** (not full event-sourcing). Each event
maps to the set of engines it dirties (`event → dirty engines`). Cached engine
outputs are invalidated on their events and recomputed lazily on read or eagerly
by a priority worker. Health and Next-Action (pure aggregators) recompute
whenever any component they summarize is dirtied. Day rollover (`asOf` change) is
modeled as an event, keeping engines wall-clock-free and deterministic.

## Alternatives

1. **All-synchronous on every view** — rejected: O(17 × N matters) storms.
2. **Full event-sourcing of the matter** — rejected: unnecessary given
   deterministic replay from the matter record + engine version + asOf.
3. **Time-based recompute only (nightly batch)** — rejected: strict deadlines and
   new events need faster reaction than a nightly cycle.

## Consequences

- Single-matter view cost drops to O(dirty engines).
- List/dashboard reads hit materialized snapshots, not engines.
- Requires an event bus + invalidation map + recompute queue when a datastore
  lands (not in Epic 4).

## Risks

- Recompute storms on broad invalidations (e.g. corpus update dirties Legal for
  all matters). Mitigation: priority queue + concurrency caps + backpressure +
  honest `stale` signaling (see Scale Model).

## Revisit trigger

When the real matter datastore + worker infrastructure is introduced.
