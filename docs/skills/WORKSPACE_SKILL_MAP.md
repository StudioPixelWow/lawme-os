# LawME — Workspace ↔ Skill Activation Map

LawME is not one application — it is a system of workspaces (Design Bible).
Skills follow the same law: **the smallest scope that serves the task.**

## Global — always active (`.claude/skills/`)
These 10 apply to every LawME task, on every workspace:

| Layer | Skills |
|---|---|
| Language & layout | hebrew-rtl-best-practices · hebrew-i18n |
| Compliance | israeli-accessibility-compliance · israeli-privacy-shield · israeli-ai-compliance-kit |
| Security | israeli-appsec-scanner |
| Data foundations | israeli-postgres-toolkit · israeli-id-validator · israeli-phone-formatter |
| דינו quality | hebrew-llm-eval-suite |

## Workspace-scoped (activate on entry, deactivate on exit)

| Workspace | Directory | Skills |
|---|---|---|
| מחקר משפטי (Legal Research) | skills-disabled/legal-research/ | hebrew-legal-research · hebrew-nlp-toolkit |
| תיקים (Matters) | skills-disabled/practice-packs/ | the ONE pack matching the matter's practice area (12 available: employment ×3, rental, wills, divorce, patent, tenders, small-claims, fines, flight, car-accident) |
| מסמכים (Documents) | skills-disabled/documents/ | hebrew-document-generator |
| תקשורת (Communication) | skills-disabled/communication/ | israeli-whatsapp-business · gws-hebrew-email-automation · hebrew-chatbot-builder · hebrew-voice-bot-builder · israeli-chatbot-analytics — **content/planning only until accounts are approved** |
| אוטומציה (Automation) | skills-disabled/automation/ | n8n-hebrew-workflows (requires an n8n instance — none exists) |
| פיננסים (Finance) | skills-disabled/finance/ | israeli-financial-reports · israeli-expense-categorizer · green-invoice · hashavshevet-data-tools · israeli-vat-reporting · cardcom-payment-gateway · boi-economic-data · israeli-client-payment-chaser |
| — frozen — | skills-disabled/future/ | israeli-bank-connector (founder-only decision) |

## Activation procedure
```bash
# entering a Legal Research task:
mv .claude/skills-disabled/legal-research/hebrew-legal-research .claude/skills/
# … work …
# leaving the task:
mv .claude/skills/hebrew-legal-research .claude/skills-disabled/legal-research/
```
Rules:
1. Never activate all skills simultaneously (LAWME SKILLS POLICY).
2. Practice packs: exactly one pack per matter, matched to its practice
   area — never several packs at once (overlap risk: CONFLICT_MATRIX.md).
3. Finance and Communication skills may be activated for **drafting and
   analysis of local/synthetic data only**; any real account connection is
   a founder approval.
4. Every activation that outlives a single task must be recorded in
   LAWME_SKILLS_REGISTRY.md (enabled-state column).
