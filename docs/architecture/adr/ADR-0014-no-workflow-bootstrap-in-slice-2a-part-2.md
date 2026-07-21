# ADR-0014 — No Workflow bootstrap in Slice 2A Part 2

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

The Workflow Engine owns matter lifecycle progression (currently in-memory,
detection-based). Slice 2A Part 2 hardens Intake Draft persistence and freezes the
canonical Matter-creation direction. There is a temptation to also initialize
Workflow state as part of intake/bootstrap. Doing so now would couple Workflow
initialization to intake before the Bootstrap Engine and identity foundation exist.

## Decision

Slice 2A Part 2 **will not initialize Workflow**. The **Workflow Engine remains the
lifecycle owner** and will be integrated later through a **separately approved
bootstrap policy**. No Workflow rows, no Workflow initialization, and no Workflow
coupling are introduced in this slice.

## Consequences

- Intake Draft hardening stays tightly scoped to draft security and integrity.
- Workflow initialization is deferred to a deliberate, separately reviewed step,
  most naturally as part of the Matter Bootstrap design (ADR-0011).
- No Workflow schema or state is created by 20260717090000.

## Rejected alternatives

1. **Seed Workflow state on draft creation/confirmation** — rejected: couples
   Workflow to intake before Bootstrap/identity exist; premature and hard to unwind.
2. **Persist a Workflow table in this slice** — rejected: out of scope; Workflow
   remains engine-owned until its own approved bootstrap policy.

## Security impact

Neutral. No new persisted Workflow surface, so no new RLS/authorization surface is
introduced here.

## Migration impact

None. 20260717090000 touches only `matter_intake_drafts` and its helper functions.

## Future review conditions

Revisit when the Matter Bootstrap Engine is designed; Workflow initialization is a
candidate step there, under a separately approved policy.
