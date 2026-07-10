# V10 Changelog

## Icon system (built first)
- `src/design-system/icons/tokens.ts` — semantic icon sizes (ICON).
- `src/design-system/icons/glyphs.tsx` — +15 glyphs: DinoGlyph
  (meridian seal), Research, Signature, Filing, Bench, Legislation,
  Evidence, Compare, History, Preview, Building, Shield, Lock, Share,
  Report, Plus.
- `src/design-system/icons/practice.tsx` — practice-area marks.
- `primitives/icon-container.tsx` — +7 variants (dino, matter, court,
  hearing, research, team, communication), xl size, inner top
  highlight.
- `primitives/indicators.tsx` — AIMark now renders the meridian seal;
  `DinoMark` alias exported.
- `docs/design-system/iconography.md` — the system's documentation.

## Center recomposed to the approved reference
- `components/today-focus.tsx` — full-width navy briefing with
  internal CompactTimeline (vertical, selectable, expandable) and the
  דינו band. Greeting stays as one quiet line above.
- `components/office-attention.tsx` — section title + full-list door.
- `components/matter-board.tsx` — featured mini-workspace (identity /
  track / facts + המלצת דינו panel / activity / operational floor),
  3 supporting matters with state rings and edge accents, folded queue.
- `components/workspace-launchers.tsx` — NEW: 8 workspace doors with
  premium icon seats; glass lift on hover; בקרוב badges.
- `components/today-workspace.tsx` — five-object composition;
  role-section machinery retired with the removed blocks.
- `focus.ts` — BOARD: 3 supporting matters + queue.

## Removed (deleted, not restyled)
- context-dock, team-workload, client-waiting, court-updates,
  document-shelf, lead-strip, finance-strip, focus-timeline.
  (Models remain in `office.ts` for the dedicated workspaces.)

## Shell refinements
- `shell/side-rail.tsx` — workspace nav placeholders (מחקר משפטי,
  דינו, פיננסים, צוות, דוחות), "פעולה חדשה +" action, version footer.
- `shell/utility-rail.tsx` — reference group labels; communication
  block removed.
- `matter-health.tsx` — ring strokes for waiting/risk/scheduled.
