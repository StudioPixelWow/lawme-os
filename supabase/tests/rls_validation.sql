-- ============================================================================
-- LawME — RLS cross-tenant leakage validation (Epic 1)
-- Run against a LOCAL validation database only (never production).
-- Requires: the POC foundation migration applied + stub/real auth schema.
-- Every block RAISEs on failure; silent completion = PASS.
-- ============================================================================

begin;

-- Fixtures: two orgs, two users, one membership each --------------------------
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

insert into public.organizations (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Firm Aleph', 'firm-aleph'),
  ('10000000-0000-0000-0000-000000000002', 'Firm Bet',   'firm-bet');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'User A'),
  ('00000000-0000-0000-0000-00000000000b', 'User B');

insert into public.organization_memberships (organization_id, profile_id, role, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'partner', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'lawyer',  'active');

insert into public.legal_sources (id, registry_code, name_en, category, trust_tier, priority) values
  ('20000000-0000-0000-0000-000000000001', 'LSR-038', 'Supreme Court decisions', 'A-judicial', 1, 'P0'),
  ('20000000-0000-0000-0000-000000000002', 'FIRM',    'Firm private uploads',    'G-firm-private', 6, 'P0');

-- one GLOBAL public document + one PRIVATE document per org
insert into public.legal_documents (id, organization_id, source_id, document_type, title) values
  ('30000000-0000-0000-0000-000000000001', null,
   '20000000-0000-0000-0000-000000000001', 'judgment', 'Global public judgment'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002', 'legal_opinion', 'Firm Aleph private opinion'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002', 'legal_opinion', 'Firm Bet private opinion');

insert into public.legal_research_sessions (id, organization_id, created_by, title) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', 'Aleph research');

-- ============================================================================
-- Tests run as USER A (member of Firm Aleph only)
-- ============================================================================
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

do $$
declare n int;
begin
  -- T1: sees the global document
  select count(*) into n from public.legal_documents
   where id = '30000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'T1 FAIL: global corpus not readable'; end if;

  -- T2: sees own org's private document
  select count(*) into n from public.legal_documents
   where id = '30000000-0000-0000-0000-00000000000a';
  if n <> 1 then raise exception 'T2 FAIL: own private doc not readable'; end if;

  -- T3: does NOT see the other org's private document  ← core leakage test
  select count(*) into n from public.legal_documents
   where id = '30000000-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'T3 FAIL: CROSS-TENANT LEAKAGE (documents)'; end if;

  -- T4: does NOT see the other org's research session
  select count(*) into n from public.legal_research_sessions;
  if n <> 1 then raise exception 'T4 FAIL: session visibility incorrect (saw %)', n; end if;

  -- T5: cannot see the other organization row itself
  select count(*) into n from public.organizations
   where id = '10000000-0000-0000-0000-000000000002';
  if n <> 0 then raise exception 'T5 FAIL: foreign organization visible'; end if;
end $$;

-- T6: cannot INSERT into the global corpus (organization_id IS NULL)
do $$
begin
  begin
    insert into public.legal_documents (organization_id, source_id, document_type, title)
    values (null, '20000000-0000-0000-0000-000000000001', 'judgment', 'forged global doc');
    raise exception 'T6 FAIL: client wrote into the GLOBAL corpus';
  exception when insufficient_privilege or check_violation then
    null; -- expected: RLS blocks it
  end;
end $$;

-- T7: cannot UPDATE a global document (authority/verification tamper)
do $$
declare n int;
begin
  update public.legal_documents
     set authority_score = 100, verification_status = 'verified_primary'
   where id = '30000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T7 FAIL: client altered a GLOBAL document'; end if;
end $$;

-- T8: cannot INSERT a private doc into ANOTHER org
do $$
begin
  begin
    insert into public.legal_documents (organization_id, source_id, document_type, title)
    values ('10000000-0000-0000-0000-000000000002',
            '20000000-0000-0000-0000-000000000002', 'legal_opinion', 'forged cross-org doc');
    raise exception 'T8 FAIL: cross-org INSERT allowed';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- T9: cannot modify benchmark ground truth
do $$
begin
  begin
    insert into public.benchmark_tasks (task_code, category, difficulty, domain, law_as_of, prompt_he)
    values ('LILB-research-999', 'research', 'basic', 'labor', '2026-07-01', 'forged');
    raise exception 'T9 FAIL: client wrote benchmark ground truth';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- T10: cannot write legal_sources / legal_source_fetches / audit_events
do $$
begin
  begin
    update public.legal_sources set priority = 'P3'
     where registry_code = 'LSR-038';
    if found then raise exception 'T10a FAIL: client altered source registry'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.legal_source_fetches (source_id, url, outcome, retrieval_method)
    values ('20000000-0000-0000-0000-000000000001', 'https://x', 'success', 'api');
    raise exception 'T10b FAIL: client wrote fetch telemetry';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into public.audit_events (event_type) values ('forged');
    raise exception 'T10c FAIL: client wrote audit trail';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;

-- T11: audit immutability even for superuser-path writes
insert into public.audit_events (event_type, payload) values ('rls_validation_run', '{}'::jsonb);
do $$
begin
  begin
    update public.audit_events set event_type = 'tampered'
     where event_type = 'rls_validation_run';
    raise exception 'T11 FAIL: audit event mutated';
  exception when others then
    if sqlerrm not like '%immutable%' then raise; end if;
  end;
end $$;

select 'RLS VALIDATION: ALL TESTS PASSED' as result;

rollback;  -- leave no fixtures behind
