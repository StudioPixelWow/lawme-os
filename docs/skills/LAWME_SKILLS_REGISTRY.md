# LawME Skills Registry — source of truth

**Rule (LAWME SKILLS POLICY, AGENTS.md):** every installed or updated skill
MUST be recorded here, with a version and a rollback path.
Last full audit: **2026-07-11**.

## Common record (applies to all 40 skills)
- **Source page:** https://agentskills.co.il/he · **Creator:** Skills-IL org
  (github.com/skills-il) · **License:** MIT (each SKILL.md frontmatter).
- **Trust status:** community directory, org-curated; content
  security-scanned by LawME on 2026-07-11 (see SECURITY_REVIEW.md).
  Skills-IL verification: listed skills carry per-skill version tags in the
  org repos (verified via `git ls-remote --tags`).
- **Installation scope:** project (`-a claude-code --copy`), never global.
- **Install command:** see SKILLS_IL_INSTALLATION_METHOD.md (exact batches).
- **File access:** skill folder + repo workspace only. **Shell access:** per
  `allowed-tools` column below (— means none declared → instructions-only).
- **Update method / rollback:** UPDATE_AND_ROLLBACK.md (pin to per-skill tag;
  rollback = git revert of the vendored copy).
- **Activation rule:** skills in `.claude/skills/` load always; anything in
  `.claude/skills-disabled/<workspace>/` is moved in only for a matching
  workspace task and moved back afterwards (WORKSPACE_SKILL_MAP.md).

## ACTIVE — `.claude/skills/` (10)

| Skill | שם עברי | Ver | Repo | Purpose / LawME use | allowed-tools | Network | Secrets/Accounts |
|---|---|---|---|---|---|---|---|
| hebrew-rtl-best-practices | שיטות עבודה מומלצות ל-RTL | 1.4.0 | localization | RTL layout law for every UI change | — | none | none |
| hebrew-i18n | בינלאומיות עברית | 1.2.2 | localization | Hebrew locale, dates, plurals, BiDi text | — | none | none |
| israeli-accessibility-compliance | נגישות אתרים ישראלית | 1.3.0 | localization | IS-5568/WCAG audits of LawME screens | Bash(python, pip) | only the URL the operator passes (audit script) — use on localhost/preview only | none |
| israeli-privacy-shield | מגן פרטיות ישראלי | 1.4.2 | security-compliance | Privacy-law (תיקון 13) checklists for client data | — | none | none |
| israeli-ai-compliance-kit | ערכת תאימות AI ישראלית | 1.2.0 | security-compliance | AI-policy guardrails for דינו features | — | none | none |
| israeli-appsec-scanner | סורק אבטחת אפליקציות | 1.2.0 | security-compliance | Read-only secret/vuln scans of the repo | Bash(python) + secrets-scanner.sh (read-only) | none | none |
| israeli-postgres-toolkit | ערכת כלים לפוסטגרס | 1.2.0 | developer-tools | Hebrew-aware Postgres/RLS schema guidance for Supabase | — | none | none |
| israeli-id-validator | מאמת תעודת זהות | 1.1.2 | developer-tools | ת"ז / ח"פ validation for client intake forms | Bash(python) | none | none |
| israeli-phone-formatter | מפרמט טלפונים ישראלי | 1.2.1 | developer-tools | IL phone normalize/E.164 for contacts & WhatsApp | Bash(python) | none | none |
| hebrew-llm-eval-suite | חבילת הערכת LLM בעברית | 1.2.0 | developer-tools | Evaluate דינו Hebrew output quality | — | none | none |

## DISABLED — `.claude/skills-disabled/` (30)

### legal-research/ (workspace: מחקר משפטי)
| Skill | שם עברי | Ver | Repo | allowed-tools | Notes |
|---|---|---|---|---|---|
| hebrew-legal-research | מחקר משפטי בעברית | 1.4.0 | security-compliance | — | External legal content not authoritative until verified against primary sources |
| hebrew-nlp-toolkit | ערכת כלי NLP לעברית | 1.3.0 | localization | Bash(python, pip) | Hebrew tokenization/NER for document analysis |

### practice-packs/ (workspace: תיקים — activate ONE pack per matter type)
| Skill | שם עברי | Ver | allowed-tools |
|---|---|---|---|
| israeli-employment-contract-reviewer | ביקורת חוזה העסקה | 1.1.0 | — |
| israeli-employment-contracts | חוזה עבודה ישראלי | 1.1.0 | Bash(python) |
| israeli-workplace-rights-navigator | ניווט זכויות עובדים | 1.2.0 | Bash(python) |
| israeli-rental-agreements | חוזי שכירות ישראליים | 1.2.0 | — |
| israeli-wills-inheritance | צוואות וירושה | 1.0.2 | — |
| israeli-divorce-navigator | מנווט הגירושין | 1.0.0 | — |
| israeli-patent-guide | מדריך פטנטים ישראלי | 1.2.0 | — |
| israeli-tender-proposal-builder | בונה הצעות למכרזים | 1.2.0 | — |
| israeli-small-claims-court | תביעות קטנות | 1.2.0 | — |
| israeli-fines-fighter | לוחם הקנסות | 1.3.0 | — |
| israeli-flight-compensation | פיצוי על טיסות | 1.0.0 | Bash(python3) |
| israeli-car-accident-claim | תביעת תאונת רכב | 1.0.0 | Bash(python3) |
All 12: repo `legal-tech`, no network, no secrets.

### documents/ (workspace: מסמכים)
| hebrew-document-generator | מחולל מסמכים בעברית | 1.7.1 | localization | Bash(python, pip, node, npm) — RTL DOCX/PDF generation, no network |

### communication/ (workspace: תקשורת — **external accounts, founder approval before ANY connection**)
| Skill | שם עברי | Ver | Repo | Network / accounts |
|---|---|---|---|---|
| israeli-whatsapp-business | וואטסאפ עסקי ישראלי | 1.2.0 | communication | Meta WhatsApp Business API — token required, NOT connected |
| gws-hebrew-email-automation | אוטומציית מייל GWS | 1.4.0 | communication | Google Workspace OAuth — NOT connected (Gmail substitution) |
| hebrew-chatbot-builder | בונה צ'אטבוט בעברית | 1.4.0 | developer-tools | webhook handler script (server-side) — not deployed |
| hebrew-voice-bot-builder | בונה בוטים קוליים | 1.2.1 | developer-tools | telephony/TTS vendors — none connected |
| israeli-chatbot-analytics | אנליטיקת צ'אטבוטים | 1.2.0 | developer-tools | none until a bot exists |

### automation/ (workspace: אוטומציה)
| n8n-hebrew-workflows | תהליכי עבודה n8n | 2.3.0 | developer-tools | Bash(n8n, curl, node, npx, docker) — requires an n8n instance; none exists; stays disabled |

### finance/ (workspace: פיננסים — **founder approval before ANY account/credential**)
| Skill | שם עברי | Ver | Repo | Accounts |
|---|---|---|---|---|
| israeli-financial-reports | דוחות כספיים ישראליים | 1.2.0 | accounting | none (local analysis) |
| israeli-expense-categorizer | מיון הוצאות עסקיות | 2.0.0 | accounting | none (local analysis) |
| green-invoice | חשבונית ירוקה (מורנינג) | 1.3.1 | accounting | Green Invoice API key — NOT connected |
| hashavshevet-data-tools | כלי נתונים לחשבשבת | 1.2.0 | accounting | Hashavshevet exports (local files only) |
| israeli-vat-reporting | דיווח מע"מ ישראלי | 1.4.0 | tax-and-finance | none (guidance) |
| cardcom-payment-gateway | שער תשלומים קארדקום | 2.1.1 | tax-and-finance | Cardcom terminal credentials — NOT connected |
| boi-economic-data | נתונים כלכליים מבנק ישראל | 1.2.0 | tax-and-finance | public BOI API (no key) — script network-reviewed |
| israeli-client-payment-chaser | גובה חובות לקוחות | 1.4.0 | tax-and-finance | sends nothing itself; drafts only |

### future/ (no workspace — founder-only)
| israeli-bank-connector | מחבר בנקאות ישראלי | 1.2.2 | tax-and-finance | Bank credentials. **Never activate without explicit founder approval and a security re-review.** |

## Status summary
- Installed: 40 · Active: 10 · Disabled: 30 · Rejected for security: 0
  (all passed content scan; risk is concentrated in credentialed
  integrations, which are structurally disabled).
- Skills requiring authentication before real use: israeli-whatsapp-business,
  gws-hebrew-email-automation, green-invoice, cardcom-payment-gateway,
  israeli-bank-connector, n8n-hebrew-workflows (instance), hebrew-voice-bot-builder (vendors).
- Conflicts: see CONFLICT_MATRIX.md. MCPs: see MCP_REGISTRY.md.
