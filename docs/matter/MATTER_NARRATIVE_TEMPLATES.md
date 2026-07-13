# Matter Narrative — Templates & Priority Order (Epic 4.2)

`src/modules/matter/narrative/templates.ts` · `narrative-engine.ts`

## Sentence builders (each carries its evidence)

- `stageSentence(state)` — current stage (from the state machine / readiness).
- `headlineSentence(state, score)` — anchored to posture + dominant concern
  (itself a sourced finding/blocker); on_track → a positive one-liner.
- `findingSentence(engine, finding)` — a finding's `messageHe` as a sentence.
- `blockerSentence(blocker)` — a blocking condition as a sentence.
- `actionSentence(prioritizedAction)` — a recommendation.
- `dimensionStatusSentence(dim)` — one status line per dimension (detailed variant).

Every builder returns `null` when there is no backing source, so an unsupported
sentence is never emitted. `ensurePeriod` gives clean sentence boundaries.

## Narrative priority order (deterministic)

Urgent items are gathered in this order and capped:

1. critical / overdue deadlines
2. blocking procedural state (policy / deadline blockers)
3. missing mandatory evidence / documents (high severity)
4. high legal risk
5. upcoming hearing / filing (imminent deadline / stage)
6. client waiting / communication breach
7. team ownership / workload blocker
8. financial issue
9. opportunity
10. routine progress

## Caps per variant

| Variant | urgent | blockers | missing | actions | limitations | status lines |
|---|---|---|---|---|---|---|
| compact | 1 | 0 | 1 | 1 | 1 | no |
| standard | 3 | 3 | 3 | 3 | 1 | key only |
| detailed | 3 | 3 | 3 | 3 | 2 | all |

The engine emits at most: one headline, one current-state sentence, up to three
urgent items, up to three blockers/missing items, up to three next actions, and a
limitation/review warning where relevant. It does **not** mention every finding.

## Output forms (Phase 11)

- `oneLineHe` — one-line status: headline + the most useful non-repeating follow-up.
- `morningBriefingHe` — current state + urgent + one missing + one action.
- `fullBriefingHe` — headline + state + urgent + blockers + missing + actions +
  limitations.

All three dedupe repeated sentences and derive from the same source assessment ids.
