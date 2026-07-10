# Morning Workspace V4 — Hero, Hierarchy and Operational Focus

**Date:** 2026-07-10 · **Scope:** /today only. No new routes/modules/services; typed mock
data only. **Uncommitted — awaiting founder approval.** Reserved commit message:
"Rebuild LawME Morning Workspace hierarchy and dynamic hero".

## 1. Hierarchy — rebuilt around the day

New order: **dark mission hero → היום ביומן (the day) → התיקים הפעילים (the work) →
contextual AI → documents → meeting preparation (+ daily summary) → finance.**
The timeline now sits directly under the hero, joined by a thin gold bridge line —
the mission literally continues into the day. Matters remain the full-width command
center. Section spacing widened to 80–112px.

## 2. The hero — the iconic LawME entry

No more white hero. A **deep navy environment** (`surface-hero-dark`): warm ivory
light entering from the top-start, a champagne reflection beneath it, blue-black
gradient depth, a refined vignette, gold inner edge — one sun, no decoration.
Composition (one environment, not columns): day signature (breathing gold dot) →
greeting in paper-white → עמית's read of the day with full provenance → **Today's
Mission** → quiet supporting priorities.

## 3. Today's Mission

A navy-glass surface (`glass-navy`: navy pickup, luminous edge, champagne top
highlight) carrying: the mission label «המשימה המרכזית שלך היום», the mission
statement («להגיע לדיון בתיק כהן כשכל חומר הראיות, הפסיקה והטיוטות — מוכנים»),
the countdown (11:30 · בעוד 48 דק׳), the readiness ring (85%, on-navy variant),
required documents, team state, four gating facts each with its next action
(בקש מהלקוח / השווה לתיק / בדוק עכשיו), and **one champagne-metal CTA:
«התחל הכנה לדיון»**. The mission dominates; nothing competes.

## 4. Dynamic hero modes

`HERO_MODES` — four typed scenarios, each with signature, עמית line, mission label,
mission and CTA: **hearing** (rendered), **high-load** (three priorities), **calm**
(drafts + clients), **quiet** (inspirational: "הכול תחת שליטה… תקדים חדש עשוי לחזק
שניים מהתיקים"). `HERO_ACTIVE_MODE` selects; no settings UI.

## 5. Hero ↔ timeline connection

Same hearing, same 11:30, same readiness (85%), same gold accent and court icon in
both; a vertical gold bridge line flows from the hero into the timeline; the
timeline's gold meridian carries the same champagne thread.

## 6. Active Matters + Matter Health

Unchanged as the full-width command center; Matter Health gained an on-navy ring
variant and a direct action on missing documents («בקש מהלקוח ←»).

## 7. Section identities

- **Documents** → Finder-like workspace: sheet objects (type+version tile, name,
  matter, state, owner, hover action, AI note on the contradiction עמית found).
- **Meetings** → preparation view (not a second calendar): prep completeness bar,
  required material, related matter, עמית's one-line prep, action per meeting.
- **Finance** → full-width executive instrument: chart | totals+forecast | one
  contextual AI insight (3.5 unbilled hours → «בדוק ורשום»).
- Timeline/matters/AI keep their distinct instruments. No two sections share anatomy.

## 8. Contextual AI everywhere

Hero mission facts · timeline readiness · matter aiNotes · document contradiction
note · meeting prep lines · finance unbilled-hours insight — each with source,
update time and an action; all marked with the single AIMark.

## Validation

lint ✓ typecheck ✓ build ✓ · zero horizontal overflow at 1440/1024/390 (all routes) ·
RTL verified · logo untouched and verified loading · timeline above matters ✓ ·
hero = strongest element ✓ · reduced-motion via tokens · focus states golden.

## Founder review points

1. The dark hero's height/darkness balance on small laptops.
2. The champagne CTA — bold champagne fill vs. quieter outline.
3. AIIntelligencePanel now lives in the intelligence band — confirm it doesn't
   feel redundant next to the hero's embedded עמית.
4. Mission copy tone (imperative vs. descriptive).

## Screenshots

`docs/reviews/morning-workspace-v4/screenshots/01–13`: desktop full, hero, mission,
hero-intelligence, timeline, matters, matter health, contextual AI, documents,
meetings, finance, tablet, mobile.
