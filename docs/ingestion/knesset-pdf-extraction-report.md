# Knesset PDF Fetch + Extraction Report

Live run 2026-08-06. The official ספר-החוקים PDFs for the 8-law pilot were
fetched from `fs.knesset.gov.il`, validated, hashed, and text-extracted, and the
results persisted to dev (`legalai.law_publications`). Artifacts:
`artifacts/knesset-live-pdf-pilot.json`, `artifacts/knesset-live-pdf-pilot.csv`.

## Environment / method

This session's cloud container has **no egress to `fs.knesset.gov.il`** (the
proxy returns `CONNECT tunnel failed, 403` — verified). The fetch + extraction
therefore ran through the **Claude-in-Chrome browser**, same-origin on
`fs.knesset.gov.il`:

- `fetch(pdfUrl)` → `arrayBuffer` (same-origin; range support confirmed: the
  server sends `Accept-Ranges: bytes`);
- validation: HTTP 200 + `content-type: application/pdf` + `%PDF-` magic bytes;
- `SHA-256` of the bytes via `crypto.subtle`;
- text extraction via **pdf.js 3.11.174** (embedded text layer), with
  RTL-aware line ordering (group glyphs by line, sort lines top→bottom, within a
  line right→left);
- `raw_text_hash = SHA-256(extracted text)`.

This is the same policy the server-side `pdf-fetch.ts` / `pdf-extract.ts`
implement (HTTPS-only, host allowlist, magic-byte + content-type validation,
SHA-256, text-layer-before-OCR); the browser is the network carrier because the
container is air-gapped from that host.

## Results (real)

| Metric | Value |
|---|---|
| PDFs discovered | 31 |
| PDFs downloaded | 31 (**100%**) |
| PDFs rejected | 0 |
| PDFs quarantined (low text-layer coverage) | 2 |
| Text extraction success (text present) | 31 / 31 (**100%**) |
| High-confidence (≥0.95 page coverage) | 29 / 31 (**93.5%**) |
| OCR used | **0** (all had a text layer) |
| Distinct SHA-256 | 31 (no duplicate binaries) |
| Total bytes | 7,652,966 (~7.65 MB) |
| Total pages | 340 |
| Total extracted chars | 968,067 |

Persisted per publication onto `law_publications`: `pdf_sha256`,
`pdf_size_bytes`, `pdf_content_type`, `pdf_fetched_at`, `page_count`,
`extraction_method`, `extraction_version`, `extraction_confidence`, `ocr_used`,
`raw_text_hash`, `content_level='full_text'`, provenance JSON. **PDF bytes are
NOT stored in Postgres** — only the hash + metadata; object-storage of the
binaries is the remaining infra wiring (see backfill decision).

## Quality sample (Epic step 11)

- **Section parsing (real container parser):** חוק-יסוד: מקרקעי ישראל (pub
  147462) → **3/3 sections** (1, 2, 3) correctly recovered after
  `normalizeHebrewLegalText`. Persisted as gated `Section` entities + 3
  `legal_chunks` (`published=false`). Full-text search verified: query
  "מקרקעין" returns sections 2 & 3 with highlighted snippets.
- **Amendment operations (real parser):** חוק-יסוד: השפיטה (תיקון מס' 4, pub
  2201200) → 4 operations: 3 `parsed` (modify §4, commencement, transitional),
  1 `needs_review` (subsection "(ב)" replacement with no plain section number —
  correctly flagged). Persisted to `legalai.amendment_operations`.
- **Aggregate over all 31 (normalized, in-browser):** ~277 section-like lines
  across 16 documents; ~3,540 candidate amendment clauses with **~33% confidently
  classified** and ~67% flagged `unsupported`.

## Known extraction-quality issues (real, surfaced)

1. **Font-glyph mis-mapping:** some PDFs render a punctuation/marker glyph as the
   Hebrew letter "פ" (seen in pub 2201200), which fragments clauses and lowers
   amendment-operation confidence.
2. **Interleaved margin headings:** section side-headings extract as separate
   lines before the section number (RTL marginalia), needing a re-join step.
3. **Punctuation noise:** stray `'` `/` from the text layer (e.g. "לישראל/").
4. **2 low-coverage PDFs** (147018 @0.5, 2161465 @0.75) — partial text layer;
   `quarantined`, OCR candidates.

These are localized and fixable (a pre-parse normalization/de-marginalia/glyph-
remap pass). Section parsing already succeeds once normalized; amendment-operation
classification is the main quality gap. This drives the **GO_WITH_FIXES**
decision (see `knesset-backfill-decision.md`).
