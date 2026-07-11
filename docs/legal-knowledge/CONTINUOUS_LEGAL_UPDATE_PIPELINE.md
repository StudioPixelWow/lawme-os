# LawME — Continuous Legal Update Pipeline (design)

**Status: design only (Epic 0, Phase 12). No implementation, no ingestion.**

## The pipeline

```
source discovery → fetch → preserve original → hash → deduplicate
→ extract text → OCR (when required) → extract metadata → identify entities
→ detect citations → normalize case numbers → validate → classify authority
→ generate embeddings → update graph → re-rank → identify affected matters
→ notify only when relevant
```

### Stage contracts

| Stage | Contract | Key decisions from registry research |
|---|---|---|
| 1. Source discovery | Registry-driven: only sources with a compatible `rag_permission`/license enter the schedule. New-source candidates go to a founder-approval queue | 134 sources classified; P0 set defined |
| 2. Fetch | Per-source adapter: API (data.gov.il CKAN, BOI), feed, structured JSON backend (gov.il collectors, supremedecisions), MCP (kolzchut) | Knesset OData + several gov.il paths need **Israeli egress** (geo/WAF) — infra decision flagged |
| 3. Preserve original | Original bytes stored per `storage_policy` (store_full / store_extract / pointer_only) before any transformation | tier-6 mirrors: pointer_only, never canonical |
| 4. Hash | SHA-256 of original → `hash` field; identity for dedup + integrity | |
| 5. Deduplicate | By hash, then by (normalized case number + date + court) for re-published documents | same judgment appears in spokesperson collector AND supremedecisions |
| 6. Extract text | PDF/DOC/HTML → text with layout anchors (paragraph/page) | Hebrew extraction QA per source (`hebrew_quality` column) |
| 7. OCR | Only when `ocr_status=pending`; Hebrew OCR with confidence per block; low confidence → review queue | older Reshumot scans |
| 8. Extract metadata | Type-specific extractors → unified schema fields + `metadata_confidence` | |
| 9. Identify entities | Courts/judges/parties/organizations per graph entity-resolution rules | orgs resolved against daily companies registry |
| 10. Detect citations | Deterministic citation parser (statutes + cases) with anchors | |
| 11. Normalize case numbers | The shared normalizer library (same one the citator uses) | golden test set in benchmark |
| 12. Validate | JSON-schema validation + business rules (dates sane, court exists, required-by-type fields present); failures → failure queue, never silently dropped | |
| 13. Classify authority | Trust-model tier + binding class from source + court hierarchy — rule-derived | |
| 14. Generate embeddings | Hebrew-capable model, per-paragraph + per-document; version-stamped so re-embedding is a tracked migration | hebrew-llm-eval-suite skill = evaluation harness |
| 15. Update graph | Citation layer (deterministic) immediately; inference layers queued with labels | |
| 16. Re-rank | Refresh source-freshness scores, citation counts, trend metrics | |
| 17. Identify affected matters | Matter issue-profile × new-document issues/citations → `affects_matter` candidate edges (inference-labeled) | firm-private, RLS |
| 18. Notify | Only when relevance ≥ threshold AND the matter is active; digest-first, not per-document spam | Design-Bible attention philosophy applies |

## Operational design

- **Scheduling:** per-source cadence from the registry's
  `update_frequency` (daily for supremedecisions/companies registry;
  weekly for regulator collectors; monthly for academic). Off-hours,
  jittered, rate-limited per host.
- **Delta detection:** ETag/Last-Modified where available; otherwise
  listing-page diff by stable item IDs; content hash as the final word.
- **Change detection (semantic):** for legislation — version diff at
  section granularity → feeds `amends`/`effective_from` edges and
  matter alerts ("סעיף שהתיק שלך נשען עליו תוקן").
- **Retry:** exponential backoff, max 3; then failure queue.
- **Failure queue:** every failed item persisted with stage, error,
  payload pointer; dashboard count; nothing vanishes silently.
- **Source outages:** N consecutive scheduled failures → source marked
  degraded, freshness score decays, founder-visible status; never
  auto-removed.
- **Versioning:** document version increments on any change; prior
  versions retained; embeddings/graph reference the version they saw.
- **Provenance:** every record carries the provenance object (retrieved
  from/at/method + pipeline version) — required by the trust model.
- **Observability:** per-source metrics (fetched, new, changed, failed,
  latency, freshness lag); per-stage throughput; weekly digest.
- **Manual review queue:** low-confidence OCR/metadata, entity-resolution
  ambiguities, validation failures.
- **Legal review queue:** overruled-detections, conflicts, anything that
  will change a citator verdict from good_law to negative.
- **Re-verification:** every `verified_*` document re-checked against its
  canonical URL on a rolling window (P0: quarterly); drift → re-ingest +
  version bump.
- **Removal & correction:** takedown/correction requests (privacy!) get a
  process: verify request → mark versions → purge copies per policy →
  tombstone with reason → downstream artifacts (embeddings, graph edges,
  notifications) cascade-removed. Mirrors' paid-removal churn (registry
  finding) makes this non-optional.

## Explicitly out of scope in Epic 0
No scheduler, no adapters, no storage, no embeddings are built. The only
live connector remains the read-only Kolzchut MCP (on-demand, not bulk).
