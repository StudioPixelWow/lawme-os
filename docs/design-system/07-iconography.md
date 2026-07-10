# 07 · Iconography Rules

Icons in LawME are punctuation, not vocabulary. Words carry meaning; icons quietly assist.

## Style

- **Line icons, 1.5px stroke, rounded caps** — matched to the hairline weight of the system.
  Recommended base set: Lucide, filtered through our wrapper (never raw imports in features).
- Filled icons exist only as **state** (a filled star = pinned) — never as a different "style".
- Icon ink: `foreground` or `foreground-soft`. Icons are never colored decoratively.
  Gold icons = AI only. Semantic-colored icons only inside semantic contexts (a critical dot).
- Sizes: 16px (inline, list meta), 20px (default UI), 24px (page-level). No 48px icon art —
  empty states use typography and space, not giant clip-art (see 10).

## Rules

1. **No icon without a job.** If removing the icon loses nothing, remove it. Navigation is
   words, not an icon column (see 08).
2. **No icon-only buttons** except universally understood glyphs (×, ⌄, ⌕, ⋯) — and even those
   carry `aria-label` + tooltip.
3. **One icon per row maximum** in lists; a row with three icons is a dashboard smell.
4. **RTL awareness is built into the wrapper.** Directional glyphs (arrows, chevrons,
   "external", undo/redo, media transport) flip automatically via the `<Icon>` component's
   flip list; symmetric glyphs never flip. "Forward/next" points **left** in this product.
5. Numbers, ₪, and dates are not icons — never replace text with pictographs in legal content.
6. Custom glyphs (matter kinds, court types) are drawn on the same 24px/1.5px grid and live in
   `src/design-system/icons/custom/` — same ink rules apply.

## The scales of justice clause

No ⚖️ clichés, no gavels, no marble columns in UI iconography. The legal identity comes from
typography and materials, not courtroom clip-art. (Brand illustration, if ever, is a separate
system with its own rules.)
