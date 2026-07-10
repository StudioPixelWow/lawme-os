# 14 · Design Tokens Reference

Tokens are the constitution of Shayish. They live in `src/design-system/tokens/*.css` as
Tailwind v4 `@theme` definitions — CSS is the source of truth; there is no JS theme object.

## Files

| File | Namespace(s) | Contents |
|---|---|---|
| `color.css` | `--color-*` | Paper/ink/gold ramps, semantics, aliases. **Also disables the default Tailwind palette** |
| `typography.css` | `--text-*` | Semantic fluid type scale (display→micro) with paired line-heights |
| `space.css` | `--spacing-*`, `--container-*` | Base unit, rhythm tokens (section/block/element/tight), page/reading measures |
| `radius.css` | `--radius-*` | xs→xl + pill |
| `elevation.css` | `--shadow-*` | Hairline, raised, float, overlay, gold-breath |
| `glass.css` | `--glass-*` + `@utility glass` | The single glass recipe |
| `motion.css` | `--ease-*`, `--motion-*`, `--animate-*` | Easings, durations, the breath keyframes, reduced-motion collapse |

Font family tokens (`--font-sans`, `--font-display`) are declared in `app/globals.css` via
`@theme inline`, because they reference `next/font` variables that exist on `<html>`.

## Naming grammar

```
--{category}-{concept}[-{variant}]
--color-surface-raised   --spacing-section   --motion-settle   --shadow-hairline
```

- **Semantic names, not visual ones.** `--color-accent`, never `--color-yellow-ish`.
  `--motion-settle`, never `--duration-280`.
- Two tiers in color: **ramps** (paper/ink/gold — physical) and **aliases** (surface/
  foreground/line/accent — semantic). Components may only use aliases + semantic colors;
  ramps are for the token file and rare, justified exceptions.
- Every token addition is a design decision → PR must update both the token file and the
  relevant doc in this directory.

## Hard rules

1. Raw values (hex, px, ms, cubic-bezier) appear **only** in token files.
2. Components consume tokens through Tailwind utilities (`bg-surface`, `text-title`,
   `shadow-raised`, `ease-settle`) or `var(--…)` in rare inline-style cases (Motion variants).
3. No component-level "local tokens" — if a component needs a new value, the system needs a
   new token (or the component is wrong).
4. Deleting/renaming a token requires a grep-verified migration in the same commit.
5. The future evening theme ("ערב") will re-map **aliases only** — any component that would
   break under alias re-mapping is misusing ramps and fails review today.
