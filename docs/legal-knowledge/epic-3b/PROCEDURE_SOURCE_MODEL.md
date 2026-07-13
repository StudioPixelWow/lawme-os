# Procedure Source Model (Epic 3B Triad, Pillar C)

Every procedural rule preserves provenance and distinguishes its legal
weight. `SourceLink.kind`:
- **legislation** — statute/regulation (mandatory_law)
- **court_rules** — labor-court procedure rules (mandatory_law)
- **case_law** — binding/persuasive judgment (recommended, pending verify)
- **official_guidance** — ministry/NII (recommended)
- **professional_practice** — accepted lawyering practice (best_practice — NOT law)
- **firm_practice** — firm convention (best_practice — NOT law)

INVARIANT (validated): a rule may be `authority="mandatory_law"` only if its
kind is legislation / court_rules / case_law / official_guidance.
Professional/firm practice is never presented as mandatory law. Dino
surfaces the distinction so a lawyer sees what is required vs recommended.
