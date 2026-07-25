# Slice 2.0.0 — Matter Workspace (Product Foundation)

The first user-facing LawME screen. A calm, premium, read-only Matter Workspace
built **entirely from existing Capability-1 data** — no Workflow, no AI logic, no
Dino, no search, no email, no automation. Capability 1 (Bootstrap) is treated as
a frozen platform dependency and is not touched.

## Architecture

A dedicated, self-contained module `src/modules/matter/workspace/` layered so the
logic is pure and unit-tested and the data read is authorized and server-only.
The frozen Bootstrap code, the prior `matter/view` "room", and `hydrateMatter`
are **not modified**.

- `types.ts` — the view-model contract + the DB-decoupled row inputs. No React,
  no Supabase, no design-system imports.
- `present.ts` — a **pure, deterministic** presenter (`buildWorkspaceView`). All
  grouping / ordering / bucketing / priority / timeline rules live here; the
  reference "now" is always passed in (no wall clock). Unit-tested.
- `loader.ts` — the **authorized, server-only** read. Evaluates the `matter.read`
  resource-authorization decision BEFORE any content is loaded (same policy as
  the room), then reads only persisted Capability-1 tables through the
  **authenticated (RLS) client** — never a service client, never `DEMO_SEED`.
- `fixtures.ts` — a deterministic demo matter (+ an empty-matter fixture) for the
  dev preview and the tests.
- `components/` — server-rendered React sections (no client JS; expandable facts
  use native `<details>`), composed by `matter-workspace.tsx`.

Every surface is a pure function of persisted data. Nothing is computed in the
view; the loader maps rows → presenter input → view-model → components.

## The eight sections

1. **Matter Hero** — navy identity band: title, procedure type, legal domain,
   stage, client, responsible lawyer, created date, status, **priority**, and
   confidentiality. (`components/hero.tsx`)
2. **Timeline** — the Activity Timeline (`matter_activity`), grouped by Jerusalem
   day, **newest first**, seeded by the Bootstrap event. Future-ready for
   Workflow. (`components/timeline.tsx`)
3. **Facts** — grouped by **epistemic status** (established / alleged / disputed /
   unknown); an allegation is never shown as established. Each fact expands to its
   source. (`components/facts.tsx`)
4. **Participants** — grouped by role in a fixed order (client → opposing party →
   … ), linked to `contacts`. (`components/participants.tsx`)
5. **Documents** — latest-first, capped, preview-ready affordance. (`components/documents.tsx`)
6. **Evidence** — split mandatory / optional with a collected count; future-ready.
   (`components/evidence.tsx`)
7. **Deadlines** — bucketed overdue / upcoming / unscheduled / completed; the
   nearest actionable deadline is derived. (`components/deadlines.tsx`)
8. **AI panel placeholder** — a reserved gold region for דינו. **UI only** — no
   chat, no pipeline, no model, no auto-run. (`components/ai-panel.tsx`)

## Routes, state, API

- **Production route** `src/app/(os)/matters/[id]/page.tsx` — server component,
  `force-dynamic`. Resolves the actor (`tryGetServerActorContext`) + RLS client
  (`getServerAuthClient`), authorizes, loads via `loadMatterWorkspace`, renders
  `<MatterWorkspace/>` inside `<Workspace width="wide">`. A denial/absence →
  `notFound()` (uniform, no enumeration).
- **Loading** `src/app/(os)/matters/[id]/loading.tsx` — a structure-true skeleton
  mirroring the hero band + two-column canvas.
- **Error / not-found** — inherited from the `(os)` boundary (`error.tsx`) and the
  uniform `notFound()`.
- **Dev preview** `src/app/dev/matter-workspace/page.tsx` — renders the same
  components from the fixture (no auth, no DB) for review/screenshots. Gated out
  of production (`LAWME_DEV_TOOLS=1` escape hatch). `?state=empty` shows the
  brand-new-matter state.
- **State** — server-rendered; no client store, no browser storage. The only
  interactivity is native `<details>` disclosure (zero JS).
- **API usage** — no new endpoints. Reads go directly through the authorized
  loader (Supabase RLS client) — matching the existing room read pattern.

## States (calm doctrine)

- **Empty** never looks broken: each empty section shows a purposeful one-line
  invitation; unknown client/owner render **"לא ידוע"** (never fabricated); the
  timeline still carries the Bootstrap event.
- **Loading** is a structure-true skeleton (no shimmer race; the shell never
  skeletons).
- **Priority** is **derived** from real strict deadlines (overdue-strict → דחוף,
  imminent-strict ≤7d → גבוה, else רגיל) — a transparent computation over real
  data, not a fabricated stored field.

## Tests

`src/modules/matter/workspace/__tests__/present.test.ts` (script
`npm run matter:workspace:test`, 11 tests): Jerusalem day math, hero + derived
priority, facts epistemic grouping (established never contains allegations),
participant role grouping, document latest-first + cap, evidence mandatory/
optional + collected count, deadline bucketing + nearest, timeline day-grouping
newest-first, empty-never-broken, and determinism. Full
`capability1:freeze-check` passes (no regression); one identity route-guard test
was updated to assert the new authorized workspace loader + no service client.

## Decisions & flags for founder review

- **Composition** — the brief lists 8 sections; the docs' richer "room" (spine +
  decision core + dock lenses) is intentionally simplified for this first slice.
  Deadlines are placed near the top (the design docs call the deadline the
  strongest object), then timeline/facts/documents in the main column, with
  participants/evidence/AI in the rail. Founder's 8-section brief was followed
  over the richer doc composition (founder precedence).
- **"Completed" deadlines** — `matter_deadlines` has no completion field, so the
  Completed bucket is modeled and future-ready but renders only when populated
  (calm-when-calm). Surfacing completed deadlines needs a completion signal
  (a later slice).
- **Priority** — no `matters.priority` column exists; derived from deadlines as
  above rather than invented.
- **Names** — client/lawyer display names come from `contacts` / `profiles` via
  the RLS client; if withheld they render "לא ידוע", never fabricated.
