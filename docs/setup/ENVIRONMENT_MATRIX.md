# LawME — Environment Matrix

| | Local | Development (hosted) | Vercel Preview | Staging | Production |
| --- | --- | --- | --- | --- | --- |
| **Supabase** | Local stack via Docker (`npm run db:start`) | Project **LawME** `udispadsbxqicmawqcuk` (ap-south-1) | Same dev project | ❌ does not exist yet | ❌ does not exist yet — must be a **separate** project before real data |
| **Vercel env** | — (`next dev`) | — | Preview (any non-main branch push) | Preview with staging vars (recommended) | Production (`main` push, auto) |
| **Database** | Local Postgres 17 | Dev Postgres 17.6 | Dev project | Staging project/branch (TBD) | Production project (TBD) |
| **Auth** | Local Supabase auth | Dev project auth | Dev project auth | TBD | Production auth only |
| **Storage** | Local buckets | Dev buckets | Dev buckets | TBD | Production buckets |
| **URL** | `http://localhost:3000` | — | `lawme-os-git-<branch>…vercel.app` | TBD | `lawme-os.vercel.app` (+ future custom domain) |
| **Env var names** | `.env.local` (ignored) | Vercel Development scope | Vercel Preview scope | Vercel Preview scope (staging values) | Vercel Production scope |
| **Data type** | Disposable synthetic | Synthetic / demo only | Synthetic | Realistic synthetic | Real client data (privileged!) |
| **Deploy** | `npm run dev` | — | push a branch | push `staging` branch (TBD) | push `main` (current: automatic) |
| **Migrations** | `supabase db reset --local` | `supabase db push` after founder approval | inherits dev | apply after staging sign-off | apply only with founder approval + backup |
| **Seed** | `supabase/seed.sql` on reset | manual, reviewed | — | reviewed staging seed | ❌ never seeded |
| **Access** | developer machine | dev team, read-only MCP | anyone with URL | dev team | founder-gated writes |
| **Reset policy** | freely | allowed (empty today) | n/a | allowed with notice | ❌ never |
| **Backups** | none needed | Supabase daily (plan-dependent) | n/a | plan-dependent | required before any migration |

## Current reality & the gap
Today there is ONE Supabase project (dev, empty) and Vercel deploys
**every `main` push straight to production**. That is fine while all
data is typed mocks — but before any real wiring:

1. **Create a production Supabase project** (or use Supabase branching)
   — paid decision, **founder approval required**. Dev project keeps
   dev keys; production keys go only to Vercel Production scope.
2. **Protect `main`** (PRs + required checks) and adopt a
   branch → preview → merge flow so production stops being every save.
3. Optional staging: a `staging` branch with Preview-scope staging vars
   is the cheapest practical path (no extra Vercel project needed).

No production data may ever be copied into local or preview
environments.
