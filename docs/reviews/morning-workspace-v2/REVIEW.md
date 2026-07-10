# Morning Workspace Visual Refinement V2 — Review

**Date:** 2026-07-10 · **Scope:** focused visual upgrade of the approved /today structure.
No structural redesign, no removed content, no new routes or business scope. Typed mock
data only. **Uncommitted — awaiting founder approval** (commit message reserved:
"Refine LawME Morning Workspace to Apple-level visual quality").

## What was upgraded

1. **Material system** — three purposeful materials, now lit: `surface-paper` /
   `surface-paper-raised` (ivory with inner top highlight, tonal wash, navy-tinted
   hairline-by-shadow), upgraded `glass` (24px blur, saturation pickup, luminous inner
   edge, top catch-light, bottom navy reflection, fallback), `surface-navy` (radial
   top-start light, blue-black gradient depth, warm gold edge reflection, layered shadow).
2. **Environmental background** — body now carries the lit environment: huge
   near-invisible radials (champagne dawn at top-start, cool navy depth at bottom-end),
   fixed attachment, consistent one-sun light direction.
3. **Hero** — greeting rhythm preserved; attention items now carry semantic icon seats
   (court/document/client), dot+word statuses (no pills), hover depth via `shadow-lift`.
4. **דינו intelligence** — the 2×2 stat tiles were replaced by four **rich findings**:
   semantic icon (precedent/opportunity/risk/ready), count, one-line explanation, and a
   per-finding action; live status line, named progress context («קריאת כתב ההגנה»),
   provenance, CTA. The panel sits on the new lit navy.
5. **Timeline (signature)** — event-kind icons in semantic seats, semantic event colors,
   **glass active event** with gold glow raised toward the user, readiness bars on
   prepared events, quieter past, day-progress line + glass now-marker (unchanged),
   keyboard-focusable cards, swipe below xl / true grid columns at xl+.
6. **Matters** — operational rows: state line, icon seat, practice area, owner,
   readiness `MicroProgress`, status words, hover-revealed next action.
7. **AI insights** — categorized (תקדים/נקודת תורפה/חיוב חסר) with icon, impact,
   related matter, confidence bar, source, action, and the single `AIMark`.
8. **Documents** — file-tile redesign (PDF navy / DOC indigo sheet with version),
   owner, state words (התקבל/טיוטה/נסקר/הוגש/נחתם), hover action.
9. **Finance** — dashed target line (יעד ₪175K), semantic trend indicators, gold
   current month, hover tooltips (unchanged behavior).
10. **Shell** — glass rail with gold-illuminated active item; top-bar search on lit
    paper with hover lift.

## Tokens added

10 status identities × (ink / wash / on-navy) in `color.css`; `--shadow-lift`,
`--shadow-gold-glow`, `--shadow-seat`, `--shadow-seat-hover` in `elevation.css`;
`light.css` (environment + 3 lit-surface utilities); upgraded glass recipe. No existing
token was renamed or removed; no raw hex or generic Tailwind colors in components
(verified by grep).

## Reusable components created

`IconContainer` (12 semantic variants × light/navy surfaces × 3 sizes, interactive
lift), `StatusText`, `StatusTag`, `StateLine`, `MicroProgress`, `ConfidenceBar`,
`AIMark` — all typed, RTL-safe, token-only, reduced-motion-aware.

## Icons introduced

user, court (columns — no gavel clichés), phone, alert, trend (drawn up-toward-left,
RTL-native), task, check, pen, book, hourglass, ledger — same 24px / 1.5px-stroke family.

## Validation

lint ✓ typecheck ✓ build ✓ · zero horizontal overflow at 1440/1024/390 (a 212px tablet
overflow from the hero grid's unshrinkable AI column was found and fixed with proper
`min-w-0` track behavior) · RTL verified in-browser · official logo verified loading ·
reduced-motion via tokens · no hex/generic colors in components.

## Still needs founder review

1. The glass **active timeline event** — glass-on-content is within the "live moment"
   rule, but it's the boldest glass use yet; confirm it earns its place.
2. **Navy density** — דינו + daily summary remain two navy surfaces (per the approved
   structure); the new lighting differentiates them, but the earlier concern stands.
3. The environmental background is deliberately near-invisible — if you want more
   presence, the radii/alphas are single-token adjustments.
4. Status wording (e.g. «דיון היום», «ממתין לרשם») — legal-Hebrew review welcome.

## Inspect

`npm run dev` → **http://localhost:3000/today** at 1440 / 1024 / 390.
Screenshots (11): `docs/reviews/morning-workspace-v2/screenshots/01–11`.
