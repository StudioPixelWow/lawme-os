# POC Data Flow

## Ingestion → answer, step by step

1. **discover()** — `SupremeDecisionsAdapter` lists the 13 fixture items
   (bounded; live discovery requires permissions per ACCESS_RESEARCH.md).
2. **fetchDocument()** — fixture body + content type (no network).
3. **normalize()** — unified normalized object: case number → shared
   normalizer (searchKey), dates, storage policy, access classification,
   `isSynthetic: true`, provenance (sha256, retrievedAt, method=fixture,
   parserVersion).
4. **validate()** — schema + business rules; fixtures claiming verified_*
   status are REJECTED (tested).
5. **extractDocument()** — content-type routed; HTML → sanitized blocks
   (headings/paragraphs) with heading paths and char offsets into
   `normalizedText`; anchors `h:0001`/`p:0007`.
6. **chunkBlocks()** — paragraph windows ≤1200 chars, 1-block overlap,
   chunk keeps its first block's anchor.
7. **MockEmbeddingProvider.embed()** — deterministic 256-d trigram-hash
   vectors, L2-normalized, model metadata stamped.
8. **LexicalIndex.build()** — BM25 index over chunks, Hebrew final-letter
   folding, same tokenizer as queries.
9. **runResearch()** — normalize query → controlled dictionary expansion
   (17 employment entries, logged) → hybridSearch (filters → BM25 + cosine
   → authority/trust/freshness weights → relevance gate → per-document
   diversification) → evidence items with `createAnchor()` +
   `formatCitation()` + score breakdown + warnings.
10. **buildStructuredAnswer()** — extractive claims bound to citations;
    statutes/judgments/conflicting buckets; explicit gaps; mandatory
    label "טיוטת מחקר — נדרשת בדיקת עורך דין".
11. **recordRun()** — JSONL run record (`.poc-runs/`, gitignored),
    secret-pattern payloads rejected.

## Persistence mapping (when the migration is applied)
| In-memory today | Table tomorrow |
|---|---|
| NormalizedLegalDocument | legal_documents (+ legal_sources FK) |
| provenance | legal_source_fetches + provenance columns |
| ExtractionResult.normalizedText | legal_document_text (fts generated) |
| ExtractedBlock[] | legal_document_sections (anchor_key, offsets) |
| Chunk vectors | legal_embeddings (model-stamped) |
| ResearchRequest/Result | legal_research_sessions/queries/results |
| AnswerClaim + citations | legal_answer_claims + legal_claim_citations |
| Benchmark run | benchmark_runs + benchmark_results |

## Invariants enforced end-to-end (test-backed)
- Every block's `(charStart, charEnd)` slices `normalizedText` exactly.
- Anchor keys unique per document version; version hash changes break
  anchors detectably.
- Every evidence item carries citation + anchor + retrievedAt + warnings.
- Fixture content can never exceed `secondary_supported` and always warns
  "fixture content — not legal authority".
- Zero evidence → explicit missing-source notice, never a made-up answer.
