# LawME — Connection Status

Last verified: **2026-07-11** (during the environment-connection phase).
No secret values appear in this document.

| Service | Connected | Auth method | Scope | Read/Write | Project | Last verified | Remaining action | Founder approval required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase MCP | ✅ (verified via Cowork session; project entry in `.mcp.json`) | OAuth (browser) | Project-scoped: LawME dev | **Read-only** | `udispadsbxqicmawqcuk` · LawME · ap-south-1 | 2026-07-11 | First local Claude Code use: approve OAuth in browser | For any write / migration apply |
| Supabase CLI | ⚙️ installed as devDependency (v2.109.x) | `SUPABASE_ACCESS_TOKEN` (local shell only) | LawME dev project | Local only | same | 2026-07-11 | Run `supabase link --project-ref udispadsbxqicmawqcuk` once locally | Linking is safe; remote pushes always ask |
| Local Supabase (Docker) | ❌ not running | — | local | local | — | 2026-07-11 | Requires Docker Desktop on the Mac; then `npm run db:start` | No |
| Vercel MCP | ✅ verified | OAuth (browser) | Team `office-7152s-projects` | Read (inspection) | `lawme-os` (prj_RkpYU0Wm…) | 2026-07-11 | First local Claude Code use: approve OAuth | For deploys / env-var changes |
| Vercel ⇄ GitHub integration | ✅ live | Vercel Git integration | repo → production | Auto-deploy on push to `main` | StudioPixelWow/lawme-os | 2026-07-11 | — (note: every push deploys production!) | Consider protecting main / preview flow |
| Vercel CLI | ❌ not installed locally | OAuth (`vercel login`) | — | — | — | 2026-07-11 | `npm i -g vercel && vercel link` on the Mac when needed | No |
| GitHub MCP | ⚙️ configured in `.mcp.json` (official remote) | OAuth (browser) | repos, issues, PRs, actions, code security | Read + repo ops | StudioPixelWow/lawme-os | 2026-07-11 | First local Claude Code use: approve OAuth | For releases / Actions changes |
| GitHub repo | ✅ verified (remote, branch, pushes) | git over https | repository | Push access works | StudioPixelWow/lawme-os · main · **public** | 2026-07-11 | Consider making the repo private | Visibility change = founder call |
| Playwright MCP | ⚙️ configured in `.mcp.json` (`@playwright/mcp`, Chromium) | none (local) | project | Local browser | — | 2026-07-11 | First run downloads Chromium locally if missing | No |
| Context7 MCP | ⚙️ configured in `.mcp.json` (official remote) | OAuth / optional API key (local) | docs lookup | Read-only | — | 2026-07-11 | Approve on first use; optional key via local env | No |
| Local dev server | ✅ verified (this session: build + /today load) | — | local | — | — | 2026-07-11 | — | No |

**Key facts discovered in the audit**
- Supabase **LawME** project exists (created 2026-07-10), is **empty** (0 tables, 0 migrations, 0 edge functions, 0 security findings) → safe to designate as the DEVELOPMENT project. A separate PRODUCTION project should be created before real client data (paid decision — founder approval).
- Vercel **lawme-os** project exists with 19 deployments, all from GitHub pushes to `main`, latest = `61a2fc1` (Liquid Gold) — **READY** at `lawme-os.vercel.app`. Framework: Next.js, Node 24.x, Turbopack.
- **Every push to `main` deploys production.** There is no staging branch. See ENVIRONMENT_MATRIX.md for the recommended flow.
- The GitHub repository is **public**.
