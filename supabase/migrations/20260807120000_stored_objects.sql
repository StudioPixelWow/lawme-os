-- ============================================================================
-- Stored objects (ADDITIVE) — content-addressed registry of official PDF
-- binaries in object storage (current Epic Track B). One row per DISTINCT
-- sha256 (dedup): an omnibus PDF shared by many laws is stored once, and
-- publications reference it many-to-one. Bytes live in the object-storage
-- bucket (legal-source-files), NEVER in Postgres. Additive; RLS deny-by-default.
-- ============================================================================
create schema if not exists legalai;

create table if not exists legalai.stored_objects (
  sha256          text primary key,                 -- 64-hex content address
  bucket          text not null default 'legal-source-files',
  object_key      text not null,                     -- knesset/laws/<id>/publications/<itemId>/<sha256>.pdf
  size_bytes      bigint not null,
  content_type    text not null default 'application/pdf',
  storage_status  text not null default 'pending',   -- pending | uploaded | verified | failed | quarantined
  storage_version text not null default 'legal-object-store-1',
  ref_count       integer not null default 0,        -- number of publications referencing this binary
  uploaded_at     timestamptz,
  verified_at     timestamptz,
  license_basis   text not null default 'statutory_exemption_sec6',
  provenance      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint stored_objects_sha_chk check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint stored_objects_status_chk check (storage_status in ('pending','uploaded','verified','failed','quarantined'))
);
create index if not exists so_status_idx on legalai.stored_objects (storage_status);
create index if not exists so_key_idx on legalai.stored_objects (bucket, object_key);

alter table legalai.stored_objects enable row level security;
-- no policies: service-role only. Storage bucket 'legal-source-files' is private
-- (public=false) and has no permissive storage.objects policy → deny-by-default;
-- users receive a signed URL only through a reviewed backend path.

comment on table legalai.stored_objects is
  'Content-addressed registry of official PDF binaries in object storage (dedup by sha256). Additive; service-role only; bytes never in Postgres.';
