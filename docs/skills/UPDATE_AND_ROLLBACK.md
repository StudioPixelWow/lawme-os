# Skills — Update & Rollback Procedure

**Law (LAWME SKILLS POLICY): every update requires a rollback path.**
Because all skills are vendored with `--copy`, the rollback path is always
git itself — every skill version ever installed is a commit away.

## Version pinning
Each skill has a per-skill tag in its category repo, e.g.
`v1.4.0-hebrew-rtl-best-practices` in `skills-il/localization`.
Current pinned versions: LAWME_SKILLS_REGISTRY.md (Ver column).

## Update procedure (one skill)
```bash
# 1. see what exists
git ls-remote --tags https://github.com/skills-il/<repo> | grep <slug>

# 2. review the delta BEFORE installing (security re-review is mandatory)
#    read the changed files on GitHub between the two tags

# 3. install the new pinned version over the vendored copy
npx -y skills-il@1.10.0 add skills-il/<repo>@v<NEW>-<slug> \
  --skill <slug> -a claude-code --copy -y
#    (if the skill is disabled, move the refreshed copy back into
#     .claude/skills-disabled/<workspace>/<slug>)

# 4. re-run the security sweep on the updated folder
#    (SECURITY_REVIEW.md §2 checklist) + npm run env:check

# 5. update LAWME_SKILLS_REGISTRY.md (version + last-verified date)

# 6. commit skill + registry together:
git add .claude/ docs/skills/LAWME_SKILLS_REGISTRY.md
git commit -m "skills: update <slug> v<OLD> → v<NEW>"
```

## Rollback procedure
```bash
# find the update commit
git log --oneline -- .claude/skills .claude/skills-disabled | head

# revert it (restores the previous vendored version AND the registry row)
git revert <commit>
```
No network needed to roll back — the old version is in history.

## Batch updates
Never update more than one *workspace group* in a single commit; a bad
update must be revertible without dragging unrelated skills with it.

## MCP updates
MCP servers are pinned by version in `.mcp.json` (e.g.
`@skills-il/kolzchut-mcp@1.0.1`). Update = new `npm pack` review →
founder approval → bump the pinned version → registry update. Rollback =
git revert of `.mcp.json`.

## CLI updates
Stay on `skills-il@1.10.0` until there is a reason to move; any bump gets
the same tarball inspection the current version received.
