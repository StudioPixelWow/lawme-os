# Morning Workspace V7 — Review Package

**Sprint:** central workspace recomposition (visual reset, not a polish pass)
**Preserved untouched:** navy sidebar, utility rail, logo, routing, typed mock
data, semantic status system, glyphs, a11y + responsive foundations.

---

## 1. What was removed

The entire V6 central presentation layer was deleted (not restyled):

| Removed component | Replaced by |
| --- | --- |
| `morning-hero` (dark hero rectangle) | Today Focus scene — a working object, not a banner |
| `daily-timeline` (standalone section) | timeline integrated inside Today Focus |
| `active-matters-section` (repeated rows) | Matter Operations Board (featured / supporting / queue) |
| `ai-insights-section` (large AI block) | contextual AI marks + Intelligence Drawer |
| `recent-documents-section` (card grid) | Document Shelf — physical work objects |
| `meetings-panel` (generic section) | compact Meeting Prep object inside the Context Dock |
| `finance-panel` (resident dashboard) | executive Finance Strip, chart on expansion |
| `daily-summary-panel` | folded into the Intelligence Drawer |
| `ai-intelligence-panel` (legacy) | — |

## 2. The new composition

A hybrid of the spec's Option A + B: **Today Focus (with embedded timeline)
spanning most of the width, the Context Dock as a floating glass column
beside it**; the Matter Operations Board full-width beneath; then the
Document Shelf, the Finance Strip, and the collapsed Intelligence Drawer.
The first viewport is a complete product scene: contextual header line,
the focal hearing object, its live context, and a visible glimpse of the
board. No greeting banner — the greeting is one quiet line.

## 3. How Today Focus works

A layered scene on the ivory hero surface: a **navy focal object** (the
hearing — countdown, time, location, one champagne CTA + one contextual
action) sits under the **Context Halo**, with the **Gold Meridian**
entering its start edge. Beside it, the **prepared work** — five physical
objects (two documents, a draft, the new precedent, a client update) with
layered paper edges, slightly stacked. Below the object: the context strip
(readiness ring, risk, missing items + action, responsible lawyer).

## 4. Timeline integration

The day flows beneath the scene, connected by a meridian stub. Default:
the last finished event, the glass time-cursor (10:42), the active event
(gold, breathing), the next event, and "כל היום · עוד 3". Expanded in
place: the full day with preparation bars, participants, locations,
linked matters. **Selecting any event re-aims the focal object.**

## 5. The Matter Operations Board

A mixed operational layout, not a Kanban and not rows: one **featured
matter** (large, gold meridian, full anatomy: identity, health signature,
next irreversible event, documents ready, team, AI recommendation, one
action, expandable detail), two **supporting matters** (health chip,
compact track, next event, one issue; hover reveals the action + latest
activity), and a **compact queue** for the rest. Each state carries its
own accent through the semantic status system.

## 6. Matter Health — now visual

`MatterSignature`: the procedural **milestone track is the proceeding
itself** (כתבי טענות → הוכחות → סיכומים → פסק דין), with the matter's
live position as a gold node, missing-item diamond markers, dependency
hourglass, deadline-risk breathing dot, and עמית's mark. Headlined by an
operational state chip — מוכן לדיון / סיכון מועד / ממתין ללקוחה / ממתין
להחלטת הרשם / פער ראיות — each visually distinct. No generic percentage
circle.

## 7. The Context Dock

A floating glass layer (the only permanent glass in the center — live
context), sticky beside the scene on desktop, a sheet-like expander below
`xl`. It re-aims itself at the focused object: matter identity, its
documents, עמית's findings (with source + confidence + action), the
gating facts, team, meeting prep when the context has one, and exactly
one suggested action.

## 8. Contextual AI

No standalone AI block in the center. עמית appears as the small gold mark
inside objects: on prepared drafts, document issues, matter
recommendations, the finance insight. Depth lives in one collapsed
**Intelligence Drawer** (navy) at the end: every finding with its why,
matter, source, confidence and action, plus the day's numbers.

## 9. Documents as physical objects

The shelf: each document is a sheet with layered paper edges beneath it,
a quiet first-lines preview on its face, file-type identity, version,
review progress, signature state and עמית's issue marker. Hover lifts the
sheet off the shelf (Living Edge + reveal of the note/action). The shelf
itself catches their weight with the reflection floor. Snap-scrolling
strip — closer to a premium Finder than a card grid.

## 10. Interaction model

One focus state drives the page: timeline event → re-aims Today Focus;
matter → re-aims the Context Dock + moves the halo; **Esc** returns to
the day's default focus; every selectable object is a real button
(keyboard reachable, `aria-pressed`); hover states reveal secondary
information everywhere; reduced motion collapses via the motion tokens.

## Validation

- `npm run lint` — clean · `npx tsc --noEmit` — clean · `npm run build` — static
- Horizontal overflow **0px** at 1440 / 1280 / 1024 / 390
- Side zones pixel-untouched (no shell file modified except none)
- Full screenshot set + interaction states in `screenshots/`

## Still requires founder review

1. The Context Dock's width balance at 1440 (7:3) — can widen the scene.
2. The prepared-work column density (5 objects) — can trim to 4.
3. Queue hover action ("למעקב ←") — currently revealed on hover only.
4. Whether the finance strip should keep the ₪ trends inline or hide
   them behind the expansion at laptop widths.
5. Mobile: the dock renders as an expander under the scene — a true
   bottom sheet needs a future interaction sprint.
