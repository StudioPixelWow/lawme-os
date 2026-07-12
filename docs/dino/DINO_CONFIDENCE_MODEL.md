# Confidence Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

confidence/confidence-engine.ts. Confidence is a decomposed set of factors
(question clarity, matter context, domain, retrieval relevance, evidence/
primary-source coverage, authority quality, source + citation verification,
contradiction resolution, corpus coverage, QA, Red Team) — never one opaque
percentage and NEVER a numerical legal-outcome probability. Bands
(high_within_poc, moderate, low, insufficient_evidence, domain_mismatch,
human_review_required) are chosen by deterministic rules that override the
numeric score. Returns factor breakdown, blocking uncertainty,
human-review flag, and reasons confidence cannot be higher.
