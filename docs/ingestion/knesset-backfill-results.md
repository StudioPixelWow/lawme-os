# Knesset Backfill — Results

Status as of 2026-08-07. Track A (normalization + amendment parser) and Track B
(object storage) hardening completed; the controlled backfill is **not started**
(gated on a full GO — see `knesset-backfill-decision.md`).

## Track A — normalization + amendment parser (PASS)

- `pdf-normalize.ts` (v `legal-normalize-1`): deterministic line-rejoin, reversed-
  paren fix, glued-year fix, missing-hyphen fix, context-bounded glyph remap,
  running-head removal. 3 separate layers (raw / normalized / structured).
- `amendment-parser-v2.ts` (v `amendops-2`): 14 operation types, old/new text +
  target extraction, statuses parsed/needs_review/unsupported/ambiguous.
- Evaluation (106 clauses, 20 real): precision 1.00, type-accuracy 1.00,
  target-accuracy 1.00, unsupported+ambiguous 5.66%, **0 high-confidence false
  mutations** → gate PASS. (Caveat: iterated against the set; see the eval doc.)
- Reprocess on real messy PDFs (147018/173930/2140800): 5 parsed, 1 ambiguous,
  1 unsupported; persisted as `amendops-2` operations.

## Track B — object storage (NOT_GO)

- `object-storage.ts` (v `legal-object-store-1`) + `legalai.stored_objects`:
  content-addressed key, dedup by sha256, round-trip verification, deny-by-default
  policy on the reused private bucket `legal-source-files`. Unit-tested.
- 31 distinct binaries registered (`storage_status=pending`), every publication
  keyed. **0 uploaded/verified** — physical byte upload is the operator step
  (needs the storage service key + a network path to fs.knesset.gov.il).

## Persisted to dev (metadata + reprocess)

```
stored_objects            31 (0 verified — upload pending)
law_publications          33 (31 with pdf_sha256 + pdf_object_key)
amendment_operations      10 total (6 amendops-2, incl. 1 ambiguous)
Section (official PDF)     3   (published=false)
legal_chunks (official)   3   (published=false; FTS-searchable)
published publications     0
published chunks/sections  0
demo chunks                4   (non_authoritative_demo, gated)
```

## Metrics (this reprocess pass)

```
laws processed (reprocess sample)      3
normalization success                  3/3
sections parsed (cumulative, real)     3
amendment operations parsed (v2)       5 parsed + 1 ambiguous
needs_review / unsupported             0 / 1
chunks created (cumulative, real)      3
PDFs uploaded                          0  (operator step)
storage bytes                          0  (registered 7.65 MB across 31 objects, pending upload)
```

## Two low-confidence PDFs (diagnosed)

- **pub 147018** (2 pages, coverage 0.5): page 1 carries clean text; page 2 has
  no text layer (blank/image verso). Not corruption — the content page extracted
  fine. OCR only if page 2 is later found to hold content.
- **pub 2161465** (8 pages, coverage 0.75): 6 text pages clean; 2 pages lack a
  text layer (image/table pages). Per-page extraction method + optional OCR on
  those 2 pages is the fix. No glyph corruption.
