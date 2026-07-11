# LawME — Deployment Workflow

## How deployment works today
- Vercel project `lawme-os` is connected to GitHub
  `StudioPixelWow/lawme-os`.
- **Every push to `main` builds and deploys PRODUCTION automatically**
  (`lawme-os.vercel.app`). 19 deployments so far, all green, Turbopack,
  Node 24.x.
- Any push to another branch creates a **Preview** deployment at
  `lawme-os-git-<branch>-office-7152s-projects.vercel.app`.

## The recommended flow (once real data exists)
1. Work on a feature branch → push → Vercel Preview.
2. Verify the preview (Playwright checks: /today, RTL, overflow,
   console).
3. PR → review → merge to `main` → production deploy.
4. Protect `main` with required checks (lint, typecheck, build) —
   founder decision, see CONNECTION_STATUS.md.

## Inspection (safe, no approval needed)
- Vercel MCP: `list_deployments`, `get_deployment`,
  `get_deployment_build_logs`, `get_runtime_logs`.
- Local: `npm run build` must pass before any push.

## Guardrails
- No manual production deploys (`vercel --prod`) — production ships
  only through `main`, and while the auto-deploy model stands, pushing
  `main` IS deploying. Treat `git push` on main accordingly.
- Rollback: Vercel dashboard → previous READY deployment → "Promote"
  — founder approval required.
- Environment variables change only in the Vercel dashboard, per
  scope, by the founder (or with explicit approval); never via chat.
