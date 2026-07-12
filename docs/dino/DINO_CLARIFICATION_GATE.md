# Clarification Gate

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

clarification/clarification-gate.ts. Dino stops and asks when critical
facts are missing; it NEVER silently invents them. Matter-specific
questions (first-person, or attached to a matter/context) require critical
facts (e.g. pregnancy dismissal → employment_duration, employer_knowledge,
permit_status, dismissal_date, employment_relationship). General legal-
research questions may proceed without them. Returns canProceed,
missingCritical/Optional fields, clarificationQuestions (with "why"),
assumptionsThatWouldBeRequired, prohibitedAssumptions, recommendedNextStep.
