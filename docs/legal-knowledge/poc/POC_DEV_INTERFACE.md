# POC Development Interface (Epic 2, Phase 12)

**Route:** `/dev/legal-intelligence` — founder-review surface only.

## Gating (test-backed)
`isDevInterfaceEnabled(env)` (pure function, unit-tested):
- development / test builds → enabled;
- **production builds → `notFound()` (404)** unless the explicit
  `LAWME_DEV_TOOLS=1` server env is set — which is NOT set anywhere and
  would be a deliberate founder action on a protected preview only.
- Not linked from any navigation (sidebar/topbar untouched); no
  production entry point exists.

## What it shows
Native RTL (`dir="rtl" lang="he"`), Design-Bible materials (paper
surfaces, ink text, gold accent, pill chips, shadow-lift) — deliberately
minimal, explicitly NOT the future Research Workspace:

- Hebrew question input + filters (תחום, העדפת סמכות)
- Visible label: **"סביבת POC — נתונים סינתטיים בלבד"**
- Ranked sources with: authority class (Hebrew), court, canonical case
  number, verification status, the exact quoted passage, formatted
  citation, anchor key + character range, source URL, full score
  decomposition (lexical/vector/authority/trust/freshness → final),
  per-item warnings
- Run metadata: engine version, correlation id, duration, retrieval
  explanation, global warnings, missing-source notice
- Footer disclaimer: "טיוטת מחקר — נדרשת בדיקת עורך דין"

## Data source
Server-side only (`run-research.ts`, `import "server-only"`):
- With `SUPABASE_URL` + `SUPABASE_SECRET_KEY` in the server env → the
  Development database (seeded fixture corpus).
- Without → in-memory repositories seeded from the same fixtures through
  the same contract, labeled "זיכרון מקומי (fallback)" in the footer.
No Supabase credentials of any kind reach the client bundle; the page is
a server component and the runner module is server-only enforced.

## How the founder runs it
```bash
# in the repo, with .env.local containing the dev URL + keys (optional):
npm run dev
# open http://localhost:3000/dev/legal-intelligence
```
Without keys it still works in fallback mode — same fixtures, same engine.
