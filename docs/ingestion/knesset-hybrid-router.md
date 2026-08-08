# Knesset Extraction — Production Hybrid Router (as built)

Implements the founder-approved hybrid architecture. Deterministic-first, glyph-
preserving, OCR only on the residual. Automatic/proxy metrics — **not** human
accuracy. `published = 0` throughout; raw extraction is never overwritten;
reprocessing uses only PDFs already in Object Storage.

## Components

- `src/.../publication/extraction-router.ts` — `routePage(signals)` → decision
  with `route`, `engine`, `engine_version`, `route_reason`, `confidence`,
  `machine_derived`, `needs_review`, `published: 0`, `router_version`.
- `src/.../publication/layout-order-v3.ts` — Path B1 layout-only reading-order
  recovery (recursive XY-cut, RTL). Re-orders the SAME glyph stream; verified
  lossless; never OCRs.
- `benchmark/knesset-layout/engineering-eval/run-router.ts` — 108-page regression.
- `.../eng-azure.ts`, `.../eng-google.ts` — Path-B2 cloud adapters (operator-run).
- `.../eng-b2-compare.ts` — residual comparison + evidence-based provider select.
- `tools/legal-ingest/reprocess-hybrid.ts` — production reprocess (dry-run; commit
  gated on provider selection + approved migration).

## Routing rules

| condition | route | engine |
|---|---|---|
| good text layer, Hebrew-share ≥ 0.6, layout-2 resolves order | **A** | layout-2 (glyphs preserved) |
| good text layer + glyphs, layout-2 order unresolved | **B1** | layout-order-v3 (re-order only, no OCR) |
| no text layer (scanned) OR Hebrew-share < 0.6 (garbled/F2) | **B2** | cloud OCR (selected provider; Tesseract fallback only) |

Unresolved / low-confidence → `needs_review`. `published` never flips here.

## Regression across all 108 pages (proxy)

- **Path A 86.1% · Path B1 (layout-only) 4.6% · Path B2 (OCR) 9.3%.**
- **unresolved 0%** (B1 resolved all 5 of its pages losslessly) · needs_review 9.3% (the 10 B2 pages).
- **glyph-loss proxy (A+B1) 0.03%** · duplication 0% · Hebrew-share 99.4% · citation alignment 66.7%.
- **No regression on clean classes:** `old_font` stays 100% Path A / 0% loss; the full publication unit-test suite (66) passes.
- B1 pages: bench-044, 058, 068, 073, 088 (all resolved). bench-061 is garbled *and* unresolved → correctly routes to **B2** (OCR), not B1.
- B2 residual (10): scanned bench-022, 023, 101, 102, 104, 105, 107, 108; garbled bench-060, 061.

Full tables: `engineering-eval/report/router-regression.{json,md}`; per-page
persistable records: `engineering-eval/report/route-decisions.json`.

## Path B2 provider selection — PENDING (operator)

Selection needs Azure Document Intelligence **and** Google Document AI run on the
10 residual pages (this build has no cloud creds/egress; Tesseract is fallback-
only and excluded from selection). On the residual, layout-2 yields ~0% Hebrew /
20% text and Tesseract ~70% — confirming OCR is required there.

```
B2_IDS=bench-022,bench-023,bench-101,bench-102,bench-104,bench-105,bench-107,bench-108,bench-060,bench-061
AZURE_DI_ENDPOINT=... AZURE_DI_KEY=... PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-azure.ts
GCP_PROJECT=... GCP_LOCATION=... GCP_DOCAI_PROCESSOR=... GOOGLE_APPLICATION_CREDENTIALS=... PDFS_DIR=... node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-google.ts
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-b2-compare.ts   # → recommends a provider on evidence
```

## Go-live sequence (gated)

1. Run the two cloud adapters on the residual; `eng-b2-compare.ts` selects the B2 provider on Hebrew fidelity / duplication / reading order / section boundaries / page alignment / latency / cost.
2. `reprocess-hybrid.ts` dry-run over a staged sample (done for the 108; extend to a corpus sample) — confirm routing distribution + no regression on clean classes.
3. **Approval-gated:** apply the extraction-layer migration (new columns: engine, engine_version, route_reason, confidence, machine_derived, needs_review, order_version, router_version) and wire the persist step. `reprocess-hybrid.ts --commit` refuses until a provider is selected and the migration is in place.
4. Staged corpus reprocess (small cohorts first), from Object-Storage PDFs only, raw never overwritten, `published = 0`.

Publishing extracted statutory text remains separately gated on the frozen human
benchmark GO (see `knesset-engineering-eval-phase2.md`).
