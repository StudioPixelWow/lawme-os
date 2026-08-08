# Router regression — all 108 benchmark pages (engineering / proxy)

> Not human-ground-truth accuracy. Path A untouched; B1 re-orders same glyphs; B2 OCR pending operator run. published=0.

- **Path A (deterministic):** 86.11%
- **Path B1 (layout-only recovery):** 4.63%
- **Path B2 (OCR):** 9.26%
- **unresolved (B1 not fixable):** 0%   ·   **needs_review:** 9.26%
- **glyph-loss proxy (A+B1):** 0.03%   ·   **duplication (A+B1):** 0%
- **Hebrew-share:** 99.4%   ·   **citation alignment:** 66.67%

## Per stratum

| stratum | pages | %A | %B1 | %B2 | unresolved% | glyph-loss% | dup% | heb% | citation% |
|---|---|---|---|---|---|---|---|---|---|
| budget_table | 4 | 100 | 0 | 0 | 0 | 0.09 | 0 | 100 | 75 |
| classic_marginal_caption | 19 | 89.47 | 0 | 10.53 | 0 | 0 | 0 | 100 | 57.89 |
| complex_modern | 21 | 85.71 | 4.76 | 9.52 | 0 | 0.11 | 0 | 97.7 | 76.19 |
| doubled_text_layer | 1 | 100 | 0 | 0 | 0 | 0 | 0 | 100 | 100 |
| front_or_index | 25 | 88 | 12 | 0 | 0 | 0 | 0 | 99.95 | 88 |
| image_partial | 9 | 33.33 | 0 | 66.67 | 0 | 0 | 0 | 100 | 33.33 |
| modern_two_column | 6 | 83.33 | 16.67 | 0 | 0 | 0.03 | 0 | 99.95 | 83.33 |
| old_font | 23 | 100 | 0 | 0 | 0 | 0 | 0 | 99.45 | 47.83 |

## Path B1 pages (layout-only order recovery, no OCR)

- bench-044: resolved losslessly ✓
- bench-058: resolved losslessly ✓
- bench-068: resolved losslessly ✓
- bench-073: resolved losslessly ✓
- bench-088: resolved losslessly ✓

## Path B2 pages (OCR — cloud provider pending)

- bench-022, bench-023, bench-060, bench-061, bench-101, bench-102, bench-104, bench-105, bench-107, bench-108