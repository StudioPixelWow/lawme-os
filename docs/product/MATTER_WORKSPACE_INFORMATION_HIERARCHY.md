# Matter Workspace — Information Hierarchy (Epic 5)

Defines exactly what is seen first, what is deferred, and what is never shown.
Grounded in `MatterProfile` = { `state`, `score`, `prioritizedActions`,
`narrative` }.

## 1. The five-second test

Within five seconds of opening a Matter, the attorney must be able to answer:

| Question | Surface | Bound to |
|---|---|---|
| On track, or needs me now? | Posture badge | `score.summary.posture` |
| The single most urgent thing? | Dominant concern line | `score.summary.dominantConcernHe` / `narrative.urgentItemsHe[0]` |
| Is a hard deadline about to bite? | Nearest-deadline chip | first strict item of `state.questions.when` (sorted) |
| What is blocking progress? | Top blocker | `score.summary.topBlockers[0]` |
| What next, who, by when? | Top action | `prioritizedActions[0]` (label, owner, due, approval) |
| Must I review before proceeding? | Review indicator | `state.requiresHumanReview` / `narrative.reviewRoute` |

If any of these six cannot be answered from the unscrolled screen, the hierarchy
is wrong. This is the acceptance test for the decision core.

## 2. Above the fold — never requires scrolling

The **decision core** (Regions A–D and the Region E summary):

1. **Identity & stage** — `titleHe`, client, procedure type, legal domain,
   current stage + `stageIndex/totalStages` (`state.stage`).
2. **Posture badge** — `score.summary.posture` with color semantics
   (on_track→green, needs_attention→amber, at_risk→orange, requires_review→purple,
   degraded→grey-red, blocked→red, insufficient_data→grey).
3. **Status indicators** — review-required, confidentiality (`privileged`),
   AI-policy (`prohibited`/`restricted…`), freshness (stale) — as small chips.
4. **The briefing** — `narrative.headlineHe` + `narrative.currentStateHe`.
5. **Needs you now** — up to 3 `narrative.urgentItemsHe`, the nearest strict
   deadline, and up to 3 `score.summary.topBlockers`.
6. **Recommended next actions** — top 3 `prioritizedActions` with owner, due,
   approval requirement, and expected effect.
7. **Posture/coverage summary** — the one-row dimension state summary
   (`score.summary.assessmentCoverage`, count by state) — the compact form of E.

Nothing in this list is behind a scroll, a tab, or a click. Everything else is.

## 3. Progressive disclosure — one expand or one drill-down away

Shown only when the attorney expands a region or drills into an element:

- **Full dimension grid** (12 + optional) — `score.dimensions`, each with state,
  numeric (where present), confidence, freshness, findings, blockers, actions,
  review route.
- **Per-dimension detail panel** — the dimension's findings, the engine's
  structured `data`, its required actions, and its provenance.
- **Legal coverage detail** — triad breakdown (legislation/case-law/procedure),
  source verification, specialist routing.
- **Evidence & documents** — full checklists, mandatory vs optional, provenance,
  missing-for-stage.
- **Deadlines & timeline** — full chronology, all `state.questions.when`, basis.
- **Client & communication** — responsiveness, awaiting items, policy, last contact.
- **Team** — ownership, workload, supervisor, overloaded members.
- **Finance** — arrangement, billed/collected/outstanding, write-off risk
  (role/confidentiality gated).
- **Risk register** — the five-dimension risk items (`matter-risk` data).
- **Procedure graph** — stages, current position, next options, transitions.
- **Trend** — posture and dimension changes over time (`computeTrend`).
- **Provenance / audit** — `sentenceEvidenceMap`, `sourceAssessmentIds`, engine
  versions, `inputsHash` (when persisted).

Rule: **at most one interaction** to reach any of these from the decision core.
Nothing important is more than one expand/drill away.

## 4. On request only

Runs or reveals only on explicit attorney action:

- **Dino research / drafting / deep issue analysis** — the full pipeline. Never
  auto-run (cost, latency, fail-closed). Launched from Region G.
- **Full source text** of a statute/judgment — opened from a citation.
- **Complete audit trail** — from the provenance drawer.
- **Cross-matter comparisons / portfolio views** — out of the single-matter scope.

## 5. Never shown (at all)

- **Model chain-of-thought / raw reasoning** — none is produced or stored.
- **Any legal-outcome probability** — banned product-wide; the Outcome engine
  emits only a rule-based position band, shown as a band, never a %.
- **Unverified case numbers as fact** — candidates are labelled unverified/
  discovery-only; never rendered as authority.
- **Private client context beyond task need** — governed by the client AI policy;
  a `prohibited` matter shows a manual-handling notice, not AI-derived content.
- **A blended overall percentage** — there is none; posture is categorical.
- **"No risk" / "guaranteed" language** — the narrative forbids it.

## 6. Density & escalation

The decision core is **calm when the matter is calm**: an on_track matter shows a
short positive briefing, an empty blockers area, and one or two routine next
actions — no manufactured warnings. As the matter degrades, the same regions fill
with urgent items, blockers, and limitations, and the posture badge escalates
color. Information density is a function of the matter's real state, never a fixed
dashboard of empty widgets.

## 7. Ordering within each list (deterministic)

- Urgent items: narrative priority order (deadline → blocking → missing mandatory
  → legal risk → hearing/filing → client → team → finance).
- Blockers: kind rank (policy > deadline > evidence/document > fact).
- Next actions: `prioritizedActions` rank (priority × 10, +deadline, +blocking,
  +approval).
- Dimensions in the grid: fixed canonical order (legal, procedure, evidence,
  documents, deadlines, readiness, progress, client, communication, team, finance,
  risk, then optional outcomeReadiness).

Deterministic ordering means the screen is stable across refreshes for the same
matter state — the attorney builds muscle memory.
