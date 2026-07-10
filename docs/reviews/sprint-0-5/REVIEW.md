# Sprint 0.5 — Experience Review & Polish

**Date:** 2026-07-10 · **Scope:** shell + `/today` experience only. No business features,
no CRM, no matters logic, no Supabase, no auth, no primitives library, no styleguide.

## What was reviewed

The complete Sprint 0 foundation, state by state, against the Shayish docs
(`docs/design-system/`) and the Sprint 0.5 visual direction:

1. `/today` default state (desktop 1440)
2. Top rail & navigation close-up
3. Command bar open (⌘K)
4. דינו panel open
5. Empty placeholder state (`/matters`)
6. Loading skeleton
7. not-found state
8. Mobile (390×844)
9. Tablet (834×1112)
10. Long-scroll desktop (full `/today` page)

All captures in [`screenshots/`](./screenshots) were taken from the **actual production
build** (`next build` + `next start`, Chromium @2x).

## What was polished

Full list in [CHANGELOG.md](./CHANGELOG.md). Highlights:

- **Glass catch-light** — a second inset light-wash was added to the single glass recipe,
  so the rail, command bar and דינו panel read as frosted crystal with light falling in.
- **Active-nav motion** — the gold underline now draws itself in (`animate-underline`,
  280ms settle), giving navigation a quiet moment of confirmation.
- **Placeholders became wells, not cards** — hairline card boxes replaced by quiet
  ivory wells sunk into the paper (`bg-surface-sunken/60`), reducing "dashboard card" feel.
- **Command bar** — keyboard-hint footer (↵ ניווט · Esc סגירה), refined trigger with
  hover depth (hairline → raised).
- **דינו panel** — `inert` while closed (tab order correct), breath animation only while
  open, trust line added ("דינו תמיד יציע — ואתם תמיד תחליטו"), slide distance refined.
- **Typography** — `text-balance` on all display/title lines, `text-pretty` on context
  lines; not-found gained a faint-ink 404 and a single gold hairline.
- **Bidi** — the Latin wordmark is now `dir="ltr"`-isolated inside the Hebrew rail;
  the 404 numeral is LTR-isolated.
- **Mobile** — rail nav scrolls without a visible scrollbar (`scrollbar-none`).

## Verified in validation

`npm run lint` ✓ · `npm run typecheck` ✓ (script added this sprint) · `npm run build` ✓ —
all 6 routes return 200; **zero horizontal overflow** on desktop/tablet/mobile for every
route; `document.dir === "rtl"` verified in-browser; reduced-motion collapses via the
motion tokens; keyboard: ⌘K/Ctrl+K, Esc, Enter-to-navigate, gold focus ring, skip-link.

## What still needs founder approval

1. **Placeholder wells vs. cards** — the new quiet-well direction (vs. Sprint 0's
   hairline cards). See `06-placeholder-empty.png`.
2. **Gold budget in chrome** — currently: active-nav underline + דינו toggle hover.
   Is the hover-gold on the דינו button too much gold, or exactly right?
3. **Glass depth** — blur 20px / 72% tint. Deeper (more Vision-Pro) or lighter?
4. **The greeting** — "בוקר טוב" is static; time-of-day greeting (בוקר/צהריים/ערב)
   arrives with real data. Approve the static version for now?
5. **Command bar placement** — 14vh from top. Comfortable, or should it sit higher?
6. **Mobile nav** — horizontal scroll of the five words. Alternative: collapse into
   a sheet. Current direction assumes five words always fit with a small scroll.

## Exact routes and states to inspect

| State | Route / action |
|---|---|
| Morning brief | `http://localhost:3000/today` |
| Long scroll | `/today`, scroll to bottom |
| Command bar | any page → ⌘K (or Ctrl+K) |
| דינו panel | top rail → the ✦ button |
| Empty placeholder | `/matters` (also `/clients`, `/calendar`, `/documents`) |
| Loading skeleton | slow network (DevTools → Network → Slow 3G) → navigate between pages |
| Error state | manual only for now (no failing data source exists yet) |
| not-found | `/no-such-page` |
| Tablet / Mobile | DevTools responsive: 834×1112 / 390×844 |
| Reduced motion | macOS: System Settings → Accessibility → Display → Reduce Motion |

Production routes: same paths once deployed (no production deployment exists yet).
