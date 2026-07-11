# LawME — Legal Intelligence POC Schema

**Migration:** `supabase/migrations/20260711155956_legal_intelligence_poc_foundation.sql`
**Status: prepared and locally validated — NOT applied remotely.** Applying
to the hosted dev project requires founder approval (`npx supabase db push`).

## Validation performed (2026-07-11)
Applied end-to-end on a local PostgreSQL 16.13 cluster with pgvector +
pg_trgm and a Supabase-compatible `auth` stub: **23 tables created, RLS
enabled on all 23, 40 policies**, and the 11-test cross-tenant suite
(`supabase/tests/rls_validation.sql`) passes. No remote database was
touched.

## Table map (23)

| Group | Tables | Tenancy |
|---|---|---|
| Identity | organizations · profiles · organization_memberships | mixed (see RLS doc) |
| Source registry | legal_sources | GLOBAL, service-written |
| Documents | legal_documents · legal_document_versions · legal_document_files · legal_document_text · legal_document_sections | GLOBAL (org_id NULL) or PRIVATE (org_id set) |
| Entities & graph | legal_entities · legal_document_entities · legal_citations | GLOBAL reference / follows parent doc |
| Ingestion | legal_source_fetches | GLOBAL, service-only |
| Embeddings | legal_embeddings | follows parent doc; service-written |
| Research | legal_research_sessions · legal_research_queries · legal_research_results · legal_answer_claims · legal_claim_citations | ORGANIZATION-PRIVATE |
| Benchmark | benchmark_tasks · benchmark_runs · benchmark_results | GLOBAL; ground truth service-written |
| Audit | audit_events | immutable, org-scoped read |

## Key design decisions
1. **Public/private split by `organization_id NULL-ness`** on
   legal_documents, enforced by RLS (not by convention). Child tables
   (versions/text/sections/files/embeddings) inherit via SECURITY DEFINER
   helpers `app.can_read_document` / `app.can_write_document`.
2. **Vocabulary parity with Epic 0**: document_type (18 values),
   authority_type, verification_status, storage_policy, treatment,
   claim labels — the CHECK constraints use exactly the enums of
   `unified-legal-document.schema.json` and the trust model. One
   vocabulary, two representations.
3. **Hebrew lexical strategy**: PostgreSQL has no Hebrew stemmer →
   `to_tsvector('simple', normalized_text)` (generated column, GIN) +
   `pg_trgm` GIN for fuzzy matching. Normalization (final-letter forms,
   punctuation, quote marks) happens in the application layer before
   storage — same normalizer the case-number library uses.
4. **Embeddings separated** from document rows (`legal_embeddings`),
   dimension-flexible `vector` column for the POC (mock provider);
   choosing the production model adds a fixed-dim column + ANN index in a
   later migration.
5. **Versioning**: `legal_document_versions` with sha256 + parser_version;
   text/sections/embeddings hang off versions, so re-extraction is a new
   version, never an overwrite.
6. **Anchors as rows**: `legal_document_sections(version_id, anchor_key,
   char_start, char_end, page_number)` — the DB-side of the citation
   anchor model; `legal_claim_citations.anchor_key` references them
   logically (soft reference by design: anchors survive re-parse
   comparison checks in the app layer).
7. **UUID PKs everywhere** (gen_random_uuid); timestamptz everywhere;
   Asia/Jerusalem handled at the application layer (Design decision:
   store UTC, render Jerusalem).
8. **Soft delete** via `deleted_at` on organizations, profiles,
   legal_documents, legal_research_sessions; SELECT policies exclude
   deleted rows; no hard-DELETE policies for clients anywhere.
9. **Bounded sizes**: CHECKs on text lengths, file byte_size ≤ 100MB,
   scores 0–100, confidence 0–1 — defense against abuse (threat model).
10. **JSONB only at the edges** (warnings, score_breakdown, expansion,
    inputs/gold, settings) — everything queryable is relational.

## What is deliberately NOT here
CRM/finance/communication/marketing tables (out of Epic 1 scope), a
matters table (only `matter_ref text` placeholder — the Matter workspace
epic owns that model), fixed-dim embedding indexes (model not chosen),
Hebrew dictionary FTS (no stemmer exists; revisit with dedicated tooling).

## Rollback
Documented at the bottom of the migration file: single-transaction apply
(auto-rollback on failure); full reverse-order DROP script for empty
databases; **restore-from-backup for databases with data**. See
LEGAL_INTELLIGENCE_POC_MIGRATION_REVIEW.md for the review checklist.
