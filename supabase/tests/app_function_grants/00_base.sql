-- Focused base to validate the app.* grant-hardening migration: exact function
-- signatures + RLS + triggers, PUBLIC EXECUTE default (pre-hardening state).
create schema if not exists app;
create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='nobody_role') then create role nobody_role nologin noinherit; end if;
end $$;
grant usage on schema public, app, auth to authenticated, anon, service_role, nobody_role;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub','')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'role','') $$;
grant execute on function auth.jwt(), auth.uid(), auth.role() to authenticated, anon, service_role, nobody_role;

create table public.organizations (id uuid primary key, name text not null);
create table public.profiles (id uuid primary key);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id),
  profile_id uuid not null references public.profiles(id),
  role text not null default 'lawyer', status text not null default 'active',
  primary key (organization_id, profile_id));

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create or replace function app.forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'immutable'; end $$;
create or replace function app.forbid_established_fact_on_insert() returns trigger language plpgsql as $$
begin
  if new.status in ('confirmed','document_derived') then
    raise exception 'intake may not create an established fact (status=%)', new.status using errcode='check_violation';
  end if; return new;
end $$;
create or replace function app.is_org_member(org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active') $$;
create or replace function app.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_memberships m where m.organization_id=org and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','partner','admin')) $$;
-- other DEFINER helpers (exact signatures; minimal bodies — presence is what the grant migration needs)
create or replace function app.current_org_ids() returns setof uuid language sql stable security definer set search_path=public as $$ select organization_id from public.organization_memberships where profile_id=auth.uid() and status='active' $$;
create or replace function app.can_read_document(doc uuid) returns boolean language sql stable security definer set search_path=public as $$ select true $$;
create or replace function app.can_write_document(doc uuid) returns boolean language sql stable security definer set search_path=public as $$ select true $$;
create or replace function app.session_org(sess uuid) returns uuid language sql stable security definer set search_path=public as $$ select sess $$;
create or replace function app.query_org(q uuid) returns uuid language sql stable security definer set search_path=public as $$ select q $$;
create or replace function app.claim_org(cl uuid) returns uuid language sql stable security definer set search_path=public as $$ select cl $$;
create or replace function app.version_document(ver uuid) returns uuid language sql stable security definer set search_path=public as $$ select ver $$;
create or replace function app.matter_can_approve(matter uuid) returns boolean language sql stable security definer set search_path=public as $$ select false $$;
create or replace function app.enforce_child_matter_org() returns trigger language plpgsql stable security definer set search_path=public as $$ begin return new; end $$;
create or replace function app.enforce_matter_participant_org() returns trigger language plpgsql stable security definer set search_path=public as $$ begin return new; end $$;

create table public.matters (
  id uuid primary key, organization_id uuid not null references public.organizations(id),
  title text not null, updated_at timestamptz not null default now());
create trigger matters_touch before update on public.matters for each row execute function app.touch_updated_at();
alter table public.matters enable row level security;
create policy matters_select on public.matters for select to authenticated using (app.is_org_member(organization_id));
create policy matters_insert on public.matters for insert to authenticated with check (app.is_org_member(organization_id));
create policy matters_update on public.matters for update to authenticated using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

create table public.matter_facts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  matter_id uuid not null references public.matters(id), status text not null, updated_at timestamptz not null default now());
create trigger matter_facts_touch before update on public.matter_facts for each row execute function app.touch_updated_at();
create trigger matter_facts_forbid_established before insert on public.matter_facts for each row execute function app.forbid_established_fact_on_insert();
alter table public.matter_facts enable row level security;
create policy matter_facts_select on public.matter_facts for select to authenticated using (app.is_org_member(organization_id));
create policy matter_facts_insert on public.matter_facts for insert to authenticated with check (app.is_org_member(organization_id));

grant select, insert, update on public.matters, public.matter_facts to authenticated, anon;
grant all on public.matters, public.matter_facts to service_role;

-- seed: org1(userA member), org2(userB member); one matter in org1
insert into public.profiles(id) values ('a0000000-0000-0000-0000-00000000000a'),('b0000000-0000-0000-0000-00000000000b');
insert into public.organizations(id,name) values ('11111111-1111-1111-1111-111111111111','Org1'),('22222222-2222-2222-2222-222222222222','Org2');
insert into public.organization_memberships(organization_id,profile_id,role,status) values
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-00000000000a','lawyer','active'),
 ('22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-00000000000b','lawyer','active');
insert into public.matters(id,organization_id,title) values ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','M1');

create table public._results (test_no int, passed boolean, detail text);
grant insert on public._results to authenticated, anon, service_role, nobody_role;
