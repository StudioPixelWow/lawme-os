-- LawME — Capability 1 · Slice 1.0.3 Bootstrap persistence primitives:
-- LOCAL security harness BASELINE (the CURRENT live pre-1.0.3 state).
-- Load this, then apply
--   supabase/migrations/20260724120000_capability1_bootstrap_persistence_primitives.sql,
-- then run bootstrap_primitives_tests.sql. Local disposable Postgres 16 only.
-- It faithfully reproduces: the matter_intake_drafts table + its CURRENT guard,
-- constraints and RLS; the matter_facts fact-guard; app helpers; auth.uid()/role()
-- GUC shims; and the Supabase role model (authenticated / anon / service_role).

set check_function_bodies = off;

-- ── Roles (Supabase model). lawme_bootstrap is NOT pre-created — the migration creates it. ──
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- ── auth shims: uid() + role() read session GUCs ──
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('test.role', true), '')
$$;

-- ── app helpers (copied from live definitions) ──
create schema if not exists app;
create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function app.is_org_member(org uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active');
$$;
create or replace function app.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','partner','admin'));
$$;
create or replace function app.can_access_intake_draft(draft_org uuid, draft_creator uuid, reviewers uuid[]) returns boolean language sql stable security definer set search_path to 'public' as $$
  select app.is_org_member(draft_org) and (auth.uid()=draft_creator or auth.uid()=any(coalesce(reviewers,'{}'::uuid[])));
$$;

-- org consistency for a draft's confirmed_matter_id (current live form).
create or replace function app.enforce_draft_matter_org() returns trigger language plpgsql volatile security definer set search_path = public as $$
declare matter_org uuid;
begin
  if new.confirmed_matter_id is null then return new; end if;
  select m.organization_id into matter_org from public.matters m where m.id = new.confirmed_matter_id;
  if matter_org is null then raise exception 'confirmed_matter_id is not valid' using errcode='foreign_key_violation'; end if;
  if new.organization_id <> matter_org then raise exception 'confirmed_matter_id is not permitted for this draft' using errcode='check_violation'; end if;
  return new;
end $$;

-- child org consistency + fact guard (current live forms).
create or replace function app.enforce_child_matter_org() returns trigger language plpgsql stable security definer set search_path = public as $$
declare matter_org uuid;
begin
  select m.organization_id into matter_org from public.matters m where m.id = new.matter_id;
  if matter_org is null then raise exception 'matter % does not exist', new.matter_id using errcode='foreign_key_violation'; end if;
  if new.organization_id <> matter_org then raise exception 'org mismatch' using errcode='check_violation'; end if;
  return new;
end $$;
create or replace function app.forbid_established_fact_on_insert() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('confirmed','document_derived') then
    raise exception 'intake may not create an established fact (status=%)', new.status using errcode='check_violation';
  end if;
  return new;
end $$;

-- ── tables ──
create table public.organizations (id uuid primary key);
create table public.profiles (id uuid primary key);
create table public.organization_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), profile_id uuid references public.profiles(id), role text, status text);
create table public.matters (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), deleted_at timestamptz);

create table public.matter_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id),
  fact_key text not null, statement_he text not null,
  status text not null check (status in ('confirmed','client_alleged','opposing_alleged','document_derived','disputed','unknown')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger matter_facts_org_consistent before insert or update on public.matter_facts for each row execute function app.enforce_child_matter_org();
create trigger matter_facts_no_confirm_on_insert before insert on public.matter_facts for each row execute function app.forbid_established_fact_on_insert();

create table public.matter_intake_drafts (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations (id),
  created_by                  uuid references public.profiles (id),
  reviewer_ids                uuid[] not null default '{}'::uuid[],
  status                      text not null default 'active' check (status in
                                ('active','needs_clarification','ready_for_review','confirming','confirmed','rejected','expired')),
  provider_mode               text not null default 'deterministic',
  engine_version              text not null,
  version_token               text not null,
  policy_snapshot             jsonb not null default '{}'::jsonb,
  structured_draft            jsonb not null,
  review_state                jsonb not null default '{}'::jsonb,
  clarification_rounds        jsonb not null default '[]'::jsonb,
  provenance                  jsonb not null default '[]'::jsonb,
  confidential_input          text,
  confirmation_idempotency_key text,
  confirmed_matter_id         uuid references public.matters (id),
  correlation_id              uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  expires_at                  timestamptz,
  constraint matter_intake_drafts_confirm_consistency check ((status = 'confirmed') = (confirmed_matter_id is not null))
);
create unique index matter_intake_drafts_idem_uq on public.matter_intake_drafts (organization_id, confirmation_idempotency_key) where confirmation_idempotency_key is not null;
create trigger matter_intake_drafts_touch before update on public.matter_intake_drafts for each row execute function app.touch_updated_at();
create trigger matter_intake_drafts_org_consistent before insert or update on public.matter_intake_drafts for each row execute function app.enforce_draft_matter_org();

-- CURRENT (pre-1.0.3) guard — SECURITY INVOKER, search_path='' (from 20260717090000).
create or replace function app.enforce_intake_draft_transitions() returns trigger language plpgsql volatile security invoker set search_path = '' as $$
declare v_is_client boolean := (auth.role() = 'authenticated');
begin
  if tg_op = 'INSERT' then
    if new.status in ('confirming','confirmed') or new.confirmed_matter_id is not null then
      raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
    if v_is_client then
      if new.status <> 'active' then raise exception using errcode='P0001', message='INTAKE_DRAFT_TRANSITION_FORBIDDEN'; end if;
      if new.confirmation_idempotency_key is not null then raise exception using errcode='P0001', message='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'; end if;
    end if;
    return new;
  end if;
  if old.status = 'confirmed' or old.confirmed_matter_id is not null then
    raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'; end if;
  if new.organization_id is distinct from old.organization_id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception using errcode='P0001', message='INTAKE_DRAFT_IDENTITY_IMMUTABLE'; end if;
  if new.confirmed_matter_id is distinct from old.confirmed_matter_id then
    raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
  if new.status in ('confirming','confirmed') and new.status is distinct from old.status then
    raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'; end if;
  if v_is_client then
    if new.reviewer_ids is distinct from old.reviewer_ids then raise exception using errcode='P0001', message='INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN'; end if;
    if new.provider_mode is distinct from old.provider_mode or new.engine_version is distinct from old.engine_version or new.policy_snapshot is distinct from old.policy_snapshot
       or new.provenance is distinct from old.provenance or new.confirmation_idempotency_key is distinct from old.confirmation_idempotency_key
       or new.correlation_id is distinct from old.correlation_id or new.version_token is distinct from old.version_token or new.expires_at is distinct from old.expires_at then
      raise exception using errcode='P0001', message='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'; end if;
    if new.status is distinct from old.status then
      if not ((old.status='active' and new.status in ('needs_clarification','ready_for_review','rejected'))
        or (old.status='needs_clarification' and new.status in ('active','ready_for_review','rejected'))
        or (old.status='ready_for_review' and new.status in ('active','needs_clarification','rejected'))) then
        raise exception using errcode='P0001', message='INTAKE_DRAFT_TRANSITION_FORBIDDEN'; end if;
    end if;
    if old.status not in ('active','needs_clarification','ready_for_review') then
      if new.structured_draft is distinct from old.structured_draft or new.review_state is distinct from old.review_state
         or new.clarification_rounds is distinct from old.clarification_rounds or new.confidential_input is distinct from old.confidential_input then
        raise exception using errcode='P0001', message='INTAKE_DRAFT_CONTENT_LOCKED'; end if;
    end if;
  end if;
  if (new.status='confirmed') <> (new.confirmed_matter_id is not null) then
    raise exception using errcode='P0001', message='INTAKE_DRAFT_CONFIRMATION_INCONSISTENT'; end if;
  return new;
end $$;
revoke all on function app.enforce_intake_draft_transitions() from public;
revoke all on function app.enforce_intake_draft_transitions() from anon;
revoke all on function app.enforce_intake_draft_transitions() from authenticated;
create trigger matter_intake_drafts_guard before insert or update on public.matter_intake_drafts for each row execute function app.enforce_intake_draft_transitions();

-- ── RLS (current live) ──
alter table public.matter_intake_drafts enable row level security;
create policy matter_intake_drafts_select on public.matter_intake_drafts for select to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));
create policy matter_intake_drafts_insert on public.matter_intake_drafts for insert to authenticated with check (app.is_org_member(organization_id) and created_by=(select auth.uid()) and status not in ('confirming','confirmed') and confirmed_matter_id is null);
create policy matter_intake_drafts_update on public.matter_intake_drafts for update to authenticated using (app.can_access_intake_draft(organization_id, created_by, reviewer_ids)) with check (app.can_access_intake_draft(organization_id, created_by, reviewer_ids));

alter table public.matter_facts enable row level security;
create policy matter_facts_insert on public.matter_facts for insert to authenticated with check (app.is_org_member(organization_id));
create policy matter_facts_select on public.matter_facts for select to authenticated using (app.is_org_member(organization_id));

-- ── grants (like Supabase) ──
grant usage on schema public, app, auth to authenticated, anon;
grant execute on function auth.uid(), auth.role() to authenticated, anon, service_role;
grant execute on function app.is_org_member(uuid), app.is_org_admin(uuid), app.can_access_intake_draft(uuid,uuid,uuid[]) to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- ── SEED (baseline; org + profiles + memberships + one matter for FK targets) ──
insert into public.organizations(id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1'), ('bbbbbbbb-0000-4000-8000-0000000000b1');
insert into public.profiles(id) values
  ('66666666-0000-4000-8000-000000000006'), -- creator
  ('77777777-0000-4000-8000-000000000007'), -- reviewer
  ('22222222-0000-4000-8000-000000000002'), -- member (non-reviewer)
  ('33333333-0000-4000-8000-000000000003'), -- non-member
  ('44444444-0000-4000-8000-000000000004'); -- admin
insert into public.organization_memberships(organization_id, profile_id, role, status) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1','66666666-0000-4000-8000-000000000006','paralegal','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','77777777-0000-4000-8000-000000000007','lawyer','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','22222222-0000-4000-8000-000000000002','lawyer','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','44444444-0000-4000-8000-000000000004','admin','active');
insert into public.matters(id, organization_id) values
  ('11111111-1111-4000-8000-0000000000c1','aaaaaaaa-0000-4000-8000-0000000000a1'),  -- org A matter
  ('22222222-2222-4000-8000-0000000000c2','bbbbbbbb-0000-4000-8000-0000000000b1');  -- org B matter (cross-tenant)
