-- LawME RLS Authorization Alignment — local security harness (Slice 0.8.5).
-- Baseline schema (live helper bodies + current policies) + seed. Load, then apply
-- supabase/migrations/20260722120000_capability08_rls_authorization_alignment.sql,
-- then run rls_alignment_tests.sql. Local disposable Postgres 16 only.

set check_function_bodies = off;
-- ── Roles ──
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- ── auth shim (auth.uid() reads a session GUC) ──
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

-- ── app helpers (copied from live definitions) ──
create schema if not exists app;
create or replace function app.is_org_member(org uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active');
$$;
create or replace function app.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','partner','admin'));
$$;
create or replace function app.can_access_intake_draft(draft_org uuid, draft_creator uuid, reviewers uuid[]) returns boolean language sql stable security definer set search_path to 'public' as $$
  select app.is_org_member(draft_org) and (auth.uid()=draft_creator or auth.uid()=any(coalesce(reviewers,'{}'::uuid[])));
$$;

-- ── tables (authorization-relevant columns) ──
create table public.organization_memberships(id uuid primary key default gen_random_uuid(), organization_id uuid, profile_id uuid, role text, status text);
create table public.matters(id uuid primary key, organization_id uuid, assigned_owner_id uuid, confidentiality text, status text default 'open', deleted_at timestamptz);
create table public.matter_members(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, profile_id uuid, can_review bool default false, can_approve bool default false);
create table public.matter_participants(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, contact_id uuid, role text);
create table public.matter_documents(id uuid primary key, organization_id uuid, matter_id uuid, confidentiality text, approval_state text default 'draft', deleted_at timestamptz);
create table public.matter_notes(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, confidentiality text);
create table public.matter_evidence(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, status text);
create table public.matter_tasks(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, status text);
create table public.matter_research_links(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid);
create table public.matter_facts(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid, status text);
create table public.matter_deadlines(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid);
create table public.matter_activity(id uuid primary key default gen_random_uuid(), organization_id uuid, matter_id uuid);
create table public.contacts(id uuid primary key default gen_random_uuid(), organization_id uuid);
create table public.matter_intake_drafts(id uuid primary key default gen_random_uuid(), organization_id uuid, created_by uuid, reviewer_ids uuid[] default '{}', status text default 'active', confirmed_matter_id uuid);

-- indexes the live schema has (so EXPLAIN is representative)
create unique index matter_members_matter_id_profile_id_key on public.matter_members(matter_id, profile_id);

-- ── enable RLS + BASELINE (current live) policies ──
alter table public.matters enable row level security;
create policy matters_select on public.matters for select to authenticated using (deleted_at is null and app.is_org_member(organization_id));
create policy matters_insert on public.matters for insert to authenticated with check (app.is_org_member(organization_id));
create policy matters_update on public.matters for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_members enable row level security;
create policy matter_members_select on public.matter_members for select to authenticated using (app.is_org_member(organization_id));
create policy matter_members_insert on public.matter_members for insert to authenticated with check (app.is_org_admin(organization_id));
create policy matter_members_update on public.matter_members for update to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));
create policy matter_members_delete on public.matter_members for delete to authenticated using (app.is_org_admin(organization_id));

alter table public.matter_participants enable row level security;
create policy matter_participants_select on public.matter_participants for select to authenticated using (app.is_org_member(organization_id));
create policy matter_participants_insert on public.matter_participants for insert to authenticated with check (app.is_org_admin(organization_id));
create policy matter_participants_update on public.matter_participants for update to authenticated using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

alter table public.matter_documents enable row level security;
create policy matter_documents_select on public.matter_documents for select to authenticated using (deleted_at is null and app.is_org_member(organization_id));
create policy matter_documents_insert on public.matter_documents for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_documents_update on public.matter_documents for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_notes enable row level security;
create policy matter_notes_select on public.matter_notes for select to authenticated using (app.is_org_member(organization_id));
create policy matter_notes_insert on public.matter_notes for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_notes_update on public.matter_notes for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_evidence enable row level security;
create policy matter_evidence_select on public.matter_evidence for select to authenticated using (app.is_org_member(organization_id));
create policy matter_evidence_insert on public.matter_evidence for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_evidence_update on public.matter_evidence for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_tasks enable row level security;
create policy matter_tasks_select on public.matter_tasks for select to authenticated using (app.is_org_member(organization_id));
create policy matter_tasks_insert on public.matter_tasks for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_tasks_update on public.matter_tasks for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_research_links enable row level security;
create policy matter_research_links_select on public.matter_research_links for select to authenticated using (app.is_org_member(organization_id));
create policy matter_research_links_insert on public.matter_research_links for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_research_links_update on public.matter_research_links for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_facts enable row level security;
create policy matter_facts_select on public.matter_facts for select to authenticated using (app.is_org_member(organization_id));
create policy matter_facts_insert on public.matter_facts for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_facts_update on public.matter_facts for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_deadlines enable row level security;
create policy matter_deadlines_select on public.matter_deadlines for select to authenticated using (app.is_org_member(organization_id));
create policy matter_deadlines_insert on public.matter_deadlines for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_deadlines_update on public.matter_deadlines for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_activity enable row level security;
create policy matter_activity_select on public.matter_activity for select to authenticated using (app.is_org_member(organization_id));
create policy matter_activity_insert on public.matter_activity for insert to authenticated with check (app.is_org_member(organization_id));

alter table public.contacts enable row level security;
create policy contacts_select on public.contacts for select to authenticated using (app.is_org_member(organization_id));
create policy contacts_insert on public.contacts for insert to authenticated with check (app.is_org_member(organization_id));
create policy contacts_update on public.contacts for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table public.matter_intake_drafts enable row level security;
create policy matter_intake_drafts_select on public.matter_intake_drafts for select to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));
create policy matter_intake_drafts_insert on public.matter_intake_drafts for insert to authenticated with check (app.is_org_member(organization_id) and created_by=(select auth.uid()) and status <> all(array['confirming','confirmed']) and confirmed_matter_id is null);
create policy matter_intake_drafts_update on public.matter_intake_drafts for update to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids)) with check (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));

-- ── grants (like Supabase: authenticated may attempt; RLS filters) ──
grant usage on schema public, app, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant execute on function app.is_org_member(uuid), app.is_org_admin(uuid), app.can_access_intake_draft(uuid,uuid,uuid[]) to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── SEED ──
insert into public.organization_memberships(organization_id, profile_id, role, status) values
  ('aaaaaaaa-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','lawyer','active'),  -- owner
  ('aaaaaaaa-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','lawyer','active'),  -- member
  ('aaaaaaaa-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000003','lawyer','active'),  -- non-member
  ('aaaaaaaa-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000004','admin','active'),   -- admin
  ('aaaaaaaa-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000006','paralegal','active'), -- creator
  ('aaaaaaaa-0000-4000-8000-000000000001','77777777-0000-4000-8000-000000000007','lawyer','active'),   -- reviewer
  ('bbbbbbbb-0000-4000-8000-000000000001','55555555-0000-4000-8000-000000000005','lawyer','active');   -- tenant B

insert into public.matters(id, organization_id, assigned_owner_id, confidentiality) values
  ('a1111111-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','internal'),
  ('a2222222-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','privileged'),
  ('b1111111-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','55555555-0000-4000-8000-000000000005','internal');

-- U_member is a matter_member of M1 only
insert into public.matter_members(organization_id, matter_id, profile_id, can_review, can_approve) values
  ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002', true, false);

-- children of M1 (orgA) + one document under MB (orgB, cross-tenant)
insert into public.matter_documents(id, organization_id, matter_id, confidentiality) values
  ('d1111111-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','standard'),
  ('d2222222-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001','a2222222-0000-4000-8000-000000000002','privileged'),
  ('db111111-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001','standard');
insert into public.matter_notes(organization_id, matter_id, confidentiality) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','privileged');
insert into public.matter_evidence(organization_id, matter_id, status) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','required');
insert into public.matter_tasks(organization_id, matter_id, status) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','open');
insert into public.matter_research_links(organization_id, matter_id) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001');
insert into public.matter_facts(organization_id, matter_id, status) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001','alleged');
insert into public.matter_deadlines(organization_id, matter_id) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001');
insert into public.matter_activity(organization_id, matter_id) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001');
insert into public.matter_participants(organization_id, matter_id, contact_id, role) values ('aaaaaaaa-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000001', gen_random_uuid(), 'client');
insert into public.contacts(organization_id) values ('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.matter_intake_drafts(organization_id, created_by, reviewer_ids, status) values ('aaaaaaaa-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000006', array['77777777-0000-4000-8000-000000000007']::uuid[], 'ready_for_review');
