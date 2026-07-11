# LawME — Database Workflow

## Projects
- **Development:** Supabase `LawME` · ref `udispadsbxqicmawqcuk` ·
  ap-south-1 · Postgres 17.6 — currently EMPTY (0 tables, 0
  migrations). All schema work happens here first.
- **Production:** does not exist yet. Must be created (founder
  approval — paid decision) before any real client data. Never develop
  against it.

## The only path to schema change
1. Write a versioned migration file:
   `supabase/migrations/<timestamp>_<name>.sql`
   (`npx supabase migration new <name>` generates the shell).
2. Test locally: `npm run db:reset:local` (Docker) — applies all
   migrations + `seed.sql` from scratch.
3. Regenerate types: `npm run db:types` → commit the migration + types
   together.
4. Apply to the hosted DEV project: `npx supabase db push`
   — **founder approval required** (it mutates a remote database).
5. Production application (future): only after staging sign-off,
   with a backup, with founder approval.

## Hard rules
- RLS ON for every table from the first migration. The Supabase
  advisors (via MCP, read-only) must stay clean after every change.
- No SQL writes through MCP (it is configured read-only on purpose).
- No `db reset` against any remote database, ever.
- Generated types (`src/types/database.types.ts`) are committed and
  regenerated after every migration — never hand-edited.
- Seeds are synthetic only; real client data never leaves production.

## Planned first schema (when approved)
The Design Bible's operational objects map naturally to tables:
matters, clients, documents, events/deadlines, tasks, team members,
communications, court updates, dino_insights — each with RLS by firm
membership. Prepare as ONE reviewed initial migration.
