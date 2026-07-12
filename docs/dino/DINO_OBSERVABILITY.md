# Observability

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

Each run yields a full audit trail: stage records (status, provenance,
rule versions, safe summaries, timings), a decision log (one safe line per
material decision), stop conditions, and warnings (never swallowed —
`DinoRunResult.warnings` equals the union of stage warnings). No model
chain-of-thought is captured. The dev interface renders these artifacts as
collapsible stages with PASS/FAIL/STOPPED/REQUIRES-REVIEW badges. Safe
persistence is deferred (see DINO_PERSISTENCE_DECISION.md); existing
`audit_events`/`research_*` tables are the interim home.
