-- ============================================================================
-- LEGAL AI ISRAEL — Phase 2: documents, sections, citations, statutes, topics,
-- jobs, quality, search analytics.
--
-- STATUS: APPLIED to the LawME development project (udispadsbxqicmawqcuk) on
-- 2026-08-02 with founder approval. Builds on
-- 20260726140000_legal_ai_israel_source_registry.sql. RLS deny-by-default; the
-- registry safety checks from Phase 1 are untouched.
--
-- EMBEDDING DIMENSION DECISION: pgvector requires a fixed dimension for an index
-- and the project has not selected an embedding provider yet. We standardize on
-- vector(1536) (documented here); switch by a follow-up migration if a provider
-- with a different dimension is adopted. Embeddings are populated later.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;
-- (unaccent intentionally omitted — not used by this schema; add later if needed)

-- Extend the Phase-1 canonical document table -------------------------------
alter table legalai.legal_documents
  add column if not exists canonical_document_id uuid references legalai.legal_documents(id),
  add column if not exists canonical_url text,
  add column if not exists proceeding_type text,
  add column if not exists court_level text,
  add column if not exists tribunal_name text,
  add column if not exists district text,
  add column if not exists chamber text,
  add column if not exists publication_date date,
  add column if not exists title text,
  add column if not exists parties_display text,
  add column if not exists language text default 'he',
  add column if not exists is_final boolean,
  add column if not exists is_precedential boolean,
  add column if not exists legal_authority_level integer,
  add column if not exists original_storage_path text,
  add column if not exists original_mime_type text,
  add column if not exists original_size_bytes bigint,
  add column if not exists raw_text text,
  add column if not exists normalized_text text,
  add column if not exists extraction_method text,
  add column if not exists extraction_confidence numeric,
  add column if not exists parser_version text,
  add column if not exists source_metadata jsonb default '{}'::jsonb,
  add column if not exists derived_metadata jsonb default '{}'::jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists source_removed_at timestamptz;

create index if not exists ld_decision_date_idx on legalai.legal_documents (decision_date);
create index if not exists ld_court_idx on legalai.legal_documents (court_name);
create index if not exists ld_court_level_idx on legalai.legal_documents (court_level);
create index if not exists ld_proceeding_idx on legalai.legal_documents (proceeding_type);
create index if not exists ld_pubstatus_idx on legalai.legal_documents (publication_status);
create index if not exists ld_status_idx on legalai.legal_documents (status);
create index if not exists ld_canonical_idx on legalai.legal_documents (canonical_document_id);

-- Extend source copies: storage + one-canonical-per-document -----------------
alter table legalai.legal_document_sources
  add column if not exists storage_path text,
  add column if not exists last_seen_at timestamptz default now();
create unique index if not exists lds_one_canonical_per_doc
  on legalai.legal_document_sources (document_id) where is_canonical;

-- Document versions (never overwrite an original) ---------------------------
create table if not exists legalai.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  version_number integer not null,
  source_id uuid references legalai.legal_sources(id),
  source_url text,
  storage_path text,
  mime_type text,
  sha256 text not null,
  size_bytes bigint,
  retrieved_at timestamptz default now(),
  change_type text,
  is_current boolean default true,
  metadata jsonb default '{}'::jsonb,
  unique(document_id, version_number)
);
create unique index if not exists ldv_one_current_per_doc
  on legalai.legal_document_versions (document_id) where is_current;

-- Document sections (structural + retrieval) --------------------------------
create table if not exists legalai.document_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  section_index integer not null,
  section_type text,
  heading text,
  paragraph_start integer,
  paragraph_end integer,
  page_start integer,
  page_end integer,
  text text not null,
  normalized_text text,
  token_count integer,
  text_search tsvector,
  embedding vector(1536),
  embedding_model text,
  parser_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(document_id, section_index)
);
create index if not exists ds_doc_idx on legalai.document_sections (document_id, section_index);
create index if not exists ds_fts_idx on legalai.document_sections using gin (text_search);
create index if not exists ds_trgm_idx on legalai.document_sections using gin (text gin_trgm_ops);
create index if not exists ds_vec_idx on legalai.document_sections using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Judges --------------------------------------------------------------------
create table if not exists legalai.judges (
  id uuid primary key default gen_random_uuid(),
  normalized_name text unique not null,
  display_name text not null,
  aliases text[] default '{}',
  metadata jsonb default '{}'::jsonb
);
create table if not exists legalai.document_judges (
  document_id uuid references legalai.legal_documents(id),
  judge_id uuid references legalai.judges(id),
  role text,
  opinion_type text,
  panel_order integer,
  primary key(document_id, judge_id, role)
);

-- Parties (only text already public in the official document) ----------------
create table if not exists legalai.document_parties (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  role text,
  display_name text,
  normalized_name text,
  is_anonymized boolean default false,
  source_text text
);

-- Statutes ------------------------------------------------------------------
create table if not exists legalai.statutes (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  display_name text not null,
  aliases text[] default '{}',
  enactment_year integer,
  source_url text,
  unique(normalized_name, enactment_year)
);
create table if not exists legalai.statute_sections (
  id uuid primary key default gen_random_uuid(),
  statute_id uuid not null references legalai.statutes(id),
  section_number text not null,
  heading text,
  text text,
  effective_from date,
  effective_to date,
  source_url text,
  unique(statute_id, section_number, effective_from)
);
create table if not exists legalai.document_statute_citations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  section_id uuid references legalai.document_sections(id),
  statute_id uuid references legalai.statutes(id),
  statute_section_id uuid references legalai.statute_sections(id),
  citation_text text not null,
  normalized_citation text,
  paragraph_number integer,
  page_number integer,
  extraction_method text,
  confidence numeric
);

-- Case citations ------------------------------------------------------------
create table if not exists legalai.case_citations (
  id uuid primary key default gen_random_uuid(),
  citing_document_id uuid not null references legalai.legal_documents(id),
  cited_document_id uuid references legalai.legal_documents(id),
  cited_case_number_raw text,
  cited_case_number_normalized text,
  citation_text text not null,
  section_id uuid references legalai.document_sections(id),
  paragraph_number integer,
  page_number integer,
  treatment text default 'unknown'
    check (treatment in ('cited','followed','adopted','applied','distinguished','criticized','limited','overruled','reversed','mentioned','unknown')),
  treatment_confidence numeric,
  resolution_status text default 'unresolved'
    check (resolution_status in ('unresolved','resolved','ambiguous','not_found')),
  resolution_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists cc_citing_idx on legalai.case_citations (citing_document_id);
create index if not exists cc_cited_norm_idx on legalai.case_citations (cited_case_number_normalized);

-- Topics --------------------------------------------------------------------
create table if not exists legalai.legal_topics (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references legalai.legal_topics(id),
  slug text unique not null,
  name_he text not null,
  description text
);
create table if not exists legalai.document_topics (
  document_id uuid references legalai.legal_documents(id),
  topic_id uuid references legalai.legal_topics(id),
  confidence numeric,
  assignment_method text,
  primary key(document_id, topic_id)
);

insert into legalai.legal_topics (slug, name_he) values
  ('constitutional','משפט חוקתי'), ('administrative','משפט מנהלי'), ('civil','משפט אזרחי'),
  ('contracts','חוזים'), ('torts','נזיקין'), ('property','מקרקעין'),
  ('condominiums','בתים משותפים'), ('planning','תכנון ובנייה'), ('labor','דיני עבודה'),
  ('family','משפחה'), ('inheritance','ירושה'), ('criminal','פלילי'),
  ('traffic','תעבורה'), ('insolvency','חדלות פירעון'), ('companies','חברות'),
  ('tax','מיסים'), ('ip','קניין רוחני'), ('privacy','פרטיות'),
  ('consumer','הגנת הצרכן'), ('procedure','סדר דין'), ('evidence','ראיות'),
  ('enforcement','הוצאה לפועל')
on conflict (slug) do nothing;

-- Processing jobs / events / quality ----------------------------------------
create table if not exists legalai.ingestion_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references legalai.ingestion_runs(id),
  document_id uuid references legalai.legal_documents(id),
  event_type text not null,
  level text default 'info',
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create table if not exists legalai.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references legalai.legal_documents(id),
  job_type text not null
    check (job_type in ('download','validate_file','extract_text','normalize_text','extract_metadata',
      'segment_document','extract_case_citations','resolve_case_citations','extract_statutes',
      'classify_topics','create_search_index','create_embeddings','quality_check','publish',
      'revalidate_source','remove_document')),
  status text default 'queued' check (status in ('queued','running','succeeded','failed','skipped')),
  idempotency_key text,
  attempts integer default 0,
  max_attempts integer default 5,
  last_error text,
  scheduled_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique(document_id, job_type, idempotency_key)
);
create index if not exists pj_status_idx on legalai.processing_jobs (status, job_type);

create table if not exists legalai.document_quality_checks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references legalai.legal_documents(id),
  check_name text not null,
  passed boolean not null,
  detail text,
  created_at timestamptz default now()
);

-- Search analytics (privacy-aware) ------------------------------------------
create table if not exists legalai.search_queries (
  id uuid primary key default gen_random_uuid(),
  query_hash text,               -- optional hashing; free text not stored by default
  query_text text,               -- null unless retention policy explicitly allows
  workspace_id uuid,             -- multi-tenancy hook if used
  anonymous boolean default true,
  result_count integer,
  created_at timestamptz default now(),
  expires_at timestamptz         -- configurable retention; a purge job deletes past this
);
create table if not exists legalai.search_result_events (
  id uuid primary key default gen_random_uuid(),
  query_id uuid references legalai.search_queries(id),
  document_id uuid references legalai.legal_documents(id),
  rank integer,
  event_type text,               -- shown | opened
  created_at timestamptz default now()
);

-- RLS: deny-by-default; only PUBLISHED, public, non-removed docs are readable.
alter table legalai.legal_document_versions enable row level security;
alter table legalai.document_sections       enable row level security;
alter table legalai.judges                  enable row level security;
alter table legalai.document_judges         enable row level security;
alter table legalai.document_parties        enable row level security;
alter table legalai.statutes                enable row level security;
alter table legalai.statute_sections        enable row level security;
alter table legalai.document_statute_citations enable row level security;
alter table legalai.case_citations          enable row level security;
alter table legalai.legal_topics            enable row level security;
alter table legalai.document_topics         enable row level security;
alter table legalai.ingestion_events        enable row level security;
alter table legalai.processing_jobs         enable row level security;
alter table legalai.document_quality_checks enable row level security;
alter table legalai.search_queries          enable row level security;
alter table legalai.search_result_events    enable row level security;

-- Public read is limited to published public documents; child rows follow.
create policy ds_read_published on legalai.document_sections for select to authenticated
  using (exists (select 1 from legalai.legal_documents d
    where d.id = document_id and d.status = 'published'
      and d.publication_status = 'public' and d.removed_at is null and d.source_removed_at is null));
create policy topics_read on legalai.legal_topics for select to authenticated using (true);
create policy statutes_read on legalai.statutes for select to authenticated using (true);
-- (Ingestion / raw tables have NO read policy → not public. Service role bypasses RLS.)

comment on table legalai.document_sections is
  'Structural + retrieval sections. embedding vector(1536) per documented decision; populated later. Public read only for published public non-removed documents.';
