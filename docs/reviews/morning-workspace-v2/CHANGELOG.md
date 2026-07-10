# Morning Workspace V2 — UI Changelog

## Tokens

- `color.css` — status layer: urgent / today / waiting / progress / new / completed /
  risk / scheduled / reviewed / signed, each with ink + wash + on-navy (30 tokens).
- `elevation.css` — `--shadow-lift` (hover elevation), `--shadow-gold-glow`
  (illuminated active), `--shadow-seat` / `--shadow-seat-hover` (icon seats).
- `light.css` (new) — `bg-environment`, `surface-paper`, `surface-paper-raised`,
  `surface-navy` lit-material utilities.
- `glass.css` — Apple-grade recipe: 24px blur, saturate 1.5, luminous inner edge,
  top catch-light, inner light wash, bottom navy pickup, layered depth.
- `globals.css` — body carries the lit environment (dawn top-start radial +
  cool bottom-end radial, fixed).

## Design-system primitives (new)

- `icon-container.tsx` — IconContainer: 12 semantic variants, light/navy surfaces,
  sm/md/lg, inner highlight + hairline seat, interactive lift + catch-light.
- `indicators.tsx` — StatusText (dot+word), StatusTag, StateLine, MicroProgress
  (+showValue), ConfidenceBar, AIMark (the single sanctioned sparkle).
- `glyphs.tsx` — +11 glyphs: user, court, phone, alert, trend (RTL-native), task,
  check, pen, book, hourglass, ledger.

## Shell

- Side rail: glass material; active item illuminated (gold wash + `shadow-gold-glow`).
- Top bar: search field on lit paper (`surface-paper`) with hover lift.

## /today components

- **AttentionPanel** — semantic icon seats per kind; StatusText replaces pills.
- **AIIntelligencePanel** — findings list (icon, count, explanation, action) replaces
  2×2 tiles; named progress context; lit navy; on-navy semantic colors.
- **DailyTimeline** — kind icons + semantic colors; glass + gold-glow active card;
  readiness MicroProgress; done/kind states as dot+word; xl grid columns
  (minmax(0,1fr), shrink-safe) with swipe below xl; focusable cards.
- **ActiveMattersSection** — StateLine, icon seat, practice area, owner, readiness,
  hover-revealed action.
- **AIInsightsSection** — categories with icon+variant, impact StatusText, related
  matter, ConfidenceBar, AIMark; hover lift.
- **RecentDocumentsSection** — sheet-like file tiles (kind + version), owner, state
  words, hover action.
- **MeetingsPanel** — kind icon seats (call/meeting), day grouping kept.
- **FinancePanel** — dashed target line + label, semantic trend StatusText.
- **DailySummaryPanel** — lit navy surface.

## Data (`data.ts`)

Enriched, same content spirit: attention kinds; finding kinds+actions; timeline
kinds+prep; matters practiceArea/owner/progress/status/action; insights
category/impact/matter; documents owner/version/status/action; finance target +
trend statuses.

## Fixes found during validation

- 212px tablet overflow: hero grid tracks couldn't shrink (grid-item `min-width:auto`
  on the עמית column) — fixed with `min-w-0` + truncation-safe StatusText.
- Active-event chip truncation at xl column width — chip copy tightened.
