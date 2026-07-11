# Skills-IL — Candidate Catalog for LawME (resolved 2026-07-11)

Every candidate below was resolved against the real skills-il repos via
`git ls-remote --tags` — **no names were guessed**. Decision legend:
**ACTIVE** = installed in `.claude/skills/` · **DISABLED** = installed in
`.claude/skills-disabled/<workspace>/` · **FUTURE** = installed disabled,
requires founder approval + credentials before any use.

## Core skills (15)

| # | Skill | Version | Repo | Decision |
|---|-------|---------|------|----------|
| 1 | hebrew-rtl-best-practices | 1.4.0 | localization | ACTIVE |
| 2 | hebrew-i18n | 1.2.2 | localization | ACTIVE |
| 3 | israeli-accessibility-compliance | 1.3.0 | localization | ACTIVE |
| 4 | israeli-privacy-shield | 1.4.2 | security-compliance | ACTIVE |
| 5 | israeli-ai-compliance-kit | 1.2.0 | security-compliance | ACTIVE |
| 6 | israeli-appsec-scanner | 1.2.0 | security-compliance | ACTIVE |
| 7 | israeli-postgres-toolkit | 1.2.0 | developer-tools | ACTIVE |
| 8 | israeli-id-validator | 1.1.2 | developer-tools | ACTIVE |
| 9 | israeli-phone-formatter | 1.2.1 | developer-tools | ACTIVE |
| 10 | hebrew-llm-eval-suite | 1.2.0 | developer-tools | ACTIVE |
| 11 | hebrew-legal-research | 1.4.0 | security-compliance | DISABLED → legal-research |
| 12 | hebrew-nlp-toolkit | 1.3.0 | localization | DISABLED → legal-research |
| 13 | hebrew-document-generator | 1.7.1 | localization | DISABLED → documents |
| 14 | israeli-whatsapp-business | 1.2.0 | communication | DISABLED → communication |
| 15 | n8n-hebrew-workflows | 2.3.0 | developer-tools | DISABLED → automation |

## Legal practice packs (13 requested → 12 found + 1 substitution note)

| # | Skill | Version | Repo | Decision |
|---|-------|---------|------|----------|
| 16 | israeli-employment-contract-reviewer | 1.1.0 | legal-tech | DISABLED → practice-packs |
| 17 | israeli-employment-contracts | 1.1.0 | legal-tech | DISABLED → practice-packs |
| 18 | israeli-workplace-rights-navigator | 1.2.0 | legal-tech | DISABLED → practice-packs |
| 19 | israeli-rental-agreements | 1.2.0 | legal-tech | DISABLED → practice-packs |
| 20 | israeli-wills-inheritance | 1.0.2 | legal-tech | DISABLED → practice-packs |
| 21 | israeli-divorce-navigator | 1.0.0 | legal-tech | DISABLED → practice-packs |
| 22 | israeli-patent-guide | 1.2.0 | legal-tech | DISABLED → practice-packs |
| 23 | israeli-tender-proposal-builder | 1.2.0 | legal-tech | DISABLED → practice-packs |
| 24 | israeli-small-claims-court | 1.2.0 | legal-tech | DISABLED → practice-packs |
| 25 | israeli-fines-fighter | 1.3.0 | legal-tech | DISABLED → practice-packs |
| 26 | israeli-flight-compensation | 1.0.0 | legal-tech | DISABLED → practice-packs |
| 27 | israeli-car-accident-claim | 1.0.0 | legal-tech | DISABLED → practice-packs |

## Finance & office-ops (8)

| # | Skill | Version | Repo | Decision |
|---|-------|---------|------|----------|
| 28 | israeli-financial-reports | 1.2.0 | accounting | DISABLED → finance |
| 29 | israeli-expense-categorizer | 2.0.0 | accounting | DISABLED → finance |
| 30 | green-invoice | 1.3.1 | accounting | DISABLED → finance |
| 31 | hashavshevet-data-tools | 1.2.0 | accounting | DISABLED → finance |
| 32 | israeli-vat-reporting | 1.4.0 | tax-and-finance | DISABLED → finance |
| 33 | cardcom-payment-gateway | 2.1.1 | tax-and-finance | DISABLED → finance |
| 34 | boi-economic-data | 1.2.0 | tax-and-finance | DISABLED → finance |
| 35 | israeli-client-payment-chaser | 1.4.0 | tax-and-finance | DISABLED → finance |

## Future / credentialed (5)

| # | Skill | Version | Repo | Decision |
|---|-------|---------|------|----------|
| 36 | israeli-bank-connector | 1.2.2 | tax-and-finance | FUTURE (bank credentials — founder only) |
| 37 | gws-hebrew-email-automation | 1.4.0 | communication | DISABLED → communication (Gmail substitution, see below) |
| 38 | hebrew-chatbot-builder | 1.4.0 | developer-tools | DISABLED → communication |
| 39 | hebrew-voice-bot-builder | 1.2.1 | developer-tools | DISABLED → communication |
| 40 | israeli-chatbot-analytics | 1.2.0 | developer-tools | DISABLED → communication |

## Not found / substitutions
- A dedicated **"gmail" skill does not exist** on Skills-IL. Closest match
  installed instead: `gws-hebrew-email-automation` (Google-Workspace Hebrew
  email automation) — recorded as a substitution.
- All other requested names resolved exactly.

## Israeli MCP servers (5 requested — see MCP_REGISTRY.md)
kolzchut (`@skills-il/kolzchut-mcp` 1.0.1, org-maintained) ·
data.gov.il (datagov-israel / data-gov-il) · Knesset (knesset) ·
State budget (il-budget / budgetkey) · CBS statistics (israel-statistics /
israeli-cbs). None enabled — proposal only, founder approval required.
