# Founder Review — Matter App Engineering Implementation Plan

Status: complete, awaiting founder approval. **No code — the engineering build plan
only.** HEAD `13cbaa2`. Architecture, Blueprint, and design are frozen; this is the
sprint roadmap that turns them into a shippable Matter App.

## What was produced

`docs/product/matter-app/implementation/`:
- `ENGINEERING_CONVENTIONS.md` — the fixed ground rules: stack, exact folder structure
  (`src/modules/matter/view/**`, route `src/app/(os)/matters/[id]/page.tsx`), the
  **view-model adapter seam** (`MatterProfile → RoomViewModel`), the state store
  (React context + useReducer, mirroring `ShellProvider`), the test harness (Vitest +
  Testing Library + happy-dom for components, Playwright for e2e/visual, a
  `/dev/matter-states` gallery as "stories"), and the **Global Definition of Done**.
- `SPRINT_ROADMAP_PART_1.md` — Sprints 0–12.
- `SPRINT_ROADMAP_PART_2.md` — Sprints 13–26 + the release/parallelization map.
- this review.

## Shape of the plan

**26 sprints**, each ≤ 3 developer-days, each independently mergeable, each ending with
a working, unbroken app, none requiring future redesign. Every sprint defines: Goal ·
Business Value · Files · Components · Types · Hooks · Stores · Tests · Stories ·
Acceptance Criteria · DoD delta · Dependencies · Risk · Estimated Time.

The **adapter seam** is the key engineering decision: the UI is a pure function of a
`RoomViewModel` produced from the already-shipped `MatterProfile`. This lets all 25 UI
sprints run on demo fixtures and isolates the datastore to a single final gated sprint
(26) — nothing UI depends on persistence.

## Milestones

- **A · Walking skeleton (0–4):** reachable matter room, Decision Core, one action,
  evidence — internal review.
- **B · Decision surface (5–10):** score, blockers, spine, deadlines — 5s/30s tests pass.
- **C · Full intelligence (11–18):** all lenses + דינו — 10-minute test passes.
- **D · Production-grade (19–25):** roles, responsive, accessibility, motion, states,
  keyboard, acceptance gates.
- **E · Live data (26):** real matters — **gated on a separate datastore epic.**

## Why a developer can start Sprint 1 immediately

- Every path, component, type, hook, store, and test is named against the real repo.
- The Blueprint fixes every product/visual decision; the conventions fix every
  engineering decision; the adapter fixes the data seam.
- Sprint 0 stands up the harness; Sprint 1 delivers a reachable, RTL, non-broken room on
  demo data. No product question remains open.

## Founder decisions required

1. Approve the **26-sprint plan** and the milestone order.
2. Approve the **engineering conventions** (folder structure, context+useReducer store,
   Vitest+Playwright harness, `/dev/matter-states` gallery instead of Storybook).
3. Confirm that **Sprint 1 may create the `/matters/[id]` route** (the only new route;
   `/today` and existing routes untouched) — this is the first code, so it needs the
   explicit "begin implementation" go-ahead.
4. Confirm the **datastore epic** is scheduled before Sprint 26 (the only persistence
   work).

## Recommended immediate next step

Approve the plan and the product-design freeze commit (Epic 5 + 5.1 + Blueprint +
this plan, all docs), then give the explicit go-ahead to begin **Sprint 0** (harness)
and **Sprint 1** (the walking-skeleton room). No code is written until that go-ahead.

Do not write code. Only the engineering build plan. Wait for founder approval.
