-- ============================================================================
-- LawME — Capability 1 · Slice 1.0.5: Bootstrap PUBLIC GATEWAY
--   New additive migration. Does NOT modify or rerun any historical migration
--   (20260724120000 / 20260724130000 / 20260724140000). Development-only target
--   on approval. Production is NEVER touched.
--
-- WHY
--   app.bootstrap_matter_v1(jsonb) is the atomic Bootstrap RPC. Browser/service
--   roles must NOT be granted USAGE on schema `app`, and the `app` schema is not a
--   general PostgREST API surface, so `authenticated` (which holds EXECUTE on the
--   internal RPC) cannot *reach* it: a direct call fails with
--   "permission denied for schema app". This migration adds exactly ONE narrow
--   public-schema entry point so the canonical server-side use case can invoke the
--   Bootstrap engine through the authenticated, JWT-preserving Supabase session —
--   without widening the `app` schema surface.
--
-- GATEWAY MODEL (proven locally under the Development privilege model)
--   * A SECURITY INVOKER wrapper CANNOT bridge: for SECURITY INVOKER, PostgreSQL
--     checks the *invoking* role's privileges on the referenced function, and
--     `authenticated` has no USAGE on schema `app` → "permission denied for schema
--     app". Therefore SECURITY DEFINER is technically required and justified.
--   * Owner = lawme_bootstrap — the existing dedicated Bootstrap principal that
--     already owns and runs app.bootstrap_matter_v1. The gateway therefore adds
--     ZERO new privilege: it runs as the same principal that already executes the
--     internal RPC, and its body is a pure forward (no table access, no business
--     logic). postgres is deliberately NOT used as owner (keeps a browser-reachable
--     SECURITY DEFINER function off the superuser-adjacent role).
--   * auth.uid() is preserved: the JWT claim GUC (request.jwt.claim.sub) is
--     session-scoped and survives the SECURITY DEFINER role switch, so
--     app.actor_uid() inside the internal RPC still resolves the real user.
--
-- OWNERSHIP MECHANICS (transient; end state unchanged)
--   Transferring ownership to lawme_bootstrap requires the new owner to hold CREATE
--   on the function's schema. CREATE on schema `public` is granted transiently and
--   revoked before COMMIT — end state: lawme_bootstrap has NO CREATE on public.
--
-- SINGLE TRANSACTION: any failure rolls back the whole migration.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Pre-flight — the internal Bootstrap objects must exist; the gateway must not.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'bootstrap_matter_v1'
      and p.prosecdef = true and pg_get_userbyid(p.proowner) = 'lawme_bootstrap'
  ) then
    raise exception 'preflight: app.bootstrap_matter_v1 (lawme_bootstrap-owned SECURITY DEFINER) is required';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'actor_uid'
  ) then
    raise exception 'preflight: app.actor_uid() is required';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bootstrap_matter_v1'
  ) then
    raise exception 'preflight: public.bootstrap_matter_v1 already exists — gateway already applied?';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'lawme_bootstrap') then
    raise exception 'preflight: role lawme_bootstrap missing';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- The narrow public gateway. Minimal forwarding only: no business logic, no
-- planner/validation logic, no actor/org override, no dynamic SQL, no fallback
-- identity, no table access. Fully qualifies the internal function; search_path
-- pinned empty.
-- ----------------------------------------------------------------------------
grant lawme_bootstrap to postgres with set true;   -- idempotent (already present)
grant create on schema public to lawme_bootstrap;    -- transient (ownership transfer only)

create or replace function public.bootstrap_matter_v1(p_payload jsonb)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $gateway$
  select app.bootstrap_matter_v1(p_payload)
$gateway$;

alter function public.bootstrap_matter_v1(jsonb) owner to lawme_bootstrap;
revoke create on schema public from lawme_bootstrap;

-- Least-privilege EXECUTE: authenticated only; never anon/service_role/PUBLIC.
revoke all on function public.bootstrap_matter_v1(jsonb) from public;
revoke all on function public.bootstrap_matter_v1(jsonb) from anon;
revoke all on function public.bootstrap_matter_v1(jsonb) from service_role;
grant execute on function public.bootstrap_matter_v1(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Postconditions — fail on ANY drift from the approved model.
-- ----------------------------------------------------------------------------
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bootstrap_matter_v1';

  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'post: gateway owner must be lawme_bootstrap';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'bootstrap_matter_v1'
         and p.prosecdef = true
         and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%') then
    raise exception 'post: gateway must be SECURITY DEFINER with a pinned search_path';
  end if;
  -- forwards ONLY to the internal RPC; no other app.* reference.
  if v_def not like '%app.bootstrap_matter_v1(%' then
    raise exception 'post: gateway must forward to app.bootstrap_matter_v1';
  end if;
  -- ACL: authenticated only.
  if not has_function_privilege('authenticated', 'public.bootstrap_matter_v1(jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.bootstrap_matter_v1(jsonb)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.bootstrap_matter_v1(jsonb)', 'EXECUTE')
     or has_function_privilege('public', 'public.bootstrap_matter_v1(jsonb)', 'EXECUTE') then
    raise exception 'post: gateway EXECUTE ACL must be authenticated-only';
  end if;
  -- browser/service roles gained NO app-schema USAGE; the internal RPC stays unreachable directly.
  if has_schema_privilege('authenticated', 'app', 'USAGE')
     or has_schema_privilege('anon', 'app', 'USAGE')
     or has_schema_privilege('service_role', 'app', 'USAGE') then
    raise exception 'post: no browser/service role may hold USAGE on schema app';
  end if;
  -- transient ownership grant fully revoked.
  if has_schema_privilege('lawme_bootstrap', 'public', 'CREATE') then
    raise exception 'post: lawme_bootstrap must not retain CREATE on schema public';
  end if;
  -- internal RPC ACL unchanged (still authenticated-only, still owned by lawme_bootstrap).
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'app' and p.proname = 'bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'post: internal RPC owner drifted';
  end if;
end;
$$;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe; the gateway holds no state):
--   begin;
--     drop function if exists public.bootstrap_matter_v1(jsonb);
--   commit;
-- The internal app.bootstrap_matter_v1, historical migrations, and Production are
-- untouched by this migration and by its rollback.
-- ============================================================================
