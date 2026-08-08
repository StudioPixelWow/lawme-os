# Engineering Evaluation — Runbook

All commands from the repo root. `PDFS_DIR` points at a directory holding one
`<publication_item_id>.pdf` per benchmark publication (pulled from Object Storage
by `prepare-annotation.ts`, or your local `benchmark/knesset-layout/pdfs/`).
Nothing here touches the strict benchmark or ground truth. `published = 0`.

## 1. Objective reference + layout-2 (runs anywhere with the PDFs)

```bash
PDFS_DIR=benchmark/knesset-layout/pdfs \
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-extract.ts
```

Writes `reference/<id>.json` (PDF text-layer glyph oracle) and
`outputs/layout-2/<id>.json`.

## 2. Self-hosted OCR candidate — Tesseract 4 + Hebrew

Prereq: `tesseract`, `tesseract-ocr-heb`, `pdftoppm` (poppler). Resumable
(skips finished pages); `OCR_FORCE=1` to redo, `OCR_DPI` / `OCR_PSM` to tune.

```bash
sudo apt-get install -y tesseract-ocr-heb poppler-utils
PDFS_DIR=benchmark/knesset-layout/pdfs \
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-tesseract.ts
```

## 3. Cloud candidate — Azure AI Document Intelligence (OPERATOR-RUN)

Needs an Azure Document Intelligence resource + network egress (absent in the
build sandbox). Sends only the single benchmark page (split with `pdftk`; use
`qpdf --pages src N -- src out.pdf` if you prefer). Keys via env, never in code.

```bash
AZURE_DI_ENDPOINT=https://<resource>.cognitiveservices.azure.com \
AZURE_DI_KEY=<key> \
PDFS_DIR=benchmark/knesset-layout/pdfs \
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-azure.ts
```

Writes `outputs/azure-di/<id>.json`. (Google Document AI can be added as a
sibling adapter with the same output schema if you want a second cloud point.)

## 4. Self-hosted layout/OCR candidate — Surya (OPERATOR-RUN)

Needs a GPU + Surya weights. **Verify the weights licence** for your org's
revenue before use (see `docs/ingestion/knesset-layout-ocr-evaluation.md`). The
adapter refuses if `surya_ocr` is not on PATH, and its JSON parse may need a
tweak for your Surya version.

```bash
pip install surya-ocr    # verify licence first
PDFS_DIR=benchmark/knesset-layout/pdfs \
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-surya.ts
```

## 5. Score every engine present + hard-case artifacts

```bash
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-score.ts
PDFS_DIR=benchmark/knesset-layout/pdfs \
node --experimental-strip-types benchmark/knesset-layout/engineering-eval/eng-artifacts.ts
```

`eng-score.ts` auto-discovers whatever is under `outputs/` and writes
`report/eng-eval-report.json` + `report/eng-eval-summary.md`. Re-run it after
adding Azure/Surya to fold them into the same per-stratum comparison.

## 6. Tests

```bash
node --experimental-strip-types --test benchmark/knesset-layout/engineering-eval/__tests__/eng-metrics.test.ts
```

## Adding another engine

Write `outputs/<engine>/<id>.json` with at least
`{ engine, text, reading_order_text, provenance:{publication_item_id,page_number,source_url,machine_derived:true} }`
(and optionally `section_boundaries`, `marginal_captions`, `unresolved`,
`mean_confidence`), then re-run `eng-score.ts`. Keep provenance on every output.
