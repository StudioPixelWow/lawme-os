# LawME — Unified Legal Document Schema

**Status: schema definition only (Epic 0, Phase 9). No database migration
is created from this document without founder approval.**
Machine-readable: `unified-legal-document.schema.json` (JSON Schema
2020-12, validated).

## Design principles

1. **One envelope, eighteen document types.** Judgment, decision,
   legislation, regulation, order, bill, protocol, guidance, circular,
   regulator decision, ethics decision, academic article, internal firm
   document, pleading, contract, legal opinion, evidence, court filing —
   all share identity, provenance, verification and licensing fields;
   type-specific fields (case metadata, legislative dates) are nullable.
2. **Identity is internal.** `document_id` is a LawME ULID; source
   identifiers (case numbers, gov.il IDs) are attributes, because source
   IDs mutate, collide across courts, and vanish with site redesigns.
3. **Provenance is required.** Every non-firm document must record where,
   when and how it was retrieved. A document without provenance cannot
   reach `verified_*` status (trust model rule 3).
4. **Verification is a status, not an assumption.** `verification_status`
   uses the trust model's labels; `authority_type` (binding/persuasive/
   secondary) is never defaulted — unknown stays `unknown`.
5. **Time is multi-dimensional.** Document date ≠ publication date ≠
   effective date ≠ version date ≠ ingestion date ≠ verification date.
   Legislation answers are wrong without `version_date`; monitoring is
   impossible without `ingestion_date`/`verification_date`.
6. **Storage policy is per-document.** `store_full` (open/licensed
   content), `store_extract` (metadata + limited extract), `pointer_only`
   (tier-6 mirrors, permission-unclear sources — we keep the reference,
   not the copy). Enforces the registry's rag_permission findings.
7. **Citations are structured edges in waiting.** `statutes_cited` and
   `cases_cited` carry normalized references + optional resolved
   `target_document_id` + treatment + pinpoint location. The knowledge
   graph consumes these directly.
8. **AI extractions are labeled.** `ratio`, `obiter`, treatment
   classifications and other model outputs are `inference` until human
   or rule-based verification upgrades them.
9. **Versioning + hash.** Every record has a SHA-256 of the retrieved
   original and an incrementing version; prior versions are retained
   (correction/removal process in the update pipeline depends on this).
10. **Anchors enable pinpoint citation.** Stable paragraph/page anchors
    let answers cite כתב טענות עמ' 4 פסקה 12-style locations and let the
    citator record exactly where a citation occurs.

## Field groups (full definitions in the JSON Schema)

| Group | Fields |
|---|---|
| Identity | document_id, document_type, source_id, source_type |
| Location | canonical_source_url, original_file_url |
| Titles | title, title_he, title_en |
| Time | document/publication/effective/version/ingestion/verification dates |
| Judicial | case_number(+raw), procedure_type, court, chamber, judges, panel_size, parties, lawyers |
| Substance | legal_domains, legal_issues, outcome, remedies, amounts, majority_minority, ratio, obiter |
| Citations | statutes_cited[], cases_cited[] (with treatment + location), cases_citing[], citation_locations[], paragraph/page anchors |
| Treatment | appeal_status, later_treatment |
| Content | full_text, extracted_text, page_count, language, ocr_status |
| Integrity | hash, version, metadata_confidence |
| Governance | verification_status, authority_type, license_status, storage_policy, retention_policy |
| Scores | source_reliability, authority_score |
| LawME | matter_ids, provenance{} |

## Mapping to future Supabase schema (informative only)
The envelope maps naturally onto: `documents` (core), `document_parties`,
`document_citations` (edges), `document_versions`, `document_anchors` —
all RLS-by-firm from the first migration, per DATABASE_WORKFLOW.md. The
graph model (LEGAL_KNOWLEDGE_GRAPH_ARCHITECTURE.md) consumes the same
citation rows. **Deliberately not migrated in Epic 0.**

## Validation examples
Synthetic sample instances live in `benchmark/sample-tasks.json` (the
benchmark tasks reference documents in this envelope). The schema itself
compiles under ajv (draft 2020-12) — checked in Phase 21 validation.
