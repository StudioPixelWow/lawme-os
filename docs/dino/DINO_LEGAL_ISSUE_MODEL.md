# Legal Issue Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

issues/issue-decomposer.ts. Deterministic issue templates per subdomain,
instantiated against the matter context into an issue **GRAPH** (not a
flat list) with dependency edges — e.g. pregnancy dismissal:
protected_status → permit_requirement / hearing_duty / discrimination →
remedies. Each issue: type, legal elements, required/available/missing/
disputed facts, burden of proof, source-requirement ids, authority
threshold, risk, dependencies, resolution. Generic fallback for
in-domain questions without a specific template.
