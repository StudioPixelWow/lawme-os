# LAW ME — Founder-Approved Engineering Evaluation (SEPARATE path)

This directory is the **engineering** evaluation path. It is deliberately and
permanently distinct from the strict human-ground-truth benchmark, which is
preserved unchanged in the parent directory (`ground-truth/` stays as-is for
future independent human annotation and eventual certification).

## What this is — and what it is NOT

- It **is** an automatic, reproducible comparison of extraction engines on the
  same 108 real corpus pages, to drive engineering decisions (engine choice,
  F1/F2/F3) with evidence.
- It is **NOT** human-ground-truth accuracy and **NOT** certification. No score
  here may be reported as "accuracy vs human ground truth" (founder constraint).
- `published = 0`. Nothing here authorizes publishing extracted statutory text.
  The official PDF remains authoritative; machine-derived text stays labelled
  machine-derived.

## Neutrality of the reference

The only external reference is the **PDF's own embedded text layer**, used only
as an **order-independent glyph multiset** (a glyph oracle). That measures
whether an engine preserves the glyphs actually present in the authoritative PDF
— without privileging any engine's *reading order* (the contested, human axis,
measured intrinsically instead). Two honest caveats the harness makes explicit:

- **No text layer** (scanned/image pages): there is *no* objective text
  reference. Those pages are OCR-only and flagged as needing human certification.
- **Garbled text layer** (F2 glyph corruption, e.g. bad `ToUnicode` on old
  fonts): the embedded text is itself wrong, so glyph-loss vs it is meaningless
  and OCR may legitimately differ. The harness detects this (low Hebrew-share)
  and marks the reference unreliable rather than scoring against garbage.

## Metrics (all automatic / proxy)

Order-independent vs the reference: **text-loss**, **duplication**. Intrinsic:
**Hebrew-share** (glyph-sanity / F2 signal), **section-boundary monotonic
diagnostic** (NON-gating), **caption/body false-separation** (layout output),
**folio/citation-alignment presence**, **unresolved / failure rate**. Plus
**cross-engine glyph agreement** (triangulation — neither engine is truth). All
reported **per stratum** and overall.

## Pipeline

```
eng-extract.ts     objective reference (PDF text layer) + run layout-2   → reference/, outputs/layout-2/
eng-tesseract.ts   self-hosted OCR candidate (tesseract 4 + heb, 300dpi)  → outputs/tesseract-heb/
eng-azure.ts       cloud candidate (Azure DI) — OPERATOR-RUN (creds)      → outputs/azure-di/
eng-surya.ts       self-hosted layout/OCR candidate — OPERATOR-RUN (GPU)  → outputs/surya/
eng-score.ts       all engines → per-stratum comparison                   → report/
eng-artifacts.ts   hard-case side-by-side (image + engines + metrics)     → artifacts/hard-cases.html
```

See `RUNBOOK.md` for exact commands, including running the cloud/self-hosted
candidates on your own infrastructure and re-scoring.

## How metrics map to F1/F2/F3

- **F1 (layout / reading order):** layout-2 `unresolved` pages + low cross-engine
  agreement + false-separation. layout-2 preserves glyphs but can mis-order
  multi-column / marginal-caption pages.
- **F2 (glyph fidelity):** low Hebrew-share on the embedded layer (garbled old
  fonts) and on engine output. Where the layer is garbled, OCR (which reads the
  rendered shapes) is the fix, not the layer.
- **F3 (footnotes / marginal structure):** caption/body separation on
  `classic_marginal_caption` pages.

## Result snapshot (see `report/eng-eval-summary.md` for full per-stratum tables)

- Reference: 108 pages, **8** scanned/no-text-layer, **2** garbled embedded text.
- **layout-2**: ~0.03% glyph-loss (it *is* the text layer), 0% duplication,
  Hebrew-share ~90%, unresolved ~5.6%, failure ~14% — excellent on the ~100
  text-layer pages; contributes nothing on scanned pages and inherits garbled
  glyphs on F2 pages.
- **tesseract-heb**: ~10.6% glyph divergence on clean pages (mediocre Hebrew OCR)
  but **higher** Hebrew-share (~97%), i.e. on garbled/scanned pages it recovers
  cleaner true glyphs. No layout/section structure by itself.
- Cross-engine glyph agreement on clean pages: **~82%**.

This is the empirical basis for the recommended **hybrid**: deterministic layout-2
as the primary path for text-layer pages, OCR only for the scanned + garbled
residual, plus F1 reading-order work on the unresolved pages. See the parent
report for the full recommendation and the publication-evidence bar.
