-- Base schema modelling the live LawME foundation just enough to apply and
-- test the two intake-draft migrations. Faithful to the real definitions of
-- app.touch_updated_at / app.is_org_member / app.is_org_admin and the base tables.

create schema if not exists app;
create schema if not exists auth;

-- Supabase-like roles.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='nobody_role') then create role nobody_role nologin noinherit; end if;
end $$;
grant usage on schema public, app, auth to authenticated, anon, service_role;

-- auth.* stubs reading the per-request JWT claims GUC (as Supabase does).
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub','')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'role','')
$$;
grant execute on function auth.jwt(), auth.uid(), auth.role() to authenticated, anon, service_role;

-- minimal auth.users for the profiles FK.
create table auth.users (id uuid primary key);

create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  profile_id uuid not null references public.profiles (id),
  role text not null check (role in ('owner','partner','admin','lawyer','paralegal')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  unique (organization_id, profile_id)
);
create table public.matters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title_he text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_memberships m
    where m.organization_id = org and m.profile_id = auth.uid() and m.status='active');
$$;
create or replace function app.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_memberships m
    where m.organization_id = org and m.profile_id = auth.uid() and m.status='active'
      and m.role in ('owner','partner','admin'));
$$;
grant execute on function app.is_org_member(uuid), app.is_org_admin(uuid) to authenticated, anon, service_role;
