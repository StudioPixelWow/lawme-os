-- LawME — Capability 1 · Slice 1.0.4B actor-resolution compatibility tests.
-- Run AFTER: bootstrap_rpc_setup.sql + 1.0.3 + 1.0.4 + (simulate Dev limitation:
--   revoke usage on schema auth from lawme_bootstrap) + 1.0.4B.
-- Proves the wrapper is required and correctly scoped. Local disposable PG only.
\set ON_ERROR_STOP on

do $$
declare v text; n uuid;
begin
  -- 1. lawme_bootstrap has NO USAGE on schema auth (Dev-equivalent).
  if has_schema_privilege('lawme_bootstrap','auth','USAGE') then
    raise exception 'FAIL A1 : lawme_bootstrap unexpectedly has auth USAGE';
  end if;

  -- 2. Direct auth.uid() from a lawme_bootstrap context is DENIED (wrapper required).
  set local role lawme_bootstrap;
  begin
    perform auth.uid();
    v := 'NO_ERROR';
  exception when others then v := sqlerrm;
  end;
  reset role;
  if v not like '%permission denied for schema auth%' then
    raise exception 'FAIL A2 : direct auth.uid() should be denied, got "%"', v;
  end if;

  -- 3. app.actor_uid() from lawme_bootstrap SUCCEEDS (bridges the gap).
  perform set_config('test.uid','00000001-0000-4000-8000-000000000001', true);
  set local role lawme_bootstrap;
  begin
    select app.actor_uid() into n;
    v := 'OK';
  exception when others then v := sqlerrm;
  end;
  reset role;
  if v <> 'OK' then raise exception 'FAIL A3 : app.actor_uid() from lawme_bootstrap failed: %', v; end if;
  if n <> '00000001-0000-4000-8000-000000000001'::uuid then raise exception 'FAIL A3 : actor_uid returned %', n; end if;

  -- 4. app.actor_uid() returns NULL without an authenticated subject.
  perform set_config('test.uid','', true);
  select app.actor_uid() into n;
  if n is not null then raise exception 'FAIL A4 : actor_uid should be null without a subject'; end if;

  -- 5. ACLs: only lawme_bootstrap may execute app.actor_uid().
  if not has_function_privilege('lawme_bootstrap','app.actor_uid()','EXECUTE') then raise exception 'FAIL A5 : lb missing execute'; end if;
  if has_function_privilege('authenticated','app.actor_uid()','EXECUTE')
     or has_function_privilege('anon','app.actor_uid()','EXECUTE')
     or has_function_privilege('service_role','app.actor_uid()','EXECUTE')
     or has_function_privilege('public','app.actor_uid()','EXECUTE') then
    raise exception 'FAIL A5 : app.actor_uid executable by a browser/service/public role';
  end if;

  -- 6. owners: actor_uid=postgres, RPC=lawme_bootstrap; RPC uses app.actor_uid (no raw auth.uid).
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace where nsp.nspname='app' and p.proname='actor_uid')) <> 'postgres' then
    raise exception 'FAIL A6 : app.actor_uid owner not postgres'; end if;
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace where nsp.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'FAIL A6 : RPC owner not lawme_bootstrap'; end if;
  if not exists (select 1 from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
                 where nsp.nspname='app' and p.proname='bootstrap_matter_v1' and pg_get_functiondef(p.oid) like '%app.actor_uid()%') then
    raise exception 'FAIL A6 : RPC does not resolve actor via app.actor_uid()'; end if;
  if exists (select 1 from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
             where nsp.nspname='app' and p.proname='bootstrap_matter_v1' and pg_get_functiondef(p.oid) like '%auth.uid%') then
    raise exception 'FAIL A6 : RPC still references auth.uid directly (must go through app.actor_uid)'; end if;

  raise notice 'PASS A1-A6 actor-resolution (wrapper required, scoped, owners/ACL correct, RPC bridged)';
end $$;

-- ============================================================================
-- Slice 1.0.4B · Option B (guard lazy-evaluation) assertions A7–A11.
-- Proves the guard no longer eagerly touches schema auth, that the sanctioned
-- lawme_bootstrap channel is auth-independent, and that no second projection was
-- introduced. Run in the SAME Dev-compatible model (auth USAGE revoked from lb).
-- ============================================================================
do $$
declare v_def text; v_code text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
    where nsp.nspname='app' and p.proname='enforce_intake_draft_transitions';
  -- strip SQL line comments so prose mentions of auth.role() cannot skew the checks.
  v_code := regexp_replace(v_def, '--[^\n]*', '', 'g');

  -- A7. NO eager auth.role(): no variable INITIALIZER may call auth.role() (the
  --     `v_is_client := (auth.role() ...)` signature). Legitimate lazy usage is an
  --     `if (auth.role() = ...)` condition, which has no `:=`.
  if v_code ~ ':=\s*\(?\s*auth\.role' then
    raise exception 'FAIL A7 : guard initializer calls auth.role() (eager) — Option B violated';
  end if;

  -- A8. Client-role semantics RETAINED: auth.role() is still consulted (client branches).
  if position('auth.role' in v_code) = 0 then
    raise exception 'FAIL A8 : guard no longer references auth.role() at all — client path would be unenforced';
  end if;
  -- A8b. Every auth.role() call sits on the non-bootstrap side: the code must guard
  --      it with `not v_is_bootstrap` (UPDATE path) or the INSERT branch. Assert the
  --      lazy structural marker is present.
  if position('not v_is_bootstrap' in v_code) = 0 then
    raise exception 'FAIL A8b : lazy client-branch guard (not v_is_bootstrap) missing';
  end if;

  -- A9. Guard still SECURITY INVOKER, postgres-owned, pinned search_path (posture unchanged).
  if exists (select 1 from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
             where nsp.nspname='app' and p.proname='enforce_intake_draft_transitions'
               and (p.prosecdef <> false or pg_get_userbyid(p.proowner) <> 'postgres')) then
    raise exception 'FAIL A9 : guard posture drifted (must be postgres-owned SECURITY INVOKER)';
  end if;

  -- A11. Option B introduced NO second projection: app.actor_role() must not exist,
  --      and app.actor_uid() (the single approved projection) must be present.
  if exists (select 1 from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
             where nsp.nspname='app' and p.proname='actor_role') then
    raise exception 'FAIL A11 : app.actor_role() must NOT exist (Option B forbids a second projection)';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
                 where nsp.nspname='app' and p.proname='actor_uid') then
    raise exception 'FAIL A11 : app.actor_uid() (the single approved projection) must exist';
  end if;

  raise notice 'PASS A7-A11 (no eager auth.role, client semantics retained, posture intact, no second projection)';
end $$;

-- A10 (behavioral). Under the revoked model, the sanctioned channel ready_for_review
-- → confirming UPDATE performed AS lawme_bootstrap must SUCCEED — this is the exact
-- operation (guard line initializing v_is_client) that failed before Option B.
-- Seeded and rolled back; leaves zero residue.
begin;
  insert into public.matter_intake_drafts
    (id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft)
  values ('daaaaaaa-0000-4000-8000-00000000aaaa','aaaaaaaa-0000-4000-8000-0000000000a1',
          '00000002-0000-4000-8000-000000000002', array['00000003-0000-4000-8000-000000000003']::uuid[],
          'ready_for_review','intake-1','v1','{}'::jsonb);

  do $$
  declare v text;
  begin
    set local role lawme_bootstrap;
    begin
      update public.matter_intake_drafts
        set status='confirming',
            confirmation_idempotency_key='K-optionb',
            confirmation_plan_hash=repeat('a',64),
            confirmation_bootstrap_version='matter-bootstrap-v1'
        where id='daaaaaaa-0000-4000-8000-00000000aaaa';
      v := 'OK';
    exception when others then v := sqlerrm;
    end;
    reset role;
    if v <> 'OK' then
      raise exception 'FAIL A10 : sanctioned channel ready->confirming failed under revoked model: %', v;
    end if;
    if (select status from public.matter_intake_drafts where id='daaaaaaa-0000-4000-8000-00000000aaaa') <> 'confirming' then
      raise exception 'FAIL A10 : transition did not take effect';
    end if;
    raise notice 'PASS A10 (bootstrap channel ready->confirming is auth-independent under the revoked model)';
  end $$;
rollback;
