# Skills-IL — Installation Method (verified 2026-07-11)

## Source
- Site: https://agentskills.co.il/he (Hebrew) — Israeli agent-skills directory.
- Skills live in public GitHub repos under the **skills-il** organization,
  one repo per category: `localization`, `legal-tech`, `tax-and-finance`,
  `accounting`, `communication`, `security-compliance`, `developer-tools`,
  `government-services`, `mcps`.
- MCP directory: https://agentskills.co.il/he/mcp (42 servers listed).

## Official install method
The site's documented method is the **skills-il CLI** (npm), a fork of
`vercel-labs/skills` (MIT):

```bash
npx skills-il@1.10.0 add skills-il/<category-repo>[@tag] \
  --skill <slug> [<slug> …] -a claude-code --copy -y
```

- `-a claude-code` → installs into the **project-scoped** `.claude/skills/`
  directory (the format Claude Code loads natively).
- `--copy` → copies files instead of symlinking (repo stays self-contained,
  no runtime dependency on a cache directory).
- `-y` → non-interactive.
- Version pinning: every skill has per-skill git tags in its category repo,
  e.g. `v1.4.0-hebrew-rtl-best-practices`. Pin with
  `skills-il/localization@v1.4.0-hebrew-rtl-best-practices`.
- Management: `npx skills-il ls` (list installed), `npx skills-il remove <slug>`.

## CLI safety review (performed before first run)
- Tarball `skills-il@1.10.0` inspected before execution:
  MIT license, fork of vercel-labs/skills, **no postinstall scripts**,
  no telemetry beyond npm itself, writes only under `.claude/skills/`.
- Verdict: safe to run. Pinned invocation (`skills-il@1.10.0`) used for
  reproducibility.

## Exact commands used for the LawME install (2026-07-11)
```bash
npx -y skills-il@1.10.0 add skills-il/localization       --skill hebrew-rtl-best-practices hebrew-document-generator hebrew-nlp-toolkit hebrew-i18n israeli-accessibility-compliance -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/developer-tools    --skill hebrew-llm-eval-suite israeli-postgres-toolkit israeli-id-validator israeli-phone-formatter hebrew-chatbot-builder n8n-hebrew-workflows hebrew-voice-bot-builder israeli-chatbot-analytics -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/security-compliance --skill israeli-appsec-scanner israeli-privacy-shield israeli-ai-compliance-kit hebrew-legal-research -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/communication      --skill israeli-whatsapp-business gws-hebrew-email-automation -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/legal-tech         --skill israeli-employment-contract-reviewer israeli-employment-contracts israeli-workplace-rights-navigator israeli-rental-agreements israeli-wills-inheritance israeli-divorce-navigator israeli-patent-guide israeli-tender-proposal-builder israeli-small-claims-court israeli-fines-fighter israeli-flight-compensation israeli-car-accident-claim -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/accounting         --skill israeli-financial-reports israeli-expense-categorizer green-invoice hashavshevet-data-tools -a claude-code --copy -y
npx -y skills-il@1.10.0 add skills-il/tax-and-finance    --skill israeli-vat-reporting cardcom-payment-gateway boi-economic-data israeli-client-payment-chaser israeli-bank-connector -a claude-code --copy -y
```
All 40 skills installed successfully into `.claude/skills/<slug>/`.

## LawME activation-scope layout (post-install reorganization)
Claude Code has **no native enable/disable toggle** for project skills —
anything under `.claude/skills/` is active. LawME therefore implements
"smallest activation scope" with a two-directory convention:

```
.claude/
  skills/            ← ACTIVE (10) — loaded by Claude Code on every session
  skills-disabled/   ← INSTALLED BUT INACTIVE (30) — grouped by workspace
    legal-research/  practice-packs/  documents/
    communication/   automation/      finance/   future/
```

To activate a skill for a task: `mv .claude/skills-disabled/<ws>/<slug> .claude/skills/`
(and move it back when the task ends). See WORKSPACE_SKILL_MAP.md for
which workspace activates what, and UPDATE_AND_ROLLBACK.md for versioning.
