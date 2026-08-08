# Path-B2 — Google Document AI Evaluation (Frozen Result)

**Provider decision:** GOOGLE DOCUMENT AI
**Status:** ADOPTED WITH REQUIRED GUARDS
**Azure required:** NO (Azure is `OPTIONAL_BENCHMARK`, not a blocking adoption gate)
**Evaluation cohort:** the 10 Phase-2 residual hard-case pages
**Production writes during evaluation:** NONE (`published=0` throughout; FROZEN and existing published records untouched)

This is a **founder-approved engineering evaluation** using automatic/proxy signals
(text produced, mean model confidence, table structure, page classification). It is
**not** a claim of human-level accuracy and does not certify correctness. The strict
108-page human benchmark and `FROZEN-v1` are unaffected by this document or the code
it describes.

---

## 1. Measured results (live Google Document AI run, processor `f9c278ea84dcf89d`, `eu`)

| Page      | Type                                               | Confidence | Result                           |
| --------- | -------------------------------------------------- | ---------: | -------------------------------- |
| bench-022 | bilingual pharma, Hebrew + Latin, legacy scan/font |       96.0 | PASS                             |
| bench-023 | bilingual pharma, Hebrew + Latin, legacy scan/font |       95.7 | PASS                             |
| bench-102 | colophon / price                                   |       96.4 | PASS                             |
| bench-105 | colophon / price                                   |       95.8 | PASS                             |
| bench-108 | colophon / price                                   |       97.0 | PASS                             |
| bench-060 | 2026 budget table                                  |       92.8 | TEXT PASS / TABLE STRUCTURE FAIL |
| bench-061 | 2026 budget table                                  |       89.2 | TEXT PASS / TABLE STRUCTURE FAIL |
| bench-101 | almost empty                                       |       56.6 | NEEDS_REVIEW                     |
| bench-104 | empty                                              |          0 | NEEDS_REVIEW                     |
| bench-107 | empty                                              |          0 | NEEDS_REVIEW                     |

Run summary: `google-docai: 10 pages (0 failed)`. Confidence range 0 → 97.0.

## 2. Conclusions

- **Google performs strongly on the difficult scanned bilingual Hebrew/Latin pages.**
  bench-022 / bench-023 (legacy font, scanned, Hebrew beside Latin pharmacopoeia names)
  are exactly the residual cases Path A (deterministic) and Path B1 (layout-only order
  recovery) cannot handle. Google recovered both scripts at ~96 confidence with clean,
  readable Hebrew. This is the decisive B2 use case, and it passes.

- **Raw OCR text is not sufficient for structured budget tables.** On bench-060 / bench-061
  the characters are captured well (89–93 confidence) but flattening to `document.text`
  separates the numeric amounts from their row labels, so the amount↔label relationship
  is lost. A budget line's amount must stay attached to its section. Structured,
  table-aware extraction is therefore mandatory for these pages (see guard #1).

- **Empty or extremely sparse pages cannot be automatically treated as successful OCR.**
  bench-101 ("1 1", conf 56.6), bench-104 (empty, conf 0), bench-107 (empty, conf 0)
  are almost certainly genuinely blank versos, but "OCR returned no text" is not proof of
  "page is blank". These route to `needs_review` for a one-time human confirmation
  (guard #2). They are **not** marked as extraction failures (Google completed
  successfully) and **not** auto-published as blanks.

- **`produced_text_rate = 70%` is fully explained by the three empty/sparse pages.**
  Seven of ten pages produced meaningful OCR; the three "missing" are exactly
  bench-101/104/107. Produced-text is now reported as a breakdown
  (`pages_with_text` / `likely_blank_or_sparse` / `ocr_failed` / `needs_review`) so
  expected blanks are never counted as OCR failures.

- **Hebrew-share is not a meaningful failure signal for bilingual pages.** The aggregate
  ~56% is dragged down by the legitimately half-Latin pharma pages. Hebrew-share is kept
  as a diagnostic but is not a hard gate.

- **The duplication score was distorted by repeated dot-leader / rule characters**
  (`-.-.-.`, `====`) used to lay out the budget tables. Duplication is now computed on a
  copy with structural punctuation removed; the canonical OCR text is never altered.

## 3. Required guards (implemented)

1. **Table-aware extraction** — build a canonical table representation from Document AI's
   own structured objects (native `pages[].tables` cells; geometry fallback from token
   bounding boxes when the processor returns none). The amount↔label relationship is
   preserved by keeping each cell in its `(row, column)` grid position — never re-paired
   from OCR order. A deterministic table-text form is produced for search/RAG. Pages that
   look tabular (many numeric tokens) but yield no reliable structure route to
   `needs_review` (`B2_TABLE_STRUCTURE_UNCERTAIN`).

2. **Empty/sparse-page review routing** — explicit page states
   (`content` / `sparse` / `likely_blank` / `ocr_failed` / `needs_review`) with
   machine-readable reason codes (`B2_SPARSE_PAGE`, `B2_EMPTY_OCR`, `B2_LOW_CONFIDENCE`,
   `B2_TABLE_STRUCTURE_UNCERTAIN`, `B2_TABLE_LOW_CONFIDENCE`, `B2_OCR_ERROR`). A provider
   HTTP 200 is never by itself sufficient to accept a page.

## 4. Decision model

```
Google Document AI → OCR + layout extraction → quality checks →
  clean prose                  → accepted
  valid structured table       → accepted
  sparse / uncertain blank     → needs_review
  questionable table structure → needs_review
  provider/API failure         → failed/retry
```

## 5. Processor note (table structure)

The current processor `lawme-b2-ocr-dev` is an **Enterprise Document OCR** processor.
Basic OCR processors typically return text/tokens/lines but **not** native
`pages[].tables`. Two supported outcomes follow, both safe:

- If native table cells are present, they are used directly (`source=docai_tables`).
- If absent, tables are reconstructed from token **coordinates** (not whitespace),
  labelled `source=geometry_reconstructed`, and **always** routed to `needs_review`.

To obtain native table cells for budget tables (and let them reach `accepted`), enable a
Form Parser / Layout Parser processor. Until then, budget tables correctly land in
`needs_review` rather than being published with a possibly-broken amount↔label mapping.

## 5b. Live retest result (enriched run) + geometry-gate fix

The enriched Google run confirmed the processor emits **no native `pages[].tables`**
(Enterprise Document OCR), so table structure comes from the geometry fallback
(token bounding boxes). Live outcome after the geometry-gate fix:

- accepted (5): bench-022, bench-023, bench-102, bench-105, bench-108
- needs_review (5): bench-060, bench-061 (budget tables), bench-101 (sparse), bench-104, bench-107 (blank)
- failed: 0 · `all_match_expected: true` · decision `GOOGLE_APPROVED`

The first live run exposed a false-positive: the geometry fallback treated the
two-column bilingual page (bench-022) and the colophon line (bench-102) as tables
and over-quarantined them. Fix (generic, not overfit): geometry reconstruction now
only fires on **numeric-heavy** pages (`pageNumericRatio ≥ 0.3`), so prose/colophons
stay clean prose while budget tables (bench-060/061) still reconstruct. On the live
060/061 the reconstructed grid keeps label↔value together (e.g. 061:
`78 תיירות → 410,509 / 100,862 / 360,803`; `01 03 החברה להגנות ים המלח → 73,500 / 85,862`),
mean cell confidence 0.95–0.97, and is routed to `needs_review` because it is
geometry-derived, not native Document AI cells.

## 6. Scope / integrity

`published=0` for every record. This evaluation and its code do not modify FROZEN
material, existing published records, protected production data, or the strict 108-page
human benchmark. No corpus-wide reprocessing was triggered.
