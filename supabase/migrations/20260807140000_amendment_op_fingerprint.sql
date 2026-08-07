-- A1: Amendment-operation dedup key fix (additive, non-destructive).
--
-- The old unique key (publication_canonical_id, source_span_start, operation_type)
-- collapsed genuinely-distinct operations that shared a clause start-offset and
-- type — ~60% of parsed ops were dropped on ON CONFLICT DO NOTHING. This adds a
-- precise per-op fingerprint and swaps the uniqueness onto it.
--
-- Applied to dev 2026-08-07 in this order (add cols -> backfill -> verify 0
-- collisions -> new unique index -> drop old constraint). Reprocess recomputes
-- fingerprints via src/.../publication/amendment-fingerprint.ts (identical formula).

-- 1) Additive columns (nullable).
alter table legalai.amendment_operations
  add column if not exists op_fingerprint text,
  add column if not exists old_text text,
  add column if not exists new_text text;

comment on column legalai.amendment_operations.op_fingerprint is
  'sha256 hex over target_law_id|target_section|operation_type|norm(old_text|evidence)|norm(new_text)|span_start|span_end. Distinguishes distinct ops sharing a clause offset+type.';

-- 2) Backfill fingerprints for existing rows (old_text/new_text null -> evidence).
update legalai.amendment_operations
set op_fingerprint = encode(sha256(convert_to(
  concat_ws('|',
    target_law_id,
    coalesce(target_section,''),
    operation_type,
    lower(btrim(regexp_replace(coalesce(old_text, evidence, ''), '\s+', ' ', 'g'))),
    lower(btrim(regexp_replace(coalesce(new_text, ''), '\s+', ' ', 'g'))),
    coalesce(source_span_start::text,''),
    coalesce(source_span_end::text,'')
  ), 'UTF8')), 'hex')
where op_fingerprint is null;

-- 3) Precise unique key (verified 0 collisions on backfilled legacy rows).
create unique index if not exists ao_fp_uniq
  on legalai.amendment_operations (publication_canonical_id, op_fingerprint);

-- 4) Drop the coarse key only after the precise one is verified in place.
alter table legalai.amendment_operations drop constraint if exists ao_uniq;
