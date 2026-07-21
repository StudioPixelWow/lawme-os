# ADR-0009 — Timeline is a derived projection

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

The Matter Timeline presents a chronological view assembled from canonical
records (matter facts, deadlines, participants, documents, activity) and domain
events. A recurring temptation is to persist a dedicated `timeline` table as its
own source of truth. That would create a second writer for information already
owned elsewhere, risking drift between the timeline and the records it depicts.

## Decision

The Timeline is a **pure derived projection**. It is computed from canonical
persisted inputs and events at read time (as the existing `engines/timeline.ts`
does) and is never itself a source of truth. No `timeline` source-of-truth rows
are created, and no migration introduces a timeline table in this slice.

## Consequences

- The timeline can never disagree with the records it projects.
- Timeline changes require no schema migration; they are engine changes.
- Any caching of the projection must be invalidation-safe and clearly non-authoritative.

## Rejected alternatives

1. **Persist a `timeline` table** — rejected: a second writer for facts/deadlines/
   events invites drift and a "which one is correct?" ambiguity that is unsafe for
   legal work.
2. **Materialized view as truth** — rejected for now: acceptable only as a pure,
   invalidation-safe cache, never as the authoritative record.

## Security impact

No new persisted surface, so no new RLS surface to secure. The projection inherits
the tenant scoping of its canonical inputs; it must never widen access beyond what
those inputs' policies already permit.

## Migration impact

None in Slice 2A Part 2. No timeline table, no timeline columns.

## Future review conditions

Revisit only if a concrete requirement (e.g. immutable legal audit trail export)
demonstrably cannot be met by projecting canonical records + events — and even then,
prefer an append-only event log owned by the data layer over a second fact writer.
