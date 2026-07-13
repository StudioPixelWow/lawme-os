# ADR-0005 — Matter Narrative Engine

Status: Proposed (Epic 4 review) · Date: 2026-07 · Owner: founder decision

## Context

A matter should be able to explain its own state as a concise professional
briefing. The risk is building a chatbot / persona that invents facts or asserts
outcomes.

## Decision

Build the first Narrative Engine as **deterministic template composition** over
the typed `MatterState`. Every sentence traces to a structured finding/action
(`sourceAssessmentIds`); `generatedAt = asOf` (reproducible). It reports legal
*coverage*, never an outcome probability; it never personifies the matter; it
respects the client AI policy; it flags human review when any source assessment
requires it. An optional LLM phrasing layer may come later, strictly downstream,
under Dino's fail-closed drafting rules, sourcing nothing.

## Alternatives

1. **LLM-generated prose v1** — rejected: unreproducible, unauditable, risks
   invented facts/claims; violates the no-claim rule.
2. **No narrative (raw findings only)** — rejected: partners want a briefing, not
   a JSON dump; a deterministic briefing is safe and valuable.

## Consequences

- Reproducible, auditable, provenance-bearing briefings.
- A typed `MatterNarrative` output the UI renders directly.
- Lives in `src/modules/matter/narrative/` (future) as a pure consumer of
  `MatterState`.

## Risks

- Templates can feel rigid. Acceptable for v1; the later phrasing layer addresses
  polish without sacrificing safety.

## Revisit trigger

After v1 ships and partners evaluate readability; before any LLM phrasing layer
is enabled.
