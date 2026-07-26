# Matter Workspace — Sections, Panels, Collapse States & Drill-Downs (Epic 5)

Every region and panel, its data source, default collapse state, expand behavior,
and drill-down targets. IDs (e.g. `region.header`) are stable references for the
build. All bindings resolve against `MatterProfile`.

Legend — default state: **OPEN** (always rendered), **SUMMARY** (compact by
default, expandable), **COLLAPSED** (header only), **ON_REQUEST** (rendered on
action).

---

## Region A — `region.header` (Matter Identity) · OPEN

Purpose: orient and triage in one line.

Content & binding:
- `header.title` ← `state.titleHe`
- `header.client` ← `state.` client name (matter record); `header.procedure` ←
  procedure type label; `header.domain` ← `state.` legal domain
- `header.stage` ← `state.stage.currentStageTitleHe` + `stageIndex+1/totalStages`
- `header.posture` ← `score.summary.posture` (badge, color per hierarchy §2)
- `header.indicators`:
  - review-required ← `state.requiresHumanReview`
  - confidentiality ← client confidentiality (`privileged` → lock chip)
  - ai-policy ← client `aiPolicy` (`prohibited`/`restricted…` → chip)
  - freshness ← `score.freshness.stale` (+ `computedAt`)
  - degraded ← `state.degraded.hasFailures`

Collapse: none (always open). Drill: click posture → opens Region E grid; click a
confidentiality/AI chip → policy explainer popover.

Actions: refresh assessment (`action.refresh`), open Dino (`action.dino`), matter
menu (rename/close/share — permission-gated; sharing is out of scope for the
attorney role and never performed by AI).

---

## Region B — `region.briefing` (The Narrative) · OPEN

Purpose: the matter states its own situation in professional Hebrew.

Content & binding:
- `briefing.headline` ← `narrative.headlineHe`
- `briefing.currentState` ← `narrative.currentStateHe`
- `briefing.variantToggle` — compact / standard / detailed
  (`buildNarrative` variant); default **standard**.

Collapse: none. Drill: any sentence → provenance drawer (Region I) via its
`sentenceEvidenceMap` entry. Detailed variant reveals per-dimension status lines.

---

## Region C — `region.needs_now` (Needs You Now) · OPEN

Three stacked blocks, each hides itself when empty (no empty widgets):

1. `needs.urgent` ← `narrative.urgentItemsHe` (cap 3). Each item → provenance drill.
2. `needs.deadline` ← nearest strict item of `state.questions.when`
   (sorted by `daysRemaining`); shows label + `relativeDaysHe` + strict flag.
   Drill → `region.deadlines` panel.
3. `needs.blockers` ← `score.summary.topBlockers` (cap 3). Each blocker shows its
   message + a "clear it" affordance linking to the matching action in Region D.

Collapse: whole region collapses to a single count chip ("3 פריטים דחופים") when
the attorney minimizes it; default OPEN. Empty state: region absent when there are
no urgent items, no imminent/overdue strict deadline, and no blockers.

---

## Region D — `region.actions` (Recommended Next Actions) · OPEN

Purpose: convert state into the next decision.

Content & binding: `prioritizedActions` (top 3 shown; "show all N" expands).
Each action card:
- label ← `labelHe`; rank ← `rank`; priority ← `priority`
- owner ← `ownerRoleHe` ("לא ידוע" if unknown — never invented)
- due ← `dueHe` ("לא ידוע" if unknown)
- why ← `reasonHe`; expected effect ← `expectedEffectHe`
- approval ← `requiresHumanApproval` (badge: "טעון אישור")
- clears ← `blockerCodes` (links to the blocker in Region C)

Per-action interactions: accept/mark-done, assign owner, set due, dismiss (with
reason), open detail, "why this?" → provenance. Actions with external effect are
gated (see INTERACTIONS §Action gating). AI never executes an external action
autonomously.

Collapse: SUMMARY (top 3) ↔ expanded (all). Never fully collapsed — the next
action is core.

---

## Region E — `region.score` (Score / Dimension Overview) · SUMMARY

Purpose: the decomposed health of the matter.

Summary form (always in the decision core):
- `score.summaryRow` ← posture + `assessmentCoverage` + a compact strip of the 12
  dimension chips (state color only), weakest/strongest highlighted
  (`score.summary.weakestDimension` / `strongestDimension`).

Expanded form (`score.grid`): the full grid of `score.dimensions`, each cell:
- label ← `labelHe`; state ← `state` (color); numeric ← `numericScore` (only if
  non-null); confidence ← `confidence`; freshness ← `freshness` (stale badge);
  review ← `reviewRoute` (chip).

Collapse: SUMMARY ↔ grid. Drill: click any dimension cell → `panel.dimension`
(Region F) for that dimension.

Rule: `unavailable`/`stale`/`unknown` cells render as themselves (never green,
never a number).

---

## Region F — Intelligence Panels · accordion, each COLLAPSED by default

One panel per intelligence area. Opening a panel is one interaction; each is
independently collapsible. Panels render their engine's structured `data` +
findings + actions; none are shown until opened.

### `panel.dimension` (generic dimension drill-down)
Binding: the selected `score.dimensions[id]`. Shows state, numeric, confidence,
freshness, all findings (code + message + severity), blockers, required actions,
review route, and `sourceAssessmentIds`. Every dimension cell drills here.

### `panel.legal` · Legal & Coverage
Binding: `matter-legal` assessment + triad coverage (`evaluateTriad`) via
`data.triadState`, `data.legislation/caseLaw/procedure`, `data.canRecommend`.
Content: triad three-pillar coverage (legislation / case-law / procedure), source
verification state, "requires specialist review" routing, missing-authority list.
Drill: a cited statute/section → source viewer (ON_REQUEST); case-law candidates
shown labelled "מועמד — לא מאומת". Never shows an outcome probability.

### `panel.evidence` · Evidence
Binding: `matter-evidence` `data` (mandatoryCount, collectedMandatory,
mandatoryMissing, optionalMissingCount). Content: mandatory vs optional checklist,
collected/missing, provenance link into the procedure graph's evidence
requirements. Action: mark collected, attach (attachment is a human action).

### `panel.documents` · Documents
Binding: `matter-document` `data` (stageKind, requiredForStage, missingForStage,
presentCount). Content: stage-required documents, present/missing, filing
readiness. Drill → a document (ON_REQUEST).

### `panel.deadlines` · Deadlines & Timeline
Binding: `matter-deadline` `data.views` + `matter-timeline` `data`
(deadlineTimeline, openedDaysAgo, daysSinceLastComm). Content: chronological list,
overdue/imminent/upcoming/unscheduled, strict flags, basis. Drill: a deadline →
its basis + the action that addresses it.

### `panel.client` · Client & Communication
Binding: `matter-client` `data` (responsiveness, aiPolicy, confidentiality,
daysSinceContact) + `matter-communication` `data` (awaitingResponse, daysSinceLast,
lastDirection). Content: responsiveness, awaiting items, policy constraints, last
contact recency. Action: log contact, send update (send is human-gated — AI drafts
only on request, never sends).

### `panel.team` · Team & Ownership
Binding: `matter-team` `data` (size, hasSupervisor, avgLoad, openTasks,
overloaded). Content: assigned members, supervisor presence, workload, overloaded
flags, unassigned warning. Action: assign/reassign (permission-gated).

### `panel.finance` · Finance · role/confidentiality gated
Binding: `matter-financial` `data` (hasArrangement, billed, collected, outstanding,
currency, writeOffRisk). Content: fee arrangement, billing/collection, write-off
risk. **Visibility gate:** only for roles permitted to see finance and only when
confidentiality allows; otherwise the panel shows "מוגבל להרשאה". If the finance
engine is unavailable, panel shows unavailable (never zero).

### `panel.risk` · Risk Register
Binding: `matter-risk` `data.risks` (five dimensions: procedural/evidentiary/
factual/client/financial), `byDimension`, `topRisk`. Content: risk items grouped by
dimension with severity; overall shown as a band, never a number-as-probability.

### `panel.procedure` · Procedure Graph
Binding: procedure graph (`orderedStages`, `nextStages`) + `state.stage`
(currentStageId, nextOptionsHe, canAdvance). Content: the stage sequence, current
position, allowed transitions with their conditions, prerequisites for advancing.
Drill: a stage → its required facts/evidence/documents/actions and their sources.

---

## Region G — `region.dino` (Ask Dino / Research) · ON_REQUEST

Purpose: on-demand deep legal intelligence. Never auto-runs. See AI_SURFACES.
Content: a prompt/launcher scoped to the matter; pre-filled suggestions derived
from open questions (e.g. "בדוק כיסוי משפטי לסוגיית X"). On run: shows the Dino
result with coverage, limitations, citations, confidence, and the human-review
route; a fail-closed "no sufficiently relevant source" state when coverage is
insufficient. Output is a draft/answer — never an executed action.

Collapse: ON_REQUEST (launcher visible in Region A; results open in a panel/drawer).

---

## Region H — `region.trend` (Trend / History) · COLLAPSED

Binding: `computeTrend(previous, current)` — direction, changed dimensions,
improvement/deterioration reasons. Content: posture over time, per-dimension
movement. Persistence deferred (Epic 4.2 constraint) → today driven by supplied
snapshots/fixtures; the panel renders "היסטוריה תיאסף עם הפעלת השמירה" when no
prior snapshot exists.

---

## Region I — `region.provenance` (Provenance / Audit) · ON_REQUEST (drawer)

Purpose: answer "why?" for any surfaced claim. Opened from any sourced element.
Binding: the element's evidence — `sentenceEvidenceMap` entry (finding codes,
blocker codes, action ids, assessment ids) or a dimension's `sourceAssessmentIds`.
Content: the exact findings/blockers/actions and the engine + version that produced
them; `inputsHash`/`computedAt` when persisted. Shows nothing sensitive beyond the
structured evidence; never raw private documents.

---

## Global collapse behavior

- The **decision core** (A–D + E summary) never collapses below its always-visible
  content.
- Region F panels remember their open/closed state per matter per attorney
  (client-side preference, no server write in Epic 5).
- A "focus mode" collapses all Region F panels to headers, leaving only the
  decision core — the fastest triage view.
- An "expand all" opens every Region F panel for a full read.
