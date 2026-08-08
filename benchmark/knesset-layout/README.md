# LAW ME — Knesset Layout/Extraction Regression Benchmark

**Permanent, versioned, immutable.** This is not a one-off F1 test. It is the
fixed ground against which the deterministic extractor and every future
layout/OCR engine, normalization change, or pipeline revision is measured. Once
frozen, the page set and its human ground truth do not change; new versions are
added alongside, never in place.

## Contents

```
manifest-v1.json      108 real corpus pages, stratified, with source_url + page (page selection)
build-manifest.ts     deterministic generator for the manifest (reproducible)
annotation-template.json   the per-page ground-truth schema (what a human fills)
ground-truth/         one <id>.json per page, human-annotated (added during Phase 1)
freeze-benchmark.ts   computes the content hash + writes the version lock (freeze step)
FROZEN-v1.json        (created on freeze) the immutable lock: manifest hash + ground-truth hash
```

## Strata (tentative in the manifest; the annotator confirms the true stratum)

`classic_marginal_caption`, `modern_two_column`, `complex_modern`,
`old_font`, `doubled_text_layer`, `budget_table`, `image_partial`,
`front_or_index`. Coverage spans 1933–2026, original enactments and amendments,
short (1–2 pp) and long (up to 372 pp) documents.

## Ground-truth schema (per page)

Independent human ground truth — annotated from the **official PDF**, NOT from any
extractor output (to avoid circularity). Each `ground-truth/<id>.json`:

```jsonc
{
  "id": "bench-001",
  "confirmed_stratum": "complex_modern",
  "reading_order_text": "…full correct RTL reading-order transcription of the page body…",
  "regions": [
    { "role": "body", "column": 0, "bbox_or_desc": "right body column" },
    { "role": "caption", "column": -1, "bbox_or_desc": "marginal section heading, right margin" }
  ],
  "marginal_captions": ["תיקון סעיף 1", "…"],
  "section_boundaries": ["1", "2", "3", "…"],   // section numbers in reading order
  "page_alignment": { "printed_page_label": "364", "gazette_page": "…" },
  "hebrew_fidelity_notes": "any glyph corruption / ambiguous characters observed",
  "annotator": "name", "reviewed_by": "name", "confidence": "high|medium|low"
}
```

## Workflow (Phase 1) — local annotation workspace

```
# 1. PREPARE (operator, networked): pull each page's PDF from Object Storage and
#    generate a layout-2 DRAFT per page (accelerator only, marked _draft:true).
node --experimental-strip-types benchmark/knesset-layout/prepare-annotation.ts

# 2. ANNOTATE (operator, local): open the workspace in a browser.
node --experimental-strip-types benchmark/knesset-layout/annotate-server.ts
#    → http://localhost:8787  — PDF page beside the editable draft.

# 3. FREEZE (only when 108/108 are second-reviewed & APPROVED/UNRESOLVED):
node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --freeze --stamp 2026-08-08
```

In the workspace each page shows the **official PDF at the exact page** next to a
**clearly-marked DRAFT** (from `layout-2` only — never a candidate OCR/layout
engine). The annotator edits the reading-order text, marks body / caption / table
/ header-footer regions, confirms section boundaries, page/citation alignment and
the stratum, records Hebrew/glyph issues, and sets a state:
`APPROVED` / `NEEDS_CORRECTION` / `UNRESOLVED`. Everything is editable; the draft
is never accepted automatically. Saves are incremental (per edit, atomic) to
`ground-truth/<id>.json`. A second reviewer sets `reviewed_by`. A progress
dashboard shows counts per stratum; keyboard shortcuts (J/K nav, A/N/U state,
Ctrl+S save, R reset-to-draft) keep review fast.

Freeze validates every required field and requires **108/108 second-reviewed**
(state APPROVED or UNRESOLVED — `NEEDS_CORRECTION`/pending blocks freeze), then
writes the immutable `FROZEN-v1.json` (sha-256 of the manifest + every ground
truth). After freeze the set is immutable; changes require a new version.

## Evaluation protocol (Phase 2 — only after freeze)

- Do **NOT** tune any extractor against this benchmark before it is frozen.
- Run the deterministic extractor (`layout-2`) AND each candidate engine
  (self-hosted + cloud) over the same frozen pages, from Object Storage.
- Score against human ground truth — **never** the automatic proxy:

```
reading-order accuracy            (primary gate)
text-loss rate                    (must be 0)
duplicated-text rate
caption / body classification accuracy
section-boundary preservation
Hebrew character fidelity
citation / page alignment         (primary gate: citation integrity)
```

- Report per-stratum, per-engine. Accuracy + citation integrity are the primary
  gates; cost is secondary unless materially different. A hybrid outcome
  (deterministic for clean pages, self-hosted for some complex, cloud OCR only
  for residual low-confidence) is an allowed conclusion.

## Invariants

The official PDF is the sole authority; extractor/OCR output is always
machine-derived. `published = 0` until this benchmark is annotated, frozen, and
passed. No corpus-wide reprocessing before an engine is selected on this set.
