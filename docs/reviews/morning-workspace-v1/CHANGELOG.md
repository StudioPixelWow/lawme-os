# Morning Workspace V1 — Changelog

## Shell

- **New `TopBar`** (replaces `TopRail`): official logo (next/image, `/brand/lawme-logo.png`),
  semantic search field (⌘K trigger), notifications (gold unread dot), עמית shortcut, profile orb.
- **New `SideRail`**: vertical start-edge (right) navigation — icons+words (lg), icons (md),
  gold active hairline, quiet hover glide, footer brand line.
- **New `MobileNav`**: glass bottom bar with the five destinations, safe-area padding.
- `AppShell` recomposed: top bar → rail → padded canvas (`md:ps-20 lg:ps-56`) → bottom bar.
- `AssistantPanel`: moved to the end edge (left) with corrected slide direction; header sans.
- `navigation.ts`: nav items now carry glyph keys.
- **Deleted** `top-rail.tsx`.

## Design system

- `glyphs.tsx`: +8 glyphs (home, briefcase, users, calendar, document, bell, clock, pin) —
  same 24px / 1.5px-stroke grammar.
- `space.css`: new `--container-wide` (82rem) for dense operational workspaces.
- `Workspace`: new `width="wide"` variant.
- **Typography modernized**: `PageHeader`, `SectionChapter`, `Placeholder`, error and 404
  headlines switched from serif-led to sans (semibold, tracking-tight). Serif token retained
  for brand/editorial moments only.

## /today — the Morning Workspace (full replacement)

- `src/modules/today/data.ts` — typed realistic mock data (attention, findings, timeline,
  matters, insights, documents, summary, meetings, finance).
- New components (`src/modules/today/components/`):
  `MorningHero`, `AttentionPanel`, `AIIntelligencePanel` (deep navy, progress, 4 findings,
  provenance, CTA→עמית), `DailyTimeline` (RTL horizontal, gold next-event, mobile swipe),
  `ActiveMattersSection`, `AIInsightsSection` (confidence + source + action + disclosure),
  `RecentDocumentsSection`, `DailySummaryPanel` (navy + gold bars), `MeetingsPanel`,
  `FinancePanel` (single-series billing chart: ink bars, gold current month, direct label,
  hover tooltip, RTL time axis; totals with trends), shared `SectionHeading`/`ToneChip`.
- Page assembled from modules with staggered `animate-rise` choreography; grids are
  `grid-cols-1` explicit (fixed a 4px implicit-column overflow on mobile).

## Assets

- `public/brand/lawme-logo.png` — official logo, stored unmodified (source file provided
  by founder; original `LAWME.png` upload moved to `_to_delete/` after copying).
