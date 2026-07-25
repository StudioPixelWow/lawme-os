# Slice 3.2.0 — Dino Experience MVP (first complete user experience)

Connects the existing foundations — Matter Intelligence, the Conversation Engine
and the Legal Research Orchestrator — into the first usable Dino experience: a
lawyer can open Dino from anywhere, ask a legal question, and receive a grounded,
source-attributed answer with a confidence level. This slice adds no new
intelligence; it exposes the existing intelligence, plus the FIRST provider
(Anthropic) adapter.

## Request flow

```
User Question
  → Conversation Engine  (intent, scope, clarifications; matter-aware or general)
  → Matter Intelligence  (loaded + authorized when a matter is in context)
  → Legal Research Orchestrator  (LawME's own verified investigation)
  → Provider Adapter  (Anthropic — prose only, over verified sources)
  → Grounded Response
```

Grounding is decided by **LawME**, not the model: the pipeline computes the
verified `LegalResearchResult` first, and the provider writes only the prose
(executive summary + legal analysis) strictly over the sources handed to it. The
provider **may never query a legal database**.

## Module

`src/modules/dino/experience/`:

- `types.ts` — `GroundedResponse` (the 8 sections), `DinoProvider` (the adapter
  seam), pipeline I/O.
- `pipeline.ts` — `runDinoTurn`: runs the flow and picks the response **mode**.
- `providers/anthropic.ts` — the first model adapter. Consumes only
  ConversationContext + MatterIntelligence (optional) + LegalResearchResult;
  builds an Anthropic Messages request that contains **only the verified
  sources**; reads `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` from the environment
  (never hardcoded); HTTP transport is **injectable** (testable offline);
  validates that every cited `recordId` is one of the provided sources.
- `providers/deterministic.ts` — the fallback: when no key is configured (or the
  model call fails), Dino still answers, stating the **verified findings only**.
- `response-composer.ts` — projects sections 3–8 deterministically from the
  research (source attribution is inherent).
- `failure-modes.ts` — the honest, model-free failure texts.
- `components/dino-conversation.tsx` — the live panel body (client).

## Response modes (never fabricate)

The pipeline chooses one mode and only calls the model in `answered`:

- **answered** — verified authority exists → provider writes the prose; full
  grounded response.
- **no_verified_authority** — research ran but nothing is usable → shows the
  discovery-only sources with an explicit caveat; no model call.
- **needs_facts** — the request is ambiguous or missing facts → asks follow-up
  questions; no model call, no sources surfaced.
- **out_of_scope** — outside the supported domain (labour) → says so; no sources.

An explicit other-domain anchor (ירושה / מקרקעין …) overrides a matter's labour
hint, so an off-topic question on a labour matter is still out of scope.

## Response structure (8 sections)

Executive summary · legal analysis · relevant legislation · relevant case law ·
conflicting authorities · confidence level · sources · follow-up questions. Every
legal statement links back to its source; multiple supporting authorities are
shown together; conflicting authorities are explained, not hidden; discovery-only
(unverified) case law is flagged, never presented as established law.

## The global panel

The reserved shell Dino panel (`AssistantPanel`, opened via ⌘K / the top bar) now
hosts the live `DinoConversation`. Context is derived from the route — no mode is
ever chosen: on `/matters/:id` the context is that matter's intelligence;
elsewhere it is general legal research. It posts to `POST /api/dino/ask`, which
authorizes the actor, loads MatterIntelligence for the matter when present, runs
the pipeline, and returns the `GroundedResponse`.

## Tests

`dino:experience:test` — 9 tests: answered (provider used, sources attributed),
out_of_scope (no provider call), needs_facts (asks for facts), no_verified_
authority (discovery-only, not presented as law), general mode (no matter), the
deterministic fallback, the Anthropic adapter (source-only request, key header,
hallucinated-id filtering) via a fake transport, adapter-unavailable-without-key,
and immutability + determinism. The Conversation Engine was extended to support
general (no-matter) mode (its 10 tests still pass). Lint, typecheck, build pass;
`capability1:freeze-check` passes — no regression.

## Configuration

Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in the deployment
environment to enable model prose. Without it the experience is fully functional
on the deterministic provider (verified findings). No secret is stored in the
repo.

## Not in this slice

No drafting, hearing preparation, workflow actions, or external integrations
beyond the configured legal providers.
