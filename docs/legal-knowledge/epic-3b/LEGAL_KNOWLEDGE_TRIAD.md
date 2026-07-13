# LawME Legal Knowledge Triad (Epic 3B redirected)

LawME is built around CONNECTED legal knowledge, not documents alone. The
permanent model: Legislation ↕ Case Law ↕ Procedure ↕ Documents ↕ Evidence
↕ Deadlines ↕ Actions ↕ Matter Context ↕ Outcome. Dino must answer both
"what is the law?" and "what should the lawyer do next?".

Three pillars, developed in parallel from the start:
- **Pillar A — Legislation**: version-certain statute/order metadata
  (`legislation/`, `extension-orders/`) + 3 real official records captured
  (severance, women's employment, prior notice).
- **Pillar B — Case Law**: authority model + 20 curated candidate judgment
  records pointing to the official judiciary source (`case-law/`).
- **Pillar C — Legal Procedure Graph**: 11 connected employment procedures
  (`procedure/`), each stage linked to legislation/evidence/deadlines/actions.

A correct statute without interpretation is insufficient; judgments without
procedure are insufficient; a workflow without authority is insufficient.
The **triad coverage model** (`triad/coverage.ts`) enforces this: a
substantive matter recommendation is allowed only for `triad_complete` or a
justified statute-driven partial where the only missing pillar (case law)
is disclosed. 24 tests across the three pillars.
