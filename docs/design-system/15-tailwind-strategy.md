# 15 · Tailwind v4 Implementation Strategy

Tailwind v4 is configured **entirely in CSS** — no `tailwind.config.js`. The pipeline is the
scaffold's own: `@tailwindcss/postcss` → `app/globals.css` → token files.

## Entry point

`src/app/globals.css`:

```css
@import "tailwindcss";

/* Shayish tokens — order matters: color first (later files may reference it) */
@import "../design-system/tokens/color.css";
@import "../design-system/tokens/typography.css";
@import "../design-system/tokens/space.css";
@import "../design-system/tokens/radius.css";
@import "../design-system/tokens/elevation.css";
@import "../design-system/tokens/glass.css";
@import "../design-system/tokens/motion.css";

@theme inline {
  /* next/font variables live on <html>, hence `inline` */
  --font-sans: var(--font-assistant), system-ui, sans-serif;
  --font-display: var(--font-frank-ruhl), var(--font-assistant), serif;
}

@layer base { /* canvas, selection, focus-visible, ::placeholder */ }
```

## Key decisions

1. **`@theme` is the design system's API.** Declaring `--color-surface` doesn't just create a
   variable — it *generates* `bg-surface`, `text-surface`, etc. Tokens and utilities are one
   artifact; drift between "the palette doc" and "what compiles" is impossible.
2. **The default palette is disabled** (`--color-*: initial` before our ramps). `bg-purple-500`,
   `text-slate-400`, `bg-gray-100` do not exist in this codebase — the No-Purple rule and the
   warm-not-grey rule are compiler-enforced. Same for default shadows (`--shadow-*: initial`)
   so `shadow-md` can't reintroduce black smoke.
3. **Semantic utilities over raw utilities** in component code:
   `bg-surface-raised text-foreground-soft rounded-md shadow-hairline p-element` reads as the
   design language. Default numeric spacing (`p-4`, `gap-2`) remains available for
   micro-layout *inside* components; rhythm between blocks uses rhythm tokens.
4. **`@utility` for recipes, not components.** Exactly two planned: `glass` (the one glass
   recipe) and `focus-gold` (the focus ring). Anything more complex becomes a React component —
   we don't build a parallel class-based component system.
5. **Logical properties only** — Tailwind's `ms-/me-/ps-/pe-/start-/end-` utilities; the
   physical `ml-/mr-/pl-/pr-/left-/right-` set is banned via ESLint (see 13).
6. **No arbitrary values in feature code.** `w-[347px]` in a module is a smell; arbitrary
   values are legal only inside `design-system/` primitives while a token is being decided,
   and must not survive a release.
7. **Class composition** uses a tiny `cx` helper + `tailwind-variants` (or CVA) inside
   primitives for variant styling — variants stay declarative, tokens stay the vocabulary.
8. **Dark/evening readiness:** because components use aliases, the evening theme will be one
   `@media`/class block re-mapping aliases in `color.css` — zero component changes by design.

## What we deliberately do NOT do

- No `tailwind.config.js`/`ts` (v4 CSS-first only, per the scaffold).
- No `@apply` soup — `@apply` is allowed only in `@layer base` for element defaults.
- No plugin zoo — v4 core covers container queries, 3D transforms; add plugins only with a
  documented need.
- No inline hex/arbitrary colors anywhere — if a color isn't a token, it isn't in the product.
