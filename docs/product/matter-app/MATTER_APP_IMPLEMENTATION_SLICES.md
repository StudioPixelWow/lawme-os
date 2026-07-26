# Matter App — Implementation Slices (Epic 5.1)

The safest build sequence for the Matter Room (Reduced Premium first). Each slice:
components, data contract, acceptance test, dependencies, risks, what stays mocked,
what must NOT be built yet. Every slice binds to `MatterProfile` (no new engines).

**Global rule:** no slice ships until it passes the blur test, two-accent law,
one-hero law, zero-overflow at four widths, keyboard + RTL + reduced-motion, and the
forbidden list. UI only — no engine/route/migration changes beyond the new
`/matters/:id` view when Slice 1 lands (founder-approved separately).

### Slice 1 — Static Product Skeleton
- Components: the matter room shell inside the existing OS chrome (SideRail, TopBar,
  Context Dock placeholder), the room layout (hero zone + spine zone + dock).
- Data: none (static fixture identity). Acceptance: renders in the shell, RTL, zero
  overflow at four widths, blur test recognizable. Depends: existing shell components.
- Mocked: all content. Do NOT build: any lens, any live data.

### Slice 2 — Decision Core
- Components: identity seat, state chip, narrative line, review/freshness seals, one
  CTA. Data: `state` identity + `score.summary.posture` + `narrative.headlineHe` +
  `prioritizedActions[0]` + `requiresHumanReview`. Acceptance: five-second test passes
  on blocked + healthy fixtures; one obvious action. Depends: Slice 1.
- Mocked: action execution. Do NOT build: score grid, lenses.

### Slice 3 — Matter Narrative presentation
- Components: narrative variants (compact/standard/detailed) + evidence drawer.
- Data: `narrative` + `sentenceEvidenceMap`. Acceptance: every sentence drills to
  evidence; no unsupported sentence; variant toggle. Depends: Slice 2.

### Slice 4 — Matter Posture & Score Lens
- Components: the diagnostic rail (weakest/strongest), the focused Score Lens.
- Data: `score.dimensions`, `score.summary`. Acceptance: no 12-cell grid by default;
  unavailable ≠ zero; two-accent law. Depends: Slice 2. Risk: resisting the KPI-grid
  temptation — enforce the rail form.

### Slice 5 — Blockers & Next Actions
- Components: the blocker object, the prioritized action list (dock), action gating
  (Class 0–4), assign/due/dismiss/undo. Data: `score.summary.topBlockers`,
  `prioritizedActions`, `state.questions.blocking`. Acceptance: Class-2 shows approval;
  Class-3 never auto-executes; undo works. Depends: Slice 2.

### Slice 6 — Procedure Timeline (the Spine)
- Components: the Milestone Spine (meridian, node states, ◆/▲/⚑), node detail. Data:
  procedure graph + `state.stage`. Acceptance: "where been/is/next/blocks" answered
  from the spine alone; RTL meridian; long + short procedures. Depends: Slice 1.
  Risk: stepper-look — enforce the living spine (breath, dashed future, pulse).

### Slice 7 — Documents & Evidence lenses
- Components: Document Readiness object, Evidence Gap object, the two lenses. Data:
  `matter-document`/`matter-evidence` data + procedure evidence requirements.
  Acceptance: missing-mandatory surfaces on the node + lens; mark-collected (human).
  Depends: Slice 6.

### Slice 8 — Client & Communication lens
- Components: Client Waiting object, communication lens. Data: `matter-client`/
  `matter-communication`. Acceptance: awaiting/policy shown; send is human-gated.
  Depends: Slice 2.

### Slice 9 — Legal Intelligence lens
- Components: the Legal lens (triad coverage, sources, specialist route). Data:
  `matter-legal` + triad. Acceptance: insufficient coverage → requires_review +
  specialist route; candidates labelled unverified; no outcome probability. Depends:
  Slice 4.

### Slice 10 — דינו on-request actions
- Components: the דינו assistant tool surface (TopBar), on-request runs, fail-closed
  no-answer, evidence drawers, draft labelling. Data: Dino pipeline via the app layer
  (bounded context). Acceptance: never auto-runs; fail-closed shown; drafts labelled +
  routed; Esc returns. Depends: Slices 3, 9. Risk: keep it a tool surface, not a chat.

### Slice 11 — Team & Finance role-gated lenses
- Components: Team lens, Finance lens (role/confidentiality-gated, unavailable ≠ zero).
  Data: `matter-team`/`matter-financial` + role. Acceptance: finance hidden for
  unpermitted roles; unavailable renders; no permanent finance space. Depends: Slice 5.

### Slice 12 — Responsive & accessibility refinement
- Recompose for 1024/390 (spine→shelf, lenses→sheets, sticky CTA, dock→drawer);
  IS 5568/WCAG pass; keyboard-only path; reduced motion. Acceptance: RESPONSIVE +
  ACCESSIBILITY docs' gates. Depends: Slices 2–11.

### Slice 13 — Motion & micro-interactions
- The rise-in entrances, the single breathing now-node, hover living-edge, context
  re-aiming. All via motion tokens (reduced-motion inherited). Acceptance: no motion
  outside tokens; one breathing node; no forbidden animation. Depends: Slice 12.

### Slice 14 — Production data integration
- Replace fixtures with the real matter datastore + materialized profile/snapshots
  (per the Scale/Persistence models). Acceptance: single-matter view < ~250ms; stale/
  degraded states honest; RLS enforced. Depends: all prior + the datastore epic.
  Do NOT build before the datastore + persistence are approved.

## What must not be built yet (across all slices)

Persistence/snapshots (until the datastore epic), the Morning-Workspace portfolio
surface, other workspaces, any Design-System change, any new engine, LLM narrative
phrasing, and Class-3 automation. The first four slices (Skeleton → Decision Core →
Narrative → Score Lens) are the prototype that validates the whole direction.
