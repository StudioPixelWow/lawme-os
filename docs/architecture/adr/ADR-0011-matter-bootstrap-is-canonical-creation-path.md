# ADR-0011 — Matter Bootstrap is the canonical Matter-creation path

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

Operational Matters are created from approved source packages (e.g. a confirmed
Intake Draft). Without a single canonical creation path, multiple channels could
each write partial or complete Matters, producing inconsistent Matter state and
bypassing invariants (tenant scoping, required participants/facts, epistemic rules).

## Decision

The **Matter Bootstrap Engine** is the canonical path for creating operational
Matters from approved source packages. **No future Intake channel may
independently write a complete Matter.** Intake produces a reviewable draft; the
Bootstrap Engine is the one place that atomically materializes a Matter from an
approved package.

## Consequences

- Exactly one code path enforces Matter-creation invariants.
- Intake, and any future capture channel, terminate at a draft/approved-package
  boundary and hand off to Bootstrap.
- Atomic multi-table creation requires a single controlled server operation
  (see ADR-0012).

## Rejected alternatives

1. **Let each channel insert Matters directly** — rejected: N writers, N chances
   to violate invariants, no single audit point.
2. **Client-orchestrated multi-insert** — rejected: supabase-js cannot do
   multi-table transactions; partial Matters would be possible on failure.

## Security impact

Concentrating creation in one controlled path lets authorization and audit be
enforced in a single, reviewable place. Direct client creation of complete Matters
is disallowed; the Intake Draft table already blocks direct client confirmation
(see ADR-0012, and migration 20260717090000).

## Migration impact

No Bootstrap engine/RPC is created in Slice 2A Part 2. This ADR freezes the
principle; implementation is gated behind Capability 0.8 (ADR-0013).

## Future review conditions

Revisit when the Bootstrap Engine is designed for implementation. Any proposal to
let another channel write a Matter directly must return to this ADR first.
