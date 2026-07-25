# Slice 4.0.0 — Legal Reasoning Engine (the core differentiator)

The engine that thinks like a senior lawyer **before** any language model runs.
Given `MatterIntelligence` + `ConversationContext` + `LegalResearchResult`, it
produces one immutable, fully-traceable `LegalOpinion`. The LLM never invents
legal reasoning — the reasoning already exists in this object. No UI, no LLM, no
prompts, no drafting, no actions.

```
Question → Matter Intelligence → Legal Research → LEGAL REASONING ENGINE
        → Legal Opinion → (later) LLM → natural-language answer
```

## Module

`src/modules/legal-reasoning/` (pure, deterministic; reads the reviewed
procedure catalog for legal elements/exceptions/risks — does not modify it or any
prior slice):

- `types.ts` — the `LegalOpinion` and all sub-types.
- `catalog.ts` — resolves the governing procedure and extracts the legal ELEMENTS
  (required facts), statutory EXCEPTIONS, legal RISKS and governing legislation.
- `engine.ts` — `buildLegalOpinion`: the reasoning.

## What the engine determines (all 20)

Issue framing (bound to the governing procedure) · relevant / established /
alleged / disputed / missing facts · **element-by-element (IRAC) analysis** of the
cause of action (each element satisfied / contested / missing, mapped to the
matter's facts) · applicable legislation & case law · conflicts · binding vs
persuasive authorities · authority hierarchy (legislation governs; case law is
subordinate/interpretive) · jurisprudence settled / divided / unsettled /
undetermined · whether more facts are required · whether it can be answered now ·
legal risks (from the cause of action) & practical risks (from the matter) ·
explicit assumptions · a provisional conclusion · confidence anchored to an
explicit scale · exactly which authorities support each element/conclusion ·
and the statements that are **unsupported**.

## Adversarial self-challenge

Before concluding, the engine actively argues against itself across six
categories — **contrary authority, alternative interpretation, procedural
obstacles, jurisdictional limitations, statutory exceptions, factual weaknesses**
— and dispositions each challenge (accepted / rebutted / unresolved). An accepted
or unresolved challenge forces the conclusion to remain provisional and caps
confidence. The opinion is complete only after the strongest opposing argument
has been considered.

## Reasoning principles (enforced)

Every conclusion is traceable to authority ids; every element records its
supporting authorities or is listed as unsupported. If support is insufficient
the engine does **not** conclude (`direction: cannot_conclude`). Conflicts are
shown, never hidden. Missing facts make the conclusion provisional. Uncertainty
is surfaced (assumptions, unsupported statements, an anchored confidence scale) —
never hidden.

## Worked example (fixture pregnancy-dismissal matter)

Elements resolve to: employment_duration ✓, pregnancy_status ✓ (established);
employer_knowledge, permit_status (contested — alleged/disputed);
employment_relationship, dismissal_date, hearing_held (missing). Binding
legislation (חוק עבודת נשים §9, verified); case law undetermined (unverified).
Adversarial challenges raise the statutory permit exception, the unscheduled
strict deadline (procedural), and the unproven elements (factual weakness).
Result: `cannot_conclude` (missing essential elements), `confidence: low`,
`canAnswerNow: false` — an honest, provisional, fully-traceable opinion.

## Success criterion

A future provider adapter receives the `LegalOpinion` **and nothing else**; its
only job is to convert it into excellent Hebrew. The provider never determines
legal reasoning. (Per the STOP list, wiring the adapter to consume `LegalOpinion`
is a later slice — this slice builds the engine only.)

## Tests

`legal:reasoning:test` — 10 tests: issue framing, IRAC element partition,
authority classification + hierarchy + jurisprudence, adversarial self-challenge
across categories, provisional conclusion on missing elements, traceability /
unsupported statements, legal + practical risks, explicit assumptions,
out-of-scope, and deep-immutability + determinism. Lint, typecheck, build pass;
`capability1:freeze-check` passes — no regression.

## Not built

No UI, LLM, prompts, drafting, hearing prep, workflow, or additional providers;
no redesign of Matter Intelligence / Conversation Engine / Legal Research.
