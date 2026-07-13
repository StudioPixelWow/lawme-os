# ADR-0004 — Matter Score model

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

Matter Health rolls up to a status + optional score. The question is whether the
product's headline is one opaque percentage or a decomposed vector.

## Decision

Use a **multi-dimensional, categorical-first** score. Each dimension (Readiness,
Legal, Evidence, Documents, Deadline, Risk, Client, Communication, Finance, Team,
Progress, Outcome) reports a **status** (always), an optional bounded **score**
(null where numeric precision would be false — Legal, Deadline, Client, Outcome),
**confidence**, and **freshness**. Overall status = worst dimension. No opaque
universal percentage is shown as a headline; an aggregate index may exist only as
a labelled sorting aid.

## Alternatives

1. **Single Health percentage** — rejected: false precision; not actionable for a
   legal file; averages away barred claims.
2. **Numeric score for every dimension** — rejected: forces invented numbers for
   inherently categorical judgments (is coverage sufficient?).
3. **Status-only, no scores at all** — rejected: loses useful gradation where a
   ratio is meaningful (evidence collected, progress).

## Consequences

- Explainable, partner-suitable, UI-scannable across many matters.
- `matter_score_dimensions` snapshots become the dashboard/trend read model.
- Health engine stays the roll-up mechanism; the Score Model is its output
  contract.

## Risks

- Slightly more complex UI than one number. Mitigation: worst-status headline +
  drillable dimension chips.

## Revisit trigger

When the Matter Workspace UI is designed, or if partners request a different
triage surface.
