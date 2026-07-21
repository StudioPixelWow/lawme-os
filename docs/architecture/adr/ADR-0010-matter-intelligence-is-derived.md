# ADR-0010 — Matter Intelligence is derived, not legal truth

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

Matter Intelligence (Matter Profile, Matter Score, prioritized actions, Matter
Narrative, Matter Posture) synthesizes a helpful operational picture of a matter.
It is computed today as a pure function over persisted canonical inputs and is
recomputed client-side (room-store `useMemo`); nothing is cached as truth. The
risk to guard against is treating these synthesized outputs as authoritative
legal conclusions or as source records.

## Decision

Matter Intelligence, Matter Score, Matter Narrative and Matter Posture are
**derived from persisted canonical inputs**. They are decision-support outputs,
**not legal truth** and **not authoritative source records**. They may be
recomputed at any time and must never overwrite the canonical facts, deadlines,
or epistemic statuses they read from.

## Consequences

- Canonical facts remain the single source of truth; intelligence is a lens over them.
- Scores/narratives can evolve (model changes) without data migrations.
- Any surfaced score/narrative must be presented as advisory, never as a finding.

## Rejected alternatives

1. **Persist score/narrative as authoritative fields** — rejected: freezes a
   synthesized opinion as if it were fact and invites stale, misleading truth.
2. **Let intelligence write back "confirmed" facts** — rejected: violates the
   epistemic model (intake/derivation may never produce established statuses).

## Security impact

No new authoritative persisted surface. If any intelligence output is ever cached,
it must carry the tenant scoping of its inputs and be marked non-authoritative;
it must never expose data the inputs' RLS would deny.

## Migration impact

None in this slice. No score/narrative/posture truth columns introduced.

## Future review conditions

Revisit if a feature requires persisting a *point-in-time* intelligence snapshot
(e.g. "what the score was when the attorney decided"). Such a snapshot must be an
explicitly non-authoritative, append-only audit artifact, not a mutable truth field.
