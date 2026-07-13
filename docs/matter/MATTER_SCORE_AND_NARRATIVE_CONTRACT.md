# Matter Score & Narrative — Combined Contract (Epic 4.2)

The two product contracts and how they compose, for UI and future domains.

## Same source, two views

Both the Matter Score and the Matter Narrative derive from the **same**
`MatterState` and the **same** assessment ids. They can never disagree, because the
narrative reads the score's dimensions and the state's findings/blockers/actions —
never a separate computation.

## The composed profile

`src/modules/matter/profile.ts` → `buildMatterProfile(matter, opts?)`:

```
Matter → assessMatter → MatterState
                         ├─ computeMatterScore(state)   → MatterScore
                         ├─ prioritizeActions(state)     → PrioritizedAction[]
                         └─ buildNarrative(state, score)  → MatterNarrative
→ MatterProfile { state, score, prioritizedActions, narrative }
```

`profileFromState(state)` does the same from an already-computed state.
Backward compatible: `assessMatter` and `MatterState` are unchanged; score,
posture, prioritizedActions, and narrative are **additive**.

## What a Matter can now explain

what is happening (stage + posture) · what is healthy / at risk (dimension states)
· what is missing (findings + limitations) · what blocks progress (blockers) ·
what next (prioritized actions) · who should act (owner roles) · by when (due
hints + deadlines) · why (finding messages) · which findings support the
conclusion (`sentenceEvidenceMap`, `sourceAssessmentIds`) · what is stale/
unavailable (freshness + `unavailableDimensions`/`staleDimensions`) · where human
review is required (`reviewRoute`, `requiresHumanReview`).

## UI-ready contracts (no UI built)

The output supports — without prescribing — a dimension grid, a posture badge, a
segmented/radar overview, a trend indicator, a narrative card, urgent-items and
blockers lists, next actions, freshness, and a review warning. Presentation is
deferred to the Design Bible.

## Invariants (test + benchmark enforced)

- 0 unsupported narrative statements · 100% sentence traceability.
- 0 allegations presented as confirmed facts.
- 0 failed-engine matters marked healthy · 100% blocking-deadline surfaced.
- 100% specialist-review routing when legal coverage is insufficient.
- No opaque overall percentage · no legal-outcome probability.
