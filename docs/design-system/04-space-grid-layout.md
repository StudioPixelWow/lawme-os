# 04 · Spacing, Grid, Layout Rules, Responsive Rules

## 1. Spacing system

Base unit **4px** (Tailwind v4 `--spacing: 0.25rem`), used in an 8-step working rhythm:
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 — plus **composition tokens** that make "huge whitespace"
a token, not an ad-hoc margin:

| Token | Value | Meaning |
|---|---|---|
| `spacing-section` | 120px (`7.5rem`) | Vertical distance between page **chapters**. The signature LawME breath |
| `spacing-block` | 48px (`3rem`) | Distance between blocks inside a chapter |
| `spacing-element` | 24px (`1.5rem`) | Distance between related elements |
| `spacing-tight` | 12px (`0.75rem`) | Label→value, icon→text |

Laws:

- Space communicates grouping **before** any line or box does. If you're adding a divider,
  first ask whether doubling the gap solves it.
- Vertical page padding: min 64px top on every workspace page; content never touches the rail.
- Density is a *mode* (future compact toggle for power lists), never the default.

## 2. Grid system

- **The canvas is a single readable column, not a 12-column dashboard grid.**
  Page content lives in a centered container: `max-w-page` (68rem) for workspace pages,
  `max-w-reading` (42rem) for prose.
- Inside a chapter, use CSS grid with **content-shaped columns** (e.g. `grid-cols-[1fr_20rem]`
  for story + margin notes), not free-form 12-col spans. Asymmetry is welcome; the wide
  column always carries the narrative.
- Horizontal gutters: 24px minimum between columns, 32px on wide screens.
- Alignment: a page has exactly **one** primary text start-edge (the right edge in RTL).
  Everything hangs from it. Centered text is reserved for empty states and ceremony.

## 3. Layout rules

- **Long-scroll, chaptered pages.** A workspace page = opening (display title + one quiet
  line of context) → chapters separated by `spacing-section`. Chapters are separated by
  *space and a small title*, not by boxed panels.
- **No widget grids.** Two cards side-by-side is composition; six tiles is a dashboard — banned.
- **Sticky is chrome-only:** the top rail, a chapter nav, a document toolbar. Content itself
  never sticks.
- **Edges stay clean.** Nothing is flush to the viewport edge except the rail and glass panels;
  the canvas floats with min 24px side padding (mobile) / 48px (desktop).
- **One primary action per view region**, placed at the natural end of reading, or in the
  page opening for creation flows ("תיק חדש").
- Depth budget per screen: canvas + at most one raised layer + at most one glass layer.

## 4. Responsive rules

Breakpoints (Tailwind defaults, used with intent):

| Range | Treatment |
|---|---|
| `<sm` (phone) | The brief, not the OS: single column, `spacing-section` compresses to 64px, chapter navs become horizontal scroll, glass panels become full-screen sheets |
| `sm–lg` (tablet) | Single column + side notes collapse under the narrative; AI panel overlays |
| `lg+` (desktop) | Full editorial layout; AI panel docks beside the canvas |
| `2xl+` | The canvas does **not** stretch — whitespace grows, `max-w-page` holds. Ultra-wide screens get calmer, not denser |

- Touch targets ≥ 44px on any pointer-coarse device.
- Fluid type (`clamp`) handles most scaling; layout changes happen at breakpoints, type flows between them.
- Never hide capability on mobile silently — collapse it behind clear affordances.
