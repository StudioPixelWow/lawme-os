# F1 Hybrid Layout/OCR — Technology Evaluation & Architecture (for approval)

Date: 2026-08-08. Prepared in response to the founder decision to solve F1 as a
**hybrid extraction architecture** (deterministic where validated + a real
layout/OCR path for complex pages), evaluated against a human-reviewed benchmark
**before** any build or corpus-wide reprocessing. Nothing here is implemented yet;
`published = 0` remains mandatory.

## 1. Problem restatement (evidence-based)

Deterministic geometry (`layout-2`) reconstructs **classic gazette pages**
(marginal-caption, single body column) losslessly and correctly, verified by
manual review. It **cannot** reliably reconstruct — nor reliably *flag* — these
real failure classes, confirmed on live corpus pages:

- **Modern multi-column body** (e.g. pub 2161820, 2021 omnibus): two adjacent
  body columns with no whitespace gap → interleaved reading order.
- **Doubled text layer** (e.g. pub 544591 p3): each phrase appears twice.
- **Old-font glyph corruption** (e.g. pub 148830, 1959): F2 territory, but it also
  corrupts layout signals.
- **Budget tables / schedules**: structure lost to a flat list.

Crucially, the automatic reading-order proxy is **untrustworthy** (reported 100%
where manual review found ~72% on the "resolved" set). So routing and GO cannot
rely on it.

## 2. Corpus scale (for costing)

```
full-text publications      3,004
total pages                17,796   (avg 5.9/pub, max 372)
pages in docs ≥ 8 pages    12,130   (68% of pages; skew to modern multi-column)
```

The corpus is overwhelmingly **born-digital** (a text layer exists — that is why
pdf.js extraction works at all). So the primary need is **layout / reading-order
analysis**, with **OCR as the tool for the pages whose text layer is unusable**
(doubled, old-font, image-only).

## 3. Key architectural insight — render-to-image OCR solves F1+F2 together

For doubled-layer, old-font, and image pages, **rendering the PDF page to an
image and running layout-aware OCR bypasses the broken text layer entirely**: OCR
reads the visual glyphs, yielding both correct reading order (F1) *and* correct
Hebrew characters (F2) in one pass. Therefore:

- On the **OCR path**, F1 and F2 are **solved together** (no separate glyph fix
  needed for those pages).
- On the **deterministic path** (classic clean text layer), F1 is done
  (`layout-2`); F2 remains a small separate targeted fix for residual glyph
  issues in that text layer.

Recommendation on the founder's F1/F2 question: **merge F1+F2 on the OCR path;
keep F2 as a small separate task for the deterministic path.** They partially
converge rather than fully merging.

## 4. Candidate technologies (shortlist to benchmark — not yet selected)

| Option | Hebrew / RTL | Layout + reading order | Bounding boxes | Old-font / image OCR | Deploy | Determinism | Cost @ our scale | License |
|---|---|---|---|---|---|---|---|---|
| **Azure AI Document Intelligence** (Read+Layout, v4) | Hebrew `he` explicitly supported (print) in Read **and** Layout | Yes — document structure, reading order, tables | Yes (bounding regions) | Yes (Read OCR) | Cloud API | Model versions pinnable per API version; cache results → deterministic downstream | ~$1.5/1k (Read), ~$10/1k (Layout) | Commercial SaaS |
| **Google Document AI** (Document OCR + Layout Parser) | Hebrew supported | Yes — Layout Parser: chunks, reading order | Yes | Yes | Cloud API | Processor versions pinnable; cache → deterministic | $1.5/1k (OCR), $10/1k (Layout) | Commercial SaaS |
| **Surya** (datalab-to) | 90+ langs; Hebrew **not** explicitly benchmarked — must test | Yes — layout, reading order, tables | Yes | Yes | Self-host (GPU or CPU/Apple-Silicon) | Pinned weights → fully deterministic | $0/page + compute | Apache-2.0 code; **model weights need a commercial license above $5M rev** |
| **Tesseract 5 (heb)** + layout engine | Hebrew OCR solid; RTL mature | OCR only — needs a separate layout model (e.g. layoutparser) | Word/line boxes | Yes (core strength) | Self-host (CPU) | Fully deterministic | $0/page + compute | Apache-2.0, no restriction |
| **PaddleOCR / PP-Structure** | RTL handling **weak** (documented Arabic LTR issue) — risky for Hebrew reading order | Layout + tables | Yes | Yes | Self-host | Deterministic | $0/page | Apache-2.0 |
| VLMs (GPT-4o / Gemini / Claude vision) | Strong | Strong | Approx | Strong | API | **Non-deterministic** — conflicts with the reproducibility requirement and the project's "no LLM for deterministic reconstruction" rule | ~$1–5/1k+ | SaaS |

Notes: PaddleOCR is a **caution** (RTL reading-order weakness). VLMs are
**excluded from the deterministic core** by the founder's reproducibility rule,
though a VLM could serve as an optional adjudicator on `needs_review` pages only.

## 5. Recommended architecture — per-page hybrid router

```
PDF page (from Object Storage; never re-downloaded from Knesset)
      │
      ▼
[ Router — deterministic signals over the text-layer geometry ]
   route to OCR path if ANY of:
     • ≥2 body columns / center gap (modern multi-column)
     • doubled text layer (duplicate-item ratio)
     • old-font / glyph anomaly (F2 signals: undefined-glyph, low dict-rate)
     • image-only / very low text coverage
     • deterministic reconstruction fails validation (body-like caption, low conf)
      │                                   │
      ▼ (clean classic)                   ▼ (complex/ambiguous)
[ Path A: deterministic layout-2 ]   [ Path B: render page → image → layout-OCR ]
   fast, free, validated                selected provider (from the benchmark)
      │                                   │
      └──────────────┬────────────────────┘
                     ▼
   machine-derived layers (NEVER overwrite raw):
     raw_extraction · normalized_extraction · structured_legal_text
     + page_number, bounding_boxes, reading_order, provenance, engine, confidence
                     ▼
   confidence gate:
     high-confidence + human-sampled PASS → eligible for RAG corpus
     low-confidence / unresolved         → needs_review / quarantined (never guessed)
```

Invariants (all per founder requirements): the **official PDF stays the sole
authority**; OCR/layout text is always machine-derived, never authoritative; raw
text is never overwritten; Hebrew + RTL are first-class; low-confidence pages
never enter the RAG corpus; reprocessing runs from Object Storage only.

## 6. Benchmark design (the GO gate — human ground truth, not the proxy)

Build a representative benchmark of **~140 real pages** from Object Storage,
stratified:

```
classic marginal-caption        25
modern two-column (clean)        20
complex modern (2161820-class)   20
doubled text-layer               15
old-font (pre-1970)              20
budget table / schedule          15
partial / image-only             10
in-force vs repealed spread      15
```

For each page, establish **human ground truth**: correct reading-order text,
caption vs body labels, section boundaries, page/citation. (First-pass
transcription assisted, human-verified against the source PDF.)

Compare **deterministic `layout-2`** vs each candidate on human-reviewed metrics:

```
reading-order accuracy         (primary)
text-loss rate                 (must be 0)
duplicated-text rate
caption / body classification accuracy
section-boundary preservation
Hebrew character fidelity       (F2)
citation / page alignment
```

**GO only on human ground truth**, never the automatic proxy. Per-class results
drive the router thresholds (which classes go to Path A vs Path B).

## 7. Cost at our scale

One-time reprocessing of the whole corpus (17,796 pages), worst case **all pages
via cloud Layout** = ~**$178** (Google/Azure Layout @ $10/1k) or ~**$27** via
Document OCR. Realistically only the **routed complex subset** (est. 30–45% of
pages) needs Path B → **~$55–$80 one-time**. **Self-hosted** (Surya/Tesseract) is
**$0/page** + a few hours of GPU/CPU compute on the operator machine. Benchmark
phase cost is a few dollars. Future scale (e.g. 100k pages) via cloud Layout ≈
**$1,000**; self-hosted stays compute-only. **Cost is not a deciding constraint at
this scale** — accuracy, determinism, privacy, and integration are.

## 8. Local vs external API

- **Router + Path A (deterministic):** local Node, already built.
- **Path B:** either **self-hosted** (Python + Tesseract/Surya on the operator
  machine or a short-lived GPU box — deterministic, private, $0/page) **or a cloud
  API** (Azure/Google — explicit Hebrew, lowest integration effort, ~$60–180,
  results cached for downstream determinism). The sandbox is air-gapped, so Path B
  runs from the operator's networked machine (same pattern as the backfill),
  reading bytes from Object Storage.
- Data-sensitivity note: this is **public, officially-published legislation**, so
  sending it to a cloud OCR API is low-risk; self-hosting is still preferable for
  strict determinism/reproducibility.

## 9. Recommendation (to be confirmed by the benchmark)

Lead candidates to benchmark first: **(1) Tesseract-heb + a layout model**
(fully open, no license limit, strong Hebrew OCR, deterministic, self-hosted) and
**(2) Azure Document Intelligence Layout** (explicit Hebrew in Read+Layout,
reading order + tables, lowest integration effort). **Surya** as a third if its
Hebrew accuracy tests well (mind the model-weight commercial license). Select on
the human-reviewed benchmark, not convenience. Determinism + Hebrew fidelity +
reading-order accuracy are the tie-breakers.

## 10. Implementation plan (phased; each phase gated)

```
Phase 0  THIS DOCUMENT — evaluation + architecture + benchmark design + cost   → founder approval
Phase 1  Build the ~140-page benchmark set from Object Storage + human ground truth
Phase 2  Run layout-2 vs 2–3 candidates on the benchmark; human-reviewed metrics; SELECT engine
Phase 3  Build the hybrid router + Path B integration (operator-run, from Object Storage);
         persist machine-derived layers + provenance; unresolved → needs_review/quarantine
Phase 4  Reprocess corpus through the hybrid (operator, from Object Storage, no Knesset re-download);
         re-gate on a fresh human-reviewed sample
Phase 5  Publish decision — still gated; published stays 0 until the human benchmark passes
```

**Do not begin corpus-wide OCR/reprocessing before Phase 0 is approved and an
engine is selected in Phase 2.**

## Sources

- Google Document AI pricing — https://cloud.google.com/document-ai/pricing
- Azure Document Intelligence language support (Hebrew in Read & Layout) — https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/ocr?view=doc-intel-4.0.0
- Surya (OCR/layout/reading-order, license) — https://github.com/datalab-to/surya
- PaddleOCR RTL reading-order caveat — https://github.com/PaddlePaddle/PaddleOCR/discussions/14971
