# Morning Workspace V4 — Changelog

## Tokens / materials

- `light.css` — new `surface-hero-dark` (navy environment: ivory sun top-start,
  champagne reflection, vignette, gold inner edge, deep seat).
- `glass.css` — new `glass-navy` (navy-pickup glass for dark environments:
  luminous edge, champagne top highlight, deep shadow, blur fallback).

## Data (`data.ts`)

- `HERO_MODES` (hearing / high-load / calm / quiet) + `HERO_ACTIVE_MODE` +
  `HERO_PROVENANCE` + `HERO_FACTS` (gating facts with actions) + slimmed `HERO_FOCUS`.
- Meetings: + matter, prep (0–1), docsNeeded, aiPrep, action.
- Documents: + optional aiNote (version-contradiction finding on d-3).
- Finance: + `FINANCE_FORECAST`, `FINANCE_AI_INSIGHT` (unbilled hours + action).

## Components

- **New `TodayMission`** — the mission glass: label, statement, countdown, readiness
  ring (navy), documents, team, gating facts with actions, champagne CTA.
- **New `SupportingPriorities`** — quiet secondary priorities under the mission.
- **`MorningHero`** — rebuilt as the dark environment composition; day-signature with
  breathing gold dot; עמית line with provenance; mode-driven.
- **Removed** `hero-focus.tsx`, `attention-panel.tsx` (content absorbed into the
  mission + supporting priorities).
- `HealthRing` — `surface="navy"` variant; MatterHealth missing-docs action.
- **`RecentDocumentsSection`** — sheet-object grid (Finder-like), AI note support.
- **`MeetingsPanel`** — preparation view: prep bar, materials, עמית prep line, action.
- **`FinancePanel`** — full-width executive band: chart | totals + forecast |
  contextual AI insight with CTA.
- `page.tsx` — new hierarchy, gold hero→timeline bridge, mt-20/28 rhythm,
  AIIntelligencePanel moved into the intelligence band beside insights.
- `index.ts` — exports updated.
