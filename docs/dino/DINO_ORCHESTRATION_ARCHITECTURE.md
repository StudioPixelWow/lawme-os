# Orchestration Architecture

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

```
src/modules/dino/
  core/        pipeline contract: types, stage runner, context, result, request
  classification/ intent + question/domain classifiers (deterministic-first)
  context/     matter-context assembler (allegations ≠ facts, provenance)
  clarification/ clarification gate (never invents facts)
  planning/    research planner (structured plan, not an answer)
  issues/      legal-issue decomposer (issue GRAPH with dependencies)
  sources/     required-source planner (substitution law)
  retrieval/   query-strategy engine + retrieval orchestrator (per issue)
  authority/   authority validator (never upgraded by model confidence)
  contradictions/ contradiction engine (never hidden)
  coverage/    coverage evaluator (coverage ≠ relevance)
  evidence/    evidence ledger (no valid anchor → dropped)
  claims/      claim planner (safe_to_state)
  drafting/    controlled drafting (structured artifacts only, mandatory label)
  citations/   citation verifier (broken → blocks claim)
  qa/          Legal QA (blocking gate)
  red-team/    Red Team (structurally separate from drafting)
  confidence/  confidence engine (factors, no outcome probability)
  review/      human-review router
  providers/   provider abstraction (deterministic + mock, no live calls)
  policies/    versioned policy registry
  benchmark/   orchestration benchmark
  tests/       deterministic scenarios A–G + unit tests
  orchestrator.ts  runs the 26 stages, structured stop conditions
```

Every module is a pure function over typed inputs. The orchestrator wires
them, records provenance + rule versions per stage, stops on blocking
conditions, and never swallows warnings or converts failure into a
confident answer. Run modes: deterministic_test, development, future_provider.
