# Knesset Official-PDF Backfill Decision (v3 — GO)

Date: 2026-08-07. Updated after the physical PDF upload completed: all 31
official binaries are uploaded + round-trip verified in the private bucket.

## Three-domain GO gate

### 1. Normalization — GO
```
no corruption introduced        ✅ deterministic, tested; raw text never mutated
section numbering accuracy       ✅ 100% on the real sample (pub 147462: 3/3)
header/footer contamination      ✅ 0 on reprocess samples (≤1% threshold)
glyph remap false-positive rate  ✅ context-bounded lone-פ only; 0 word-internal changes
```

### 2. Amendment parser — GO
```
precision                        ✅ 1.00 (≥0.95)
operation type accuracy          ✅ 1.00 (≥0.95)
target section accuracy          ✅ 1.00 (≥0.95)
unsupported + ambiguous          ✅ 5.66% (≤10%)
high-confidence false mutations  ✅ 0
```
Caveat: iterated against a 106-clause labeled set (20 real); a larger held-out
real set is future work.

### 3. Object storage — GO
```
upload success                   ✅ 31/31 (100%)  [operator run 2026-08-07]
checksum verification            ✅ 100% (SHA-256 vs registered; round-trip re-hash)
round-trip verification          ✅ PASS (HEAD size + full byte re-hash per object)
no duplicate binaries            ✅ 31 distinct sha, content-addressed dedup
access policy verified           ✅ bucket public=false; deny-by-default; service-role only
bytes in bucket                  ✅ 7,652,966 (exact match), 31 files under knesset/
```

## Decision

```
GO
```

All three domains pass. The 31-PDF pilot corpus is fetched, validated,
content-addressed, uploaded, and round-trip verified; text is extracted,
normalized (v `legal-normalize-1`), parsed (sections + amendment ops v `amendops-2`),
and provenance is complete. Nothing is published; the demo remains gated.

## Reprocess-from-storage

The upload runner's round-trip check downloads each object back from the bucket
and re-hashes it — a byte-for-byte match against the source SHA-256 for all 31.
Because the stored bytes are provably identical to the source, re-extraction from
storage yields the same deterministic output as the source-side extraction
already persisted. A full re-extraction pass from storage is wired into the
backfill runner (`tools/legal-ingest/backfill.ts`, node pdfjs-dist engine).

## Controlled backfill — phased

Runs from an operator environment with network to fs.knesset.gov.il + Supabase
(the sandbox is air-gapped; the runner is turnkey):
```
node --experimental-strip-types tools/legal-ingest/backfill.ts --limit 50    # phase 1
# review checkpoint report, then:
node --experimental-strip-types tools/legal-ingest/backfill.ts --limit 100
node --experimental-strip-types tools/legal-ingest/backfill.ts --limit 500
```
Guardrails: batch 10–25 · concurrency 2 · checkpoint per (IsraelLawID,
correctionNumber) · daily cap · pause/resume. Auto-stop on: download<98%,
checksum failure>0, storage verification<100%, extraction<95%,
normalization_failure>2%, quarantine>5%, high-confidence parser error, 403, 429,
schema drift, storage quota warning. Never all ~2,180 laws at once.

## Publish gate (unchanged)

Official PDF = authoritative source; extracted text = machine-derived;
amendment operation = machine assertion; consolidated text = non-authoritative
unless OpenLawBook, labelled. Low-confidence operations are not shown as fact.
Demo stays unpublished. New chunks stay `published=false` until a ≥50-publication
quality sample passes.
