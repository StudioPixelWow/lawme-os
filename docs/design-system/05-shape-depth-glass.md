# 05 · Radius, Elevation & Shadows, Glass System

## 1. Radius system

Soft but architectural — closer to Linear than to bubbly consumer apps:

| Token | Value | Use |
|---|---|---|
| `radius-xs` | 6px | Chips, kbd, tiny controls |
| `radius-sm` | 8px | Inputs, buttons |
| `radius-md` | 12px | Cards, popovers |
| `radius-lg` | 16px | Panels, sheets, modals |
| `radius-xl` | 24px | Glass surfaces, hero containers |
| `radius-pill` | 9999px | Pills, avatars, dots |

Laws: nested radii must decrease inward (outer 16 → inner 8); never mix radii on siblings;
no sharp 0px corners except full-bleed chrome (rail edges).

## 2. Elevation & shadows

Elevation is **navy-tinted air, not black smoke**. All shadows derive from ink `#0A1629`
at low alphas — pure-black shadows look dirty on ivory.

| Token | Recipe | Use |
|---|---|---|
| `shadow-hairline` | 0 0 0 1px ink/6% | The default "border" — a drawn line, not a shadow |
| `shadow-raised` | 1px 2px ink/5% + 2px 8px ink/4% | Cards that lift off the canvas |
| `shadow-float` | 2px 6px ink/5% + 12px 32px ink/8% | Popovers, dropdowns, the timer |
| `shadow-overlay` | 4px 12px ink/6% + 24px 64px ink/14% | Modals, command bar, AI panel |
| `shadow-gold-breath` | ring gold/35% + 2px 12px gold/18% | **AI presence only** (see 11) |

Laws:

- Four elevations exist. There is no "level 5".
- Most UI sits flat on the canvas with `shadow-hairline` at most. Raised is earned by
  interactivity (a card you can open) or ephemerality (a popover).
- Elevation change is animated (see 06) — things *settle*, they don't teleport.
- Hairlines (`--color-line`, ink/8%) are the system's borders everywhere: 1px, never 2px,
  never solid mid-grey.

## 3. Glass system

Glass is the material of **ephemeral intelligence** — surfaces that float above the workspace
for a moment: the command bar, the עמית panel, sticky context headers during scroll, sheet
scrims. Content (cards, chapters, forms) is **never** glass.

The recipe (one place, `tokens/glass.css`, applied only via the `glass` utility /
future `<Surface material="glass">`):

```
background:      paper-50 at 72% opacity
backdrop-filter: blur(20px) saturate(1.4)
inner light:     inset 0 1px 0 white/60%   (top catch-light)
edge:            0 0 0 1px ink/5%
depth:           0 12px 40px ink/10%
radius:          radius-xl (24px)
```

Laws:

1. **Maximum one glass surface visible at a time** (the scrim behind a glass overlay doesn't count).
2. Glass must always have real content behind it to blur — glass on a blank canvas is fog; use paper.
3. Text on glass: `foreground` only — never soft/faint inks (contrast collapses on blur).
4. Glass never scrolls its background; it floats while the workspace scrolls beneath.
5. Fallback: where `backdrop-filter` is unavailable, glass degrades to `paper-0` at 96% opacity.
6. Vision-Pro-feel calibration: the blur is deep (20px) and the tint warm — glass should feel
   like frosted crystal over parchment, not like a grey Windows acrylic.
