# Sprint 0.5 — Review Checklist

Verified against the production build (`next build` + `next start`), Chromium.

- [x] **Desktop reviewed** — 1440×900, all 6 routes, screenshots 01–07
- [x] **Tablet reviewed** — 834×1112, all routes, zero horizontal overflow, screenshot 08
- [x] **Mobile reviewed** — 390×844, all routes, zero horizontal overflow, nav scrolls
      without scrollbar, screenshot 09
- [x] **RTL reviewed** — `document.dir === "rtl"` verified in-browser; start-edge panel,
      logical properties only (no `left/right` classes in src), wordmark + 404 bidi-isolated
- [x] **Keyboard reviewed** — ⌘K / Ctrl+K opens, Esc closes topmost layer, Enter opens the
      first navigation result, gold `:focus-visible` ring on all interactive elements,
      skip-link to main, עמית panel `inert` while closed
- [x] **Reduced motion reviewed** — all `--motion-*` durations collapse to 1ms centrally;
      breath animation disabled; smooth-scroll disabled
- [x] **Command bar reviewed** — glass, filter, navigation, creation placeholder,
      שאל את עמית handoff to the panel, keyboard-hint footer (screenshot 04)
- [x] **AI panel reviewed** — glass catch-light, gold mark on AI content, breath while
      open, disabled composer, trust line (screenshot 05)
- [x] **Loading reviewed** — skeleton mirrors the editorial layout (screenshot 10)
- [x] **Error reviewed** — code-level review + typography polish; **no live repro path
      exists yet** (no data source can fail) — needs a forced-error pass when real data
      arrives
- [x] **not-found reviewed** — `/no-such-page` renders the designed 404 (screenshot 07)

## Validation runs

- [x] `npm run lint` — clean
- [x] `npm run typecheck` — clean
- [x] `npm run build` — clean, all routes prerender
- [x] All routes return 200 (`/`, `/today`, `/matters`, `/clients`, `/calendar`, `/documents`)
- [x] No horizontal overflow at 1440 / 834 / 390 on every route (measured programmatically)
