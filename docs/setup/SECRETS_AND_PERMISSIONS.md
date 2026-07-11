# LawME — Secrets & Permissions

## Where secrets live (and only there)
| Secret | Location | Never in |
| --- | --- | --- |
| Supabase anon/publishable key | `.env.local` (dev value), Vercel scopes | chat, docs, screenshots |
| Supabase service-role key | Vercel Production scope + founder's vault | git, client code, `NEXT_PUBLIC_*`, chat |
| `SUPABASE_ACCESS_TOKEN` (CLI) | developer shell profile | any file in the repo |
| DB passwords / `SUPABASE_DB_URL` | vault + CI secret store | everywhere else |
| Future AI / WhatsApp / email keys | Vercel server-side scopes | client bundle |
| OAuth tokens for MCP servers | Claude Code local credential store | the repo |

## Naming law
`NEXT_PUBLIC_` = shipped to every browser. A server secret with that
prefix is a security incident. `npm run env:check` scans for this.

## Git hygiene
`.gitignore` covers `.env*`, `.vercel`, `supabase/.temp`,
`playwright/.auth`, `.claude/settings.local.json`. The env:check script
sweeps tracked files for env/secret-like names on every run.

## Claude permission model (see also AGENTS.md guardrails)
**Allowed silently:** reads, searches, `git status/diff/log`, lint,
typecheck, build, tests, local Playwright, read-only Supabase MCP,
Vercel/GitHub inspection, creating local migration files.
**Always ask the founder:** remote migration apply, remote SQL writes,
production deploy/rollback, env-var mutation, secret rotation,
`git push --force`, branch/DB/storage/user deletion, GitHub releases or
Actions changes, RLS/Edge Function deployment. Never bypass-permissions
mode; never blanket-approve destructive Bash.

## Current risk register (2026-07-11)
1. **`main` auto-deploys production** — acceptable for a mock-data
   product; must change before real data (branch protection + PR flow).
2. **Repository is public** — the code (and Hebrew mock content) is
   world-readable. Founder decision whether to go private.
3. **Single Supabase project** — dev and (future) prod are the same
   today. Create a separate production project before real data.
4. No branch protection / required checks on `main` yet.
None of these expose secrets today; all become critical the moment
real client data enters the system.
