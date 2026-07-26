# Matter App — Sprint Roadmap · Part 2 (Sprints 13–24 + Release)

Continues Part 1. Same rules: ≤ 3 dev-days, independently mergeable, working app,
Global DoD applies.

---

## Sprint 13 — Client & Communication lens (Slice 8)

- **Goal:** the Client lens (responsiveness, policy, awaiting items) + the Client
  Waiting object; send/draft are human-gated (Class-2).
- **Business value:** the client's demand on the matter is visible and safe to act on.
- **Files:** `view/objects/lens-client/index.tsx`, `client-waiting.tsx`.
- **Components:** `ClientLens`, `ClientWaiting`.
- **Types:** `ClientVM`, `CommunicationVM`.
- **Hooks:** `useLens('client')`. **Stores:** none new.
- **Tests:** vitest — awaiting/policy states; `aiPolicy=prohibited` suppresses AI content;
  send is Class-2 (draft only, human sends); log-contact is Class-1.
- **Stories:** ClientLens × {responsive, slow, unreachable, awaiting, policy-restricted}.
- **Acceptance:** awaiting items + policy shown; no AI-drafted message is sent; urgency
  is the only color.
- **Dependencies:** Sprint 6, Sprint 7.
- **Risk:** low. **Time:** 2 days.

## Sprint 14 — Legal Intelligence lens (Slice 9)

- **Goal:** the Legal lens — triad coverage (legislation/case-law/procedure), source
  verification, specialist routing; candidates labelled unverified; no outcome %.
- **Business value:** the legal-coverage answer + fail-closed honesty on screen.
- **Files:** `view/objects/lens-legal/index.tsx`, `triad-coverage.tsx`.
- **Components:** `LegalLens`, `TriadCoverage`, `SourceRow`.
- **Types:** `LegalVM` (triadState, pillars, canRecommend, sources).
- **Hooks:** `useLens('legal')`. **Stores:** none new.
- **Tests:** vitest — insufficient coverage → requires_review + specialist route;
  case-law candidates render "מועמד — לא מאומת"; never an outcome probability.
- **Stories:** LegalLens × {triad_complete, insufficient_case_law, requires_specialist_review}.
- **Acceptance:** coverage pillars shown; specialist route on insufficiency; verified vs
  candidate sources distinct; no probability anywhere.
- **Dependencies:** Sprint 6.
- **Risk:** medium — correctness of the fail-closed rendering (safety).
- **Time:** 3 days.

## Sprint 15 — Risk lens + Procedure lens detail

- **Goal:** the Risk register lens (five dimensions, band not %) and the Procedure lens
  (stage requirements + sources: mandatory-law vs practice, never conflated).
- **Business value:** exposure + procedural requirements inspectable.
- **Files:** `view/objects/lens-risk/index.tsx`, `lens-procedure/index.tsx`.
- **Components:** `RiskLens`, `ProcedureLens`.
- **Types:** `RiskVM`, `ProcedureStageVM`.
- **Hooks:** `useLens('risk'|'procedure')`. **Stores:** none new.
- **Tests:** vitest — risk grouped by dimension, shown as band; procedure separates
  mandatory_law from professional_practice; sources cited.
- **Stories:** RiskLens × {low, mixed, critical}; ProcedureLens × {node with mandatory law}.
- **Acceptance:** risk as a band (no number-as-probability); procedure requirements +
  provenance correct.
- **Dependencies:** Sprint 6, Sprint 9.
- **Risk:** low. **Time:** 2 days.

## Sprint 16 — דינו ambient seals (Slice 10a)

- **Goal:** render דינו seals on the exact object each ambient finding is about (coverage
  gap, deadline risk, missing item, contradiction, stale client, missing owner,
  specialist review); silent when nothing actionable.
- **Business value:** ambient, sourced intelligence — the Bible's דינו constitution.
- **Files:** `view/objects/dino-seal/index.tsx`; adapter ambient-findings mapping.
- **Components:** `DinoSeal`.
- **Types:** `DinoFindingVM` (object-ref, finding, why, evidence, action).
- **Hooks:** `useDinoAmbient()`. **Stores:** none new.
- **Tests:** vitest — a seal appears only where a finding exists; one seal per object;
  hover glimpse + click drawer; silence when none.
- **Stories:** DinoSeal × {coverage-gap, deadline-risk, missing-item, silent}.
- **Acceptance:** seals attach to their object, never float; evidence one hover/one click
  away; no seal when nothing actionable; never a toast/chat.
- **Dependencies:** Sprint 4 (drawer), Sprint 9/14 (objects to attach to).
- **Risk:** low. **Time:** 2 days.

## Sprint 17 — דינו on-request assistant + fail-closed (Slice 10b)

- **Goal:** the on-request דינו tool surface (from TopBar/⌘K/`i`): scoped runs, structure-
  true progress, citations, confidence, fail-closed no-answer, labelled drafts; Esc
  returns.
- **Business value:** deep legal work on demand, safely, without leaving the matter.
- **Files:** `view/objects/dino-assistant/index.tsx`, `view/hooks/useDinoRun.ts`;
  wire to the Dino pipeline via a server action with a bounded context package.
- **Components:** `DinoAssistant`, `DinoResult`, `NoAnswerState`.
- **Types:** `DinoRunVM`, `DinoResultVM`.
- **Hooks:** `useDinoRun()`. **Stores:** `dinoRun` state.
- **Tests:** vitest/e2e — never auto-runs; insufficient coverage → no-answer state; drafts
  labelled "טיוטת מחקר…" + review route; never sends/files; Esc returns to the object.
- **Stories:** DinoAssistant × {suggested, running, answer, no-answer, blocked-do-not-proceed}.
- **Acceptance:** explicit launch only; fail-closed shown; draft never executed; a
  bounded context package (not the whole matter) is passed.
- **Dependencies:** Sprint 14, Sprint 4.
- **Risk:** high — pipeline wiring + fail-closed + safety; keep it a tool surface, not chat.
- **Time:** 3 days.

## Sprint 18 — Team & Finance role-gated lenses (Slice 11)

- **Goal:** the Team lens and the Finance lens — finance role/confidentiality-gated,
  unavailable ≠ zero, never permanent space.
- **Business value:** capacity + commercial state for permitted roles only.
- **Files:** `view/objects/lens-team/index.tsx`, `lens-finance/index.tsx`;
  `view/hooks/useRole.ts`.
- **Components:** `TeamLens`, `FinanceLens`.
- **Types:** `TeamVM`, `FinanceVM`, `RoomRole`.
- **Hooks:** `useRole()`. **Stores:** `role` (from server).
- **Tests:** vitest — finance hidden for unpermitted roles; unavailable renders "לא זמין"
  (not 0); no invented balance; team ownership/overload shown.
- **Stories:** FinanceLens × {visible, unavailable, gated-hidden}; TeamLens × {staffed, unstaffed, overloaded}.
- **Acceptance:** finance never occupies permanent space; gating correct; unavailable honest.
- **Dependencies:** Sprint 6.
- **Risk:** medium — gating (privacy). **Time:** 2 days.

## Sprint 19 — Role model + permission gating (cross-cutting)

- **Goal:** apply the full role/visibility matrix (partner/senior/lawyer/intern/office/
  finance/compliance) to every object + default collapse per role; server-derived role.
- **Business value:** each role sees the right first view; privacy enforced.
- **Files:** `view/role/matrix.ts`, integrate `useRole` across objects.
- **Components:** none new (gates existing objects).
- **Types:** `RoleMatrix`.
- **Hooks:** `useRole`, `useVisible(surface)`.
- **Tests:** vitest — the visibility matrix per role; gated surfaces render nothing (not
  "restricted" noise), except finance's single line; confidentiality/AI-policy overlay.
- **Stories:** Room × {partner, lawyer, intern, finance, compliance}.
- **Acceptance:** each role's first view + gating match `MATTER_APP_ROLE_MODEL`.
- **Dependencies:** Sprint 18 and all lens sprints.
- **Risk:** medium. **Time:** 3 days.

## Sprint 20 — Responsive recomposition (Slice 12a)

- **Goal:** tablet 1024 (dock→drawer, rail→icons) and mobile 390 (stack by priority,
  spine→shelf, lenses→bottom sheets, sticky CTA, דינו→sheet).
- **Business value:** the app works on every device; not a shrunken desktop.
- **Files:** responsive variants across objects; `view/objects/sheet.tsx` (bottom sheet);
  dock-drawer.
- **Components:** `BottomSheet`, `DockDrawer`.
- **Types:** none new.
- **Hooks:** `useBreakpoint()`. **Stores:** none new.
- **Tests:** Playwright — zero overflow at 390/1024/1280/1440; mobile order = core →
  deadline → spine → seal → lenses; sticky CTA present; spine is a snap shelf.
- **Stories:** Room × {1440, 1024, 390}.
- **Acceptance:** the four widths pass; the eight five-second answers remain above the
  fold at each; the one action always reachable.
- **Dependencies:** all object sprints (2–18).
- **Risk:** medium — layout. **Time:** 3 days.

## Sprint 21 — Accessibility (Slice 12b)

- **Goal:** IS 5568 / WCAG 2.0 AA: keyboard-only path end-to-end, screen-reader Hebrew
  sentences per surface, state-not-by-color-alone, reduced-motion, focus order/trap,
  contrast.
- **Business value:** legal compliance + real usability; a release gate.
- **Files:** aria/role additions across objects; `view/a11y/labels.ts`.
- **Components:** none new (augment existing).
- **Types:** none new. **Hooks:** none new. **Stores:** none new.
- **Tests:** Playwright + axe — keyboard completes the ten-minute path; SR announces the
  core first; grayscale hierarchy holds; reduced-motion loses no state; AA contrast.
- **Stories:** the gallery gains an "a11y" toggle (grayscale + focus overlay).
- **Acceptance:** the `MATTER_APP_ACCESSIBILITY_REVIEW` gates pass on all three fixtures.
- **Dependencies:** Sprints 2–20.
- **Risk:** medium. **Time:** 3 days.

## Sprint 22 — Motion & micro-interactions (Slice 13)

- **Goal:** wire the Motion + Micro-Interaction blueprints via tokens: rise-in entrances,
  the single breathing now-node, hover living-edge, re-aim, and every micro-state
  (hover/select/pressed/loading/saving/failure/success/blocked/review).
- **Business value:** the premium, functional feel; state legibility through motion.
- **Files:** motion wiring across objects (token classes only).
- **Components:** none new.
- **Types:** none new. **Hooks:** none new. **Stores:** none new.
- **Tests:** Playwright — one breathing node max; reduced-motion collapses all;
  collapse instant / expand rises; no motion outside tokens (lint).
- **Stories:** the gallery plays each micro-state.
- **Acceptance:** `03_MOTION_BLUEPRINT` + `05_MICRO_INTERACTION_BLUEPRINT` gates pass.
- **Dependencies:** Sprints 2–21.
- **Risk:** low. **Time:** 2 days.

## Sprint 23 — State catalog completeness

- **Goal:** implement every remaining screen state: loading (structure-true), empty/new,
  degraded banner, stale, insufficient-data, no-legal-coverage, engine-unavailable,
  disconnected-finance, no-documents, no-deadlines, closed, archived, policy-restricted.
- **Business value:** a new matter never looks broken; a degraded matter never looks
  healthy — both invariants enforced in the UI.
- **Files:** state branches across `room.tsx` + objects; `view/objects/banner.tsx`.
- **Components:** `PartialAssessmentBanner`, `EmptyState`, `ClosedBanner`.
- **Types:** `RoomViewModel.screenState`.
- **Hooks:** `useScreenState()`. **Stores:** none new.
- **Tests:** vitest/Playwright — each of the 18 states from `MATTER_APP_STATE_CATALOG`;
  the two invariants asserted (new≠broken, degraded≠healthy).
- **Stories:** Room × the 18 states.
- **Acceptance:** all catalog states render per spec; the degraded banner is the single
  persistent notice.
- **Dependencies:** Sprints 2–19.
- **Risk:** medium. **Time:** 3 days.

## Sprint 24 — Keyboard completeness + scoped command palette

- **Goal:** the full keyboard model (all shortcuts, RTL-logical arrows, no field
  conflicts) + the matter-scoped ⌘K command modes (run דינו, create task, jump to
  blocker/deadline, open lens).
- **Business value:** keyboard-first operation; a partner triages without the mouse.
- **Files:** `view/hooks/useMatterKeys.ts`; extend the shell `CommandBar` scoped mode.
- **Components:** `MatterCommandMode`.
- **Types:** `KeyMap`.
- **Hooks:** `useMatterKeys()`. **Stores:** none new.
- **Tests:** Playwright — every shortcut in `MATTER_APP_KEYBOARD_MODEL`; no single-letter
  fires in a field; the keyboard-only path completes.
- **Stories:** a "keyboard help" overlay (`?`).
- **Acceptance:** the keyboard model passes; ⌘K scoped commands work.
- **Dependencies:** Sprints 2–17.
- **Risk:** low. **Time:** 2 days.

## Sprint 25 — Product acceptance tests + visual gates

- **Goal:** encode the five-second / thirty-second / ten-minute tests and the automated
  gates (no-false-healthy, 100% traceability, two-accent, one-hero, zero-overflow, blur
  "not-generic") as CI checks.
- **Business value:** the product guarantees become permanent regression gates.
- **Files:** `e2e/matter-app/*.spec.ts`; a two-accent/one-hero screenshot lint.
- **Components:** none.
- **Types:** none. **Hooks:** none. **Stores:** none.
- **Tests:** the full `MATTER_APP_PRODUCT_TESTS` suite, green on the three fixtures at
  four widths.
- **Stories:** n/a.
- **Acceptance:** all product tests pass in CI; failing any is a release blocker.
- **Dependencies:** Sprints 2–24.
- **Risk:** low. **Time:** 2 days.

## Sprint 26 — Production data integration (Slice 14 — GATED)

- **Goal:** replace the demo fixture with the real matter datastore + materialized
  profile/snapshots; RLS-scoped; freshness/degraded honest; performance budget.
- **Business value:** real matters render in the Matter App.
- **Files:** RSC data source swap in `matters/[id]/page.tsx`; a repository +
  materialized-profile reader (from the datastore epic).
- **Components:** none (data only).
- **Types:** none new (adapter unchanged).
- **Hooks:** none new. **Stores:** none new.
- **Tests:** e2e against seeded data; single-matter view < ~250ms; RLS enforced; stale/
  degraded honest.
- **Stories:** n/a.
- **Acceptance:** real data renders identically to fixtures (the adapter is unchanged);
  performance + RLS gates pass.
- **DoD (delta):** the ONLY sprint touching persistence; **gated on a separate founder-
  approved datastore epic** — do not start before it lands.
- **Dependencies:** all UI sprints + the datastore epic.
- **Risk:** high (data/RLS/perf) — isolated to this sprint by the adapter seam.
- **Time:** 3 days.

---

## Release map

- **Milestone A — Walking skeleton (Sprints 0–4):** a reachable matter room with the
  Decision Core, one action, and evidence. Demo-data. Shippable to internal review.
- **Milestone B — Decision surface (Sprints 5–10):** score, blockers, spine, deadlines.
  The five-second/thirty-second tests pass.
- **Milestone C — Full intelligence (Sprints 11–18):** all lenses + דינו (ambient +
  on-request). The ten-minute test passes.
- **Milestone D — Production-grade (Sprints 19–25):** roles, responsive, accessibility,
  motion, states, keyboard, acceptance gates.
- **Milestone E — Live data (Sprint 26):** real matters (gated on the datastore epic).

## Parallelization

After Sprint 6, the lens sprints (11–15, 18) are parallelizable across developers (each
is an isolated object folder + adapter slice). Spine (8–9), דינו (16–17), and the
cross-cutting sprints (19–25) serialize on their dependencies. Sprint 26 is last and
gated.

## Total

26 sprints (0–26), each ≤ 3 dev-days → ~62 dev-days of UI work + 1 gated data sprint.
Every sprint ends with a working, unbroken app and requires no product decision — the
Blueprint is the source of truth.
