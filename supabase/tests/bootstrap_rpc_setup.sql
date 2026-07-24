-- LawME — Capability 1 · Slice 1.0.4 Atomic Bootstrap RPC: LOCAL harness BASELINE.
-- Full-schema pre-1.0.3 state (Matter domain + Intake drafts + guard + helpers +
-- roles + auth shims + seed). Load this, then apply IN ORDER:
--   supabase/migrations/20260724120000_capability1_bootstrap_persistence_primitives.sql
--   supabase/migrations/20260724130000_capability1_bootstrap_matter_rpc.sql
-- then run bootstrap_rpc_tests.sql. Local disposable Postgres 16 only.

set check_function_bodies = off;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('test.role', true), '') $$;

create schema if not exists app;
create or replace function app.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create or replace function app.is_org_member(org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active'); $$;
create or replace function app.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','partner','admin')); $$;
create or replace function app.can_access_intake_draft(draft_org uuid, draft_creator uuid, reviewers uuid[]) returns boolean language sql stable security definer set search_path=public as $$
  select app.is_org_member(draft_org) and (auth.uid()=draft_creator or auth.uid()=any(coalesce(reviewers,'{}'::uuid[]))); $$;
create or replace function app.enforce_draft_matter_org() returns trigger language plpgsql volatile security definer set search_path=public as $$
declare matter_org uuid; begin
  if new.confirmed_matter_id is null then return new; end if;
  select m.organization_id into matter_org from public.matters m where m.id=new.confirmed_matter_id;
  if matter_org is null then raise exception 'confirmed_matter_id is not valid' using errcode='foreign_key_violation'; end if;
  if new.organization_id <> matter_org then raise exception 'confirmed_matter_id not permitted' using errcode='check_violation'; end if;
  return new; end $$;
create or replace function app.enforce_child_matter_org() returns trigger language plpgsql stable security definer set search_path=public as $$
declare matter_org uuid; begin
  select m.organization_id into matter_org from public.matters m where m.id=new.matter_id;
  if matter_org is null then raise exception 'matter % does not exist', new.matter_id using errcode='foreign_key_violation'; end if;
  if new.organization_id <> matter_org then raise exception 'org mismatch' using errcode='check_violation'; end if;
  return new; end $$;
create or replace function app.enforce_matter_participant_org() returns trigger language plpgsql stable security definer set search_path=public as $$
declare matter_org uuid; contact_org uuid; begin
  select m.organization_id into matter_org from public.matters m where m.id=new.matter_id;
  select c.organization_id into contact_org from public.contacts c where c.id=new.contact_id;
  if matter_org is null then raise exception 'matter missing' using errcode='foreign_key_violation'; end if;
  if contact_org is null then raise exception 'contact missing' using errcode='foreign_key_violation'; end if;
  if new.organization_id <> matter_org or new.organization_id <> contact_org then
    raise exception 'cross-tenant link rejected' using errcode='check_violation'; end if;
  return new; end $$;
create or replace function app.forbid_established_fact_on_insert() returns trigger language plpgsql set search_path=public as $$
begin if new.status in ('confirmed','document_derived') then
  raise exception 'intake may not create an established fact (status=%)', new.status using errcode='check_violation'; end if;
  return new; end $$;

-- ── tables (real columns) ──
create table public.organizations (id uuid primary key);
create table public.profiles (id uuid primary key);
create table public.organization_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), profile_id uuid references public.profiles(id), role text, status text);
create table public.matters (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'), title_he text not null check (char_length(title_he) between 1 and 300),
  file_no_he text, forum_he text, legal_domain text not null default 'labor' check (legal_domain in ('labor')),
  procedure_type text not null, topic text not null, current_stage_id text not null,
  status text not null default 'open' check (status in ('open','archived','closed')), assigned_owner_id uuid references public.profiles(id),
  opened_at timestamptz not null default now(), as_of date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  confidentiality text not null default 'client_confidential' check (confidentiality in ('internal','client_confidential','privileged')),
  ai_policy text not null default 'allowed_with_review' check (ai_policy in ('allowed','allowed_with_review','prohibited')),
  unique (organization_id, slug));
create trigger matters_touch before update on public.matters for each row execute function app.touch_updated_at();
create table public.matter_members (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id) on delete cascade, profile_id uuid not null references public.profiles(id),
  matter_role text not null check (matter_role in ('partner','senior_lawyer','lawyer','intern','office_manager','finance','compliance','paralegal')),
  can_review boolean not null default false, can_approve boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (matter_id, profile_id));
create table public.contacts (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  kind text not null check (kind in ('person','company')), name_he text not null check (char_length(name_he) between 1 and 300),
  id_number_he text, contact_info jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  archived_at timestamptz, created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id));
create trigger contacts_touch before update on public.contacts for each row execute function app.touch_updated_at();
create table public.matter_participants (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id), contact_id uuid not null references public.contacts(id),
  role text not null check (role in ('client','opposing_party','related_party','witness','expert','counsel','mediator','insurer')),
  notes_he text, responsiveness text, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id), unique (matter_id, contact_id, role));
create trigger matter_participants_org_consistent before insert or update on public.matter_participants for each row execute function app.enforce_matter_participant_org();
create table public.matter_facts (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id) on delete cascade, fact_key text not null check (char_length(fact_key) between 1 and 120),
  statement_he text not null check (char_length(statement_he) between 1 and 4000),
  status text not null check (status in ('confirmed','client_alleged','opposing_alleged','document_derived','disputed','unknown')),
  provenance jsonb not null default '{}'::jsonb, linked_document_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.profiles(id));
create trigger matter_facts_org_consistent before insert or update on public.matter_facts for each row execute function app.enforce_child_matter_org();
create trigger matter_facts_no_confirm_on_insert before insert on public.matter_facts for each row execute function app.forbid_established_fact_on_insert();
create table public.matter_deadlines (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id) on delete cascade, label_he text not null check (char_length(label_he) between 1 and 300),
  due_at timestamptz, strict boolean not null default false, basis_he text,
  source text not null check (source in ('statute','court_order','contract','estimated','user_supplied')),
  confidence text not null default 'unknown' check (confidence in ('known','estimated','unknown')),
  provenance jsonb not null default '{}'::jsonb, timezone text not null default 'Asia/Jerusalem', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.profiles(id),
  constraint matter_deadlines_known_has_date check (confidence <> 'known' or due_at is not null),
  constraint matter_deadlines_unknown_no_date check (confidence <> 'unknown' or due_at is null));
create trigger matter_deadlines_org_consistent before insert or update on public.matter_deadlines for each row execute function app.enforce_child_matter_org();
create table public.matter_evidence (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id) on delete cascade, label_he text not null check (char_length(label_he) between 1 and 300),
  evidence_type text not null check (evidence_type in ('document','testimony','record','communication','expert','physical')),
  mandatory boolean not null default false, status text not null default 'required' check (status in ('required','collected','missing','disputed','inconclusive')),
  owner_id uuid, owner_he text, provenance jsonb not null default '{}'::jsonb, linked_document_id uuid, linked_fact_field text, legal_issue_id_he text, procedure_stage_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.audit_events (id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(), organization_id uuid references public.organizations(id),
  actor uuid, actor_role text, event_type text not null, object_type text, object_id uuid, payload jsonb not null default '{}'::jsonb);

create table public.matter_intake_drafts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  created_by uuid references public.profiles(id), reviewer_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'active' check (status in ('active','needs_clarification','ready_for_review','confirming','confirmed','rejected','expired')),
  provider_mode text not null default 'deterministic', engine_version text not null, version_token text not null,
  policy_snapshot jsonb not null default '{}'::jsonb, structured_draft jsonb not null, review_state jsonb not null default '{}'::jsonb,
  clarification_rounds jsonb not null default '[]'::jsonb, provenance jsonb not null default '[]'::jsonb, confidential_input text,
  confirmation_idempotency_key text, confirmed_matter_id uuid references public.matters(id), correlation_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), expires_at timestamptz,
  constraint matter_intake_drafts_confirm_consistency check ((status='confirmed') = (confirmed_matter_id is not null)));
create unique index matter_intake_drafts_idem_uq on public.matter_intake_drafts (organization_id, confirmation_idempotency_key) where confirmation_idempotency_key is not null;
create trigger matter_intake_drafts_touch before update on public.matter_intake_drafts for each row execute function app.touch_updated_at();
create trigger matter_intake_drafts_org_consistent before insert or update on public.matter_intake_drafts for each row execute function app.enforce_draft_matter_org();

create or replace function app.enforce_intake_draft_transitions() returns trigger language plpgsql volatile security invoker set search_path='' as $$
declare v_is_client boolean := (auth.role() = 'authenticated');
begin
  if tg_op='INSERT' then
    if new.status in ('confirming','confirmed') or new.confirmed_matter_id is not null then raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
    if v_is_client then
      if new.status<>'active' then raise exception using errcode='P0001', message='INTAKE_DRAFT_TRANSITION_FORBIDDEN'; end if;
      if new.confirmation_idempotency_key is not null then raise exception using errcode='P0001', message='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'; end if;
    end if; return new; end if;
  if old.status='confirmed' or old.confirmed_matter_id is not null then raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'; end if;
  if new.organization_id is distinct from old.organization_id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then raise exception using errcode='P0001', message='INTAKE_DRAFT_IDENTITY_IMMUTABLE'; end if;
  if new.confirmed_matter_id is distinct from old.confirmed_matter_id then raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
  if new.status in ('confirming','confirmed') and new.status is distinct from old.status then raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
  if v_is_client then
    if new.reviewer_ids is distinct from old.reviewer_ids then raise exception using errcode='P0001', message='INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN'; end if;
    if new.status is distinct from old.status then
      if not ((old.status='active' and new.status in ('needs_clarification','ready_for_review','rejected'))
        or (old.status='needs_clarification' and new.status in ('active','ready_for_review','rejected'))
        or (old.status='ready_for_review' and new.status in ('active','needs_clarification','rejected'))) then
        raise exception using errcode='P0001', message='INTAKE_DRAFT_TRANSITION_FORBIDDEN'; end if;
    end if;
  end if;
  if (new.status='confirmed') <> (new.confirmed_matter_id is not null) then raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_INCONSISTENT'; end if;
  return new; end $$;
revoke all on function app.enforce_intake_draft_transitions() from public, anon, authenticated;
create trigger matter_intake_drafts_guard before insert or update on public.matter_intake_drafts for each row execute function app.enforce_intake_draft_transitions();

alter table public.matter_intake_drafts enable row level security;
create policy midr_select on public.matter_intake_drafts for select to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));
create policy midr_insert on public.matter_intake_drafts for insert to authenticated with check (app.is_org_member(organization_id) and created_by=(select auth.uid()) and status not in ('confirming','confirmed') and confirmed_matter_id is null);
create policy midr_update on public.matter_intake_drafts for update to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids)) with check (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));

grant usage on schema public, app, auth, extensions to authenticated, anon, service_role;
grant execute on function auth.uid(), auth.role() to authenticated, anon, service_role;
-- Supabase model: authenticated holds broad SELECT; RLS is the filter (harness reads only).
grant select on all tables in schema public to authenticated, service_role;
grant execute on function app.is_org_member(uuid), app.is_org_admin(uuid), app.can_access_intake_draft(uuid,uuid,uuid[]) to authenticated, service_role;

-- ── SEED ──
insert into public.organizations(id) values ('aaaaaaaa-0000-4000-8000-0000000000a1'), ('bbbbbbbb-0000-4000-8000-0000000000b1');
insert into public.profiles(id) values
  ('00000001-0000-4000-8000-000000000001'),  -- owner (confirm authority)
  ('00000002-0000-4000-8000-000000000002'),  -- lawyer (creator, NO confirm authority)
  ('00000003-0000-4000-8000-000000000003'),  -- reviewer (lawyer, but reviewer relationship)
  ('00000004-0000-4000-8000-000000000004');  -- non-member
insert into public.organization_memberships(organization_id, profile_id, role, status) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1','00000001-0000-4000-8000-000000000001','owner','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','00000002-0000-4000-8000-000000000002','lawyer','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','00000003-0000-4000-8000-000000000003','lawyer','active');
-- existing contacts: one in org A (link_existing OK), one in org B (cross-tenant)
insert into public.contacts(id, organization_id, kind, name_he) values
  ('c0000001-0000-4000-8000-0000000000c1','aaaaaaaa-0000-4000-8000-0000000000a1','person','לקוח קיים'),
  ('c0000002-0000-4000-8000-0000000000b2','bbbbbbbb-0000-4000-8000-0000000000b1','person','זר');
