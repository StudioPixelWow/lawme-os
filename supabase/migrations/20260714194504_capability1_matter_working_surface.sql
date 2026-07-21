-- ============================================================================
-- LawME — Capability 1: Matter Working Surface (persistence foundation)
-- Migration: 20260714194504_capability1_matter_working_surface
--   (corrected: an earlier header line named 20260714120000; the canonical
--    version is the filename/remote-history value 20260714194504.)
--
-- STATUS: APPLIED TO DEVELOPMENT (historically reconciled — header only).
--   Applied to:        DEVELOPMENT project udispadsbxqicmawqcuk ONLY.
--   Migration version: 20260714194504 (present exactly once in remote history).
--   Production:        NEVER touched.
--   Reconciliation:    verified against live schema on 2026-07-21 — all objects
--     (matters, matter_members, matter_documents/_versions, matter_evidence,
--      matter_tasks, matter_notes, matter_activity, matter_research_links, the
--      matter-documents bucket, and app.matter_can_approve with search_path=public)
--     exist as this file defines. NO executable drift: only the STATUS/version
--     header above and cosmetic formatting differ from the applied rendering; the
--     executable SQL below is preserved. A pre-apply security review accompanies
--     this file (docs/database/CAPABILITY_1_MATTER_SURFACE_RLS.md).
--
-- WHAT THIS DOES
--   Adds the Matter-scoped work-item schema that Capability 1 needs so that an
--   attorney's work (documents, evidence, tasks, notes, activity, research
--   links) SURVIVES refresh and a new server request. It is purely ADDITIVE:
--   it creates new public.matter_* tables + one private storage bucket and
--   reuses the existing tenant model (organizations / memberships / profiles),
--   the existing app.* RLS helpers, and the existing immutable audit_events.
--
-- ARCHITECTURE (unchanged invariants)
--   * Persist INPUTS (work items + evidentiary decisions); Matter
--     Intelligence / Score / Narrative / Posture are RE-DERIVED on load by the
--     existing pure engines. No stored derived state, no duplicated scoring.
--   * Every table is tenant-isolated on organization_id and RLS-first.
--   * All client-side access is deny-by-default; the trusted write path is the
--     server (service_role bypasses RLS). Client policies are defense in depth.
--   * Matter-level roles/rights live on matter_members (NOT on the frozen
--     organization_memberships.role enum).
--
-- SINGLE TRANSACTION: a failure during apply rolls back automatically.
-- ============================================================================

begin;

-- Helpers: this migration reuses the existing app.is_org_member /
-- app.is_org_admin / app.touch_updated_at / app.forbid_mutation from
-- 20260711173213. One new approver-rights helper (app.matter_can_approve) is
-- defined AFTER matter_members below, because a SQL function body is validated
-- at creation time and must not reference a table that does not yet exist.

-- ----------------------------------------------------------------------------
-- 1. matters — the persisted Matter root (was an in-memory fixture)
-- ----------------------------------------------------------------------------
create table public.matters (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id),
  slug               text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  title_he           text not null check (char_length(title_he) between 1 and 300),
  file_no_he         text,
  forum_he           text,
  legal_domain       text not null default 'labor' check (legal_domain in ('labor')),
  procedure_type     text not null,
  topic              text not null,
  current_stage_id   text not null,
  status             text not null default 'open' check (status in ('open','archived','closed')),
  assigned_owner_id  uuid references public.profiles (id),
  opened_at          timestamptz not null default now(),
  as_of              date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  unique (organization_id, slug)
);
create index matters_org_idx on public.matters (organization_id, status);
create trigger matters_touch before update on public.matters
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2. matter_members — fine-grained Matter roles + review/approve rights
--    (leaves organization_memberships.role untouched)
-- ----------------------------------------------------------------------------
create table public.matter_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  matter_id        uuid not null references public.matters (id) on delete cascade,
  profile_id       uuid not null references public.profiles (id),
  matter_role      text not null check (matter_role in
                     ('partner','senior_lawyer','lawyer','intern',
                      'office_manager','finance','compliance','paralegal')),
  can_review       boolean not null default false,
  can_approve      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (matter_id, profile_id)
);
create index matter_members_matter_idx on public.matter_members (matter_id);
create trigger matter_members_touch before update on public.matter_members
  for each row execute function app.touch_updated_at();

-- Approver-rights helper (defined here, after matter_members exists).
-- SECURITY DEFINER so a policy can consult matter_members without recursion.
create or replace function app.matter_can_approve(matter uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matter_members mm
    where mm.matter_id = matter
      and mm.profile_id = auth.uid()
      and mm.can_approve = true
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. matter_documents — operational evidence-document record
--    (mirrors the app EvidenceDocument type)
-- ----------------------------------------------------------------------------
create table public.matter_documents (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id),
  matter_id             uuid not null references public.matters (id) on delete cascade,
  title                 text not null check (char_length(title) between 1 and 300),
  filename              text not null,
  mime_type             text not null,
  size                  bigint not null check (size >= 0 and size <= 104857600),
  document_type         text not null check (document_type in
                          ('correspondence','contract','payslip','dismissal_letter',
                           'medical','court_filing','id_document','other')),
  evidence_type         text not null check (evidence_type in
                          ('document','testimony','record','communication','expert','physical')),
  source_type           text not null check (source_type in
                          ('client','opposing_party','third_party','public_record','internal')),
  document_date         date,
  uploaded_by_id        uuid references public.profiles (id),
  uploaded_by_he        text,
  assigned_reviewer_id  uuid references public.profiles (id),
  assigned_reviewer_he  text,
  confidentiality       text not null default 'standard' check (confidentiality in
                          ('standard','confidential','privileged','restricted')),
  evidence_decision     text check (evidence_decision in
                          ('supports','contradicts','inconclusive','authenticity_uncertain','incomplete')),
  verification_state    text not null default 'unverified' check (verification_state in
                          ('unverified','provisional','verified')),
  approval_state        text not null default 'draft' check (approval_state in
                          ('draft','in_review','approved','rejected')),
  scan_status           text not null default 'scan_pending' check (scan_status in
                          ('scan_pending','scan_clean_demo','scan_failed')),
  workflow_id           text,
  legal_issue_id_he     text,
  procedure_stage_id    text,
  latest_version        int not null default 1 check (latest_version >= 1),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index matter_documents_matter_idx on public.matter_documents (matter_id, created_at desc);
create trigger matter_documents_touch before update on public.matter_documents
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. matter_document_versions — immutable V1 version model
--    (replacement = new row; originals preserved; binaries never overwritten)
-- ----------------------------------------------------------------------------
create table public.matter_document_versions (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id),
  matter_id            uuid not null references public.matters (id) on delete cascade,
  document_id          uuid not null references public.matter_documents (id) on delete cascade,
  version              int not null check (version >= 1),
  content_hash         text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  storage_bucket       text not null default 'matter-documents',
  storage_path         text not null,
  byte_size            bigint not null check (byte_size >= 0 and byte_size <= 104857600),
  mime_type            text not null,
  prev_version_id      uuid references public.matter_document_versions (id),
  created_by_id        uuid references public.profiles (id),
  created_by_he        text,
  verification_status  text not null default 'unverified' check (verification_status in
                         ('unverified','provisional','verified')),
  change_reason        text,
  created_at           timestamptz not null default now(),
  unique (document_id, version)
);
create index matter_document_versions_doc_idx on public.matter_document_versions (document_id, version desc);
-- immutable: versions are an audit-grade lineage
create trigger matter_document_versions_no_mutate before update or delete on public.matter_document_versions
  for each row execute function app.forbid_mutation();

-- ----------------------------------------------------------------------------
-- 5. matter_evidence — evidence requirements + collected evidence
-- ----------------------------------------------------------------------------
create table public.matter_evidence (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id),
  matter_id            uuid not null references public.matters (id) on delete cascade,
  label_he             text not null check (char_length(label_he) between 1 and 300),
  evidence_type        text not null check (evidence_type in
                         ('document','testimony','record','communication','expert','physical')),
  mandatory            boolean not null default false,
  status               text not null default 'required' check (status in
                         ('required','collected','missing','disputed','inconclusive')),
  owner_id             uuid references public.profiles (id),
  owner_he             text,
  -- NOTE (Capability 1, single-source-of-truth rule): evidentiary review
  -- OUTCOMES (decision / approval_state / reviewer) live ONLY on
  -- matter_documents. matter_evidence owns the requirement/input; a
  -- requirement's satisfaction is DERIVED from its linked, approved documents.
  provenance           jsonb not null default '{}'::jsonb,
  linked_document_id   uuid references public.matter_documents (id),
  linked_fact_field    text,
  legal_issue_id_he    text,
  procedure_stage_id   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index matter_evidence_matter_idx on public.matter_evidence (matter_id);
create trigger matter_evidence_touch before update on public.matter_evidence
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 6. matter_tasks — standalone + workflow-linked tasks
-- ----------------------------------------------------------------------------
create table public.matter_tasks (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id),
  matter_id           uuid not null references public.matters (id) on delete cascade,
  title_he            text not null check (char_length(title_he) between 1 and 300),
  description_he      text,
  owner_id            uuid references public.profiles (id),
  owner_he            text,
  creator_id          uuid references public.profiles (id),
  creator_he          text,
  source              text not null default 'standalone' check (source in ('standalone','workflow','blocker')),
  workflow_id         text,
  status              text not null default 'open' check (status in
                        ('open','in_progress','paused','waiting','in_review','done','reopened')),
  priority            text not null default 'normal' check (priority in ('low','normal','high','critical')),
  due_date            date,
  linked_object_type  text check (linked_object_type in
                        ('document','evidence','note','workflow','deadline','stage','research','blocker')),
  linked_object_id    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);
create index matter_tasks_matter_idx on public.matter_tasks (matter_id, status);
create trigger matter_tasks_touch before update on public.matter_tasks
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 7. matter_notes — internal legal notes (safe text; no HTML execution)
-- ----------------------------------------------------------------------------
create table public.matter_notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  matter_id        uuid not null references public.matters (id) on delete cascade,
  author_id        uuid references public.profiles (id),
  author_he        text,
  body             text not null check (char_length(body) between 1 and 20000),
  confidentiality  text not null default 'standard' check (confidentiality in
                     ('standard','confidential','privileged','restricted')),
  pinned           boolean not null default false,
  mentions         jsonb not null default '[]'::jsonb,
  links            jsonb not null default '[]'::jsonb,
  revision         int not null default 1 check (revision >= 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);
create index matter_notes_matter_idx on public.matter_notes (matter_id, pinned desc, created_at desc);
create trigger matter_notes_touch before update on public.matter_notes
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 8. matter_activity — human-readable feed (append-only in practice; NOT the
--    immutable audit — that stays in public.audit_events)
-- ----------------------------------------------------------------------------
create table public.matter_activity (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  matter_id        uuid not null references public.matters (id) on delete cascade,
  occurred_at      timestamptz not null default now(),
  actor_id         uuid references public.profiles (id),
  actor_he         text,
  actor_role       text,
  kind             text not null check (char_length(kind) between 1 and 120),
  description_he   text not null check (char_length(description_he) between 1 and 1000),
  object_type      text,
  object_id        text,
  before_state     jsonb,
  after_state      jsonb,
  source_action    text,
  correlation_id   uuid
);
create index matter_activity_matter_idx on public.matter_activity (matter_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 9. matter_research_links — link existing legal_research_* to Matter objects
--    (no new research engine; reuse the approved research tables)
-- ----------------------------------------------------------------------------
create table public.matter_research_links (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id),
  matter_id            uuid not null references public.matters (id) on delete cascade,
  research_session_id  uuid references public.legal_research_sessions (id),
  research_query_id    uuid references public.legal_research_queries (id),
  title_he             text,
  question_he          text,
  coverage_state       text,
  legal_issue_id_he    text,
  linked_object_type   text check (linked_object_type in ('note','blocker','workflow','document','evidence','stage')),
  linked_object_id     text,
  human_review_state   text not null default 'pending' check (human_review_state in
                         ('pending','reviewed','approved','rejected')),
  created_by_id        uuid references public.profiles (id),
  created_by_he        text,
  created_at           timestamptz not null default now()
);
create index matter_research_links_matter_idx on public.matter_research_links (matter_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 10. Storage: private bucket for Matter document binaries.
--     Org+matter-prefixed read paths; NO client writes (server/service only).
--     Path rule: organizations/<organization_id>/matters/<matter_id>/...
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'matter-documents',
  'matter-documents',
  false,                                   -- private: no anonymous public reads
  104857600,                               -- 100MB, matches version byte_size CHECK
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy matter_documents_read_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'matter-documents'
    and name like 'organizations/%'
    and app.is_org_member(((string_to_array(name, '/'))[2])::uuid)
  );
-- No client INSERT/UPDATE/DELETE policies on storage.objects: uploads happen
-- only through the server-side finalization path (service_role bypasses RLS).

-- ============================================================================
-- ROW LEVEL SECURITY — every new table on, deny-by-default, org-scoped.
-- Pattern mirrors legal_documents: authenticated members read/insert/update
-- their org's rows; soft-delete via deleted_at where present; version + audit
-- + activity trails are append-only (no update/delete policy).
-- Server writes use service_role (bypasses RLS) — the trusted path.
-- ============================================================================

alter table public.matters                  enable row level security;
alter table public.matter_members           enable row level security;
alter table public.matter_documents         enable row level security;
alter table public.matter_document_versions enable row level security;
alter table public.matter_evidence          enable row level security;
alter table public.matter_tasks             enable row level security;
alter table public.matter_notes             enable row level security;
alter table public.matter_activity          enable row level security;
alter table public.matter_research_links    enable row level security;

-- matters
create policy matters_select on public.matters
  for select to authenticated
  using (deleted_at is null and app.is_org_member(organization_id));
create policy matters_insert on public.matters
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matters_update on public.matters
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_members (only org admins manage membership; members may read)
create policy matter_members_select on public.matter_members
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_members_insert on public.matter_members
  for insert to authenticated
  with check (app.is_org_admin(organization_id));
create policy matter_members_update on public.matter_members
  for update to authenticated
  using (app.is_org_admin(organization_id))
  with check (app.is_org_admin(organization_id));
create policy matter_members_delete on public.matter_members
  for delete to authenticated
  using (app.is_org_admin(organization_id));

-- matter_documents (soft-delete)
create policy matter_documents_select on public.matter_documents
  for select to authenticated
  using (deleted_at is null and app.is_org_member(organization_id));
create policy matter_documents_insert on public.matter_documents
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_documents_update on public.matter_documents
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_document_versions (append-only lineage: read + insert only)
create policy matter_document_versions_select on public.matter_document_versions
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_document_versions_insert on public.matter_document_versions
  for insert to authenticated
  with check (app.is_org_member(organization_id));

-- matter_evidence
create policy matter_evidence_select on public.matter_evidence
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_evidence_insert on public.matter_evidence
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_evidence_update on public.matter_evidence
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_tasks
create policy matter_tasks_select on public.matter_tasks
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_tasks_insert on public.matter_tasks
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_tasks_update on public.matter_tasks
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_notes (soft-archive via archived_at; still row-visible to org)
create policy matter_notes_select on public.matter_notes
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_notes_insert on public.matter_notes
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_notes_update on public.matter_notes
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

-- matter_activity (append-only feed: read + insert only)
create policy matter_activity_select on public.matter_activity
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_activity_insert on public.matter_activity
  for insert to authenticated
  with check (app.is_org_member(organization_id));

-- matter_research_links
create policy matter_research_links_select on public.matter_research_links
  for select to authenticated
  using (app.is_org_member(organization_id));
create policy matter_research_links_insert on public.matter_research_links
  for insert to authenticated
  with check (app.is_org_member(organization_id));
create policy matter_research_links_update on public.matter_research_links
  for update to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (do not run blindly; take a backup first)
-- Reverse of apply, safe on a database holding NO real Matter data:
--
--   begin;
--   drop policy if exists matter_documents_read_org on storage.objects;
--   delete from storage.buckets where id = 'matter-documents';
--   drop table if exists public.matter_research_links   cascade;
--   drop table if exists public.matter_activity         cascade;
--   drop table if exists public.matter_notes            cascade;
--   drop table if exists public.matter_tasks            cascade;
--   drop table if exists public.matter_evidence         cascade;
--   drop table if exists public.matter_document_versions cascade;
--   drop table if exists public.matter_documents        cascade;
--   drop table if exists public.matter_members          cascade;
--   drop table if exists public.matters                 cascade;
--   drop function if exists app.matter_can_approve(uuid);
--   commit;
--
-- Existing tables (organizations, profiles, memberships, legal_*, audit_events)
-- and the legal-source-files bucket are untouched by this migration.
-- ============================================================================
