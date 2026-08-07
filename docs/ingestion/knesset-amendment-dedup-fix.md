# A1 — Amendment Operation Dedup Key Fix

Date: 2026-08-07. Fixes the too-coarse amendment_operations unique key surfaced by
the post-backfill quality sample (finding A1). Additive + non-destructive.

## Problem

The unique key `(publication_canonical_id, source_span_start, operation_type)`
collapsed genuinely-distinct operations that share a clause start-offset and the
same operation type. Across the three backfill phases ~29k parsed ops persisted
as 10,188 — roughly 60% dropped on `ON CONFLICT DO NOTHING`. Confirmed on
high-volume laws (2000944: 2,861 parsed → 848 stored; 2000907: 1,083 → 328).
Publish-safety was never affected (ops are gated machine assertions), but the
amendment graph was materially under-populated.

## Fix — deterministic op fingerprint

`op_fingerprint = sha256( target_law_id | target_section | operation_type |
norm(old_text ?? evidence) | norm(new_text) | source_span_start | source_span_end )`
where `norm = lower(trim(collapse_whitespace))`. Uniqueness moves to
`(publication_canonical_id, op_fingerprint)`.

The formula is implemented once in SQL (migration backfill) and once in TS
(`src/.../publication/amendment-fingerprint.ts`), and the two are verified to
produce byte-identical hashes on a Hebrew fixture
(`e0edb8e7…` from both). So legacy-backfilled rows and freshly reprocessed rows
hash the same and never duplicate.

## Migration (applied to dev, in this order)

`supabase/migrations/20260807140000_amendment_op_fingerprint.sql`

1. Add nullable columns `op_fingerprint`, `old_text`, `new_text`.
2. Backfill `op_fingerprint` for existing rows (old/new text null → evidence).
3. Verify **0 collisions** on `(publication_canonical_id, op_fingerprint)` across
   all 10,188 rows (0 null fingerprints).
4. Create unique index `ao_fp_uniq`.
5. Drop the old coarse constraint `ao_uniq` (only after step 3–4 verified).

Verification run: `total=10188, null_fp=0, colliding_keys=0`. Final indexes:
`ao_fp_uniq` (unique) + `ao_pub_idx` + `ao_law_idx` + pkey.

## Reprocess (operator, from Object Storage)

`tools/legal-ingest/reprocess-amendments.ts` re-derives the full op set from the
PDFs already in the bucket (no Knesset re-fetch):

```
node --experimental-strip-types tools/legal-ingest/reprocess-amendments.ts
```

Per amendment/correction publication: extract → normalize → `parseAmendmentsV2`
→ filter to KEEP_OP_TYPES + confidence ≥ 0.6, cap 25 → fingerprint →
**per-publication replace** (delete that pub's ops, insert the fresh set). The
per-pub replace honors "do not delete existing ops before reprocess" — a pub's
rows are removed only inside its own successful re-parse. Idempotent via
`ao_fp_uniq`. Reports attempted / persisted / within-run duplicates / ambiguous /
needs_review / unsupported / failed.

`backfill.ts` now also writes `op_fingerprint` + `old_text`/`new_text` and upserts
on the new key, so future backfill and reprocess stay consistent.

GO gate: `fingerprint collisions = 0` (DB-enforced by `ao_fp_uniq`), persisted ≫
prior 10,188 with the increase explained by recovered distinct ops, and
high-confidence false mutations = 0 (re-checked against the amendment eval set).
