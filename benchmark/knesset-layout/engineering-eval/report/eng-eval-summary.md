# Engineering Evaluation — candidate comparison (AUTOMATIC/PROXY metrics)

> **Not human-ground-truth accuracy. Not certification.** Metrics are vs the PDF's own text layer (order-independent glyph oracle) + intrinsic signals. The strict human benchmark is preserved unchanged. `published = 0`.

Reference: 108 pages · 8 scanned/no-text-layer · 2 garbled embedded text (F2).

Cross-engine glyph agreement (layout-2 vs tesseract-heb, clean pages): **82.37%**

## layout-2

| metric | value |
|---|---|
| pages | 108 |
| pages_with_reliable_reference | 98 |
| pages_no_text_layer | 8 |
| pages_garbled_reference | 2 |
| mean_text_loss_pct | 0.03 |
| mean_duplication_pct | 0 |
| mean_hebrew_share | 90.16 |
| mean_section_monotonic_diag_pct | 100 |
| mean_false_separation_pct | 0.23 |
| folio_detected_rate_pct | 66.67 |
| unresolved_rate_pct | 5.56 |
| failure_rate_pct | 13.89 |

### per stratum

| stratum | pages | reliable-ref | text-loss% | dup% | heb% | false-sep% | unresolved% | failure% |
|---|---|---|---|---|---|---|---|---|
| budget_table | 4 | 4 | 0.09 | 0 | 100 | 0 | 0 | 0 |
| classic_marginal_caption | 19 | 17 | 0 | 0 | 89.47 | 0 | 0 | 10.53 |
| complex_modern | 21 | 19 | 0.11 | 0 | 88.17 | 1.19 | 9.52 | 14.29 |
| doubled_text_layer | 1 | 1 | 0 | 0 | 100 | 0 | 0 | 0 |
| front_or_index | 25 | 25 | 0 | 0 | 99.95 | 0 | 12 | 12 |
| image_partial | 9 | 3 | 0 | 0 | 33.33 | 0 | 0 | 66.67 |
| modern_two_column | 6 | 6 | 0.03 | 0 | 99.95 | 0 | 16.67 | 16.67 |
| old_font | 23 | 23 | 0 | 0 | 99.45 | 0 | 0 | 0 |

## tesseract-heb

| metric | value |
|---|---|
| pages | 108 |
| pages_with_reliable_reference | 98 |
| pages_no_text_layer | 8 |
| pages_garbled_reference | 2 |
| mean_text_loss_pct | 10.62 |
| mean_duplication_pct | 12.17 |
| mean_hebrew_share | 97.22 |
| mean_section_monotonic_diag_pct | 100 |
| mean_false_separation_pct | 0 |
| folio_detected_rate_pct | 67.59 |
| unresolved_rate_pct | 2.78 |
| failure_rate_pct | 71.3 |

### per stratum

| stratum | pages | reliable-ref | text-loss% | dup% | heb% | false-sep% | unresolved% | failure% |
|---|---|---|---|---|---|---|---|---|
| budget_table | 4 | 4 | 25.78 | 10.03 | 100 | 0 | 0 | 100 |
| classic_marginal_caption | 19 | 17 | 4.49 | 3.48 | 100 | 0 | 0 | 42.11 |
| complex_modern | 21 | 19 | 26.39 | 1.92 | 100 | 0 | 0 | 71.43 |
| doubled_text_layer | 1 | 1 | 49.53 | 0.63 | 100 | 0 | 0 | 100 |
| front_or_index | 25 | 25 | 3.49 | 23.08 | 100 | 0 | 0 | 76 |
| image_partial | 9 | 3 | 2.61 | 91.44 | 66.67 | 0 | 33.33 | 100 |
| modern_two_column | 6 | 6 | 18.2 | 1.81 | 100 | 0 | 0 | 66.67 |
| old_font | 23 | 23 | 4.6 | 8.45 | 100 | 0 | 0 | 73.91 |

## Failure classes

- **Scanned / no text layer** (OCR-only, needs human cert): 8 — bench-022, bench-023, bench-101, bench-102, bench-104, bench-105, bench-107, bench-108
- **Garbled embedded text (F2 glyph)**: 2 — bench-060, bench-061
- **layout-2 unresolved reading order (F1)**: 6 — bench-044, bench-058, bench-061, bench-068, bench-073, bench-088
- **layout-2 low Hebrew share (F2 inherited)**: 2 — bench-060, bench-061