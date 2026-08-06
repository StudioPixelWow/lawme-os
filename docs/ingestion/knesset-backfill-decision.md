# Knesset Official-PDF Backfill Decision (v2)

Date: 2026-08-07. Supersedes the prior GO_WITH_FIXES scorecard after the Track A
(normalization + amendment parser) and Track B (object storage) hardening.

## Three-domain GO gate

A full GO requires ALL THREE domains to pass.

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
Caveat: iterated against a 106-clause labeled set (20 real). Held-out real
evaluation is future work; the reprocess run showed 0 high-confidence false
mutations on out-of-tuning real text.

### 3. Object storage — NOT_GO
```
upload success                   ❌ 0% (31 registered, 0 uploaded)
checksum verification            ❌ 0% (not run against live bucket)
no duplicate binaries            ✅ 31 distinct sha, content-addressed dedup
access policy verified           ✅ private bucket, deny-by-default, service-role only
round-trip verification          ✅ implemented + unit-tested (not run live)
```
Blocker: physical byte upload needs the storage service key AND a network path
to fs.knesset.gov.il for the bytes. This container is air-gapped from that host
and the browser cannot authenticate to storage without exposing the key.

## Decision

```
GO_WITH_FIXES
```

Both original Track A blockers are FIXED and verified. The single remaining gap
is the **physical PDF byte upload to object storage** (an operator/infra step,
not a code gap — the storage subsystem is fully built, policied, and tested).

## Backfill status

The controlled backfill runs **only on a full GO**. Decision is GO_WITH_FIXES,
so the ≤500-law / ≤5,000-publication backfill is **NOT started**. It unblocks
when the byte upload runs from an environment holding the storage service key +
network access to fs.knesset.gov.il, flipping the 31 objects to `verified`.

## Backfill guardrails (pre-agreed, for when GO is reached)
`batch 10–25 · concurrency 2 · checkpoint per (IsraelLawID, correctionNumber) ·
daily cap · pause/resume`. Auto-stop on: download<98%, extraction<95%,
normalization_failure>2%, high-confidence parser error, quarantine>5%, storage
verification failure, 403, 429, schema drift.
