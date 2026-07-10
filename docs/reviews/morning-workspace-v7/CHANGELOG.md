# V7 Changelog

## Removed (deleted, not restyled)
- `src/modules/today/components/morning-hero.tsx`
- `src/modules/today/components/daily-timeline.tsx`
- `src/modules/today/components/active-matters-section.tsx`
- `src/modules/today/components/ai-insights-section.tsx`
- `src/modules/today/components/recent-documents-section.tsx`
- `src/modules/today/components/meetings-panel.tsx`
- `src/modules/today/components/finance-panel.tsx`
- `src/modules/today/components/daily-summary-panel.tsx`
- `src/modules/today/components/ai-intelligence-panel.tsx`

## Added
- `src/modules/today/focus.ts` — focus model + pure data derivations
  (event↔matter↔documents↔insights↔meeting maps, health states,
  milestone tracks, board tiers, prepared-work objects)
- `components/today-workspace.tsx` — client orchestrator (focus state,
  Esc handling, page composition)
- `components/today-focus.tsx` — the Today Focus scene
- `components/focus-timeline.tsx` — integrated, expandable timeline
- `components/context-dock.tsx` — dynamic supporting layer
- `components/matter-board.tsx` — Matter Operations Board
- `components/matter-signature.tsx` — visual Matter Health
  (milestone track + state chip + markers)
- `components/document-shelf.tsx` — documents as physical objects
- `components/finance-strip.tsx` — executive strip, chart on expansion
- `components/intelligence-drawer.tsx` — עמית in depth, on demand

## Changed
- `src/design-system/tokens/light.css` — added the two remaining
  signature utilities: `context-halo`, `living-edge`
- `src/modules/today/index.ts` — public API is now `TodayWorkspace`
- `src/app/(os)/today/page.tsx` — renders the orchestrator only
- `components/matter-health.tsx` — kept for `HealthRing` (reused by the
  scene's context strip)

## Untouched (by requirement)
- `src/modules/shell/*` (sidebar, utility rail, top bar, mobile nav)
- `src/modules/today/data.ts` (typed mock data)
- brand assets, routing, tokens other than the two new utilities
