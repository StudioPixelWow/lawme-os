# Knesset Extraction — Engineering Evaluation (Phase 2) & Recommended Architecture

**Founder-approved engineering path. Automatic/proxy metrics only — NOT human
ground truth, NOT certification. The strict 108-page human benchmark is preserved
unchanged. `published = 0`.**

Harness + reproducible commands: `benchmark/knesset-layout/engineering-eval/`
(README + RUNBOOK). Evidence record: `engineering-eval/report/`. Side-by-sides:
`engineering-eval/artifacts/hard-cases.html`.

## Method (why the numbers are honest)

Engines are scored against the **PDF's own embedded text layer**, used only as an
**order-independent glyph multiset** — it measures glyph preservation without
privileging any engine's reading order. Pages with **no text layer** (scanned)
have no objective reference and are flagged OCR-only/needs-human-cert; pages with
a **garbled** text layer (F2) are detected by low Hebrew-share and excluded from
glyph-loss scoring (scoring against garbage is meaningless). Reading order is
assessed intrinsically (unresolved flag, cross-engine agreement), never against a
machine "truth".

## Candidates evaluated

| engine | kind | status |
|---|---|---|
| layout-2 | deterministic geometry | run on all 108 |
| tesseract-heb (v4, 300dpi) | self-hosted OCR | run on all 108 |
| Azure Document Intelligence | cloud OCR | adapter shipped; **operator-run** (needs creds/egress) |
| Surya | self-hosted layout/OCR (GPU, licence-gated) | adapter shipped; **operator-run** |

Azure/Surya cannot run in the build sandbox (no credentials / GPU / weights). Their
adapters produce the same output schema; run them on your infra and re-run
`eng-score.ts` to fold them in. No numbers were fabricated for them.

## Headline results (108 pages; full per-stratum tables in the report)

- Reference: **8** scanned/no-text-layer, **2** garbled embedded text (F2).
- **layout-2** — glyph-loss **0.03%**, duplication **0%**, Hebrew-share **90%**
  (dragged down only by the 8 scanned pages), false-separation **0.23%**,
  unresolved **5.6%**, failure **13.9%**. Per stratum it is essentially perfect on
  text-layer pages (`old_font` 0% loss / 0% fail, `budget_table`, `doubled_text_layer`,
  `front_or_index`, `modern_two_column`, `classic_marginal_caption` all ~0% loss).
  Its only gaps: contributes nothing on the 8 scanned pages, inherits garbled
  glyphs on 2 F2 pages, and leaves reading order **unresolved** on 6 multi-column
  pages.
- **tesseract-heb** — glyph divergence **10.6%** on clean pages (mediocre Hebrew
  OCR; e.g. `complex_modern` 26%, `doubled_text_layer` 50%, `image_partial` dup
  91%), and no layout/section structure. But **higher Hebrew-share (97%)**: on
  garbled/scanned pages it recovers cleaner *true* glyphs than the embedded layer.
- Cross-engine glyph agreement on clean pages: **82%**.

**Reading:** where a good text layer exists (100/108), layout-2 dominates and OCR
only adds noise. OCR earns its place only on the scanned + garbled residual
(~10/108 ≈ 9%), and there a strong cloud OCR is likely needed because tesseract is
weak on exactly those scans.

## Remaining failure classes

1. **Scanned / no text layer (8):** bench-022, 023, 101, 102, 104, 105, 107, 108
   — OCR-only; needs human certification. layout-2 cannot help.
2. **Garbled embedded text / F2 glyph (2):** bench-060, 061 — the PDF's own text
   is corrupt; use OCR of the rendered shapes, not the layer.
3. **layout-2 unresolved reading order / F1 (6):** bench-044, 058, 061, 068, 073,
   088 — multi-column / marginal pages where glyphs are preserved but order is
   ambiguous.
4. (Minor) **caption/body separation / F3:** already strong (0.23% false-sep);
   low priority.

## Recommended production architecture (hybrid — evidence-based)

Per-page router, deterministic-first:

1. **Has a good text layer** (embedded text present AND Hebrew-share ≥ ~0.6) →
   **layout-2** (deterministic). ~91% of pages here; near-zero glyph loss.
2. **No text layer** (scanned) → **cloud OCR** (Azure DI or Google Document AI;
   pick on the operator-run comparison). Tesseract only as an offline fallback.
3. **Garbled text layer (F2)** → **cloud OCR** of the rendered page (ignore the
   corrupt layer); flag for glyph review.
4. **Multi-column / marginal & layout-2 `unresolved` (F1)** → keep the lossless
   glyphs from the text layer but re-derive reading order with an improved layout
   pass (better band segmentation, or a layout-only model used *only* for
   ordering on flagged pages — not for the text).
5. **Any low-confidence / unresolved output → `needs_review` / quarantine, never
   published.** `published = 0` stays until certified.

Cost: OCR touches only ~9% of pages, so cloud OCR at ~$1.5–10/1k pages is
negligible at corpus scale (~17.8k pages → the OCR residual is ~1.5k pages).

### F1 / F2 / F3 work items (authorized; next increment)

- **F1** — improve layout-2 reading order on multi-column/marginal pages; target
  the 6 unresolved pages; re-run `eng-score.ts` and watch unresolved% + cross-engine
  agreement. (Glyphs already lossless — this is ordering only.)
- **F2** — add the Hebrew-share garble detector to routing (done as a metric);
  route garbled pages to OCR; add optional font `ToUnicode` remap where feasible.
- **F3** — keep caption/body separation as-is; add footnote handling if later
  strata show need.

The harness supports regression: implement a fix, re-run extract/score, compare
`report/` deltas per stratum.

## Exact evidence required before extracted statutory text may be published

Passing this engineering evaluation is **necessary but NOT sufficient**. Before
`published` may move off 0 for any statutory text, ALL of the following:

1. **Strict human benchmark completed & frozen** — 108/108 independently
   human-annotated + second-reviewed, `FROZEN-v1.json` written (its
   `combined_sha256` recorded).
2. **Selected architecture scored against that FROZEN human ground truth** (via
   `score-benchmark.ts`, not the proxy) meets GO thresholds, **per stratum**:
   reading-order ≥ 99%, text-loss = 0%, Hebrew-fidelity ≥ 99%, caption/body ≥ 99%,
   citation/page alignment = 100% — with **no stratum** below threshold.
3. **Per-page confidence gating** — only pages that clear the thresholds at high
   confidence are publish-eligible; unresolved/low-confidence →
   `needs_review`/quarantine.
4. **Provenance + labelling on every published unit** — source PDF object key,
   page, engine, `machine_derived: true`, and a visible "official PDF is
   authoritative; text is machine-derived" notice.
5. **Legal review sign-off** and a documented correction/erratum path.
6. **Explicit founder authorization** to flip `published` — it never flips merely
   because an engineering or automatic evaluation passed.

Until all six hold, the official PDF remains the sole authority and extracted text
stays machine-derived and unpublished.
