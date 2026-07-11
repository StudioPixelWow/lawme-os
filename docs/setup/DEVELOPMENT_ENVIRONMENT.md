# LawME — Development Environment

The single page a new engineer (or Claude) reads first.

## Stack
- **Next.js 16.2.10** (App Router, Turbopack) — breaking changes vs.
  training data; consult `node_modules/next/dist/docs/` (AGENTS.md rule).
- **React 19.2.4** · **TypeScript 5 (strict)** · **Tailwind CSS v4**
  (CSS-first: `@theme` / `@utility`, no JS config).
- Fonts self-hosted via `@fontsource-variable/*`.
- Design system: "Shayish" — see `docs/design-system/LAWME_DESIGN_BIBLE.md`
  (the permanent source of truth).

## Repositories & infrastructure
- GitHub: `StudioPixelWow/lawme-os` (default branch `main`, currently public).
- Vercel: project `lawme-os` on team `office-7152s-projects`;
  GitHub integration auto-deploys `main` → production
  (`lawme-os.vercel.app`).
- Supabase: project **LawME** `udispadsbxqicmawqcuk` (ap-south-1) —
  designated DEVELOPMENT database; currently empty by design.

## Daily commands
```bash
npm install          # once per dependency change
npm run dev          # local dev server (http://localhost:3000)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # production build (must stay green)
npm run env:check    # environment health check (safe, read-only)
```

## Database (see DATABASE_WORKFLOW.md)
```bash
npm run db:types       # regenerate src/types/database.types.ts
npm run db:start       # local Supabase (requires Docker Desktop)
npm run db:status      # local stack status
npm run db:reset:local # rebuild LOCAL db from migrations + seed
```

## MCP servers (see MCP_CONNECTIONS.md)
Project-scoped in `.mcp.json` (no secrets): Supabase (read-only, dev
project), Vercel, GitHub, Context7, Playwright. First use of each in
Claude Code opens a browser OAuth approval.

## Rules that never bend
- Typed mock data lives in `src/modules/**`; database access arrives
  only through versioned migrations + generated types.
- No secrets in git, docs, screenshots or chat. `.env*` is ignored.
- Production writes/deploys/migrations require founder approval.
