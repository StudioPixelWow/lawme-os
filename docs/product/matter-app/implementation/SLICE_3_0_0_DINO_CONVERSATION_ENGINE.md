# Slice 3.0.0 — Dino Conversation Engine (AI Orchestration, no AI)

The first Dino Conversation Engine. It does **not** generate answers — it
prepares every future AI interaction, deterministically, with **no AI**: no LLM,
no OpenAI, no Anthropic, no embeddings, no vector search, no prompt templates, no
streaming, no chat UI.

## Objective

Given `MatterIntelligence` (Slice 2.1.0) + conversation history + the current
user message, produce a deterministic `ConversationContext` that fully prepares a
model turn. The success test: connecting a provider is a **single adapter** that
consumes only `ConversationContext.recommendedPromptInputs`.

## Module

`src/modules/dino/conversation/` (pure; consumes the canonical MatterIntelligence
read model, never raw tables):

- `types.ts` — `ConversationContext`, `MatterContext`, `RecommendedPromptInputs`,
  `DinoIntent`, `ConversationScope`, `MatterSection`, `RequiredFact`,
  `MissingFact`, `ClarificationQuestion`, `Answerability`, `ConversationTurn`,
  `ConversationRequest`.
- `intents.ts` — the intent catalog: per-intent He/En keyword surfaces, scope,
  relevant sections, required-fact specs, task label and directive; a
  deterministic `classifyIntent` (keyword scoring + fixed priority tie-break +
  confidence).
- `engine.ts` — `buildConversationContext`: the orchestrator.
- `index.ts` — public surface.

## Responsibilities (all deterministic)

1. **Classify intent** — one of the supported intents (summarize_matter,
   explain_timeline, show_missing_information, explain_participants, explain_facts,
   explain_evidence, explain_deadlines, prepare_for_hearing, draft_request,
   general_question, unknown) by keyword match; empty/no-letters → unknown.
2. **Conversation scope** — whole_matter / single_section / general / unknown,
   plus follow-up detection: a vague follow-up ("ומה עוד?") deterministically
   inherits the prior turn's concrete intent.
3. **Relevant matter sections** — the exact `MatterIntelligence` sections the
   intent needs.
4. **Required + missing facts** — each intent declares required facts (predicates
   over MatterIntelligence); unsatisfied ones become `missingFacts` (blocking or
   not).
5. **Clarification questions** — request-side ambiguity only (unknown intent,
   unnamed draft target, missing hearing target, vague general question).
6. **Canonical context** — an intent-scoped `MatterContext` projection: only the
   relevant sections of MatterIntelligence, plus title/procedure/stage/health.
7. **Confidence** — classification confidence (0–1).
8. **Answerability** — `ready | needs_clarification | insufficient_data |
   out_of_scope` + score + Hebrew reason.
9. **Recommended prompt inputs** — the adapter seam: intent, locale, task label,
   deterministic directives (Hebrew-first, ground-only-in-data, never fabricate,
   distinguish established vs disputed, human approval for side-effecting
   actions), the grounding `MatterContext`, the user message, the conversation,
   open questions, and an `answerable` flag.

No AI calls, no prompts, no model invocation anywhere. The output is deep-frozen
and a pure function of its inputs.

## The single-adapter seam

A future provider adapter takes `recommendedPromptInputs` and maps it to that
provider's message format — that is the only place a model is ever invoked. The
engine already decides *what* to answer, *with which data*, *whether it can be
answered*, and *what to ask when it can't*; the adapter only decides *how to
phrase the call*.

## Tests

`dino:conversation:test` — 10 tests: intent classification across all supported
intents, confidence, summarize (ready + scoped projection + directives), empty-
matter `explain_participants` → insufficient_data, draft clarification vs named
target, show_missing_information always answerable, unknown → out_of_scope,
follow-up intent inheritance, hearing readiness, and deep-immutability +
determinism. Lint, typecheck, build pass; `capability1:freeze-check` passes — no
regression.

## Not built

No LLM, prompt templates, streaming, chat UI, embeddings, search, Workflow, or
automation. Wiring a provider adapter and a chat surface are later slices.
