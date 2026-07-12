# Retrieval Orchestrator

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

retrieval/retrieval-orchestrator.ts + query-strategy.ts. Retrieves **per
legal issue**, not once per question, over the EXISTING deterministic
engine (runDbResearch). Preserves score decomposition, the Relevance Gate,
corpus-coverage warnings, and mock-embeddings honesty. Query strategies
are controlled and auditable (canonical term, expansion, type, confidence,
source, meaning-drift risk) — reusing the reviewed expansion dictionary;
no uncontrolled broad expansion. The issue query anchors on the original
question so generic issues still retrieve on the real subject.
