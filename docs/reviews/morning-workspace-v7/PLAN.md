# Morning Workspace V7 — Composition Plan

## The verdict on V6's center
The center was a long document: hero rectangle → seven stacked, equal-width
sections. Every object shared one anatomy (white row, icon, title, meta,
action). Nothing overlapped, nothing responded to focus, and the page read
top-to-bottom like a specification. V7 deletes that model.

## What is preserved
The navy sidebar (start), the utility rail (end), the logo, routing, typed
mock data, semantic status system, glyphs, accessibility and responsive
foundations. Everything between the rails is recomposed.

## Chosen composition (hybrid of Option A + B)

```
┌─ contextual header (one quiet line) ─────────────────────────┐
│ TODAY FOCUS — layered scene            │  CONTEXT DOCK       │
│ · navy focal object (hearing, countdown│  · changes with the │
│   readiness, CTA) with context halo    │    focused object   │
│ · context strip (risk/missing/owner)   │  · documents        │
│ · prepared-work shelf (5 objects)      │  · AI findings      │
│ · integrated timeline (now/next/later, │  · participants     │
│   cursor, expandable to full day)      │  · missing items    │
│                                        │  · meeting prep     │
├─ MATTER OPERATIONS BOARD (full width) ─┴─────────────────────┤
│ featured matter (large, health         │ two supporting      │
│ signature, AI rec, docs, action,       │ matters, stacked    │
│ expandable detail)                     │                     │
│ compact queue strip (remaining matters)                      │
├─ DOCUMENT SHELF (physical objects) ──────────────────────────┤
├─ FINANCE — executive strip (chart on expansion) ─────────────┤
├─ INTELLIGENCE DRAWER (collapsed bar → findings + sources) ───┤
└──────────────────────────────────────────────────────────────┘
```

## Focus model (the interaction core)
One client orchestrator (`TodayWorkspace`) owns a single `focus` value:
a timeline event or a matter. Selecting a timeline event re-aims the
Today Focus scene; selecting a matter re-aims the Context Dock and moves
the halo. `Esc` returns to the day's default focus (the hearing).
The page transforms with focus — it is not a static screenshot.

## Signature system (exactly three)
1. **Gold Meridian** — one thin champagne line connecting Today Focus →
   active timeline event → featured matter → AI-touched information.
2. **Context Halo** — `context-halo` utility: restrained environmental
   light behind the currently focused object only.
3. **Living Edge** — `living-edge` utility: a hairline champagne edge
   appearing only on hover / focus / live state.

## Matter Health → visual signature
A composite `MatterSignature`: milestone track with position cursor,
missing-item markers, risk pulse, team-readiness dots and an operational
state label (מוכן לדיון / ממתין ללקוח / פער ראיות / סיכון מועד / בבדיקה
פנימית / מוכן להגשה) derived from existing mock fields. Readable in two
seconds; no generic percentage circle.

## Removed central components
morning-hero, daily-timeline (as standalone section), ai-insights-section,
recent-documents-section, meetings-panel (folded into Context Dock),
finance-panel (→ executive strip), daily-summary-panel (folded into the
intelligence drawer), active-matters-section (→ operations board),
ai-intelligence-panel (unused legacy).

## Responsive
Desktop: scene + dock side by side. ≤ lg: dock becomes a collapsible
sheet-like panel below the scene. Tablet keeps the board strong. Mobile:
Today Focus → featured matter → compact timeline → shelf as horizontal
strip; no squeezed desktop layout.
