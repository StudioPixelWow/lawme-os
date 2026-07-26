# Matter App — Engineering Conventions (shared across all sprints)

The fixed engineering ground rules so every sprint is unambiguous and a developer can
start Sprint 1 without a decision. These are frozen alongside the Blueprint.

## Stack (already in the repo)

- Next.js 16.2 (App Router, RSC, Turbopack) · React 19 · TypeScript strict · Tailwind
  v4 · Node 22 native TS (no enums, no constructor param-properties, explicit `.ts`
  import extensions).
- Design system: `src/design-system/**` (primitives, patterns, tokens, icons).
- Shell: `src/modules/shell/**` (AppShell, SideRail, TopBar, UtilityRail, CommandBar,
  AssistantPanel, ShellProvider) — **reuse, never fork**.
- Intelligence: `src/modules/matter/**` → `buildMatterProfile(matter): MatterProfile`.

## Where the Matter App lives

```
src/app/(os)/matters/[id]/page.tsx        ← the room route (RSC)
src/modules/matter/view/                  ← ALL Matter App UI
  adapter.ts                              ← MatterProfile → RoomViewModel (pure)
  room-store.tsx                          ← client store (context + useReducer)
  types.ts                                ← view-model + store types
  hooks/                                  ← useRoom, useLens, useMatterAction, …
  objects/                                ← the product objects (one folder each)
    decision-core/ milestone-spine/ score-lens/ deadline/ blocker/
    recommended-action/ dino-seal/ evidence-drawer/ lens-*/ …
  room.tsx                                ← the room layout composing objects
src/modules/matter/fixtures/demo.ts       ← demo MatterProfile(s) for dev (pre-datastore)
src/app/dev/matter-states/page.tsx        ← the "stories" gallery (every object × state)
```

Rule: the view **computes nothing**. It reads a `RoomViewModel` produced by
`adapter.ts` from `MatterProfile` + procedure graph. No business logic in components.

## The view-model adapter (the seam)

`adapter.ts` is a **pure function** `toRoomViewModel(profile, procedureGraph, role):
RoomViewModel`. It flattens the eight five-second answers, the spine nodes, the score
rail, the lenses, and the prioritized actions into presentation-ready shapes (already
localized Hebrew from the engines). Swapping fixtures → datastore changes only the RSC
data source, never the adapter or the components. This is what keeps every UI sprint
independent of the datastore epic.

## State management (no new heavy dep)

- **Server data:** RSC fetches `MatterProfile` (fixture provider now, datastore later)
  and passes the `RoomViewModel` down.
- **Client view-state:** a `MatterRoomStore` = React **context + useReducer** (mirrors
  the existing `ShellProvider` pattern) holding: `openLensId`, `selectedNodeId`,
  `focusMode`, `narrativeVariant`, optimistic edits + undo stack. No Redux, no Zustand
  (kept out unless a later sprint proves a need).
- Keyboard/focus continues to flow through the shell's `ShellProvider`; the room store
  handles room-local state only.

## Test harness (added in Sprint 0)

- **Unit/logic:** `node:test` (already used) for `adapter.ts` and pure helpers.
- **Component:** add **Vitest + @testing-library/react + happy-dom** (devDeps) —
  `*.test.tsx` under each object folder. (Rationale: RSC-friendly, fast, no browser.)
- **Interaction/e2e + visual:** add **@playwright/test** — flows + the acceptance tests
  (five-second/thirty-second/ten-minute), plus the two-accent / one-hero / zero-overflow
  screenshot lints.
- **"Stories":** the `/dev/matter-states` gallery route renders every product object in
  every state (from `05_MICRO_INTERACTION` + `STATE_CATALOG`). Storybook is **not**
  added (avoids a heavy dep); the gallery is the canonical state reference and the
  visual-test source. (Storybook remains an optional later swap.)

## Global Definition of Done (applies to EVERY sprint)

A sprint is done only when ALL hold:
1. `npm run lint` · `npm run typecheck` · `npm run build` all green.
2. All existing suites still green (`intelligence:test`, `matter:test`, `dino:test`,
   `legal:triad:test`, `legal:poc:test`, `legal:corpus:test`) + the sprint's new tests.
3. The app **runs and is not broken** at `/matters/[id]`, `/today`, and `/dev`.
4. Zero horizontal overflow at 390/1024/1280/1440 (Playwright gate).
5. RTL correct (logical properties only; no `left/right`), reduced-motion safe, focus
   visible (gold ring).
6. Two-accent law + one-hero law hold for any new surface (screenshot lint).
7. Every new surface binds to a real `RoomViewModel` field (no invented data).
8. No Design-System token added ad-hoc; new needs go through the tokens.
9. The `/dev/matter-states` gallery covers any new object's states.
10. Independently mergeable to `dev-preview`; the PR leaves `main`/`/today` untouched.

## Naming & structure rules

- One object = one folder under `view/objects/` with `index.tsx`, `*.test.tsx`, and its
  states in the gallery.
- Components are RSC by default; add `"use client"` only for interactive objects.
- Props are `RoomViewModel` slices, never raw `MatterProfile`.
- Hebrew strings come from the engines/adapter; no hard-coded UI copy beyond static
  chrome labels (which live in one `strings.ts`).

## Estimation & mergeability

- Every sprint ≤ **3 developer-days**, independently mergeable, ends with a working app.
- Sprints are ordered so each builds only on merged predecessors; parallelizable sprints
  are marked. No sprint requires future redesign (the Blueprint is frozen).

## What is explicitly out of every UI sprint

New engines, Design-System changes, persistence/migrations (until the datastore sprint),
LLM narrative, Class-3 automation, other workspaces. The datastore/persistence is a
single late sprint gated on a separate founder-approved data epic.
