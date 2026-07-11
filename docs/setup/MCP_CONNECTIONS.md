# LawME — MCP Connections

Project-scoped configuration lives in **`.mcp.json`** (committed — it
contains endpoints only, never secrets). Authentication is per-user
OAuth in the browser on first use; tokens are stored by Claude Code
locally and never in the repository.

## Supabase — `https://mcp.supabase.com/mcp`
- Pinned via query params to the **development** project
  `udispadsbxqicmawqcuk` with `read_only=true` and a restricted feature
  set (`database, docs, debugging, development`).
- Capabilities: schema/table/migration inspection, advisors, logs,
  type generation, documentation search. **No write SQL, no migration
  application** — those go through the CLI workflow with approval.
- To connect: use any Supabase tool once → browser opens → approve the
  **StudioPixelWow org** and the **LawME** project.

## Vercel — `https://mcp.vercel.com`
- Team: `office-7152s-projects` · Project: `lawme-os`.
- Capabilities: projects, deployments, build & runtime logs, docs
  search. Deploy tooling exists but must never target production
  without founder approval.
- To connect: approve the OAuth prompt for the team above.

## GitHub — `https://api.githubcopilot.com/mcp/` (official remote)
- Toolsets restricted via header: repos, issues, pull_requests,
  actions, code_security. No org-administration tools.
- Fallback if remote OAuth is unreliable: `gh` CLI (already
  authenticated locally) — never paste a PAT into chat; if a PAT is
  ever unavoidable, set it privately: `gh auth login` or a shell env.
- To connect: approve OAuth for the GitHub account that owns
  `StudioPixelWow/lawme-os`.

## Context7 — `https://mcp.context7.com/mcp`
- Version-correct library documentation (`resolve-library-id`,
  `get-library-docs`). Optional API key can be added locally
  (`CONTEXT7_API_KEY` in your shell) for higher limits — never in git.
- Governing rule appended to AGENTS.md: consult Context7 / primary
  docs before any version-sensitive implementation.

## Playwright — `@playwright/mcp@latest` (stdio, local)
- Chromium only. Used to open localhost / preview deployments, inspect
  accessibility structure, click, type, screenshot, read console and
  network. Auth state, if ever needed, goes in `playwright/.auth/`
  (git-ignored) and never holds real credentials.

## Safety posture
- Supabase: read-only + project-scoped. Vercel/GitHub: inspection by
  default; mutations ask. Nothing account-wide where project scope
  exists. See AGENTS.md "Infrastructure guardrails".
