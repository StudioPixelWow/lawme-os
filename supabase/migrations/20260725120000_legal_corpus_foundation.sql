-- ============================================================================
-- Verified Legal Corpus — foundation schema (P1-S1)
-- ============================================================================
-- ADDITIVE, LOCAL-PREPARATION ONLY. This migration has NOT been applied to
-- Development or Production. Applying it to Development requires the separate
-- founder approval gate (STOP GATE B) after the diff + checksum are reviewed.
--
-- Design notes:
--  * Prefix `vlc_` (verified legal corpus) to avoid ANY collision with the
--    prior legal-knowledge POC schema (legal_sources, legal_citations, ...).
--  * Reference data, NOT tenant/Matter data: NO changes to Matter or Bootstrap
--    tables; authorization model is untouched.
--  * Clients get NO direct access. RLS enabled + deny-by-default; reads happen
--    only through sanctioned server-side paths (service role). License display
--    limits are enforced at the rendering boundary in application code.
--  * No legal text is inserted by this migration. Verified content is loaded
--    only via the approved source + editorial verification once a written
--    reuse basis exists.
-- ============================================================================

create table if not exists public.vlc_corpus_version (
  corpus_version text primary key,
  created_at timestamptz not null default now(),
  description text not null
);

create table if not exists public.vlc_license_policy (
  policy_id text primary key,
  provider text not null,
  ingestion_allowed boolean not null,
  display_allowed boolean not null,
  max_excerpt_chars integer,
  redistribution_allowed boolean not null,
  export_to_work_product_allowed boolean not null,
  attribution_required boolean not null,
  attribution_text_he text,
  retention_obligations text,
  territory text,
  terms_ref text,
  verified_in_writing boolean not null default false
);

create table if not exists public.vlc_source (
  source_id text primary key,
  source_type text not null,
  provider text not null,
  provider_source_id text,
  official_status text not null,
  jurisdiction text not null,
  authority_strength text not null,
  binding_status text,
  court_hierarchy text,
  provenance text not null,
  license_policy_ref text not null references public.vlc_license_policy (policy_id),
  corpus_version text not null references public.vlc_corpus_version (corpus_version)
);

create table if not exists public.vlc_source_version (
  version_id text primary key,
  source_id text not null references public.vlc_source (source_id),
  version_label text not null,
  effective_date date,
  commencement_date date,
  publication_date date,
  superseded_by_version_id text,
  superseded_from_date date,
  source_text_hash text not null,
  permalink text,
  direct_link text,
  ingestion_timestamp timestamptz not null default now(),
  last_verified_timestamp timestamptz,
  verification_status text not null default 'discovery_only'
);

create table if not exists public.vlc_provision (
  provision_id text primary key,
  version_id text not null references public.vlc_source_version (version_id),
  path text not null,
  heading text,
  text text not null,
  text_hash text not null,
  in_force text not null default 'in_force',
  pinpoint_ref text
);

create table if not exists public.vlc_pinpoint (
  pinpoint_id text primary key,
  provision_or_paragraph text not null,
  anchor_type text not null,
  resolvable_anchor text,
  pinpoint_status text not null,
  pinpoint_statement_he text
);

create table if not exists public.vlc_amendment (
  amendment_id text primary key,
  source_id text not null references public.vlc_source (source_id),
  amending_instrument text,
  amendment_date date,
  effective_date date,
  affected_provisions text[] not null default '{}',
  nature_of_change text not null,
  verification_status text not null default 'discovery_only'
);

create table if not exists public.vlc_verification_record (
  verification_id text primary key,
  version_id text not null references public.vlc_source_version (version_id),
  verifier text not null,
  method text not null,
  checked_fields jsonb not null,
  result text not null,
  verified_at timestamptz not null default now(),
  re_verify_due_date date,
  notes text
);

create table if not exists public.vlc_citation (
  citation_id text primary key,
  target_ref text not null,
  display_form_he text not null,
  copyable_form text not null,
  authority_label_he text not null,
  verification_label_he text not null,
  official_badge boolean not null default false,
  link text,
  pinpoint_ref text,
  license_display_constraints_ref text not null references public.vlc_license_policy (policy_id)
);

create table if not exists public.vlc_doctrine_coverage (
  doctrine_id text primary key,
  required_provisions text[] not null default '{}',
  present_verified_provisions text[] not null default '{}',
  required_authorities text[] not null default '{}',
  present_verified_authorities text[] not null default '{}',
  coverage_level text not null,
  gaps text[] not null default '{}',
  permitted_claim_he text not null,
  last_reviewed timestamptz
);

-- Reference data, server-side only: enable RLS and deny by default. No policies
-- are created for anon/authenticated roles, so client roles receive nothing.
alter table public.vlc_corpus_version      enable row level security;
alter table public.vlc_license_policy       enable row level security;
alter table public.vlc_source               enable row level security;
alter table public.vlc_source_version       enable row level security;
alter table public.vlc_provision            enable row level security;
alter table public.vlc_pinpoint             enable row level security;
alter table public.vlc_amendment            enable row level security;
alter table public.vlc_verification_record  enable row level security;
alter table public.vlc_citation             enable row level security;
alter table public.vlc_doctrine_coverage    enable row level security;

create index if not exists vlc_source_version_source_idx on public.vlc_source_version (source_id);
create index if not exists vlc_provision_version_idx on public.vlc_provision (version_id);
create index if not exists vlc_amendment_source_idx on public.vlc_amendment (source_id);
create index if not exists vlc_verification_version_idx on public.vlc_verification_record (version_id);
