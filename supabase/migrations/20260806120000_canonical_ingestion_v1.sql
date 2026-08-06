-- ============================================================================
-- Canonical Ingestion V1 — First Production Slice (ADDITIVE, planning-applied)
-- ----------------------------------------------------------------------------
-- Adds the canonical-record persistence surface the two first collectors
-- (Knesset OData, data.gov.il Tier-1) write into, plus the quarantine /
-- dead-letter / metrics / checkpoint tables the existing schema lacked.
--
-- ADDITIVE ONLY: creates new objects; alters nothing existing. Every object is
-- guarded (IF NOT EXISTS) and RLS deny-by-default (service-role only). This file
-- is NOT auto-applied to any remote project — applying remote migrations
-- requires explicit founder approval per the repo infrastructure guardrails.
--
-- Design follows docs/architecture/canonical-legal-data-model:
--   identity + immutable version chain + attributed assertions; source-specific
--   data only in source_extras; AI never written to primary fields.
-- ============================================================================

create schema if not exists legalai;

-- ---- canonical entities (identity + head state) ----------------------------
create table if not exists legalai.canonical_entities (
  canonical_id        text primary key,
  entity_type         text not null,
  source_platform     text not null,
  source_publisher    text,
  source_dataset      text,
  source_resource     text,
  source_url          text not null,
  external_record_id  text not null,
  first_seen_at       timestamptz not null default now(),
  last_verified_at    timestamptz not null default now(),
  extraction_method   text not null,
  parser_version      text not null,
  mapping_version     text not null,
  confidence          numeric not null default 0,
  content_hash        text not null,
  raw_record_hash     text not null,
  content_level       text not null default 'metadata_only'
                        check (content_level in ('full_text','summary','metadata_only')),
  version_number      integer not null default 1,
  version_status      text not null default 'persisted'
                        check (version_status in
                          ('raw','mapped','validated','persisted','indexed','published','quarantined','failed')),
  fields              jsonb not null default '{}',
  extracted_metadata  jsonb not null default '{}',
  source_extras       jsonb not null default '{}',
  primary_text        text,
  primary_text_language text default 'he',
  tombstoned          boolean not null default false,
  -- search + AI companions (populated by later jobs; nullable now)
  text_search         tsvector,
  embedding           vector(1536),
  embedding_model     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists ce_type_idx on legalai.canonical_entities (entity_type);
create index if not exists ce_platform_idx on legalai.canonical_entities (source_platform, source_dataset);
create index if not exists ce_status_idx on legalai.canonical_entities (version_status) where tombstoned = false;
create index if not exists ce_content_hash_idx on legalai.canonical_entities (content_hash);
create index if not exists ce_fts_idx on legalai.canonical_entities using gin (text_search);
-- vector index created later once an embedding provider is chosen (open decision).

-- ---- external identifiers (many per entity) --------------------------------
create table if not exists legalai.canonical_external_ids (
  id            uuid primary key default gen_random_uuid(),
  canonical_id  text not null references legalai.canonical_entities(canonical_id) on delete cascade,
  scheme        text not null,
  value         text not null,
  confidence    numeric not null default 1,
  unique (canonical_id, scheme, value)
);
create index if not exists cei_lookup_idx on legalai.canonical_external_ids (scheme, value);

-- ---- immutable version chain -----------------------------------------------
create table if not exists legalai.canonical_entity_versions (
  id            uuid primary key default gen_random_uuid(),
  canonical_id  text not null references legalai.canonical_entities(canonical_id) on delete cascade,
  version_number integer not null,
  content_hash  text not null,
  fields        jsonb not null default '{}',
  primary_text  text,
  change_kind   text not null default 'new_version'
                  check (change_kind in ('new_version','correction','snapshot','diff')),
  valid_from    timestamptz not null default now(),
  system_from   timestamptz not null default now(),
  is_current    boolean not null default true,
  provenance    jsonb not null default '{}',
  unique (canonical_id, version_number)
);
create unique index if not exists cev_one_current on legalai.canonical_entity_versions (canonical_id) where is_current;

-- ---- typed relationships (property-graph edges) ----------------------------
create table if not exists legalai.canonical_relationships (
  id                 uuid primary key default gen_random_uuid(),
  type               text not null,
  from_canonical_id  text not null references legalai.canonical_entities(canonical_id) on delete cascade,
  to_canonical_id    text references legalai.canonical_entities(canonical_id) on delete set null,
  to_external_ref    text,               -- retained when the target is unresolved (dangling)
  confidence         numeric not null default 1,
  assertion_status   text not null default 'asserted'
                       check (assertion_status in ('asserted','resolved','inferred','disputed','retracted')),
  provenance         jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  unique (type, from_canonical_id, coalesce(to_canonical_id,''), coalesce(to_external_ref,''))
);
create index if not exists cr_from_idx on legalai.canonical_relationships (from_canonical_id, type);
create index if not exists cr_to_idx on legalai.canonical_relationships (to_canonical_id, type);

-- ---- checkpoints (resumable ingestion) -------------------------------------
create table if not exists legalai.ingestion_checkpoints (
  source        text not null,
  dataset       text not null default '',
  mode          text not null default 'backfill' check (mode in ('backfill','incremental')),
  cursor        text,
  page          integer not null default 0,
  last_modified text,
  done          boolean not null default false,
  fetched       integer not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (source, dataset)
);

-- ---- quarantine (validation failures, kept for review) ---------------------
create table if not exists legalai.ingestion_quarantine (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  dataset       text,
  entity_type   text,
  canonical_id  text,
  reasons       text[] not null default '{}',
  record        jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists iq_source_idx on legalai.ingestion_quarantine (source, dataset);

-- ---- dead-letter (unmappable raw records) ----------------------------------
create table if not exists legalai.ingestion_dead_letter (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  dataset       text,
  external_id   text,
  source_url    text,
  raw_hash      text,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists idl_source_idx on legalai.ingestion_dead_letter (source, dataset);

-- ---- run metrics (Step 15) -------------------------------------------------
create table if not exists legalai.ingestion_metrics (
  id                        uuid primary key default gen_random_uuid(),
  run_id                    uuid,
  source                    text not null,
  dataset                   text,
  records_discovered        integer not null default 0,
  records_fetched           integer not null default 0,
  records_mapped            integer not null default 0,
  records_validated         integer not null default 0,
  records_persisted         integer not null default 0,
  records_indexed           integer not null default 0,
  records_published         integer not null default 0,
  records_quarantined       integer not null default 0,
  duplicates_detected       integer not null default 0,
  updates_detected          integer not null default 0,
  tombstones_applied        integer not null default 0,
  dead_lettered             integer not null default 0,
  documents_full_text       integer not null default 0,
  documents_summary_only    integer not null default 0,
  documents_metadata_only   integer not null default 0,
  ingestion_duration_ms     integer not null default 0,
  records_per_second        numeric not null default 0,
  stopped                   boolean not null default false,
  stop_reason               text,
  created_at                timestamptz not null default now()
);
create index if not exists im_source_idx on legalai.ingestion_metrics (source, created_at);

-- ---- RLS: deny-by-default on every new table (service-role only) -----------
do $$
declare t text;
begin
  foreach t in array array[
    'canonical_entities','canonical_external_ids','canonical_entity_versions',
    'canonical_relationships','ingestion_checkpoints','ingestion_quarantine',
    'ingestion_dead_letter','ingestion_metrics'
  ] loop
    execute format('alter table legalai.%I enable row level security;', t);
  end loop;
end $$;
-- No SELECT policies are created: these tables are reachable only via the
-- service role (used by the collector), never by anon/authenticated. Public
-- exposure of published canonical content is a later, separate decision.

comment on table legalai.canonical_entities is
  'Canonical Legal Data Model V1 head state. Additive; written by the first-slice collectors. Not public-readable.';
