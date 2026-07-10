# Sprint 0.5 — UI Changelog

Every meaningful UI change in this sprint. No business features were added.

## Tokens

- `glass.css` — added a soft inset light-wash (`inset 0 16px 32px -20px white/55%`) to the
  glass recipe; crisper top edge (white 60% → 65%). Affects rail, command bar, עמית panel.
- `motion.css` — new `underline-in` keyframes + `--animate-underline`
  (280ms, ease-settle) for the active-nav gold hairline.
- `globals.css` — new `scrollbar-none` utility for scrollable chrome.

## Top rail

- Active nav word: gold underline now animates in on navigation.
- Nav words: quicker, token-driven color transitions (`--motion-quick`).
- Search trigger: raised paper fill (`bg-surface-raised/50` → full on hover),
  depth change on hover (hairline → raised shadow), icon color shift via `group`.
- עמית toggle: hover state now whispers gold (`bg-gold-100/70` + `gold-700` ink)
  instead of neutral grey.
- Wordmark: `dir="ltr"` bidi isolation; rounded focus-ring geometry (`rounded-xs`).
- User orb: subtle raised shadow; `title` tooltip.
- Nav strip: `scrollbar-none` on mobile horizontal scroll.

## Command bar

- New footer with keyboard hints: ↵ ניווט · Esc סגירה (Kbd chips).
- Inherits the improved glass catch-light.

## עמית panel

- `inert` while closed — controls leave the tab order (was: focusable while invisible).
- Breath animation runs only while the panel is open.
- Slide-in distance 24px → 32px for a clearer from-the-edge motion; documented the
  RTL-physical relationship of the offset.
- Added the trust line: "עמית תמיד יציע — ואתם תמיד תחליטו…".
- Close button transition uses the motion token.

## Patterns

- `Placeholder` — redesigned from hairline card to quiet well:
  `rounded-xl bg-surface-sunken/60`, py-20 (was py-16), no shadow;
  AI variant: gold wash softened to `bg-gold-100/70`; `text-balance`/`text-pretty`.
- `PageHeader` — `text-balance` on the display line, `text-pretty` on context,
  context spacing mt-4 → mt-5.
- `SectionChapter` — `text-balance` on chapter titles.

## States

- Loading — skeleton follows the new well geometry (`rounded-xl`, softer inks, taller block).
- Error — balanced typography (`text-balance`/`text-pretty`).
- not-found — 404 numeral in faint ink with LTR isolation, entrance choreography
  (`animate-rise`), single gold hairline accent.

## Tooling

- `package.json` — added `typecheck` script (`tsc --noEmit`).
- `docs/reviews/sprint-0-5/` — review package + 10 production-build screenshots.
