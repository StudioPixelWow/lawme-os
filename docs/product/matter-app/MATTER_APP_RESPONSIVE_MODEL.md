# Matter App — Responsive Model (Epic 5.1)

Per the Design Bible §8: never a shrunken desktop — mobile is recomposition. Zero
horizontal overflow at 390/1024/1280/1440 is a release gate. RTL throughout.

## Desktop 1440+ — full Matter Room
- Navy SideRail (`w-64`) · glass TopBar · canvas (`max-w-wide 82rem`) · Context Dock
  (`w-72`, end/left).
- Decision Core (hero) + Milestone Spine + Context Dock (Score rail, nearest deadline,
  presence, collapsed lenses). One open lens at a time.

## Laptop 1280 — compact fixed zones
- SideRail `w-64`; Context Dock stays but narrows; canvas padding tightens
  (`px-5`). The Decision Core and Spine keep full width; lenses open as overlays over
  the dock rather than beside it if space is tight.

## Tablet 1024 — collapsed navigation, dock → drawer
- SideRail collapses to the icon rail (`w-20`); the Context Dock becomes a **drawer**
  (a right/end sheet) toggled from the TopBar. The **Decision Core is preserved** at
  full prominence; the Spine remains the structure; lenses open as sheets. Bottom nav
  hidden (Bible: md → icon sidebar).

## Mobile 390 — recomposition (stack by priority)
Order (per the brief):
1. **Decision Core** (identity + state chip + narrative + sticky one action)
2. **Urgent action** — the CTA is a **sticky bottom button**
3. **Deadline** — the nearest strict deadline object
4. **Narrative** — expandable to standard/detailed
5. **Blockers** — on the current node
6. **Next actions** — a short list
7. **Timeline** — the Spine as a **horizontal shelf** (snap scroll), now-node centered
8. **Intelligence lenses** — an **accordion**; each opens a **bottom sheet**

Element transforms on mobile:
- Milestone Spine → horizontal shelf with snap; the ◉ now-node centered on load.
- Score Lens → horizontal segmented rail (weakest/strongest called out); full grid in
  a sheet.
- Intelligence lenses → accordion headers → bottom sheets.
- דינו assistant → bottom sheet (trigger button); seals stay inline on objects.
- The one primary action → sticky bottom action bar (always visible).
- Deadline → a pinned strip under the core when strict/imminent.
- Provenance → bottom sheet.
- Focus mode → full-screen focus view for a single object; Esc/back returns.

## What becomes what (summary)

| Element | 1440 | 1024 | 390 |
|---|---|---|---|
| SideRail | full `w-64` | icon `w-20` | hidden (top ⌘K) |
| Context Dock | fixed column | drawer | inline accordion + sheets |
| Milestone Spine | vertical spine | vertical spine | horizontal shelf (snap) |
| Score | rail + lens | rail + sheet lens | segmented rail + sheet |
| Lenses | dock, one open | sheets | accordion → bottom sheets |
| Primary action | in core | in core | sticky bottom button |
| דינו assistant | TopBar tool | TopBar tool | bottom sheet |

## Release gates (all four widths)

Zero horizontal overflow; the eight five-second answers remain above the fold at every
width; the one primary action is always reachable without scrolling; the spine is
navigable (vertical or shelf); no desktop layout is merely scaled down.
