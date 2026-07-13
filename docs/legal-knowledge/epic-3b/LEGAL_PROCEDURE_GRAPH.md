# Legal Procedure Graph (Epic 3B Triad, Pillar C)

`src/modules/legal-knowledge/procedure` (types, graph, catalog; 9 tests).
Procedure is a GRAPH of stages/transitions, never a flat checklist.

Models: procedure · stage (kind, actor, required facts, evidence,
documents, deadlines, actions, risks, exceptions) · transition (next /
alternative / conditional / appeal) · requirement · deadline (basis, strict)
· action (human-approval gated) · evidence · source-link.

**Provenance + law-vs-practice separation is enforced**: every rule carries
a `SourceLink` with `kind` (legislation / court_rules / case_law /
official_guidance / professional_practice / firm_practice) and `authority`
(mandatory_law / recommended / discretionary / best_practice). The graph
validator REJECTS any rule marked `mandatory_law` whose source kind is
professional/firm practice — best practice can never be presented as law
(tested). External actions (file/serve/appeal/enforce) always require human
approval.
