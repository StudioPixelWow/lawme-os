# CLDM — Architectural Risks & Open Decisions

Planning-stage. These are the risks the model deliberately guards against and the
decisions that must be made *before* any implementation Epic begins.

## Architectural risks

1. **Identity-resolution false merges.** Merging two distinct judges/companies/
   people corrupts the graph and any legal reasoning over it. *Mitigation:*
   conservative thresholds, review band, reversible merges with retained
   pre-merge snapshots, per-field survivorship provenance. Person matching never
   uses national IDs and defaults to "distinct" under doubt.
2. **Over-modeling / rigidity.** Too many entity types or premature enums make the
   model brittle. *Mitigation:* controlled vocabularies as Reference data (not DB
   enums), `source_extras` escape hatch, additive-only evolution.
3. **Provenance/versioning storage blow-up.** Bitemporal versions + per-assertion
   provenance + embeddings can multiply row counts. *Mitigation:* `diff`
   change-kind for large texts, embeddings in a separate companion, snapshots only
   where point-in-time proof is required, partitioning left to implementation.
4. **Hebrew NLP quality.** FTS tokenization, name normalization, and citation
   parsing are materially harder in Hebrew (prefix particles, niqqud, RTL, mixed
   Arabic/English). *Mitigation:* Hebrew-first configs, dedicated normalization,
   chunk-level indexing; treat parser_version as a first-class provenance field so
   quality improvements are trackable.
5. **AI authority laundering.** Machine summaries/holdings being mistaken for
   primary law. *Mitigation:* derivations are separate, `unverified`, grounded to
   source spans, never written onto the entity, filterable out of authoritative
   answers.
6. **License/rights leakage.** Serving restricted or wrongly-attributed content.
   *Mitigation:* license on every Document Source, `cc-by` attribution
   propagation, fail-closed on restriction flags, join to Source Registry access
   status.
7. **PII / privacy exposure.** Judgments and registries contain personal data.
   *Mitigation:* PII minimization on Person, prohibition on storing national IDs,
   redaction_status on documents, RLS-first access (LawME security rule), retain
   only what the legal purpose requires.
8. **Citation-graph sparsity/errors.** Unresolved or mis-resolved citations
   degrade the authority graph. *Mitigation:* citations are first-class entities,
   dangling references retained, resolution is confidence-scored and revisable.
9. **Source coupling creep.** Collectors quietly pushing source-shaped fields into
   canonical columns. *Mitigation:* the conformance checklist in `07`;
   `source_extras` as the only sanctioned home for source-specifics.
10. **Coverage bias.** The open sources skew toward registries + legislation;
    case-law (highest value) is thin. The model must not present availability as
    completeness. *Mitigation:* `verification_status` + coverage metadata surfaced
    at query time so gaps are visible, not hidden.

## Open decisions (required before implementation)

1. **UUID strategy** — UUIDv4 vs v7 (v7 gives time-ordered locality for indexes).
   *Recommendation:* v7. Decision owner: platform/eng.
2. **Storage of edges** — one polymorphic edge table vs per-type edge tables vs a
   dedicated graph store alongside Postgres. *Recommendation:* start with typed
   edge tables in Postgres (graph-compatible), revisit a graph DB only if
   traversal depth demands it.
3. **Bitemporal scope** — full bitemporality everywhere vs valid_time-only for
   most entities with system_time reserved for legal-primary content. *Trade-off:*
   completeness vs storage/complexity.
4. **Vector store** — pgvector in the same Postgres vs an external vector DB.
   *Recommendation:* pgvector first (keeps provenance joins trivial).
5. **Hebrew FTS configuration** — which tokenizer/dictionary (built-in vs a
   custom Hebrew config vs an external analyzer). Needs a spike.
6. **Identity thresholds** — concrete auto-merge/review bounds per entity type;
   must be tuned on real data (deferred until data exists, kept as config).
7. **Holding/AI-derivation review workflow** — who verifies, and the SLA for
   `unverified → human_verified`. Product + legal decision.
8. **Granularity of Section versioning** — section-level vs subsection-level
   immutability for amendments. Affects point-in-time precision vs volume.
9. **Redaction policy** — how court/registry PII is redacted and whether redaction
   is stored as a derivation or applied at read time. Legal + privacy decision.
10. **Canonical-field promotion process** — the governance for moving a field from
    `source_extras` to a canonical field (who approves, how versioned).
11. **Multi-jurisis/language expansion** — whether International/comparative law
    (currently out of scope) will reuse this model or a federated one. Defer.

## Non-goals (restated)
No code, no migrations, no tables, no schema changes, no collectors, no further
discovery/audit. This is the architecture document that future collectors and the
implementation Epic build against.
