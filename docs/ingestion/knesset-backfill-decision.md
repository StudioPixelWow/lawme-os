# Knesset Official-PDF Backfill Decision

Date: 2026-08-06. Based on the live fetch + extraction pilot
(`knesset-pdf-extraction-report.md`) over the 8-law / 31-PDF pilot set.

## GO gate scorecard

| Gate criterion | Threshold | Measured | Pass |
|---|---|---|---|
| PDF download success | ≥ 98% | 100% (31/31) | ✅ |
| Text extraction success | ≥ 95% | 100% text present; 93.5% high-confidence | ✅ / ⚠ |
| Provenance completeness | 100% | 100% (sha256, url, size, dates, ספר/page, extraction meta) | ✅ |
| Indexing | ≥ 99% | sample indexed + FTS-searchable; full-set indexing pending | ⚠ |
| Idempotency | PASS | PASS (re-runs leave counts unchanged; 31 distinct SHAs) | ✅ |
| Section numbering accuracy | ≥ 98% | 100% on the parsed sample; not measured at scale; glyph/margin artifacts on a subset | ⚠ |
| No unexplained corruption | — | 2 low-coverage PDFs explained (partial text layer); "פ" glyph artifact explained | ✅ |
| Amendment-operation classification | (quality) | ~33% confidently parsed; ~67% flagged unsupported on raw text | ⚠ |

## Decision

```
GO_WITH_FIXES
```

The core pipeline — SSRF-safe fetch, validation, SHA-256, text-layer extraction,
provenance, indexing, idempotency — is **production-quality and proven on real
data at 100% download and 100% text-extraction**. Two localized, well-defined
gaps prevent a clean GO for a broad backfill:

1. **Amendment-operation classification quality.** On normalized/clean amendment
   text the parser performs well (pub 2201200: 3/4 parsed, 1 correctly flagged),
   but on raw multi-line pdf.js output the unsupported/flagged rate is ~67%. Fix:
   a pre-parse pass that (a) re-joins layout-wrapped lines into logical clauses,
   (b) remaps mis-encoded glyphs (e.g. "פ"→"."), (c) strips margin headings, then
   re-runs the existing rule set. No parser-rule rewrite needed.
2. **Object storage for PDF binaries.** The pipeline stores hash + metadata; the
   binaries themselves need an idempotent object-storage bucket wired (bytes must
   not live in Postgres). Until then, "download" = fetched + hashed + validated,
   not persisted-as-object.

## Backfill status

Per the Epic, the controlled backfill runs **only on a full GO**. Decision is
**GO_WITH_FIXES**, therefore the ≤500-law / ≤5,000-publication backfill is **NOT
started**. It remains gated behind the two fixes above plus a network path from
the operator environment to `fs.knesset.gov.il` (this container is air-gapped
from that host; the browser carried the pilot).

## When GO is reached — backfill guardrails (pre-agreed)

`batch 10–25 · concurrency 2 · checkpoint per (IsraelLawID, correctionNumber) ·
daily cap · pause/resume`. Auto-stop on any of: 403/429, validation < 98%,
quarantine > 5%, extraction failure > 5%, storage failure, schema drift,
duplicate anomaly. Never run all ~2,180 laws at once.
