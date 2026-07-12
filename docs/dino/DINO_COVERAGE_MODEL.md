# Coverage Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

coverage/coverage-evaluator.ts. Coverage ≠ relevance. Evaluates the source
plan against validated evidence per issue: issues supported/unsupported,
primary-source coverage, binding-authority coverage, current-version
coverage, contradiction-search coverage, factual coverage, corpus-domain
coverage, missing categories/facts. Overall states: complete_for_poc,
partially_covered, insufficient_primary_sources, insufficient_case_law,
insufficient_facts, domain_not_covered, corpus_not_covered,
conflicting_authority, requires_human_research. Returns a coverage matrix.
