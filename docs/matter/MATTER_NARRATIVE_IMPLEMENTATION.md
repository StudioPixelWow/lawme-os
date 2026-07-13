# Matter Narrative — Implementation (Epic 4.2)

`src/modules/matter/narrative/` · version `matter-narrative-1.0.0`

## What it is

A **deterministic, source-traceable** briefing derived from `MatterState` +
`MatterScore`. It is NOT a chatbot, NOT an LLM, NOT prose invention. Every
sentence maps to structured evidence (finding codes / blocker codes / action ids /
assessment ids). No unsupported sentence can appear.

## Structure

- `types.ts` — `MatterNarrative`, `SentenceEvidence`, `PrioritizedAction`,
  `NarrativeVariant`.
- `formatters.ts` — Hebrew formatters (see MATTER_NARRATIVE_LANGUAGE_RULES).
- `templates.ts` — sentence builders; each returns a `SentenceEvidence` or `null`
  (a sentence with no source is never produced).
- `prioritizer.ts` — deterministic action ranking (see MATTER_ACTION_PRIORITIZATION).
- `narrative-engine.ts` — `buildNarrative(state, score, {variant})` + the three
  render helpers.

## Traceability by construction

Sentences are built from structured items:

- a **finding** → the finding's `messageHe` is the sentence; evidence =
  `[finding.code] + [engine]`.
- a **blocker** → `messageHe`; evidence = `[blocker.code]`.
- an **action** → label; evidence = `[actionId] + sourceAssessmentIds`.

Because sentences *are* structured items, 100% traceability is structural, not a
post-hoc check. `sentenceEvidenceMap` records every sentence with its evidence; the
benchmark asserts 0 unsupported statements.

## Output object

`headlineHe`, `currentStateHe`, `currentStageHe`, `urgentItemsHe`, `blockersHe`,
`missingItemsHe`, `nextActionsHe`, per-dimension status lines (`deadlineStatusHe`,
`clientStatusHe`, `legalStatusHe`, `evidenceStatusHe`, `documentStatusHe`,
`teamStatusHe`, `financialStatusHe`), `opportunitiesHe`, `limitationsHe`,
`confidence`, `reviewRoute`, `generatedAt` (= asOf), `sourceAssessmentIds`,
`sentenceEvidenceMap`.

## Failure & staleness disclosure (never silent)

- A failed engine's dimension is `unavailable`; the narrative's `limitationsHe`
  explicitly says "cannot assess X — data missing". It never says "no risk".
- Missing required facts are named in `limitationsHe`.
- Partial legal coverage → a "specialist review required" limitation.
- Missing owner → "no responsible party assigned".
- Stale dimensions are disclosed.
- Confidence is the **minimum** across cited assessments — conservative by design.

## Variants

`compact` (one-line oriented), `standard` (morning briefing), `detailed` (full
briefing with every status line). Caps per variant keep the briefing concise.
Render helpers: `oneLineHe`, `morningBriefingHe`, `fullBriefingHe` — all derive
from the same narrative object and the same source assessment ids.
