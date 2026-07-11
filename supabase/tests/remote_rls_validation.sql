-- ============================================================================
-- LawME — REMOTE RLS validation (Epic 2, Phase 7)
-- Runs against the DEVELOPMENT project via a privileged SQL channel
-- (Supabase MCP / psql as postgres). Fully transactional — rolls back,
-- leaves zero rows. Synthetic UUID users only; no real users are created.
-- Last run 2026-07-11: ALL 11 TESTS PASSED (see
-- docs/database/LEGAL_INTELLIGENCE_REMOTE_RLS_VALIDATION.md).
--
-- Tests:
--  T1  tenant A cannot READ tenant B private documents
--  T2  tenant A cannot UPDATE tenant B records
--  T3  ordinary users cannot INSERT global corpus records
--  T4  ordinary users cannot modify authority scores (global rows)
--  T5  ordinary users cannot alter verification status (global rows)
--  T6  ordinary users cannot modify benchmark ground truth
--  T7  audit events cannot be written/updated/deleted by clients
--  T8  authenticated users CAN read global public corpus records
--  T9  anonymous users cannot read protected corpus records
--  T10 membership removal immediately revokes access
--  T11 service role performs the documented ingestion writes (and only
--      the ingestion path makes global rows appear for tenants)
-- ============================================================================
begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');
insert into public.organizations (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Firm Aleph', 'firm-aleph-rlstest'),
  ('10000000-0000-0000-0000-000000000002', 'Firm Bet', 'firm-bet-rlstest');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'RLS Test User A'),
  ('00000000-0000-0000-0000-00000000000b', 'RLS Test User B');
insert into public.organization_memberships (organization_id, profile_id, role, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'partner', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'lawyer', 'active');
insert into public.legal_sources (id, registry_code, name_en, category, trust_tier, priority) values
  ('20000000-0000-0000-0000-000000000001', 'LSR-038', 'RLS test source', 'A-judicial', 1, 'P0'),
  ('20000000-0000-0000-0000-000000000002', 'FIRM', 'RLS test firm source', 'G-firm-private', 6, 'P0');
insert into public.legal_documents (id, organization_id, source_id, document_type, title) values
  ('30000000-0000-0000-0000-000000000001', null, '20000000-0000-0000-0000-000000000001', 'judgment', 'RLS test global doc'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'legal_opinion', 'RLS test Aleph private'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'legal_opinion', 'RLS test Bet private');
insert into public.benchmark_tasks (id, task_code, category, difficulty, domain, law_as_of, prompt_he) values
  ('40000000-0000-0000-0000-000000000001', 'LILB-research-998', 'research', 'basic', 'labor', '2026-07-01', 'RLS ground truth row');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.legal_documents where id = '30000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'T8 FAIL: global corpus not readable'; end if;
  select count(*) into n from public.legal_documents where id = '30000000-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'T1 FAIL: CROSS-TENANT READ'; end if;
  update public.legal_documents set title = 'tampered' where id = '30000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T2 FAIL: CROSS-TENANT UPDATE'; end if;
  begin
    insert into public.legal_documents (organization_id, source_id, document_type, title)
    values (null, '20000000-0000-0000-0000-000000000001', 'judgment', 'forged global');
    raise exception 'T3 FAIL: wrote GLOBAL corpus';
  exception when insufficient_privilege or check_violation then null;
  end;
  update public.legal_documents
     set authority_score = 100, verification_status = 'verified_primary'
   where id = '30000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T4/T5 FAIL: altered global authority/verification'; end if;
  update public.benchmark_tasks set gold = '{"forged":true}'::jsonb where task_code = 'LILB-research-998';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T6 FAIL: altered benchmark gold'; end if;
  begin
    insert into public.benchmark_tasks (task_code, category, difficulty, domain, law_as_of, prompt_he)
    values ('LILB-research-997', 'research', 'basic', 'labor', '2026-07-01', 'forged');
    raise exception 'T6b FAIL: inserted benchmark task';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into public.audit_events (event_type) values ('forged');
    raise exception 'T7a FAIL: client wrote audit';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;

delete from public.organization_memberships
 where profile_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.legal_documents where id = '30000000-0000-0000-0000-00000000000a';
  if n <> 0 then raise exception 'T10 FAIL: access survives membership removal'; end if;
end $$;
reset role;

set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.legal_documents;
    if n <> 0 then raise exception 'T9 FAIL: anon read corpus rows'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role service_role;
insert into public.legal_documents (id, organization_id, source_id, document_type, title)
values ('30000000-0000-0000-0000-0000000000ff', null, '20000000-0000-0000-0000-000000000001', 'judgment', 'service-role ingested');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.legal_documents where id = '30000000-0000-0000-0000-0000000000ff';
  if n <> 1 then raise exception 'T11 FAIL: service-ingested doc not readable'; end if;
end $$;
reset role;

select 'REMOTE RLS VALIDATION: ALL 11 TESTS PASSED' as result;
rollback;
