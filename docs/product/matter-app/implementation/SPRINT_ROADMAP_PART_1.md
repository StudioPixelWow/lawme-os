# Matter App — Sprint Roadmap · Part 1 (Sprints 0–12)

Read `ENGINEERING_CONVENTIONS.md` first. Every sprint ≤ 3 dev-days, independently
mergeable, ends with a working app, requires no product decision. "DoD" below lists
only the delta beyond the **Global DoD** in the conventions.

---

## Sprint 0 — Test harness, gallery route, adapter contract

- **Goal:** stand up the engineering scaffolding so all later sprints have tests and a
  states gallery; define the view-model seam. No visible product change.
- **Business value:** every subsequent sprint is verifiable and mergeable from day one.
- **Files:** `package.json` (add devDeps + scripts), `vitest.config.ts`,
  `playwright.config.ts`, `src/modules/matter/view/types.ts`,
  `src/modules/matter/view/adapter.ts` (stub + signature), `src/app/dev/matter-states/page.tsx`.
- **Components:** `MatterStatesGallery` (dev-only shell).
- **Types:** `RoomViewModel` (skeleton), `RoomRole`.
- **Hooks:** none. **Stores:** none.
- **Tests:** `adapter.test.ts` (identity stub); a Playwright smoke that `/dev/matter-states` renders.
- **Stories:** the gallery route exists (empty sections per object, to be filled).
- **Acceptance:** `vitest` + `playwright` scripts run; gallery route renders; typecheck green.
- **DoD (delta):** new `test:unit` (vitest) and `test:e2e` (playwright) scripts wired.
- **Dependencies:** none.
- **Risk:** low — harness choices are fixed in conventions.
- **Time:** 2 days.

## Sprint 1 — Matter route + adapter + static room skeleton (Slice 1)

- **Goal:** `/matters/[id]` renders the room layout (canvas + spine zone + dock zone)
  from a fixture `MatterProfile` via the real adapter — static, RTL, in the shell.
- **Business value:** the Matter App is reachable and structurally correct end-to-end.
- **Files:** `src/app/(os)/matters/[id]/page.tsx` (RSC),
  `src/modules/matter/fixtures/demo.ts`, `src/modules/matter/view/room.tsx`,
  `view/adapter.ts` (real mapping for identity + zones), `view/room-store.tsx` (empty
  provider), `view/objects/*/placeholder.tsx` for the three zones.
- **Components:** `MatterRoom`, `RoomCanvas`, `SpineZone` (placeholder), `ContextDock`
  (placeholder), `DecisionCoreZone` (placeholder).
- **Types:** `RoomViewModel.identity`, `.zones`.
- **Hooks:** `useRoom()` (reads store). **Stores:** `MatterRoomStore` (context+reducer, initial state).
- **Tests:** `adapter.test.ts` (identity mapping); Playwright: room renders, zero
  overflow at four widths, RTL zones placed start/end correctly.
- **Stories:** gallery "Room skeleton".
- **Acceptance:** opening `/matters/demo` shows the shell + three labelled zones with the
  fixture matter's name; no overflow; `/today` untouched.
- **DoD (delta):** demo fixture returns a real `MatterProfile` (reuse
  `matter/__tests__/fixtures` shapes, moved/duplicated into `fixtures/demo.ts`).
- **Dependencies:** Sprint 0.
- **Risk:** medium — RSC data flow + RTL zone placement; mitigated by the adapter seam.
- **Time:** 3 days.

## Sprint 2 — Decision Core: identity, posture chip, narrative, seals (Slice 2a)

- **Goal:** the hero renders identity + the **posture state chip (headline)** + one
  narrative sentence + review/freshness seals. No action yet.
- **Business value:** the 1-second answer (posture) and 5-second briefing are live.
- **Files:** `view/objects/decision-core/index.tsx`, `posture-chip.tsx`,
  `narrative-line.tsx`, `seals.tsx`; adapter additions.
- **Components:** `DecisionCore`, `PostureChip`, `NarrativeLine`, `ReviewSeal`,
  `FreshnessDot`.
- **Types:** `RoomViewModel.decisionCore` (posture, headline, seals).
- **Hooks:** `usePosture()`. **Stores:** narrativeVariant in store.
- **Tests:** vitest — chip color/label per posture (7 postures), degraded never renders
  green, seals appear on `requiresHumanReview`/stale; adapter maps `posture`/headline.
- **Stories:** DecisionCore × {on_track, needs_attention, at_risk, blocked, degraded,
  requires_review, insufficient_data, stale, policy_restricted}.
- **Acceptance:** all eight postures render with the correct chip + a sourced narrative
  sentence; two-accent law holds; blur test — the chip is the loudest element.
- **DoD (delta):** posture→token mapping lives in one place (`posture-chip` map).
- **Dependencies:** Sprint 1.
- **Risk:** low.
- **Time:** 2 days.

## Sprint 3 — Decision Core: the one CTA + action model (Class 0/1) (Slice 2b + 5a)

- **Goal:** render the single primary action (verb + owner + due + approval badge) and
  wire Class-0 (view) and Class-1 (optimistic + undo) actions.
- **Business value:** the app now leads to action — the product thesis.
- **Files:** `view/objects/recommended-action/cta.tsx`, `action.tsx`;
  `view/hooks/useMatterAction.ts`; store: optimistic edits + undo stack.
- **Components:** `PrimaryActionCTA`, `ActionRow`.
- **Types:** `RoomViewModel.primaryAction`, `ActionVM` (class, owner, due, approval).
- **Hooks:** `useMatterAction()` (dispatch/undo).
- **Stores:** `edits`, `undoStack` in `MatterRoomStore`.
- **Tests:** vitest — CTA shows owner/due or "לא ידוע"; Class-1 optimistic apply + `u`
  undo; Class-2/3 show gating (approval badge / "מוכן ל־X", no auto-exec).
- **Stories:** CTA × {class0, class1, class2 approval, class3 prohibited, unknown-owner}.
- **Acceptance:** exactly one CTA on the hero; keyboard `a` focuses it, `Enter`
  activates; undo works; no external action auto-executes.
- **DoD (delta):** action gating enforced centrally in `useMatterAction`.
- **Dependencies:** Sprint 2.
- **Risk:** medium — optimistic/undo correctness.
- **Time:** 3 days.

## Sprint 4 — Matter Narrative + evidence drawer (Slice 3)

- **Goal:** narrative variants (compact/standard/detailed) + the evidence drawer
  reachable from any sentence/seal ("why?" / `y`).
- **Business value:** trust — every claim is one interaction from its source.
- **Files:** `view/objects/evidence-drawer/index.tsx`; `narrative` variant toggle;
  `view/hooks/useEvidence.ts`.
- **Components:** `EvidenceDrawer`, `NarrativeVariantToggle`.
- **Types:** `SentenceEvidenceVM`, `RoomViewModel.narrative`.
- **Hooks:** `useEvidence(target)`. **Stores:** `openDrawer` state.
- **Tests:** vitest — every rendered sentence has an evidence target; drawer shows
  source/confidence; Esc returns focus to trigger; no raw private content.
- **Stories:** EvidenceDrawer × {finding, blocker, action, dino-seal}.
- **Acceptance:** 100% of narrative sentences drill to evidence; drawer traps focus,
  `aria-live` announces; variant toggle works.
- **DoD (delta):** drawer never renders chain-of-thought or outcome probability.
- **Dependencies:** Sprint 2.
- **Risk:** low.
- **Time:** 2 days.

## Sprint 5 — Score Lens: diagnostic rail (Slice 4a)

- **Goal:** the Context Dock's Score rail (weakest→strongest) with per-segment state +
  the weakest/strongest call-out. No 12-grid.
- **Business value:** decomposed health without a KPI wall.
- **Files:** `view/objects/score-lens/rail.tsx`, `segment.tsx`; `ContextDock` mounts it;
  adapter score mapping.
- **Components:** `ScoreRail`, `ScoreSegment`, `DockPanel`.
- **Types:** `RoomViewModel.score` (dimensions ordered, weakest/strongest).
- **Hooks:** `useScore()`. **Stores:** none new.
- **Tests:** vitest — ordering weakest→strongest; unavailable renders "לא זמין" (not 0);
  numeric only where measurable; two-accent (only the called-out segment colored).
- **Stories:** ScoreRail × {healthy, mixed, degraded/unavailable, stale}.
- **Acceptance:** rail shows 12 dimensions as segments + a weakest call-out; hover a
  segment shows label+state; no radar, no grid, no traffic-light overload.
- **DoD (delta):** the full 12-grid is NOT built here (only the rail).
- **Dependencies:** Sprint 1 (dock zone).
- **Risk:** low.
- **Time:** 2 days.

## Sprint 6 — Score Lens: focused dimension lens + Score view (Slice 4b)

- **Goal:** clicking a segment opens the dimension's focused lens (findings + actions +
  provenance); a dedicated Score view holds the full 12.
- **Business value:** depth on demand; the "why the posture" answer.
- **Files:** `view/objects/score-lens/dimension-lens.tsx`, `score-view.tsx`;
  `view/hooks/useLens.ts`.
- **Components:** `DimensionLens`, `ScoreView`.
- **Types:** `DimensionVM` (findings, actions, reviewRoute, freshness).
- **Hooks:** `useLens(id)`. **Stores:** `openLensId` (one open at a time).
- **Tests:** vitest — opening a dimension shows its findings; opening another closes the
  first; unavailable dimension shows reason; provenance reachable.
- **Stories:** DimensionLens × {evidence, legal requires_review, unavailable, strong}.
- **Acceptance:** one lens open at a time; the Score view lists all 12 with states;
  every finding sourced.
- **Dependencies:** Sprint 5, Sprint 4 (drawer).
- **Risk:** low.
- **Time:** 2 days.

## Sprint 7 — Blockers + prioritized actions + gating 2/3 (Slice 5)

- **Goal:** the blocker object + the full prioritized-action list (dock), with Class-2
  (approval) and Class-3 (prohibited) gating fully wired.
- **Business value:** "what's blocking + what to do" is complete and safe.
- **Files:** `view/objects/blocker/index.tsx`, `recommended-action/list.tsx`; extend
  `useMatterAction`.
- **Components:** `Blocker`, `ActionList`, `ApprovalGate`.
- **Types:** `BlockerVM`, extended `ActionVM`.
- **Hooks:** `useBlockers()`. **Stores:** none new.
- **Tests:** vitest — top blockers ranked (≤3); a blocker links to its clearing action;
  Class-2 shows "טעון אישור" and requires explicit approve; Class-3 never auto-executes
  and shows "מוכן ל־X" + link; `do_not_proceed` disables the Class-2 affordance.
- **Stories:** Blocker × {policy, deadline, evidence, document, fact}; ActionList ×
  {mixed classes, do_not_proceed}.
- **Acceptance:** blockers surface + rank; completing a blocker-clearing action re-aims
  and can change posture on refresh; no unsafe auto-action.
- **Dependencies:** Sprint 3.
- **Risk:** medium — gating correctness (safety-critical).
- **Time:** 3 days.

## Sprint 8 — Milestone Spine: structure + meridian + node states (Slice 6a)

- **Goal:** render the procedure spine from the graph + `state.stage`: done ● / now ◉
  (gold meridian) / future ○ (dashed); RTL direction; static.
- **Business value:** the room's structure — "where the matter is" — the Bible signature.
- **Files:** `view/objects/milestone-spine/index.tsx`, `node.tsx`, `meridian.tsx`;
  adapter spine mapping from the procedure graph.
- **Components:** `MilestoneSpine`, `SpineNode`, `Meridian`.
- **Types:** `SpineVM` (nodes, currentIndex), `SpineNodeVM`.
- **Hooks:** `useSpine()`. **Stores:** none new.
- **Tests:** vitest — node states map correctly; the meridian sits on the current node;
  RTL order; long (7-stage) and short (3-stage) procedures render.
- **Stories:** Spine × {early, mid, terminal, long, short}.
- **Acceptance:** the spine reads "been/is/next" at a glance; one meridian; RTL correct;
  zero overflow with a long procedure.
- **DoD (delta):** node markers ◆/▲/⚑ deferred to Sprint 9.
- **Dependencies:** Sprint 1.
- **Risk:** medium — RTL spine geometry + long procedures.
- **Time:** 3 days.

## Sprint 9 — Spine: node detail, ◆/▲/⚑ markers, re-aim (Slice 6b)

- **Goal:** node markers (missing-item ◆, blocked-transition ▲, דינו seal ⚑), node-detail
  expansion, and selection re-aim (halo + meridian follow; Esc returns).
- **Business value:** "what blocks the transition" + navigable procedure.
- **Files:** `milestone-spine/markers.tsx`, `node-detail.tsx`; `view/hooks/useSelection.ts`.
- **Components:** `NodeMarkers`, `NodeDetail`.
- **Types:** `SpineNodeVM.markers`, `RoomViewModel.selection`.
- **Hooks:** `useSelection()`. **Stores:** `selectedNodeId`, `focusMode`.
- **Tests:** vitest — ◆/▲/⚑ appear only when real; selecting a node re-aims the core;
  `[`/`]` traverse nodes; Esc returns.
- **Stories:** Node × {clean, missing-item, blocked-transition, dino-finding, selected}.
- **Acceptance:** markers only when data warrants; selection re-aims context; keyboard
  traversal works; the now-node is the hero.
- **Dependencies:** Sprint 8, Sprint 2 (core re-aim).
- **Risk:** medium — re-aim interaction.
- **Time:** 3 days.

## Sprint 10 — Deadline object + Deadline lens

- **Goal:** the Deadline object (the strongest in the language) in the dock + its lens
  (basis, all deadlines), plus the ▲ on the gated transition.
- **Business value:** the nearest hard clock is always visible and explained.
- **Files:** `view/objects/deadline/index.tsx`, `lens.tsx`.
- **Components:** `DeadlineObject`, `DeadlineLens`.
- **Types:** `DeadlineVM`, `RoomViewModel.deadlines`.
- **Hooks:** `useDeadlines()`. **Stores:** none new.
- **Tests:** vitest — nearest strict deadline pinned; overdue/imminent/upcoming/
  unscheduled/disputed states; ties to the spine ▲; `d` jumps to it.
- **Stories:** Deadline × {overdue, imminent, upcoming, unscheduled-strict, disputed}.
- **Acceptance:** an overdue/imminent strict deadline always surfaces in core/spine +
  dock; basis reachable; tabular numerals.
- **Dependencies:** Sprint 5 (dock), Sprint 9 (▲).
- **Risk:** low.
- **Time:** 2 days.

## Sprint 11 — Evidence lens (Slice 7a)

- **Goal:** the Evidence lens (mandatory vs optional, collected/missing, provenance) +
  the Evidence Gap object (◆ on the fact node).
- **Business value:** "what proof is missing" is inspectable and actionable.
- **Files:** `view/objects/lens-evidence/index.tsx`, `evidence-gap.tsx`.
- **Components:** `EvidenceLens`, `EvidenceGap`.
- **Types:** `EvidenceVM`.
- **Hooks:** `useLens('evidence')`. **Stores:** none new.
- **Tests:** vitest — mandatory-missing surfaces on node + lens; mark-collected (Class-1)
  optimistic; provenance links to the procedure requirement.
- **Stories:** EvidenceLens × {complete, missing-mandatory, disputed}.
- **Acceptance:** missing mandatory evidence visible on the spine and in the lens;
  mark-collected updates optimistically.
- **Dependencies:** Sprint 6, Sprint 9.
- **Risk:** low.
- **Time:** 2 days.

## Sprint 12 — Documents lens (Slice 7b)

- **Goal:** the Documents lens (stage-required docs, present/missing, filing readiness) +
  the Document Readiness object (physical-sheet grammar).
- **Business value:** document readiness for the current stage is clear.
- **Files:** `view/objects/lens-documents/index.tsx`, `document-readiness.tsx`.
- **Components:** `DocumentsLens`, `DocumentReadiness`.
- **Types:** `DocumentVM`.
- **Hooks:** `useLens('documents')`. **Stores:** none new.
- **Tests:** vitest — stage-required docs present/missing; type-chip wash; open →
  inspector stub; missing surfaces as ◆.
- **Stories:** DocumentsLens × {ready, missing-required, in-review}.
- **Acceptance:** stage document readiness visible; missing surfaces on the node; no
  full file-manager table.
- **Dependencies:** Sprint 11 pattern.
- **Risk:** low.
- **Time:** 2 days.

---

*Part 2 (Sprints 13–end) covers client/legal/risk/procedure lenses, דינו, team/finance,
roles, responsive, accessibility, motion, states, keyboard, acceptance, and the
production-data integration.*
