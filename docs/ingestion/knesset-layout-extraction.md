# F1 — Layout-Aware / Two-Column / Marginal-Caption Extraction

Date: 2026-08-07. Fixes quality-sample finding F1: in two-column ספר החוקים
pages the marginal section-captions (כותרות שוליים) interleave into section body
text. Deterministic geometry only — NO LLM for page reconstruction.

## Design

`src/.../publication/layout-reconstruct.ts` (`LAYOUT_VERSION = "layout-1"`),
pure and unit-testable over pdf.js text items (`x`, `y`, `width`, `height`,
`fontName`):

1. Group items into visual lines by `y` (top→bottom = `y` descending in PDF space).
2. Detect a persistent interior vertical whitespace gap (x-occupancy histogram
   over lines) that separates a **narrow** margin column (< 30% of page width)
   from the wide body column.
3. Guard against false positives: a genuine marginal column is **sparse** — its
   line count must be ≤ 60% of the body's. Aligned inter-word whitespace or a
   balanced two-body-column layout fails this test → fall back to single-column.
4. Partition items by side of the gap. Body → RTL reading order (lines `y↓`,
   within line `x↓`). Marginal items → captions with their `y` (for association).

Ambiguous pages (low gap clarity, or the sparsity guard) fall back to
single-column reading order and are flagged `fallbackUsed`.

### Lossless invariant (the core safety property)

Reconstruction only **reorders and partitions** — it never deletes text. Every
input glyph appears exactly once across `bodyText + marginalCaptions`. So
**text-loss = 0** and **false-removals = 0** by construction; each page carries a
`lossless` flag and the eval verifies the glyph multiset per page rather than
trusting it. "Do not silently rewrite source text" is honored: raw text is never
mutated, only re-ordered.

### Preserved layers (versioned, traceable)

- `raw_extracted_text` — flat pdf.js text (unchanged; provenance).
- `layout_reconstructed_text` — body in reading order (`layout-1`).
- `normalized_legal_text` — `normalizePdfText(layout_reconstructed_text)`.
- `marginal_captions[]` — extracted side headings with `y`.
- `layout_version`, `layout_confidence` (per page + doc mean), `fallbackUsed`.

## Tests

`__tests__/layout-reconstruct.test.ts` (6/6): single-column no-split, RTL
within-line order, two-column caption separation, losslessness in two-column
mode, empty page, document aggregation. A **real-PDF fixture regression test**
is added from `artifacts/knesset-layout-fixtures.json` (real page geometry dumped
by the eval) after the operator run.

## Evaluation (operator, from Object Storage — no Knesset re-download)

```
node --experimental-strip-types tools/legal-ingest/eval-layout.ts --pages 60
```

Stratified across page sizes (interleaved large/small). Writes
`artifacts/knesset-layout-eval.json` and reports: pages evaluated · single vs
two-column · marginal-caption count + sample (true accuracy needs manual label of
the sample — no silent ground truth) · reading-order well-formedness · text-loss
rate · false-removal glyph count · caption contamination rate · section-boundary
agreement · fallback pages · confidence distribution.

### GO thresholds

```
text-loss = 0
false removals (high-confidence) = 0
caption contamination <= 1%
reading-order accuracy >= 99%
section-boundary accuracy >= 99%
```

Nothing is published on the basis of F1 alone; the publish decision waits for the
post-fix 100-publication quality sample. `published = 0` throughout.
