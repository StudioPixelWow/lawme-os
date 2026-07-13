# ADR-0006 — Matter persistence strategy

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

Epic 4 engines are pure in-memory functions with no persistence. We must decide
what to store, when, and how — consistent with the Dino persistence decision
(defer tables, persist only safe/auditable/useful, minimize private context).

## Decision

**Create no Matter tables now.** When a datastore lands: snapshot the
trend-bearing engine outputs (Health, Score dimensions, Risk, Legal coverage,
Outcome, Progress) as immutable rows; keep current-state rows for the rest;
append-only log state transitions and human-review decisions; scope everything
with per-tenant RLS. Store `engineVersion` + `inputsHash` + `computedAt` (= asOf)
so any assessment is **replayable** and any correction is auditable. Use
snapshotting for outputs and append-only events only for the audit spine — not
full event-sourcing.

## Alternatives

1. **Create tables now** — rejected: freezes a schema against an engine set one
   review away from shared primitives.
2. **Full event-sourcing** — rejected: unnecessary given deterministic replay.
3. **Persist nothing, always recompute** — rejected: loses trend/audit and forces
   recompute in list paths.

## Consequences

- No migration in Epic 4; the engines are already snapshot-friendly.
- Dashboards read materialized snapshots; audit and trend are supported.
- Replay/correction is clean because engines are deterministic.

## Risks

- Deferring means the schema is designed later under some time pressure.
  Mitigation: this ADR + the Persistence Recommendation pre-specify the tables.

## Revisit trigger

When the real matter datastore is introduced and the Score/snapshot contracts are
approved.
