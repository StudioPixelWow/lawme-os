# LAW ME — Final Legislation Scale Report

**Run:** Full-corpus hybrid reprocess — DEV dry-run, Object-Storage only, Google Document AI for Path B2.
**Nature:** Machine-derived extraction proxy metrics — NOT human-certified accuracy. `published = 0` throughout.
**Decision:** **`LEGISLATION_FULL_CORPUS_GO`**

---

## 0. Scope resolved from inventory (before processing)

The cohort size was **not** guessed. `cohort_size=ALL` resolved the full eligible full-text set from the corpus / Object-Storage inventory: every publication with a stored PDF object **and** a known page count, in deterministic canonical order.

- **Eligible publications:** 3,004
- **Attempted:** 3,004
- **Completed:** 3,004
- **Failed:** 0
- **Total pages:** 17,796

---

## 1–5. Corpus & completion

| # | Metric | Value |
|---|--------|-------|
| 1 | Eligible publications | 3,004 |
| 2 | Publications attempted | 3,004 |
| 3 | Publications completed | 3,004 |
| 4 | Publications failed | 0 |
| 5 | Total pages | 17,796 |

## 6–10. Routing

| # | Metric | Value |
|---|--------|-------|
| 6 | Path A (deterministic text/layout) | 16,266 — **91.40%** |
| 7 | Path B1 (reading-order recovery) | 1,096 — **6.16%** |
| 8 | Path B2 (Google Document AI OCR) | 434 — **2.44%** |
| 9 | Google B2 calls | 434 |
| 10 | Google B2 failures | **0** |

## 11–20. Quality / review

| # | Metric | Value |
|---|--------|-------|
| 11 | Accepted pages | 17,603 (98.92%) |
| 12 | Needs-review pages | 193 — **1.08%** |
| 13 | Unresolved pages | **0** |
| 14 | Sparse pages | 5 |
| 15 | Likely-blank pages | 113 |
| 16 | Table pages | 75 |
| 17 | Native-table pages | 0 |
| 18 | Geometry-table pages | 75 |
| 19 | **Table pages accepted** | **0** |
| 20 | Table pages needs-review | 75 |

## 21–27. Integrity

| # | Metric | Value | Gate |
|---|--------|-------|------|
| 21 | Provenance completeness | **100%** | ✅ |
| 22 | Physical-page alignment | **100%** | ✅ |
| 23 | Raw overwrite count | **0** | ✅ |
| 24 | Published count | **0** | ✅ |
| 25 | Duplicate-extraction anomalies | 0 | ✅ |
| 26 | Extraction failures | 0 | ✅ |
| 27 | Checksum / Object-Storage anomalies | **0** | ✅ |

## 28–34. Quality diagnostics

| # | Metric | Value |
|---|--------|-------|
| 28 | Hebrew share A/B1 | 99.62% |
| 29 | Glyph-loss proxy A/B1 | 0.11% |
| 30 | Duplication A/B1 | 0% |
| 31 | Hebrew share B2 | 63.57% (see note) |
| 32 | Duplication B2 | 8.42% |
| 33 | Google mean latency | 1,873 ms |
| 34 | B2 confidence distribution | non-blank 321 / blank 113 (see note) |

**Note on #31 (Hebrew share B2 = 63.57%):** diagnostic only, never a gate. The B2 set now contains 113 fully-blank back-matter pages (Hebrew share 0) that dilute the mean, plus legitimately bilingual (Hebrew + Latin/numeric) budget-table pages. On the accepted B2 *content* pages the Hebrew share is high (colophon pages 86–93%).

**Note on #34 (confidence distribution):** in this run the field reported non-blank 321 / blank 113 because the distribution bucket compared a 0–100 DocAI page-confidence value against 0–1 thresholds, collapsing every non-blank page into "high". This is a **reporting-field scale bug only** — it does not touch routing, `needs_review`, or any gate criterion. The *true* per-page confidences (from the residual eval) are 89.15–97.04% on content pages and 56.6% on the one sparse page — i.e. high confidence on accepted content, low on the sparse page the classifier correctly routed to review. Fixed in commit `3bd838b` (normalize >1 → /100) so the field bands correctly on the next run.

---

## 35–36. Regression vs prior scale gates

All four gates held every integrity invariant (provenance 100%, alignment 100%, raw-overwrite 0, published 0, geometry-tables review-gated). Precise field-level comparison for the two scales with full metric captures:

| Dimension | 1,000-pub | Full corpus | Direction |
|---|---|---|---|
| Total pages | 4,782 | 17,796 | scaled ~3.7× |
| Path A % | 93.64 | 91.40 | −2.24 pts |
| Path B1 % | 2.13 | 6.16 | +4.03 pts |
| Path B2 % | 4.22 | 2.44 | −1.78 pts |
| Needs-review pages | 86 | 193 | +107 (rate 1.80% → 1.08%, ↓) |
| Likely-blank | 9 | 113 | +104 |
| Sparse | 2 | 5 | +3 |
| Table pages | 75 | 75 | **flat** |
| Table pages accepted | 0 | 0 | held |
| Provenance / alignment | 100% / 100% | 100% / 100% | held |
| Raw-overwrite / published | 0 / 0 | 0 / 0 | held |
| Hebrew share A/B1 | 99.35% | 99.62% | ↑ |
| Glyph-loss A/B1 | 0.01% | 0.11% | +0.10 pt |
| Duplication B2 | 9.74% | 8.42% | ↓ |
| New failure classes | [] | [] | held |

**#36 — where things changed, and why:**

- **Routing distribution:** B1 rose (2.13→6.16%) and B2 fell (4.22→2.44%). The full corpus is proportionally more text-layer-present-but-scrambled prose (recovered by B1) and less fully-scanned (B2) than the deterministic 1,000 prefix. No routing-logic change — the frozen router simply saw a different document mix.
- **Blank/sparse classification:** blanks 9→113, sparse 2→5. The additional B2 pages are overwhelmingly back-matter (blank versos + price colophons), not new content — all correctly routed to `needs_review`, none accepted as authoritative blanks.
- **Table detection: flat at 75.** The extra 2,004 publications contributed **zero** new geometry-table pages. This is coherent — numeric tables in Israeli legislation cluster in a small number of budget-law appendices already inside the prefix — and it is consistent with the blank/colophon growth above. It is nonetheless the single metric that did not move with a 3.7× page increase, so it is the recommended target for a human spot-check (see §G).
- **Glyph loss A/B1:** 0.01%→0.11% — a 10× relative move but 0.11% absolute, negligible, and expected from the older / messier text-layer PDFs in the corpus tail. No gate threshold breached.
- **OCR failure rate, provenance, alignment, duplicates, extraction failures:** unchanged at their ideal values.

## 37–38. Newly discovered failure classes

**37:** none — `newly_discovered_failure_classes: []`.
**38:** not applicable (0 pages/publications affected).

---

## 39–41. Review backlog

**#39 — needs_review by reason code** (a page may carry more than one code, so instances sum to 199 across 193 distinct pages):

| Rank | Reason code | Pages |
|---|---|---|
| 1 | `B2_EMPTY_OCR` (likely-blank back-matter) | 113 |
| 2 | `B2_TABLE_STRUCTURE_UNCERTAIN` (geometry-reconstructed tables) | 79 |
| 3 | `B2_SPARSE_PAGE` | 5 |
| 4 | `B2_LOW_CONFIDENCE` | 2 |

**#40 — ranked by volume:** empty/blank ≫ geometry tables ≫ sparse ≫ low-confidence.

**#41 — distinct-page composition of the 193-page backlog:**

- Likely-blank: **113** (`B2_EMPTY_OCR`)
- Geometry tables: **75** (`B2_TABLE_STRUCTURE_UNCERTAIN`; never auto-accepted)
- Sparse: **5** (`B2_SPARSE_PAGE`, some also `B2_LOW_CONFIDENCE`)
- Low-confidence OCR: subsumed in the sparse set (2 pages carry it as a second code)
- OCR errors: **0**
- Unresolved layout: **0**
- New reason: **none**

Path A and Path B1 contributed **zero** needs-review pages at full scale — the entire backlog is Path-B2, and every item is a known, explainable, review-gated class.

---

## Final decision

### `LEGISLATION_FULL_CORPUS_GO`

Every GO requirement is satisfied on live full-corpus evidence:

- completed = attempted (3,004 = 3,004; 0 failed)
- provenance = 100%; physical-page alignment = 100%
- published = 0; raw overwrite = 0
- no silent acceptance of uncertain B2 output — table_pages_accepted = 0
- geometry tables remain review-gated (75/75)
- sparse/blank pages remain review-gated (5 + 113, all needs_review)
- no material Path A/B1 regression (Hebrew 99.62% ↑, glyph loss 0.11%, duplication 0%)
- no unexplained duplicates (0); no structural corruption; no new high-severity failure class ([])
- checksum / Object-Storage anomalies = 0

---

## Final Legislation Readiness Plan

> Nothing below is executed. No publish, no DB persistence, no `published` flag change — all held for separate founder approval.

**A. What can safely be persisted (as an unpublished machine-derived layer).** The 17,603 accepted pages — Path A 16,266 + Path B1 1,096 + Path B2-accepted 241 — each with engine/route/route_reason/confidence, full provenance (publication_item_id, page_number, source_url, object-storage source), `machine_derived = true`, `needs_review = false`, `published = false`. Written to a **separate** extraction layer; the raw source/extraction is never overwritten.

**B. What remains needs_review (193 pages, held out of any accepted set).** 113 likely-blank back-matter, 75 geometry-reconstructed tables, 5 sparse. All flagged with reason codes for a human queue.

**C. RAG readiness.** Accepted Path A/B1 text is ready for RAG (Hebrew 99.62%, glyph loss 0.11%, duplication 0%). Accepted Path B2 content pages are usable with their `machine_derived` + confidence provenance. **Geometry-reconstructed tables must be excluded from structured retrieval** (or surfaced as prose only, flagged) until a native Form/Layout parser or human review confirms label↔value cells — the current tables preserve the relationship but are review-gated.

**D. User-facing display readiness.** Accepted A/B1 pages are display-ready with a "machine-derived" label. Accepted B2 content pages likewise. The 193 needs_review pages must **not** be displayed as authoritative until human-checked (a blank verso shown as statutory text, or an uncertain table shown as fact, would be a correctness/trust failure).

**E. Exact remaining blockers before publication.**
1. Human review of the 193 needs_review pages — priority on the 75 tables and a sample of the 113 blanks (confirm truly blank vs. an OCR miss).
2. The extraction-layer DB migration is **not applied** (approval-gated per AGENTS.md).
3. The persist step is intentionally still gated — `reprocess-hybrid --commit` refuses in this build.
4. Founder sign-off on any `published = true` transition.

**F. Recommended persistence strategy.** Apply the extraction-layer migration (founder-approved) → write the machine-derived layer with `published = false`, needs_review flags, reason codes, and provenance, batched by publication → keep raw untouched → run the corrected build (commit `3bd838b`, correct confidence banding) for the persistence pass so the confidence field is trustworthy on the record of authority.

**G. Recommended post-persistence verification sample (human, against source PDFs) before any publish.** A stratified sample: ~100 Path A + ~30 Path B1 pages spread across Knesset numbers/eras; **all 75 geometry-table pages**; a random ~20 of the 113 blanks to confirm they are genuinely blank; plus a targeted re-check of the flat-at-75 table count — pull a handful of *non-prefix* budget-type publications and confirm no table page was missed.

**H. Final founder approval required before any published-flag change.** Yes — explicit, per-batch. This report authorizes the full-corpus dry-run result only; it does not authorize persistence or publication.

---

*Legislation ingestion track — this closes the scale-gate sequence (50 → 250 → 1,000 → full corpus). No architecture iteration is proposed; the frozen routing/extraction/threshold set carried the full corpus without a new failure class.*
