# LawME — Local Development

## First-time setup (Mac)
```bash
git clone https://github.com/StudioPixelWow/lawme-os && cd lawme-os
npm install
cp .env.example .env.local     # fill values from the Supabase dashboard (dev project)
npm run env:check
npm run dev                    # http://localhost:3000 → redirects to /today
```

## Local Supabase (optional, needs Docker Desktop)
The scaffold is ready (`supabase/config.toml`, `supabase/migrations/`,
`supabase/seed.sql`). With Docker running:
```bash
npm run db:start      # local Postgres 17 + auth + storage + studio
npm run db:status     # prints local URLs and LOCAL keys (local only!)
npm run db:reset:local  # rebuild local db from migrations + seed
npm run db:stop
```
Ports are the Supabase defaults (54321-54329); adjust in
`supabase/config.toml` if they collide. **Never** import production
data locally. Note: the Cowork cloud sandbox has no Docker daemon, so
local-stack work happens on the Mac.

## Linking the CLI (once, on the Mac)
```bash
export SUPABASE_ACCESS_TOKEN=…   # from supabase.com/dashboard/account/tokens — shell only, never a file in the repo
npx supabase link --project-ref udispadsbxqicmawqcuk
```
Linking is read-safe. `supabase db push` (remote migration) always
requires founder approval first.

## Types
`npm run db:types` regenerates `src/types/database.types.ts` from the
dev project. Regenerate after every migration; commit the result.

## Playwright verification
The project uses Chromium via `playwright-core` in CI-style checks and
`@playwright/mcp` for interactive inspection (see `.mcp.json`). Test
state lives under `playwright/.auth/` (git-ignored).
