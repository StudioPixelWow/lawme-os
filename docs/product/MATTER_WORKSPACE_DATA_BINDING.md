# Matter Workspace — Data Binding & States (Epic 5)

The exact contract a front-end consumes, so the Workspace can be built with no
further product decisions. Everything binds to one object:

```ts
MatterProfile = {
  state: MatterState,               // assessMatter(matter)
  score: MatterScore,               // computeMatterScore(state)
  prioritizedActions: PrioritizedAction[],
  narrative: MatterNarrative,       // buildNarrative(state, score)
}
```

Produced by `buildMatterProfile(matter)` (`src/modules/matter/profile.ts`). The
Workspace is a **pure function of `MatterProfile`** plus the procedure graph and
(on request) Dino. It performs no computation of its own.

---

## 1. Surface → field map (authoritative)

### Header (Region A)
- title ← `state.titleHe`
- stage ← `state.stage.currentStageTitleHe`, `state.stage.stageIndex`,
  `state.stage.totalStages`, `state.stage.currentStageKind`
- posture ← `score.summary.posture`
- review indicator ← `state.requiresHumanReview`
- degraded indicator ← `state.degraded.hasFailures`,
  `state.degraded.failedEngines[]`
- freshness ← `score.freshness.computedAt`, `score.freshness.stale`
- client name / procedure type / legal domain / confidentiality / aiPolicy ← the
  `Matter` record fields (`state` carries `procedureType`, `legalDomain`; client
  `confidentiality`/`aiPolicy` from the matter's client)

### Briefing (Region B)
- headline ← `narrative.headlineHe`
- current state ← `narrative.currentStateHe`
- stage line ← `narrative.currentStageHe`
- variant ← `narrative.variant` (re-run `buildNarrative` with `{variant}` to switch)
- per-sentence evidence ← `narrative.sentenceEvidenceMap[]`

### Needs You Now (Region C)
- urgent ← `narrative.urgentItemsHe[]`
- nearest deadline ← `state.questions.when[]` (already sorted; first strict/overdue)
  fields: `labelHe`, `dueDate`, `daysRemaining`, `strict`, `state`
- blockers ← `score.summary.topBlockers[]` (`code`, `kind`, `messageHe`) — full set
  in `state.questions.blocking[]`

### Next Actions (Region D)
- list ← `prioritizedActions[]`: `rank`, `actionId`, `labelHe`, `reasonHe`,
  `ownerRoleHe`, `dueHe`, `priority`, `dependencies`, `blockerCodes`,
  `requiresHumanApproval`, `expectedEffectHe`, `sourceAssessmentIds`

### Score (Region E)
- summary ← `score.summary` (`posture`, `dominantConcernHe`, `strongestDimension`,
  `weakestDimension`, `topBlockers`, `topOpportunitiesHe`, `unavailableDimensions`,
  `staleDimensions`, `assessmentCoverage`, `requiresHumanReview`)
- grid ← `score.dimensions[]`: `id`, `labelHe`, `state`, `numericScore`,
  `confidence`, `freshness`, `sourceAssessmentIds`, `findings`, `blockers`,
  `warningsHe`, `requiredActions`, `reviewRoute`, `unavailableReasonHe`,
  `staleReasonHe`

### Intelligence panels (Region F)
Each panel binds to its engine assessment inside `state.engines[]` (match by
`engine` name) and/or the corresponding `score.dimensions[id]`:
- legal ← engine `matter-legal` (`data.triadState`, `data.canRecommend`,
  `data.legislation/caseLaw/procedure`, `data.factsConfirmed`)
- evidence ← `matter-evidence` `data`
- documents ← `matter-document` `data`
- deadlines ← `matter-deadline` `data.views` + `matter-timeline` `data`
- client ← `matter-client` `data` + communication ← `matter-communication` `data`
- team ← `matter-team` `data`
- finance ← `matter-financial` `data` (visibility-gated)
- risk ← `matter-risk` `data.risks`/`byDimension`/`topRisk`
- procedure ← procedure graph (`EMPLOYMENT_PROCEDURES`/graph helpers) keyed by
  `state.procedureType` + `state.stage`
- generic dimension drill ← `score.dimensions[id]`

### Dino (Region G)
- launched via the application layer with a bounded context package derived from
  `state` (facts + identity + policy); returns a Dino result object rendered with
  coverage, confidence (`ConfidenceReport`), citations, limitations, review route.

### Trend (Region H)
- `computeTrend(previousScore, currentScore)` → `direction`, `changedDimensions`,
  `improvementReasonsHe`, `deteriorationReasonsHe`.

### Provenance (Region I)
- for a sentence ← its `sentenceEvidenceMap` entry (`findingCodes`, `blockerCodes`,
  `actionIds`, `assessmentIds`)
- for a dimension ← `sourceAssessmentIds` + `findings[].code`
- engine identity ← `state.engines[].engine` + `engineVersion`

---

## 2. State machine of the screen

| Screen state | Trigger | Render |
|---|---|---|
| loading | profile not yet computed | skeletal header + "מעריך את התיק…"; no values |
| ready | `MatterProfile` resolved | full decision core + panels |
| degraded | `state.degraded.hasFailures` | banner naming failed engines; affected dimensions `unavailable`; posture ≠ on_track |
| stale | `score.freshness.stale` | freshness chip + refresh; stale dims never strong |
| policy-restricted | client `aiPolicy = prohibited` | manual-handling notice; AI surfaces suppressed; non-AI data (identity/stage/deadlines/facts) still shown |
| empty-of-concern | on_track, no blockers/urgent | calm core: positive briefing, no empty widgets |

Every state is derivable from `MatterProfile` fields above — no extra flags needed.

## 3. Refresh & freshness semantics

- Refresh = recompute `buildMatterProfile(matter)` (deterministic; no external
  call). `computedAt` = `matter.asOf`.
- The Workspace shows `computedAt` and, when the underlying inputs changed since,
  `stale = true`. (Event-driven invalidation and materialized snapshots are the
  Execution/Scale-model's job; the Workspace only reads freshness.)

## 4. Performance expectations (from the Scale Model)

- Single-matter view: read a materialized profile / recompute only dirty engines;
  target < ~250 ms server-side.
- The list/portfolio path (Morning Workspace) reads materialized
  Health/Score snapshots, never runs engines synchronously — out of this screen's
  scope but guaranteed by the same contracts.

## 5. Build checklist (definition of done for the UI, later)

A Matter Workspace build is complete when: every Region A–I surface binds to the
fields above; the six five-second questions are answerable unscrolled; every AI
claim drills to provenance; degraded/stale/policy-restricted states render per §2;
IS 5568 / RTL accessibility (INTERACTIONS §5) is met; and no surface computes
anything the engines don't already provide. No product decision remains — only
visual design, owned by the Design Bible.
