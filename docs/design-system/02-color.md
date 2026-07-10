# 02 · Color System

Three materials, three ramps. Everything on screen is paper, ink, or gold —
plus a small, warm-shifted semantic set. The default Tailwind palette is **disabled**
(`--color-*: initial`), so off-system colors cannot be written at all.

## Paper — the surfaces (warm white / ivory)

| Token | Value | Use |
|---|---|---|
| `paper-0` | `#FFFEFC` | Raised surfaces: cards that must lift off the canvas |
| `paper-50` | `#FBF9F5` | **The canvas.** Default app background |
| `paper-100` | `#F6F3EC` | Sunken zones, quiet wells, hover on paper |
| `paper-200` | `#EFEAE0` | Pressed states, subtle fills |
| `paper-300` | `#E4DDCF` | Strongest paper — hairline-adjacent fills only |

Paper is warm (yellow-shifted), never grey. If a background reads as grey on a calibrated
screen, it is a bug.

## Ink — the content (deep navy)

| Token | Value | Use |
|---|---|---|
| `ink-950` | `#081121` | Reserved: display headlines at large sizes |
| `ink-900` | `#0A1629` | **Default text.** Primary buttons. Icon ink |
| `ink-800` | `#12233F` | Primary button hover |
| `ink-700` | `#1C3050` | Emphasis fills |
| `ink-500` | `#3A4C68` | Secondary text (`foreground-soft`) |
| `ink-300` | `#7C8AA0` | Tertiary text, placeholders (`foreground-faint`) |
| `ink-200` | `#A8B2C2` | Disabled text |
| `ink-100` | `#D3D9E2` | Disabled fills, faint rules on raised paper |

Navy **is** the product's black. `#000000` is banned. Charcoals and cool greys are banned —
grey text is always an ink-ramp value, which keeps every grey slightly navy and harmonious.

## Gold — the light (champagne)

| Token | Value | Use |
|---|---|---|
| `gold-700` | `#8C7239` | Gold text on paper (only AA-passing gold for text) |
| `gold-600` | `#A98B45` | Focus rings, active indicators |
| `gold-500` | `#C9A961` | **The gold.** AI hairlines, key accents |
| `gold-400` | `#D8BE82` | Soft accents, chart highlight |
| `gold-300` | `#E8D9B5` | Whisper fills, selection background |
| `gold-100` | `#FAF5E8` | Faint gold wash (AI block background) |

Rules of gold:

1. Gold means **intelligence or significance** — nothing else. Never decoration, never "warning".
2. One gold element per view region (rail, page header, chapter, panel).
3. Gold text below 18px must use `gold-700` (contrast). Prefer gold as *line and light*
   (hairlines, rings, washes) over gold as text.

## Semantic — warm-shifted, quiet

| Token | Value | Wash | Meaning |
|---|---|---|---|
| `positive` | `#3D7A5C` | `#E9F1EC` | Filed, paid, confirmed |
| `caution` | `#A6641F` | `#F7EDDE` | Approaching deadline, needs review |
| `critical` | `#A63E3A` | `#F7E7E5` | Overdue, failed, blocking |
| `info` | `ink-500` | `paper-100` | Neutral notice — info is just ink |

Semantics are desaturated and warm so they sit on ivory without shouting. They appear as
**text + tiny 6px dot**, or as a wash behind text — never as loud filled badges.
`caution` is visually distinct from gold (browner, darker); if they're confusable in context,
use words instead of color.

## Aliases — what components actually use

Components never reference ramps directly. They use semantic aliases, which is what makes a
future "ערב" (evening) theme a re-mapping exercise:

```
--color-surface          → paper-50    (bg-surface)
--color-surface-raised   → paper-0     (bg-surface-raised)
--color-surface-sunken   → paper-100   (bg-surface-sunken)
--color-foreground       → ink-900     (text-foreground)
--color-foreground-soft  → ink-500
--color-foreground-faint → ink-300
--color-line             → ink at 8%   (hairlines, borders)
--color-line-strong      → ink at 14%
--color-accent           → gold-500
--color-focus            → gold-600
```

## Usage laws

- Hex values exist **only** in `src/design-system/tokens/color.css`.
- No gradients as identity. At most: a barely-there paper-to-paper wash on hero surfaces.
- No purple, no violet, no indigo — not in UI, not in charts, not in illustrations.
- Data visualization draws from ink + gold + semantic ramps only (see 09, Charts).
- Text contrast: minimum 4.5:1 body, 3:1 large text — verified against *paper-50*, not white.
