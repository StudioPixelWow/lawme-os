# POC Architecture — Legal Intelligence Vertical Slice (Epic 1)

## What was built (and what deliberately wasn't)

```
                       ┌─────────────────────────────┐
  fixtures (13 docs)   │  INGESTION FRAMEWORK        │   supabase/migrations/…poc_foundation.sql
  synthetic, no net →  │  LegalSourceAdapter contract │   (prepared, NOT applied)
                       │  SupremeDecisionsAdapter     │
                       └──────────┬──────────────────┘
                                  ▼
                       ┌─────────────────────────────┐
                       │  EXTRACTION                  │  html / plain / pdf(text-layer) / docx
                       │  blocks + anchors + offsets  │  OCR = decision point, never automatic
                       └──────────┬──────────────────┘
                                  ▼
                ┌─────────────────┴───────────────┐
                ▼                                 ▼
   ┌────────────────────┐            ┌─────────────────────────┐
   │ LEXICAL (BM25,     │            │ MOCK EMBEDDINGS         │
   │ Hebrew-folded)     │            │ trigram-hash, 256d,     │
   └─────────┬──────────┘            │ deterministic, key-free │
             │                       └───────────┬─────────────┘
             └──────────────┬────────────────────┘
                            ▼
              ┌───────────────────────────────┐
              │ HYBRID RANKER (deterministic) │ lexical 40% · vector 25% ·
              │ + filters + diversification   │ authority 18% · trust 10% ·
              └──────────────┬────────────────┘ freshness 7% — breakdown shipped
                             ▼
              ┌───────────────────────────────┐
              │ RESEARCH ENGINE               │ controlled Hebrew expansion,
              │ evidence set + exact citations│ provenance, warnings,
              └──────────────┬────────────────┘ missing-source notice
                             ▼
              ┌───────────────────────────────┐
              │ STRUCTURED ANSWER (extractive)│ claims ⇔ citations, gaps,
              │ "טיוטת מחקר — נדרשת בדיקת    │ labels, no free generation
              │  עורך דין"                    │
              └───────────────────────────────┘
```

Cross-cutting: case-number normalizer (`src/lib/legal/case-number/`),
citation anchors (`citations/anchors.ts`), run recorder
(`observability/run-log.ts`), benchmark harness (`benchmark/`).

## Deliberate absences (per founder scope)
No UI (CLI harness only) · no database writes (migration prepared only) ·
no network fetches anywhere · no paid API calls (placeholder provider
throws) · no mass corpus (13 fixtures) · no autonomous answer generation
(extractive only).

## Where things live
| Concern | Path |
|---|---|
| Case numbers | `src/lib/legal/case-number/` |
| Ingestion | `src/modules/legal-knowledge/ingestion/` |
| Extraction | `src/modules/legal-knowledge/extraction/` |
| Embeddings | `src/modules/legal-knowledge/embeddings/` |
| Retrieval | `src/modules/legal-knowledge/retrieval/` |
| Citations | `src/modules/legal-knowledge/citations/` |
| Research engine | `src/modules/legal-knowledge/research/` |
| Corpus loader | `src/modules/legal-knowledge/corpus/` |
| Benchmark harness | `src/modules/legal-knowledge/benchmark/` |
| Tests | `src/lib/legal/case-number/__tests__/`, `src/modules/legal-knowledge/tests/` |
| Migration | `supabase/migrations/20260711155956_legal_intelligence_poc_foundation.sql` |
| DB docs | `docs/database/` |
| Threat model | `docs/security/LEGAL_INTELLIGENCE_POC_THREAT_MODEL.md` |

## Design constraints honored
Provider-neutral (interfaces for adapters/extractors/embedders), no
Supabase coupling in ingestion (repository layer arrives with the applied
migration), same normalizer at index time and query time, vocabulary
parity with the Epic 0 unified schema and the migration CHECKs.
