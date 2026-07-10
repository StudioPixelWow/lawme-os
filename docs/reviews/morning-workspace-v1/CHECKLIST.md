# Morning Workspace V1 — Validation Checklist

- [x] `npm run lint` — clean
- [x] `npm run typecheck` — clean
- [x] `npm run build` — clean; all 7 routes prerender
- [x] `/today` verified at **1440** (full experience, right rail, wide hero + timeline)
- [x] `/today` verified at **1024** (compact icon rail, hero stacks, no overflow)
- [x] `/today` verified at **390** (bottom-bar navigation, single-column hero,
      swipeable timeline, readable AI panel, no cramped cards)
- [x] **Native RTL confirmed** — `document.dir === "rtl"`; rail on the right; timeline
      and finance chart flow right→left; panels slide from correct edges
- [x] **No horizontal overflow** — 0px at all three widths on all five routes
      (a 4px mobile overflow was found during validation and fixed)
- [x] **Official logo used** — `/brand/lawme-logo.png` via `next/image`, verified loaded
      in-browser; not hotlinked; unmodified
- [x] **Old temporary /today fully replaced** — no PageHeader/SectionChapter/Placeholder
      remnants on the page
- [x] Reduced motion — all animation collapses via `--motion-*` tokens
- [x] Keyboard — ⌘K, Esc, tab order (דינו panel `inert` when closed), gold focus ring,
      skip-link
- [x] AI provenance — every AI surface shows generator, update time, sources, and action
- [x] Screenshots captured from the production build (see `screenshots/01–06`)
