# First Production Ingestion Slice

The first real ingestion of legal data into LawME — two tracks (Knesset OData
legislation; data.gov.il Tier-1: ararim / mishmoret / judgments), mapped into
the Canonical Legal Data Model, incremental and measurable. This document is the
map; the code lives under `src/modules/legal-ai-israel/ingestion/`.

## 1. Code audit — infrastructure reused (Step 1)

The audit found a rich Phase-1/2 base; this slice **reuses** it rather than
building parallel systems:

| Need | Reused from | Notes |
|---|---|---|
| CLDM design | `docs/architecture/canonical-legal-data-model/**` | V1 subset only. |
| Source registry | `legalai.legal_sources` (+ audit columns) | Provenance links back to it. |
| Provenance | `legalai.document_field_provenance`, envelope pattern | Per-assertion. |
| Versioning | `legalai.legal_document_versions` + new `canonical_entity_versions` | change_kind chain. |
| Doc storage | `persist/*`, `storage/paths.ts`, buckets | Object storage via path abstraction. |
| FTS + vector | `legalai.document_sections.text_search` (GIN) + `embedding vector(1536)` (ivfflat) | Already enabled; mirrored on `canonical_entities`. |
| Checkpoints | `legalai.source_discovery_windows` (+ new `ingestion_checkpoints`) | Resume support. |
| Jobs / runs | `legalai.processing_jobs`, `ingestion_runs`, `ingestion_events` | Queue + run metrics. |
| Parsing | `parser/hebrew-normalize.ts`, `parser/segment.ts` | Hebrew segmentation + chunking. |
| Citations | `citation/case-number.ts`, `citation/extract.ts`, `statute.ts` | Case-number normalization. |
| Quality gates | `quality/gates.ts` (restriction detection) | Reused in canonical validation. |
| Collector base | `collector/*` (fail-closed guard), `source-audit/transport.ts` | Injectable HTTP pattern. |

**Gaps the audit found (added additively):** no quarantine, dead-letter, or
metrics tables; no first-class canonical head/version/relationship tables; no
generic ingestion checkpoint. All added in
`supabase/migrations/20260806120000_canonical_ingestion_v1.sql` (additive, not
auto-applied).

**CLDM open decisions that V1 settles (only for V1):** UUID→deterministic
string keys for now (identity.ts); edges in a typed Postgres table (not a graph
DB); pgvector column present but index deferred until an embedding provider is
chosen; bitemporal simplified to version chain + valid/system_from on the
version table.

## 2. Migrations

`supabase/migrations/20260806120000_canonical_ingestion_v1.sql` — additive,
guarded (`IF NOT EXISTS`), RLS deny-by-default. Adds `canonical_entities`,
`canonical_external_ids`, `canonical_entity_versions`,
`canonical_relationships`, `ingestion_checkpoints`, `ingestion_quarantine`,
`ingestion_dead_letter`, `ingestion_metrics`. **Not applied** — applying remote
migrations requires founder approval.

## 3. Entities implemented (V1 subset)

DocumentSource, DocumentVersion (version chain), Law, Section, Bill,
GovernmentDocument, Decision, Case, Court, Authority, Party, Citation, Topic —
via the source-agnostic `CanonicalRecord` (`canonical/envelope.ts`). Not the
full 47; only what the two tracks produce. Existing judgment entities
(`legal_documents` etc.) are untouched.

## 4. Collectors

Two, on one contract (`contract.ts` — `discoverCheckpoint → fetchBatch →
mapRecord → validate → persist`):

- `collectors/knesset-odata.ts` — `KnessetODataCollector`, walks an ordered list
  of entity sets.
- `collectors/data-gov-ckan.ts` — `DataGovCkanCollector`, **configurable by
  dataset id** (one collector for all three datasets).

Both inject HTTP (`collectors/http.ts`) — offline-testable; a 403/429 is
terminal (no bypass). Shared pipeline (`pipeline.ts`) drives retry, dead-letter,
quarantine, checkpointing, tombstones, and metrics.

## 5. Mappings

`mappers/knesset.ts` + `docs/ingestion/knesset-odata-mapping.md`;
`mappers/data-gov-tier1.ts` + `docs/ingestion/data-gov-tier1-mapping.md`. Every
field maps to a canonical field or `source_extras`; `content_level` is explicit
(summary never marked full_text).

## 6. Incremental ingestion (Step 9)

Backfill + incremental sync; checkpoint persistence + resume; idempotency;
deterministic dedup (content_hash); source tombstones; update detection
(content hash / modified timestamp); controlled retry; dead-letter. Never a full
reload.

## 7. Identity resolution V1 (Step 11)

Deterministic keys only (`canonical/identity.ts`): Law by knesset_law_id; Bill by
knesset_bill_id; Decision/Case by normalized case-number + authority + date;
Document by content hash / URL. **No auto-merge on person names.**

## 8. Provenance (Step 10)

Every record + version + edge carries source platform/publisher/dataset/
resource/url, first_seen/last_verified, extraction_method, parser_version,
mapping_version, confidence, content_hash, raw_record_hash, external_record_id —
traceable back to the exact source record.

## 9. Search + AI-ready segmentation (Steps 12–13)

Structured + full-text fields declared per entity (Hebrew-first `tsvector` GIN on
`canonical_entities`); vector column present, index deferred. Documents are
chunked with the existing legal segmenter (`parser/segment.ts`) — sections,
decision numbering, headings, citations, and paragraphs preserved; never a blind
character cut. No chat agent is built (out of scope).

## 10. How to run

Offline pilot (here, no network): `npm run legal:ingest:knesset -- --pilot` and
`npm run legal:ingest:data-gov -- --dataset=ararim|mishmoret|judgments --pilot`.
Live pilot (operator machine): see `pilot-results.md`.

## 11. Verification (Step 21)

Run in this session: `typecheck` (0 errors), `eslint` (0 findings on new code),
`node --test` ingestion suites (**24/24 pass**), regression on existing
legal-ai-israel suites (**41/41 pass**), and the offline pilot end-to-end (real
metrics in `pilot-results.md`). The **live pilot + remote migration** are the
founder-gated steps (network + approval), documented as a runbook rather than
claimed as done.

## 12. What full backfill needs

See `backfill-decision.md`: apply the migration (approval), run the live pilot,
confirm the GO thresholds per source (validation ≥ 98%, provenance = 100%,
indexing ≥ 99%, incremental sync, license verified, no corruption), record cc-by
attribution for ararim/mishmoret, then backfill per source — still capped,
monitored, idempotent.
