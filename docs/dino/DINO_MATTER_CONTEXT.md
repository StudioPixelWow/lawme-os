# Matter Context Model

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

context/matter-context-assembler.ts. HARD RULE: allegations are never
merged into facts. Each `ContextItem` carries an epistemic status
(confirmed_fact, client_allegation, opposing_party_allegation,
document_derived_fact, inference, unknown, disputed_fact) and provenance
(origin, reference, recordedAt). Conflicting statements on the same field
become disputed_fact and raise an unresolved factual question.

POC inputs: explicit user-supplied context + synthetic matter fixtures.
Future: LawME matter records via the repository layer (fields already
modelled: identity, chronology, deadlines, restrictions). Matter context
is per-run, minimised per stage, and NOT persisted in the POC.
