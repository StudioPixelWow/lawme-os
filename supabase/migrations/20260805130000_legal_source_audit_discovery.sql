-- ============================================================================
-- LEGAL AI ISRAEL — Legal Source Audit & Discovery Engine
--
-- STATUS: LOCAL migration (NOT yet applied). Applying to remote requires founder
-- approval (see AGENTS.md infra guardrails). Additive only — extends the Phase-1
-- registry `legalai.legal_sources` with audit/discovery columns and statuses,
-- and adds `source_permissions` + `source_audit_evidence`. No existing data is
-- modified or dropped. RLS deny-by-default; registry readable by authenticated.
--
-- FAIL-CLOSED is enforced at BOTH the service layer (collector-gate.ts) and here
-- at the DB layer: a source cannot be marked collector_status='active' unless its
-- audit is completed, technical access is not blocked, and legal reuse is not
-- prohibited/unknown.
-- ============================================================================

-- 1. Extend the registry ----------------------------------------------------
alter table legalai.legal_sources
  add column if not exists normalized_domain text,
  add column if not exists owner_type text,
  -- lifecycle statuses (text + CHECK; unions mirrored in source-audit/types.ts)
  add column if not exists access_status text default 'unknown',
  add column if not exists technical_access_status text default 'unknown',
  add column if not exists legal_reuse_status text default 'unknown',
  add column if not exists collector_status text default 'not_evaluated',
  -- access requirements
  add column if not exists requires_payment boolean default false,
  add column if not exists requires_api_key boolean default false,
  add column if not exists requires_written_permission boolean default false,
  -- robots
  add column if not exists robots_url text,
  add column if not exists robots_status text,
  add column if not exists robots_last_checked_at timestamptz,
  -- sitemap
  add column if not exists sitemap_url text,
  add column if not exists sitemap_status text,
  add column if not exists estimated_sitemap_urls integer,
  -- policy docs
  add column if not exists privacy_url text,
  add column if not exists license_url text,
  -- capability flags
  add column if not exists has_public_search boolean default false,
  add column if not exists has_public_documents boolean default false,
  add column if not exists has_direct_files boolean default false,
  add column if not exists has_pdf boolean default false,
  add column if not exists has_doc boolean default false,
  add column if not exists has_docx boolean default false,
  add column if not exists has_html_documents boolean default false,
  add column if not exists has_json boolean default false,
  add column if not exists has_api boolean default false,
  add column if not exists has_rss boolean default false,
  add column if not exists has_atom boolean default false,
  add column if not exists has_sitemap boolean default false,
  add column if not exists has_pagination boolean default false,
  -- volume / coverage
  add column if not exists estimated_documents bigint,
  add column if not exists estimated_documents_method text,
  add column if not exists update_frequency text,
  add column if not exists coverage_courts text[],
  add column if not exists coverage_topics text[],
  add column if not exists coverage_date_from date,
  add column if not exists coverage_date_to date,
  -- scores (0..100)
  add column if not exists metadata_quality_score integer,
  add column if not exists document_quality_score integer,
  add column if not exists coverage_score integer,
  add column if not exists access_score integer,
  add column if not exists legal_clarity_score integer,
  add column if not exists priority_score integer,
  -- audit bookkeeping
  add column if not exists audit_confidence numeric,
  add column if not exists last_successful_access_at timestamptz,
  add column if not exists recommended_access_method text,
  add column if not exists recommended_collector_type text;

-- CHECK constraints for the new status columns (guarded add via DO block so the
-- migration is re-runnable).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ls_access_status_chk') then
    alter table legalai.legal_sources add constraint ls_access_status_chk
      check (access_status in ('unknown','public','restricted','login_required','paid','blocked','unavailable'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ls_tech_access_status_chk') then
    alter table legalai.legal_sources add constraint ls_tech_access_status_chk
      check (technical_access_status in ('unknown','open','partially_open','rate_limited','captcha','waf_blocked','robots_disallowed','authentication_required','unavailable'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ls_legal_reuse_status_chk') then
    alter table legalai.legal_sources add constraint ls_legal_reuse_status_chk
      check (legal_reuse_status in ('unknown','open_license','public_reuse_allowed','personal_use_only','commercial_permission_required','automated_access_prohibited','written_permission_required','restricted'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ls_collector_status_chk') then
    alter table legalai.legal_sources add constraint ls_collector_status_chk
      check (collector_status in ('not_evaluated','audit_required','ready_to_build','permission_required','blocked','development','testing','active','paused','retired'));
  end if;
  -- FAIL-CLOSED (DB layer): activation requires a clean audit + lawful access.
  if not exists (select 1 from pg_constraint where conname = 'ls_activation_fail_closed_chk') then
    alter table legalai.legal_sources add constraint ls_activation_fail_closed_chk
      check (
        collector_status <> 'active'
        or (
          audit_status = 'completed'
          and technical_access_status in ('open','partially_open','rate_limited')
          and legal_reuse_status in ('open_license','public_reuse_allowed','commercial_permission_required')
          and has_captcha = false
          and requires_login = false
        )
      );
  end if;
end $$;

create index if not exists ls_norm_domain_idx on legalai.legal_sources (normalized_domain);
create index if not exists ls_collector_status_idx on legalai.legal_sources (collector_status);
create index if not exists ls_priority_idx on legalai.legal_sources (priority_score desc);

-- 2. Permission registry ----------------------------------------------------
create table if not exists legalai.source_permissions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references legalai.legal_sources(id),
  permission_type text not null,          -- e.g. written_permission | open_license | api_terms
  granted_by text,
  granted_to text,
  scope text,
  commercial_use_allowed boolean default false,
  automated_access_allowed boolean default false,
  full_text_storage_allowed boolean default false,
  redistribution_allowed boolean default false,
  attribution_required boolean default true,
  effective_from timestamptz,
  expires_at timestamptz,
  evidence_reference text,                -- path/reference; NOT the sensitive doc itself
  notes text,
  created_at timestamptz default now()
);
create index if not exists sp_source_idx on legalai.source_permissions (source_id);

-- 3. Structured audit evidence ----------------------------------------------
create table if not exists legalai.source_audit_evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references legalai.legal_sources(id),
  audit_run_id uuid references legalai.ingestion_runs(id),
  evidence_type text not null
    check (evidence_type in ('homepage','robots','sitemap','terms','license','api','feed','search','document_sample','headers','error')),
  url text,
  status_code integer,
  content_hash text,
  summary text,
  observed_at timestamptz default now()
);
create index if not exists sae_source_idx on legalai.source_audit_evidence (source_id, evidence_type);

-- 4. RLS: deny-by-default; registry readable by authenticated; evidence/
--    permissions are service-role only (no read policy → not public).
alter table legalai.source_permissions    enable row level security;
alter table legalai.source_audit_evidence enable row level security;
-- (no select policies added → only service role can read/write; RLS denies rest)

comment on table legalai.source_permissions is
  'Documented reuse permissions per source. evidence_reference points at a secured artifact; the sensitive document itself is not stored here.';
comment on table legalai.source_audit_evidence is
  'Structured, timestamped audit evidence (homepage/robots/sitemap/terms/api/feed/search/sample/headers/error) with content hashes. Service-role only.';
