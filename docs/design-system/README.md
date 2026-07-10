# שיש · Shayish — The LawME Design System

**LawME is the operating system for modern law firms. Shayish (שיש, "marble") is its material language.**

Warm stone surfaces. Deep navy ink. Champagne-gold light. The feeling of a beautifully
typeset legal dossier, alive.

This directory is the single source of truth for how LawME looks, moves, and feels.
Code that contradicts these documents is wrong, even if it works.

## How the system is layered

```
tokens  →  primitives  →  patterns  →  module compositions
(CSS)      (Button…)      (Timeline…)   (feature UI)
```

- **Tokens** live in `src/design-system/tokens/*.css` (Tailwind v4 `@theme`). They are the only
  place raw values (hex, px, ms) may appear.
- **Primitives** consume tokens only. **Patterns** consume primitives. **Modules** consume patterns.
- Nothing above the token layer may contain a hex color, a `left`/`right` property, or an ad-hoc duration.

## Reading order

| Doc | Covers |
|---|---|
| [01-philosophy.md](./01-philosophy.md) | Design philosophy · Visual principles · Workspace philosophy |
| [02-color.md](./02-color.md) | Color system |
| [03-typography.md](./03-typography.md) | Typography system |
| [04-space-grid-layout.md](./04-space-grid-layout.md) | Spacing · Grid · Layout rules · Responsive rules |
| [05-shape-depth-glass.md](./05-shape-depth-glass.md) | Radius · Elevation & shadows · Glass system |
| [06-motion.md](./06-motion.md) | Motion principles · Animation durations |
| [07-iconography.md](./07-iconography.md) | Iconography rules |
| [08-navigation.md](./08-navigation.md) | Navigation philosophy |
| [09-components.md](./09-components.md) | Component · Card · Forms · Table · Charts philosophy |
| [10-states.md](./10-states.md) | Empty · Loading · Error · Success states |
| [11-ai-visual-language.md](./11-ai-visual-language.md) | AI visual language ("דינו") |
| [12-accessibility.md](./12-accessibility.md) | Accessibility rules |
| [13-rtl.md](./13-rtl.md) | RTL rules |
| [14-tokens.md](./14-tokens.md) | Design token reference |
| [15-tailwind-strategy.md](./15-tailwind-strategy.md) | Tailwind v4 implementation strategy |

## The one-paragraph test

If a screen could belong to Salesforce, Monday, or an admin template, it is not LawME.
If it could belong to a 2030 sibling of Apple Vision Pro, Arc, Linear, or Stripe —
set in Hebrew, on warm paper, with navy ink and a single breath of gold — it is.
