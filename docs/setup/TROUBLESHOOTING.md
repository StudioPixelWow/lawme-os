# LawME — Troubleshooting

## MCP
- **MCP server missing in Claude Code** → `claude mcp list` in the repo;
  `.mcp.json` is project-scoped so it loads only inside this folder.
  First use triggers browser OAuth — approve the org/team listed in
  MCP_CONNECTIONS.md.
- **Supabase MCP refuses writes** → by design (`read_only=true`).
  Writes go through the migration workflow.
- **GitHub remote MCP OAuth fails** → fall back to `gh` CLI
  (`gh auth login`), or GitHub's official local MCP server.

## Build & dev
- **`next build` fails after dependency change** → `rm -rf .next` and
  rebuild; check the bundled Next 16 docs before changing config.
- **Fonts missing offline** → fonts are npm-vendored
  (`@fontsource-variable/*`); do not reintroduce Google Fonts URLs
  (blocked in sandboxed environments).
- **`error.tsx` retry** → Next 16 renamed `reset` to `unstable_retry`.
- **Hebrew filenames in `public/brand/`** → keep exact names; they are
  URL-encoded automatically by Next/Image.

## Supabase
- **`supabase start` fails** → Docker Desktop not running, or port
  collision (54321-54329) — adjust `supabase/config.toml`.
- **`db:types` fails with 401** → `SUPABASE_ACCESS_TOKEN` not exported
  in the shell.
- **Advisors show findings after a migration** → fix before merging;
  RLS-off tables are release blockers.

## Vercel
- **Preview didn't build** → Vercel MCP `get_deployment_build_logs`
  with `errorsOnly: true`.
- **Which commit is live?** → `get_project` → `latestDeployment`
  (compare SHA to `git log`).

## Cloud sandbox (Cowork) specifics
- No Docker daemon → local Supabase stack runs only on the Mac.
- Device bridge cannot `rm` or unlink — stale `.git/*.lock` files are
  moved into `_to_delete/` before every git operation (known pattern).
- `pkill` exits 144 and kills command chains — run it isolated.
