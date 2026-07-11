# Skills-IL — Installation Status (2026-07-11)

## Baseline
- Repo state before install: commit `972d09b` (environment-connection
  phase), clean working tree, branch `main`.
- CLI: `skills-il@1.10.0` (pinned), tarball security-reviewed before
  first execution (no postinstall, MIT, vercel-labs/skills fork).

## What was installed
- **40 / 40 skills** installed successfully via 7 batch commands
  (see SKILLS_IL_INSTALLATION_METHOD.md). 0 failures, 0 rejects.
- 1 substitution: no "gmail" skill exists on Skills-IL →
  `gws-hebrew-email-automation` installed instead.
- All installs project-scoped with `--copy` (files vendored into the repo,
  no symlinks, no runtime cache dependency).

## Resulting layout
```
.claude/skills/                     10 ACTIVE skills
.claude/skills-disabled/
  legal-research/                    2
  practice-packs/                   12
  documents/                         1
  communication/                     5
  automation/                        1
  finance/                           8
  future/                            1
```
Content: 163 markdown files, 37 python scripts, 1 shell script
(secrets-scanner.sh, read-only), 0 node binaries, 0 compiled artifacts.

## What was NOT done (by design)
- No skill connected to a real account (WhatsApp / Google / Green Invoice /
  Cardcom / bank). No credential entered anywhere.
- ~~No MCP server added to `.mcp.json`~~ **Update 2026-07-11 (Epic 0):**
  Kolzchut MCP connected with founder approval (pinned 1.0.1, read-only,
  no credentials) — see docs/legal-knowledge/KOL_ZCHUT_MCP_VALIDATION.md.
  The other four Israeli MCPs remain proposals (MCP_REGISTRY.md).
- No global (`~/.claude`) installation.
- No production or database change of any kind.

## Verification performed after install
See SECURITY_REVIEW.md (content scan) and the Step-14 test log in the
final sprint report: SKILL.md frontmatter loads, synthetic ID/phone script
tests pass, lint/typecheck/build green, `/today` renders under Playwright.

## Open items for the founder
1. Approve (or reject) the proposed MCP servers — MCP_REGISTRY.md.
2. Decide when the Finance workspace becomes real → which finance skills
   get activated and which credentials are provisioned (vault only).
3. israeli-bank-connector stays frozen until an explicit founder decision.
