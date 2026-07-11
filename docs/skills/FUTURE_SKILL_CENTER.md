# LawME Skill Center — Future Product Concept (NOT built)

**Status: concept only.** Per founder instruction (Skills-IL phase, Step 16)
no UI, no routes, no database tables were created. This document is the
blueprint for a later sprint.

## What it is
A LawME Admin workspace ("מרכז הכישורים") where the firm's administrator
sees and governs every capability installed in the office — the product
face of what today lives in `.claude/skills*` + docs/skills/.

## The object model
Each skill/MCP is a **Capability** with:

| Field | Today's source | Future source |
|---|---|---|
| Installed | directory presence | `capabilities` table |
| Enabled / Disabled | skills/ vs skills-disabled/ | `enabled` flag per firm |
| Update available | git ls-remote vs registry | background version check |
| Version | registry Ver column | semver column |
| Workspace | WORKSPACE_SKILL_MAP.md | FK → workspaces |
| Permissions | allowed-tools frontmatter | structured permission set |
| Trust status | SECURITY_REVIEW.md verdicts | reviewed / verified / pending / frozen |

## Screens (Design-Bible language: one hero object per screen)
1. **Capability board** — hero: the firm's active capability set, grouped
   by workspace exactly as the launcher cards group workspaces; gold accent
   only on items needing attention (update available, pending approval).
2. **Capability detail** — hero: the trust card (version, source,
   permissions, network profile, last security review) with a quiet
   activity line; actions: enable for workspace / freeze / request update.
3. **Approval queue** — hero: pending founder decisions (new install,
   update, account connection) — mirrors the "founder approval" gates that
   are manual today.

## Governance carried over from this phase (non-negotiable in product)
- Enable/disable is per-workspace, never global-by-default.
- Credentialed capabilities (WhatsApp, Gmail, Green Invoice, Cardcom, bank)
  require an explicit admin approval flow + vault-held secrets.
- Every update shows a diff summary and creates a rollback point.
- Trust states: **reviewed → protocol-verified → live-verified**;
  anything below "reviewed" cannot be enabled.
- דינו consumes capability output as untrusted data until validated.

## Migration path
Registry docs (docs/skills/*) are structured so their tables can be
imported as seed rows for the future `capabilities` schema — keep them
current and the product gets its data model for free.
