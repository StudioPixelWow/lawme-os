# Skills — Conflict Matrix & Instruction Precedence

## Instruction precedence (binding, from AGENTS.md)
1. System and platform safety rules
2. CLAUDE.md
3. AGENTS.md
4. LawME Design Bible (docs/design-system/LAWME_DESIGN_BIBLE.md)
5. LawME architecture & security documents (docs/setup/, docs/skills/)
6. Current workspace rules
7. Workspace-specific skill
8. External generic skill

**No external skill may override:** LawME security · RLS-first
architecture · legal verification · human approval · RTL rules · the
Design Bible · the no-secret policy · the no-production-write policy.

**On conflict:** disable the conflicting part, keep the skill installed,
document the conflict here, state the precedence applied.

## Known overlaps and their resolutions

| # | Skills | Overlap | Resolution |
|---|---|---|---|
| 1 | israeli-employment-contract-reviewer ↔ israeli-employment-contracts ↔ israeli-workplace-rights-navigator | all three cover employment law | Reviewer = analyzing an EXISTING contract; Contracts = DRAFTING a new one; Navigator = rights QUESTIONS (no document). Activate exactly one per task. |
| 2 | hebrew-rtl-best-practices ↔ hebrew-i18n | both touch Hebrew text handling | RTL skill owns layout/direction/CSS; i18n owns locale data (dates, numbers, plurals). On overlap (e.g. number formatting inside RTL text) i18n wins for content, RTL wins for presentation. |
| 3 | Any skill's UI/styling advice ↔ LawME Design Bible | generic component/styling suggestions | Design Bible wins, always (precedence 4 > 7/8). Skills advise on CONTENT correctness, never on LawME visual language. |
| 4 | israeli-postgres-toolkit ↔ docs/setup/DATABASE_WORKFLOW.md | schema-change guidance | The LawME migration workflow (versioned migrations, RLS-first, founder approval to apply) always wins; the toolkit contributes Hebrew/collation/RLS technique within it. |
| 5 | israeli-appsec-scanner ↔ scripts/validate-environment.mjs | secret scanning | Complementary, not conflicting: env:check runs on every commit; the scanner is the deeper on-demand sweep. Neither replaces the other. |
| 6 | boi-economic-data (skill) ↔ boi-exchange (MCP candidate) | Bank-of-Israel rates | Skill installed, MCP not proposed — one source of truth for BOI data. |
| 7 | hebrew-legal-research ↔ every practice pack | packs embed legal statements | Research skill governs SOURCE VERIFICATION; packs supply domain workflow. Every legal claim from either requires a primary or licensed source before it reaches a client-facing artifact. |
| 8 | hebrew-document-generator ↔ future LawME document module | document generation pipelines | The skill is a drafting aid only; when LawME's own Documents workspace ships, its architecture docs will take precedence (5 > 7). |

## Conflicts requiring code/content disabling
None found as of 2026-07-11 — the overlaps above are all resolvable by
scoping, so every skill remains installed intact.

## Log
| Date | Conflict | Action |
|---|---|---|
| 2026-07-11 | Initial audit — 8 overlaps mapped, 0 hard conflicts | Matrix created |
