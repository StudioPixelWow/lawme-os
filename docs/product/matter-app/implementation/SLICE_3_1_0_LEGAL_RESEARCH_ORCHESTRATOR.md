# Slice 3.1.0 — Legal Research Orchestrator (verified research pipeline, no AI)

LawME owns the legal-research process **before** any model is connected. This
slice builds the deterministic, adapter-based Legal Research Orchestrator that
decides what to search, where, in what order, how to rank sources, how to detect
conflicts and how to score confidence — with **no LLM**, no chat UI, no answer
generation, no prompt templates. It never writes legal conclusions; it produces
verified, prepared research.

## Module

`src/modules/legal-research/` (pure, deterministic; reuses the in-memory
legal-knowledge corpus, does not modify it or the older dino/research pipeline):

- `types.ts` — the adapter contract (`KnowledgeSourceAdapter`), the one
  `CanonicalSource` shape, `SearchPlan`, and the immutable `LegalResearchResult`.
- `domain.ts` — `classifyLegalDomain` (employment vocabulary; other domains are
  recognized only to mark them out of the corpus scope).
- `entities.ts` — `extractLegalEntities` (laws, sections, courts, judges,
  parties, dates, legal concepts) + topic resolution.
- `plan.ts` — `buildSearchPlans`: one deterministic plan per registered adapter.
- `adapters/legislation.ts`, `adapters/case-law.ts`, `adapters/index.ts` — the
  initial providers; each normalizes its native records into `CanonicalSource`.
- `rank.ts` — multi-signal ranking.
- `conflicts.ts` — conflict detection.
- `orchestrator.ts` — `runLegalResearch`.

## Adapter architecture (no database hardcoded)

The orchestrator searches whatever adapters are registered or injected — it is
provider-agnostic. Initial adapters: **Legislation** (built from the reviewed
`SourceLink`s + permalinks in the procedure catalog, keyed by `E3B-LEG-###`
refIds and the topic→legislation map) and **Case Law** (the in-memory judgment
catalog + authority assessor). Future adapters — regulations, ministry
guidelines, internal knowledge, office precedents, legal articles, contracts,
uploaded documents — implement the same `KnowledgeSourceAdapter` and drop in with
zero orchestrator change (proven by a test that injects a stub adapter).

## Pipeline (8 steps)

1. **Classify** the legal domain.
2. **Extract** legal entities (laws / sections / courts / judges / parties /
   dates / concepts) and resolve topics.
3. **Generate** deterministic search plans (one per adapter).
4. **Execute** searches in parallel (`Promise.all`).
5. **Normalize** every result into the one `CanonicalSource` format (the adapter
   contract).
6. **Rank** by authority, binding force, official source, verification, exact
   section match, recency, citation frequency and lexical relevance.
7. **Detect** duplicate authorities, conflicting rulings, overruled/limited
   precedents, and obsolete legislation.
8. **Produce** one immutable, deep-frozen `LegalResearchResult`.

## LegalResearchResult

Contains: executed searches, matched legislation, matched cases, ranking,
conflicts, confidence (level + score + reasons), coverage (per-pillar +
triad state via `evaluateTriad`), missing information, recommended follow-up
searches, verified citations, and source metadata. It **never** contains a legal
conclusion.

## Honesty (grounded, fail-closed)

Every source carries its verification status and `usableForClaim`. In the current
POC corpus the case-law records are discovery-only (unverified case numbers), so
the orchestrator surfaces them but flags `CASE_LAW_UNVERIFIED` and recommends
`VERIFY_CASE_NUMBERS`; confidence caps at **moderate** (verified binding
legislation) and never asserts a usable holding without verification. An
out-of-scope question yields `confidence: none` and empty matches — never a
fabricated result.

## Success criterion

The Conversation Engine can now receive **MatterIntelligence + LegalResearchResult
and nothing else**. A future Anthropic/OpenAI adapter consumes those two objects
and must never query a legal database directly — the investigation is already
done, verified, ranked and conflict-checked.

## Tests

`legal:research:test` — 7 tests: domain classification (labor vs out-of-scope),
entity extraction, full-pipeline run (binding legislation ranked first, moderate
confidence, verified citation), case-law discovery-only handling + follow-ups,
out-of-scope → no confidence, provider-agnostic adapter injection, and
deep-immutability + determinism. Lint, typecheck, build pass;
`capability1:freeze-check` passes — no regression.

## Not built

No LLM, prompts, streaming, chat interface, or legal answers. Only the verified
research pipeline.
