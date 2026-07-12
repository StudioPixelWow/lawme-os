# Pipeline Contract

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

26 stages (`DINO_STAGES`), each producing a `DinoStageRecord`:
stageId · purposeHe · status · started/completed · durationMs · confidence
· warnings · errors · stopConditions · provenance (provider, version,
deterministic rules, policy ids) · artifactType · audit (safe summaries).

Statuses: pending, running, passed, failed, skipped, requires_clarification,
insufficient_evidence, domain_mismatch, requires_human_review,
blocked_by_policy. Blocking statuses + any stop condition halt the pipeline.

Stages: 1 request_intake · 2 intent_detection · 3 matter_context_assembly ·
4 question_classification · 5 domain_classification · 6 clarification_gate ·
7 research_plan · 8 issue_decomposition · 9 required_source_planning ·
10 query_strategy · 11 retrieval · 12 authority_validation ·
13 contradiction_search · 14 coverage_evaluation · 15 relevance_gate ·
16 evidence_assembly · 17 claim_planning · 18 answer_planning ·
19 controlled_drafting · 20 citation_verification · 21 legal_qa ·
22 red_team_review · 23 confidence_evaluation · 24 human_review_routing ·
25 final_output · 26 audit_persistence.

Files: core/pipeline-types.ts, pipeline-stage.ts, pipeline-context.ts,
pipeline-result.ts, request.ts.
