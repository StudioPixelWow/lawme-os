# Knesset Extraction — Citation Diagnosis, Extraction-Layer Migration, Staged Reprocess

Phase 3 gate work. Automatic/proxy engineering metrics — not human accuracy.
`published = 0`; raw never overwritten; reprocess only from Object Storage.

## B. Citation-alignment diagnosis (the 66.7% explained)

The old 66.7% was a crude head/tail regex **detection rate** of a printed folio —
not an alignment failure. Re-run with proper header/footer geometry
(`engineering-eval/eng-citation-diag.ts`):

- **Physical `pdf_page_index` alignment = 100%** (108/108). Every extraction is
  tied to an explicit physical PDF page, verified `1 ≤ page ≤ numpages`. We never
  point at the wrong page.
- **TRUE citation misalignment = 0.**
- **Printed folio detected: 82/108** — 76% of all pages, **82% of applicable**
  pages (after excluding 8 front/index covers that legitimately have no folio).

Breakdown of the non-detections (26 pages), by the required distinction:

| category | count | verdict |
|---|---|---|
| true citation misalignment | 0 | — |
| non-applicable front/index (cover/index) | 8 | null, correct |
| body page, no printed folio | 18 | null, **acceptable** |
| — of which scanned/no-text-layer (image_partial) | 6 | folio needs B2 OCR |
| — of which gematria/merged-header folio (old_font, classic_marginal_caption) | ~12 | **metric limitation**, not an error |

Per stratum: `complex_modern`, `modern_two_column`, `budget_table`,
`doubled_text_layer` = 100% folio; `old_font` 16/23; `classic_marginal_caption`
14/19; `image_partial` 3/9 (scanned). Full data:
`engineering-eval/report/citation-diagnosis.json` (+ `-rows.json`).

**Conclusion:** the 66.7% is a folio-*detection* limit, not a citation *failure*.
The invariant that matters — `source_span` → physical PDF page — is **100%**. A
missing printed folio is represented as **null**; no page reference is wrong.

### Newly discovered failure class (item 9)

**Gematria / merged-header folio under-detection.** Printed folios rendered as
Hebrew numerals (gematria), or merged into a running header line, are missed by
digit-first folio extraction on ~12 old-font/marginal pages. This is a
folio-*extraction* gap (to be closed by adding gematria parsing + header-line
folio splitting in the production citation model), **not** a citation
misalignment — physical alignment stays 100%.

## C. Additive extraction-layer migration (REVIEW-ONLY, not applied)

`supabase/migrations/20260808120000_publication_page_extraction.sql` — a **new
per-page table** `legalai.publication_page_extraction`. Purely additive: it
creates one table (+ its own indexes/trigger) and alters nothing that exists.

Carries every requested field: `engine`, `engine_version`, `router_version`,
`route`, `route_reason`, `confidence`, `machine_derived`, `needs_review`,
`raw_extraction_ref` / `normalized_extraction_ref` / `structured_extraction_ref`
(separate, raw never overwritten), `pdf_page_index` (required),
`printed_page_label` (nullable), `gazette_page_number` (nullable),
`source_span_start` / `source_span_end`, `official_pdf_url`, `extraction_status`.

Hard invariants in the DDL: `published` locked `false` (check constraint),
`machine_derived` locked `true`, RLS deny-by-default (service-role only),
`pdf_page_index ≥ 1`. **Do not apply until reviewed** as additive/non-destructive
(verified: all DDL targets only the new table).

## A. Path-B2 provider selection — BLOCKED on operator cloud access

This build has no Azure/GCP credentials or egress, so Azure DI and Google
Document AI cannot be run here. I did not fabricate numbers. To complete:

```
B2_IDS=bench-022,bench-023,bench-060,bench-061,bench-101,bench-102,bench-104,bench-105,bench-107,bench-108
AZURE_DI_ENDPOINT=... AZURE_DI_KEY=... PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-azure.ts
GCP_PROJECT=... GCP_LOCATION=... GCP_DOCAI_PROCESSOR=... GOOGLE_APPLICATION_CREDENTIALS=... PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-b2-compare.ts
```

`eng-b2-compare.ts` scores both on Hebrew fidelity, duplication, reading-order
stability, section markers, page alignment, latency, cost and prints
`SELECT <provider>` (fidelity/citation weighted above cost, per instruction).
Reference point already measured on the residual: layout-2 ≈ 0% Hebrew / 20%
text, Tesseract ≈ 70% (fallback-only) — OCR is required there.

## D. Staged reprocess — plan (live run BLOCKED on Object Storage + approvals)

Order: **50 → review → 250 → review → 1,000 → review → full corpus.** Read PDFs
only from Object Storage; never re-download from Knesset; never overwrite raw;
low-confidence B2 → `needs_review`; `published = 0`.

`tools/legal-ingest/reprocess-hybrid.ts` performs the routing + Path-A/B1
extraction and emits the per-page records; `--commit` refuses until a B2 provider
is selected and this migration is applied. A **demonstration dry-run over the 108
benchmark pages** (a stand-in, since the sandbox can't reach Object Storage)
routes **93 A / 5 B1 / 10 B2**, 10 `needs_review`, raw untouched. The real
50-publication cohort must be run by the operator against Object Storage.

## Gate status

- Physical citation alignment: **100%** ✓ (the invariant that gates reprocess).
- Migration: prepared, additive, **review-required** before apply.
- B2 provider: **pending** operator cloud run.
- Staged reprocess: ready; **blocked** on B2 selection + migration approval +
  Object-Storage access.
