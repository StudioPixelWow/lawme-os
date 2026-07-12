# Dino Intelligence Engine — Overview

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

Dino is LawME's legal-intelligence **orchestrator**, not an LLM, not a
chatbot, not a single prompt. LLMs are replaceable execution providers;
the durable IP lives in a typed 26-stage pipeline of deterministic
modules: classification, matter-context assembly, clarification, research
planning, legal-issue decomposition, source planning, retrieval strategy,
authority validation, contradiction search, coverage evaluation, the
Relevance Gate, evidence assembly, claim planning, controlled drafting,
citation verification, Legal QA, Red Team, confidence, and human-review
routing.

**Intelligence is proven structurally** — through planning, evidence,
verification, stop behaviour and auditability — not through prose.

Entry point: `runDinoPipeline(repositories, request, options)` →
`DinoRunResult` (typed outcome + stage records + artifacts + stop
conditions + decision log). See DINO_PIPELINE_CONTRACT.md.

Baseline: builds on the approved Relevance Gate (commit 78698c7). The gate
remains mandatory and is combined with a coverage/source-plan gate.
