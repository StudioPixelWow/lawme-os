-- ============================================================================
-- LawME — Legal Intelligence POC Foundation (Epic 1)
-- Migration: 20260711155956_legal_intelligence_poc_foundation
--
-- STATUS: prepared, NOT applied remotely. Founder approval is required
-- before `supabase db push` (see docs/setup/DATABASE_WORKFLOW.md).
--
-- Design sources: docs/legal-knowledge/UNIFIED_LEGAL_DOCUMENT_SCHEMA.md,
-- LAWME_SOURCE_TRUST_MODEL.md, LEGAL_KNOWLEDGE_GRAPH_ARCHITECTURE.md,
-- docs/database/LEGAL_INTELLIGENCE_POC_SCHEMA.md (companion doc).
--
-- Principles: RLS-first · UUID PKs · timestamptz everywhere · soft-delete
-- aware · provenance-carrying · Hebrew-safe (simple FTS + trigram) ·
-- pgvector-ready · strict public-corpus / tenant-private separation.
--
-- Tenancy model:
--   * GLOBAL PUBLIC CORPUS  → rows with organization_id IS NULL.
--       - readable by any authenticated user
--       - writable ONLY by the trusted server ingestion path
--         (service_role, which bypasses RLS by design in Supabase)
--   * ORGANIZATION-PRIVATE  → rows with organization_id IS NOT NULL.
--       - visible/writable only to members of that organization
--   No table mixes the two under one permissive policy.
--
-- Rollback: see bottom of file (documented DROP order; never run against
-- a database holding real data without a backup).
-- ============================================================================

begin;

-- Helper functions reference tables created later in this file.
set local check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- 0. Extensions & helper schema
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid
create extension if not exists pg_trgm;    -- fuzzy Hebrew matching
create extension if not exists vector;     -- pgvector (Supabase: pre-bundled)

create schema if not exists app;

-- updated_at maintenance
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Membership helpers (SECURITY DEFINER so RLS policies can consult
-- memberships without recursive policy evaluation).
create or replace function app.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_memberships
  where profile_id = auth.uid()
    and status = 'active';
$$;

create or replace function app.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = org
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function app.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = org
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'partner', 'admin')
  );
$$;

-- audit immutability
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are immutable';
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. organizations
-- ----------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'closed')),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2. profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '' check (char_length(display_name) <= 120),
  locale        text not null default 'he-IL',
  timezone      text not null default 'Asia/Jerusalem',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3. organization_memberships
-- ----------------------------------------------------------------------------
create table public.organization_memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  profile_id       uuid not null references public.profiles (id),
  role             text not null
                   check (role in ('owner', 'partner', 'admin', 'lawyer', 'paralegal')),
  status           text not null default 'invited'
                   check (status in ('invited', 'active', 'suspended')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index organization_memberships_profile_idx
  on public.organization_memberships (profile_id) where status = 'active';
create trigger organization_memberships_touch before update on public.organization_memberships
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. legal_sources — registry of publishers & access policies (GLOBAL)
--    Mirrors docs/legal-knowledge/LAWME_LEGAL_SOURCE_REGISTRY.* (LSR ids).
-- ----------------------------------------------------------------------------
create table public.legal_sources (
  id              uuid primary key default gen_random_uuid(),
  registry_code   text not null unique check (registry_code ~ '^(LSR-\d{3}|FIRM)$'),
  name_en         text not null,
  name_he         text,
  url             text,
  publisher       text,
  category        text not null check (category in (
                    'A-judicial', 'B-legislation', 'C-legislative-process',
                    'D-regulators', 'E-open-secondary', 'F-commercial',
                    'G-firm-private')),
  trust_tier      smallint not null check (trust_tier between 1 and 6),
  priority        text not null check (priority in (
                    'P0', 'P1', 'P2', 'P3',
                    'Restricted', 'License-needed', 'Research-only')),
  rag_permission  text not null default 'unknown' check (rag_permission in (
                    'confirmed', 'open_license', 'requires_permission',
                    'restricted', 'unknown')),
  access_policy   text not null default 'metadata_only' check (access_policy in (
                    'full_ingestion', 'extract_only', 'metadata_only', 'blocked')),
  is_active       boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger legal_sources_touch before update on public.legal_sources
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 5. legal_documents — canonical document records (GLOBAL or PRIVATE)
--    organization_id IS NULL     → global public corpus
--    organization_id IS NOT NULL → firm-private document
-- ----------------------------------------------------------------------------
create table public.legal_documents (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid references public.organizations (id),
  source_id               uuid not null references public.legal_sources (id),
  document_type           text not null check (document_type in (
                            'judgment', 'decision', 'legislation', 'regulation',
                            'order', 'bill', 'protocol', 'guidance', 'circular',
                            'regulator_decision', 'ethics_decision',
                            'academic_article', 'internal_firm_document',
                            'pleading', 'contract', 'legal_opinion', 'evidence',
                            'court_filing')),
  authority_type          text not null default 'unknown' check (authority_type in (
                            'binding', 'persuasive', 'secondary', 'internal',
                            'unverified', 'unknown')),
  verification_status     text not null default 'unverified' check (verification_status in (
                            'verified_primary', 'verified_licensed',
                            'secondary_supported', 'inference', 'unverified',
                            'unknown')),
  title                   text not null check (char_length(title) between 1 and 1000),
  title_he                text,
  title_en                text,
  case_number_raw         text,
  case_number_normalized  text,
  procedure_code          text,
  court                   text,
  legal_domains           jsonb not null default '[]'::jsonb,
  document_date           date,
  publication_date        date,
  effective_date          date,
  version_date            date,
  language                text not null default 'he'
                          check (language in ('he', 'en', 'ar', 'mixed', 'other')),
  canonical_source_url    text,
  original_file_url       text,
  license_status          text not null default 'unknown',
  storage_policy          text not null default 'pointer_only' check (storage_policy in (
                            'store_full', 'store_extract', 'pointer_only')),
  retention_policy        text,
  latest_version          integer not null default 1 check (latest_version >= 1),
  metadata_confidence     numeric(4, 3) check (metadata_confidence between 0 and 1),
  authority_score         numeric(5, 2) check (authority_score between 0 and 100),
  source_reliability      numeric(5, 2) check (source_reliability between 0 and 100),
  ingestion_date          timestamptz not null default now(),
  verification_date       timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index legal_documents_org_idx      on public.legal_documents (organization_id)
  where organization_id is not null;
create index legal_documents_source_idx   on public.legal_documents (source_id);
create index legal_documents_case_no_idx  on public.legal_documents (case_number_normalized)
  where case_number_normalized is not null;
create index legal_documents_type_idx     on public.legal_documents (document_type, document_date);
create unique index legal_documents_canonical_url_uniq
  on public.legal_documents (canonical_source_url)
  where canonical_source_url is not null and organization_id is null;
create trigger legal_documents_touch before update on public.legal_documents
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 6. legal_document_versions
-- ----------------------------------------------------------------------------
create table public.legal_document_versions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.legal_documents (id),
  version        integer not null check (version >= 1),
  content_hash   text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  parser_version text not null,
  change_reason  text,
  created_at     timestamptz not null default now(),
  unique (document_id, version)
);
create index legal_document_versions_doc_idx on public.legal_document_versions (document_id);

-- ----------------------------------------------------------------------------
-- 7. legal_document_files — storage object references
-- ----------------------------------------------------------------------------
create table public.legal_document_files (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.legal_documents (id),
  version_id     uuid not null references public.legal_document_versions (id),
  is_original    boolean not null default true,
  storage_bucket text not null,
  storage_path   text not null,
  content_type   text not null,
  byte_size      bigint not null check (byte_size >= 0 and byte_size <= 104857600),
  sha256         text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index legal_document_files_version_idx on public.legal_document_files (version_id);

-- ----------------------------------------------------------------------------
-- 8. legal_document_text — extracted text + FTS (one row per version)
-- ----------------------------------------------------------------------------
create table public.legal_document_text (
  id                     uuid primary key default gen_random_uuid(),
  version_id             uuid not null unique references public.legal_document_versions (id),
  extracted_text         text,
  normalized_text        text,
  extraction_method      text not null,
  extraction_confidence  numeric(4, 3) check (extraction_confidence between 0 and 1),
  ocr_status             text not null default 'not_required' check (ocr_status in (
                           'not_required', 'pending', 'completed',
                           'low_confidence', 'failed')),
  language               text not null default 'he',
  warnings               jsonb not null default '[]'::jsonb,
  -- Hebrew note: PostgreSQL has no Hebrew stemmer; 'simple' + trigram is
  -- the deliberate POC lexical strategy (docs/database/*SCHEMA.md).
  fts                    tsvector generated always as
                           (to_tsvector('simple', coalesce(normalized_text, ''))) stored,
  created_at             timestamptz not null default now()
);
create index legal_document_text_fts_idx  on public.legal_document_text using gin (fts);
create index legal_document_text_trgm_idx on public.legal_document_text
  using gin (normalized_text gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 9. legal_document_sections — stable citation anchors
-- ----------------------------------------------------------------------------
create table public.legal_document_sections (
  id             uuid primary key default gen_random_uuid(),
  version_id     uuid not null references public.legal_document_versions (id),
  section_index  integer not null check (section_index >= 0),
  kind           text not null check (kind in ('page', 'paragraph', 'heading', 'section')),
  anchor_key     text not null,
  heading_path   text,
  page_number    integer check (page_number >= 1),
  char_start     integer not null check (char_start >= 0),
  char_end       integer not null,
  content        text not null,
  created_at     timestamptz not null default now(),
  unique (version_id, anchor_key),
  check (char_end >= char_start)
);
create index legal_document_sections_version_idx
  on public.legal_document_sections (version_id, section_index);

-- ----------------------------------------------------------------------------
-- 10. legal_entities — courts, judges, statutes, issues… (GLOBAL reference)
-- ----------------------------------------------------------------------------
create table public.legal_entities (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in (
                 'court', 'judge', 'party', 'lawyer', 'statute', 'section',
                 'regulation', 'legal_issue', 'legal_principle', 'remedy',
                 'organization', 'regulator', 'practice_area')),
  name         text not null check (char_length(name) between 1 and 500),
  name_he      text,
  external_ref text,
  attributes   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, name)
);
create index legal_entities_trgm_idx on public.legal_entities
  using gin (name gin_trgm_ops);
create trigger legal_entities_touch before update on public.legal_entities
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 11. legal_document_entities — document ↔ entity links
-- ----------------------------------------------------------------------------
create table public.legal_document_entities (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.legal_documents (id),
  entity_id       uuid not null references public.legal_entities (id),
  role            text not null check (char_length(role) between 1 and 80),
  confidence      numeric(4, 3) check (confidence between 0 and 1),
  provenance      text not null,
  evidence_anchor text,
  created_at      timestamptz not null default now(),
  unique (document_id, entity_id, role)
);
create index legal_document_entities_entity_idx
  on public.legal_document_entities (entity_id);

-- ----------------------------------------------------------------------------
-- 12. legal_citations — citation graph (deterministic layer)
-- ----------------------------------------------------------------------------
create table public.legal_citations (
  id                            uuid primary key default gen_random_uuid(),
  citing_document_id            uuid not null references public.legal_documents (id),
  cited_document_id             uuid references public.legal_documents (id),
  cited_case_number_normalized  text,
  cited_statute_ref             text,
  citation_kind                 text not null check (citation_kind in (
                                  'case', 'statute', 'regulation', 'other')),
  treatment                     text not null default 'mentions' check (treatment in (
                                  'follows', 'applies', 'interprets',
                                  'distinguishes', 'limits', 'overturns',
                                  'approves', 'mentions', 'unknown')),
  anchor_key                    text,
  confidence                    numeric(4, 3) not null check (confidence between 0 and 1),
  provenance                    text not null,
  verified                      boolean not null default false,
  label                         text not null default 'unverified' check (label in (
                                  'verified_primary', 'inference', 'unverified')),
  created_at                    timestamptz not null default now(),
  check (cited_document_id is not null
         or cited_case_number_normalized is not null
         or cited_statute_ref is not null)
);
create index legal_citations_citing_idx on public.legal_citations (citing_document_id);
create index legal_citations_cited_idx  on public.legal_citations (cited_document_id)
  where cited_document_id is not null;
create index legal_citations_cited_case_idx
  on public.legal_citations (cited_case_number_normalized)
  where cited_case_number_normalized is not null;

-- ----------------------------------------------------------------------------
-- 13. legal_source_fetches — fetch provenance (GLOBAL, ingestion-only)
-- ----------------------------------------------------------------------------
create table public.legal_source_fetches (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references public.legal_sources (id),
  document_id       uuid references public.legal_documents (id),
  url               text not null,
  requested_at      timestamptz not null default now(),
  http_status       integer,
  content_type      text,
  sha256            text check (sha256 ~ '^[0-9a-f]{64}$'),
  outcome           text not null check (outcome in (
                      'success', 'not_modified', 'failed', 'blocked', 'fixture')),
  retrieval_method  text not null,
  parser_version    text,
  error             text
);
create index legal_source_fetches_source_idx
  on public.legal_source_fetches (source_id, requested_at desc);

-- ----------------------------------------------------------------------------
-- 14. legal_embeddings — separated from documents by design
--     `embedding vector` is dimension-flexible for the POC (mock provider);
--     a fixed-dim column + ANN index is added when the real model is chosen.
-- ----------------------------------------------------------------------------
create table public.legal_embeddings (
  id             uuid primary key default gen_random_uuid(),
  version_id     uuid not null references public.legal_document_versions (id),
  chunk_index    integer not null check (chunk_index >= 0),
  anchor_key     text not null,
  model          text not null,
  model_version  text not null,
  dims           integer not null check (dims between 1 and 4096),
  embedding      vector,
  embedding_norm real,
  status         text not null default 'current' check (status in (
                   'current', 'stale', 're_embedding')),
  created_at     timestamptz not null default now(),
  unique (version_id, model, model_version, chunk_index)
);
create index legal_embeddings_version_idx on public.legal_embeddings (version_id);

-- ----------------------------------------------------------------------------
-- 15-17. Research sessions / queries / results (ORGANIZATION-PRIVATE)
-- ----------------------------------------------------------------------------
create table public.legal_research_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  created_by       uuid not null references public.profiles (id),
  matter_ref       text,
  title            text not null default '' check (char_length(title) <= 300),
  status           text not null default 'open'
                   check (status in ('open', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index legal_research_sessions_org_idx
  on public.legal_research_sessions (organization_id, created_at desc);
create trigger legal_research_sessions_touch before update on public.legal_research_sessions
  for each row execute function app.touch_updated_at();

create table public.legal_research_queries (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.legal_research_sessions (id),
  query_text        text not null check (char_length(query_text) between 1 and 4000),
  normalized_query  text not null default '',
  expansion         jsonb not null default '[]'::jsonb,
  filters           jsonb not null default '{}'::jsonb,
  engine_version    text not null default '',
  created_at        timestamptz not null default now()
);
create index legal_research_queries_session_idx
  on public.legal_research_queries (session_id, created_at desc);

create table public.legal_research_results (
  id              uuid primary key default gen_random_uuid(),
  query_id        uuid not null references public.legal_research_queries (id),
  document_id     uuid not null references public.legal_documents (id),
  version_id      uuid references public.legal_document_versions (id),
  rank            integer not null check (rank >= 1),
  score           numeric(8, 5) not null,
  score_breakdown jsonb not null default '{}'::jsonb,
  passage_anchor  text,
  passage_text    text,
  authority_type  text not null default 'unknown' check (authority_type in (
                    'binding', 'persuasive', 'secondary', 'internal',
                    'unverified', 'unknown')),
  warnings        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (query_id, rank)
);
create index legal_research_results_query_idx on public.legal_research_results (query_id);

-- ----------------------------------------------------------------------------
-- 18-19. Answer claims & claim citations (ORGANIZATION-PRIVATE via session)
-- ----------------------------------------------------------------------------
create table public.legal_answer_claims (
  id           uuid primary key default gen_random_uuid(),
  query_id     uuid not null references public.legal_research_queries (id),
  claim_index  integer not null check (claim_index >= 0),
  claim_text   text not null check (char_length(claim_text) between 1 and 4000),
  claim_label  text not null check (claim_label in (
                 'verified_primary', 'verified_licensed', 'secondary_supported',
                 'inference', 'unverified', 'unknown', 'unresolved')),
  created_at   timestamptz not null default now(),
  unique (query_id, claim_index)
);

create table public.legal_claim_citations (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null references public.legal_answer_claims (id),
  document_id     uuid not null references public.legal_documents (id),
  version_id      uuid references public.legal_document_versions (id),
  anchor_key      text not null,
  quoted_text     text,
  quote_verified  boolean not null default false,
  citation_format text,
  created_at      timestamptz not null default now()
);
create index legal_claim_citations_claim_idx on public.legal_claim_citations (claim_id);

-- ----------------------------------------------------------------------------
-- 20-22. Benchmark (GLOBAL; ground truth protected)
-- ----------------------------------------------------------------------------
create table public.benchmark_tasks (
  id            uuid primary key default gen_random_uuid(),
  task_code     text not null unique check (task_code ~ '^LILB-[a-z_]+-\d{3}$'),
  category      text not null check (category in (
                  'research', 'precedent_retrieval', 'authority_ranking',
                  'validity', 'citation_verification', 'deadline_extraction',
                  'judgment_summary', 'contradiction_detection',
                  'hearing_preparation', 'drafting', 'red_team',
                  'hallucination_detection')),
  difficulty    text not null check (difficulty in ('basic', 'practitioner', 'expert')),
  domain        text not null,
  law_as_of     date not null,
  prompt_he     text not null,
  inputs        jsonb not null default '{}'::jsonb,
  gold          jsonb not null default '{}'::jsonb,
  scoring       jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in (
                  'draft', 'expert_validated', 'retired')),
  is_synthetic  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger benchmark_tasks_touch before update on public.benchmark_tasks
  for each row execute function app.touch_updated_at();

create table public.benchmark_runs (
  id              uuid primary key default gen_random_uuid(),
  run_label       text not null,
  engine_version  text not null,
  model_provider  text not null default 'mock',
  model_version   text not null default 'mock',
  parser_version  text not null default '',
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  notes           text
);

create table public.benchmark_results (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.benchmark_runs (id),
  task_id     uuid not null references public.benchmark_tasks (id),
  score       numeric(6, 3),
  passed      boolean,
  metrics     jsonb not null default '{}'::jsonb,
  output_ref  text,
  warnings    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (run_id, task_id)
);

-- ----------------------------------------------------------------------------
-- 23. audit_events — immutable trail
-- ----------------------------------------------------------------------------
create table public.audit_events (
  id               uuid primary key default gen_random_uuid(),
  occurred_at      timestamptz not null default now(),
  organization_id  uuid references public.organizations (id),
  actor            uuid,
  actor_role       text,
  event_type       text not null check (char_length(event_type) between 1 and 120),
  object_type      text,
  object_id        uuid,
  payload          jsonb not null default '{}'::jsonb
);
create index audit_events_org_idx on public.audit_events (organization_id, occurred_at desc);
create trigger audit_events_no_update before update or delete on public.audit_events
  for each row execute function app.forbid_mutation();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Every table: RLS enabled. service_role bypasses RLS (Supabase default) —
-- that IS the trusted ingestion path. No permissive cross-tenant policy
-- exists anywhere. Full policy rationale: docs/database/LEGAL_INTELLIGENCE_POC_RLS.md
-- ============================================================================

alter table public.organizations              enable row level security;
alter table public.profiles                   enable row level security;
alter table public.organization_memberships   enable row level security;
alter table public.legal_sources              enable row level security;
alter table public.legal_documents            enable row level security;
alter table public.legal_document_versions    enable row level security;
alter table public.legal_document_files       enable row level security;
alter table public.legal_document_text        enable row level security;
alter table public.legal_document_sections    enable row level security;
alter table public.legal_entities             enable row level security;
alter table public.legal_document_entities    enable row level security;
alter table public.legal_citations            enable row level security;
alter table public.legal_source_fetches       enable row level security;
alter table public.legal_embeddings           enable row level security;
alter table public.legal_research_sessions    enable row level security;
alter table public.legal_research_queries     enable row level security;
alter table public.legal_research_results     enable row level security;
alter table public.legal_answer_claims        enable row level security;
alter table public.legal_claim_citations      enable row level security;
alter table public.benchmark_tasks            enable row level security;
alter table public.benchmark_runs             enable row level security;
alter table public.benchmark_results          enable row level security;
alter table public.audit_events               enable row level security;

-- --- organizations: members read; admins update; no client insert/delete ---
create policy organizations_select on public.organizations
  for select to authenticated
  using (deleted_at is null and app.is_org_member(id));
create policy organizations_update on public.organizations
  for update to authenticated
  using (app.is_org_admin(id))
  with check (app.is_org_admin(id));

-- --- profiles: self only ---
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --- memberships: read own + rows of orgs you belong to; admins manage ---
create policy organization_memberships_select on public.organization_memberships
  for select to authenticated
  using (profile_id = auth.uid() or app.is_org_member(organization_id));
create policy organization_memberships_insert on public.organization_memberships
  for insert to authenticated
  with check (app.is_org_admin(organization_id));
create policy organization_memberships_update on public.organization_memberships
  for update to authenticated
  using (app.is_org_admin(organization_id))
  with check (app.is_org_admin(organization_id));
create policy organization_memberships_delete on public.organization_memberships
  for delete to authenticated
  using (app.is_org_admin(organization_id));

-- --- legal_sources (GLOBAL registry): read-only for users ---
create policy legal_sources_select on public.legal_sources
  for select to authenticated using (true);
-- no insert/update/delete policies → clients cannot write; service_role only.

-- --- legal_documents: global corpus readable; private rows org-scoped ---
create policy legal_documents_select on public.legal_documents
  for select to authenticated
  using (deleted_at is null
         and (organization_id is null or app.is_org_member(organization_id)));
create policy legal_documents_insert on public.legal_documents
  for insert to authenticated
  with check (organization_id is not null and app.is_org_member(organization_id));
create policy legal_documents_update on public.legal_documents
  for update to authenticated
  using (organization_id is not null and app.is_org_member(organization_id))
  with check (organization_id is not null and app.is_org_member(organization_id));
-- No DELETE policy: removal is soft-delete (UPDATE deleted_at) for private
-- docs; global corpus rows are managed only by the ingestion service.
-- NOTE: authority_score / verification_status changes on GLOBAL rows are
-- impossible for clients (no UPDATE policy matches organization_id IS NULL).

-- Child-table access follows the parent document (helper predicate).
create or replace function app.can_read_document(doc uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.legal_documents d
    where d.id = doc
      and d.deleted_at is null
      and (d.organization_id is null or app.is_org_member(d.organization_id))
  );
$$;

create or replace function app.can_write_document(doc uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.legal_documents d
    where d.id = doc
      and d.organization_id is not null
      and app.is_org_member(d.organization_id)
  );
$$;

create or replace function app.version_document(ver uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select document_id from public.legal_document_versions where id = ver;
$$;

-- --- versions / files / text / sections / embeddings: follow parent ---
create policy legal_document_versions_select on public.legal_document_versions
  for select to authenticated using (app.can_read_document(document_id));
create policy legal_document_versions_insert on public.legal_document_versions
  for insert to authenticated with check (app.can_write_document(document_id));

create policy legal_document_files_select on public.legal_document_files
  for select to authenticated using (app.can_read_document(document_id));
create policy legal_document_files_insert on public.legal_document_files
  for insert to authenticated with check (app.can_write_document(document_id));

create policy legal_document_text_select on public.legal_document_text
  for select to authenticated
  using (app.can_read_document(app.version_document(version_id)));
create policy legal_document_text_insert on public.legal_document_text
  for insert to authenticated
  with check (app.can_write_document(app.version_document(version_id)));

create policy legal_document_sections_select on public.legal_document_sections
  for select to authenticated
  using (app.can_read_document(app.version_document(version_id)));
create policy legal_document_sections_insert on public.legal_document_sections
  for insert to authenticated
  with check (app.can_write_document(app.version_document(version_id)));

create policy legal_embeddings_select on public.legal_embeddings
  for select to authenticated
  using (app.can_read_document(app.version_document(version_id)));
-- embeddings are written only by the service pipeline (no client policy).

-- --- legal_entities (GLOBAL reference): read-only for users ---
create policy legal_entities_select on public.legal_entities
  for select to authenticated using (true);

-- --- legal_document_entities / citations: readable per parent; service-written ---
create policy legal_document_entities_select on public.legal_document_entities
  for select to authenticated using (app.can_read_document(document_id));
create policy legal_citations_select on public.legal_citations
  for select to authenticated using (app.can_read_document(citing_document_id));

-- --- legal_source_fetches: ingestion telemetry — service only (no policies) ---

-- --- research sessions / queries / results / claims / citations: org-private ---
create policy legal_research_sessions_select on public.legal_research_sessions
  for select to authenticated
  using (deleted_at is null and app.is_org_member(organization_id));
create policy legal_research_sessions_insert on public.legal_research_sessions
  for insert to authenticated
  with check (app.is_org_member(organization_id) and created_by = auth.uid());
create policy legal_research_sessions_update on public.legal_research_sessions
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create or replace function app.session_org(sess uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.legal_research_sessions where id = sess;
$$;

create or replace function app.query_org(q uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.organization_id
  from public.legal_research_queries rq
  join public.legal_research_sessions s on s.id = rq.session_id
  where rq.id = q;
$$;

create policy legal_research_queries_select on public.legal_research_queries
  for select to authenticated using (app.is_org_member(app.session_org(session_id)));
create policy legal_research_queries_insert on public.legal_research_queries
  for insert to authenticated with check (app.is_org_member(app.session_org(session_id)));

create policy legal_research_results_select on public.legal_research_results
  for select to authenticated using (app.is_org_member(app.query_org(query_id)));
create policy legal_research_results_insert on public.legal_research_results
  for insert to authenticated with check (app.is_org_member(app.query_org(query_id)));

create policy legal_answer_claims_select on public.legal_answer_claims
  for select to authenticated using (app.is_org_member(app.query_org(query_id)));
create policy legal_answer_claims_insert on public.legal_answer_claims
  for insert to authenticated with check (app.is_org_member(app.query_org(query_id)));

create or replace function app.claim_org(cl uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select app.query_org(c.query_id) from public.legal_answer_claims c where c.id = cl;
$$;

create policy legal_claim_citations_select on public.legal_claim_citations
  for select to authenticated using (app.is_org_member(app.claim_org(claim_id)));
create policy legal_claim_citations_insert on public.legal_claim_citations
  for insert to authenticated with check (app.is_org_member(app.claim_org(claim_id)));

-- --- benchmark: tasks readable, ground truth immutable to clients ---
create policy benchmark_tasks_select on public.benchmark_tasks
  for select to authenticated using (true);
create policy benchmark_runs_select on public.benchmark_runs
  for select to authenticated using (true);
create policy benchmark_results_select on public.benchmark_results
  for select to authenticated using (true);
-- no client write policies: runs/results/tasks written by service harness only.

-- --- audit_events: org admins read their org's rows; nobody mutates ---
create policy audit_events_select on public.audit_events
  for select to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id));
-- inserts via service role only (no client insert policy).

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (do not run blindly; take a backup first)
-- ----------------------------------------------------------------------------
-- This migration is a single transaction: a failure during apply rolls back
-- automatically. To reverse after a successful apply on a database that
-- holds NO real data:
--
--   drop table if exists
--     public.audit_events, public.benchmark_results, public.benchmark_runs,
--     public.benchmark_tasks, public.legal_claim_citations,
--     public.legal_answer_claims, public.legal_research_results,
--     public.legal_research_queries, public.legal_research_sessions,
--     public.legal_embeddings, public.legal_source_fetches,
--     public.legal_citations, public.legal_document_entities,
--     public.legal_entities, public.legal_document_sections,
--     public.legal_document_text, public.legal_document_files,
--     public.legal_document_versions, public.legal_documents,
--     public.legal_sources, public.organization_memberships,
--     public.profiles, public.organizations cascade;
--   drop function if exists
--     app.claim_org(uuid), app.query_org(uuid), app.session_org(uuid),
--     app.version_document(uuid), app.can_write_document(uuid),
--     app.can_read_document(uuid), app.is_org_admin(uuid),
--     app.is_org_member(uuid), app.current_org_ids(),
--     app.forbid_mutation(), app.touch_updated_at();
--   drop schema if exists app;
--   -- extensions are left installed on purpose.
--
-- On a database WITH data: restore from backup instead of dropping.
-- ============================================================================
