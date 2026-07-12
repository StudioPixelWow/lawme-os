# Claim Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

claims/claim-planner.ts. Atomic claims before drafting. Each: issue id,
proposition, claim type (verified_fact, statutory_text,
regulatory_requirement, extension_order_requirement, judicial_interpretation,
official_guidance, secondary_explanation, inference, recommendation,
unresolved), required/supporting/opposing evidence, factual dependencies,
confidence, safe_to_state + unsafe reasons, wording constraints, citation
requirement, human-review flag. A claim marked unsafe_to_state is never
drafted. Secondary/guidance-only or contradiction-involved or
missing-fact-blocked claims are unsafe.
