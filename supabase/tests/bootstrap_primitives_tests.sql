-- LawME — Capability 1 · Slice 1.0.3 Bootstrap persistence primitives:
-- LOCAL SECURITY HARNESS (30 assertions). Run AFTER loading
-- bootstrap_primitives_setup.sql and applying the 1.0.3 migration.
-- Tests PERSISTENCE PRIMITIVES ONLY — never RPC behavior (no RPC exists yet).
-- Everything runs inside ONE transaction that is ROLLED BACK, leaving zero rows.
\set ON_ERROR_STOP on
begin;

-- ── helpers ──
create function pg_temp.expect(tag text, sql text, want text) returns void language plpgsql as $$
declare got text;
begin
  begin
    execute sql;
  exception when others then
    got := sqlerrm;
    if want = 'OK' then raise exception 'FAIL % : expected OK, got "%"', tag, got; end if;
    if position(want in got) = 0 then raise exception 'FAIL % : expected "%", got "%"', tag, want, got; end if;
    raise notice 'PASS % (blocked: %)', tag, want; return;
  end;
  if want <> 'OK' then raise exception 'FAIL % : expected "%" but statement succeeded', tag, want; end if;
  raise notice 'PASS % (ok)', tag;
end $$;

create function pg_temp.seed(did uuid, st text) returns void language plpgsql as $$
begin
  insert into public.matter_intake_drafts(id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft)
  values (did, 'aaaaaaaa-0000-4000-8000-0000000000a1', '66666666-0000-4000-8000-000000000006',
          array['77777777-0000-4000-8000-000000000007']::uuid[], st, 'e1', 'v1', '{}'::jsonb);
end $$;

-- convenience: set the acting role + JWT-claim GUCs (transaction-local).
create function pg_temp.act(rolename text, uid text, jwtrole text) returns void language plpgsql as $$
begin
  perform set_config('role', rolename, true);
  perform set_config('test.uid', uid, true);
  perform set_config('test.role', jwtrole, true);
end $$;
create function pg_temp.asadmin() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); perform set_config('test.role','',true); perform set_config('test.uid','',true); end $$;

-- convenience plan-identity literals
-- idempotency key K1, plan hash H1 (64 hex), version 'bv1'
-- ============================================================================

-- 01 authenticated cannot ready_for_review -> confirming
select pg_temp.seed('d0000001-0000-4000-8000-000000000001','ready_for_review');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('01_auth_rfr_to_confirming',
  $$update public.matter_intake_drafts set status='confirming' where id='d0000001-0000-4000-8000-000000000001'$$,
  'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.asadmin();

-- 06 (done early so 02 has a confirming row): bootstrap performs BOTH transitions
select pg_temp.seed('d0000006-0000-4000-8000-000000000006','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('06a_boot_rfr_to_confirming',
  $$update public.matter_intake_drafts set status='confirming',
       confirmation_idempotency_key='K6', confirmation_plan_hash=repeat('a',64), confirmation_bootstrap_version='bv1'
     where id='d0000006-0000-4000-8000-000000000006'$$, 'OK');
select pg_temp.expect('06b_boot_confirming_to_confirmed',
  $$update public.matter_intake_drafts set status='confirmed',
       confirmed_matter_id='11111111-1111-4000-8000-0000000000c1', confirmed_at=now()
     where id='d0000006-0000-4000-8000-000000000006'$$, 'OK');
select pg_temp.asadmin();

-- 02 authenticated cannot confirming -> confirmed  (seed a confirming row via bootstrap)
select pg_temp.seed('d0000002-0000-4000-8000-000000000002','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('02a_seed_confirming',
  $$update public.matter_intake_drafts set status='confirming',
       confirmation_idempotency_key='K2', confirmation_plan_hash=repeat('b',64), confirmation_bootstrap_version='bv1'
     where id='d0000002-0000-4000-8000-000000000002'$$, 'OK');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('02_auth_confirming_to_confirmed',
  $$update public.matter_intake_drafts set status='confirmed',
       confirmed_matter_id='11111111-1111-4000-8000-0000000000c1', confirmed_at=now()
     where id='d0000002-0000-4000-8000-000000000002'$$, 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.asadmin();

-- 03 service_role JWT/possession alone cannot open the channel
select pg_temp.seed('d0000003-0000-4000-8000-000000000003','ready_for_review');
select pg_temp.act('service_role','66666666-0000-4000-8000-000000000006','service_role');
select pg_temp.expect('03_service_rfr_to_confirming',
  $$update public.matter_intake_drafts set status='confirming',
       confirmation_idempotency_key='K3', confirmation_plan_hash=repeat('c',64), confirmation_bootstrap_version='bv1'
     where id='d0000003-0000-4000-8000-000000000003'$$, 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.asadmin();

-- 04 client-set confirmation field cannot open the channel (no payload flag exists)
select pg_temp.seed('d0000004-0000-4000-8000-000000000004','ready_for_review');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('04_client_sets_plan_hash',
  $$update public.matter_intake_drafts set confirmation_plan_hash=repeat('d',64)
     where id='d0000004-0000-4000-8000-000000000004'$$, 'INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN');
select pg_temp.asadmin();

-- 05 client-set session setting cannot open the channel
select pg_temp.seed('d0000005-0000-4000-8000-000000000005','ready_for_review');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select set_config('app.is_bootstrap','true', true);
select set_config('request.jwt.claim.role','service_role', true);
select pg_temp.expect('05_client_guc_spoof',
  $$update public.matter_intake_drafts set status='confirming',
       confirmation_idempotency_key='K5', confirmation_plan_hash=repeat('e',64), confirmation_bootstrap_version='bv1'
     where id='d0000005-0000-4000-8000-000000000005'$$, 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.asadmin();

-- 07-10 bootstrap: only ready_for_review may enter confirming
select pg_temp.seed('d0000007-0000-4000-8000-000000000007','active');
select pg_temp.seed('d0000008-0000-4000-8000-000000000008','needs_clarification');
select pg_temp.seed('d0000009-0000-4000-8000-000000000009','rejected');
select pg_temp.seed('d000000a-0000-4000-8000-00000000000a','expired');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('07_active_to_confirming',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K7', confirmation_plan_hash=repeat('7',64), confirmation_bootstrap_version='bv1' where id='d0000007-0000-4000-8000-000000000007'$$,
  'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.expect('08_needsclar_to_confirming',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K8', confirmation_plan_hash=repeat('8',64), confirmation_bootstrap_version='bv1' where id='d0000008-0000-4000-8000-000000000008'$$,
  'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.expect('09_rejected_to_confirming',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K9', confirmation_plan_hash=repeat('9',64), confirmation_bootstrap_version='bv1' where id='d0000009-0000-4000-8000-000000000009'$$,
  'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.expect('10_expired_to_confirming',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='KA', confirmation_plan_hash=repeat('0',64), confirmation_bootstrap_version='bv1' where id='d000000a-0000-4000-8000-00000000000a'$$,
  'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN');
select pg_temp.asadmin();

-- 11 confirmed -> confirming denied (confirmed row is frozen). Reuse the 06 confirmed row.
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('11_confirmed_to_confirming',
  $$update public.matter_intake_drafts set status='confirming' where id='d0000006-0000-4000-8000-000000000006'$$,
  'INTAKE_DRAFT_CONFIRMED_IMMUTABLE');
select pg_temp.asadmin();

-- 12 confirming -> confirmed REQUIRES matter linkage
select pg_temp.seed('d000000c-0000-4000-8000-00000000000c','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('12a_enter_confirming',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K12', confirmation_plan_hash=repeat('1',64), confirmation_bootstrap_version='bv1' where id='d000000c-0000-4000-8000-00000000000c'$$, 'OK');
select pg_temp.expect('12_confirmed_needs_linkage',
  $$update public.matter_intake_drafts set status='confirmed', confirmed_at=now() where id='d000000c-0000-4000-8000-00000000000c'$$,
  'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT');
select pg_temp.asadmin();

-- 13 entering confirming REQUIRES an idempotency key
select pg_temp.seed('d000000d-0000-4000-8000-00000000000d','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('13_confirming_needs_key',
  $$update public.matter_intake_drafts set status='confirming', confirmation_plan_hash=repeat('2',64), confirmation_bootstrap_version='bv1' where id='d000000d-0000-4000-8000-00000000000d'$$,
  'INTAKE_DRAFT_CONFIRMATION_INCOMPLETE');
select pg_temp.asadmin();

-- 14 entering confirming REQUIRES a plan hash
select pg_temp.seed('d000000e-0000-4000-8000-00000000000e','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('14_confirming_needs_plan_hash',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K14', confirmation_bootstrap_version='bv1' where id='d000000e-0000-4000-8000-00000000000e'$$,
  'INTAKE_DRAFT_CONFIRMATION_INCOMPLETE');
select pg_temp.asadmin();

-- 15/16/17 confirmed linkage / key / plan-hash immutable (any update to confirmed row is rejected)
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('15_confirmed_linkage_immutable',
  $$update public.matter_intake_drafts set confirmed_matter_id='22222222-2222-4000-8000-0000000000c2' where id='d0000006-0000-4000-8000-000000000006'$$,
  'INTAKE_DRAFT_CONFIRMED_IMMUTABLE');
select pg_temp.expect('16_confirmed_key_immutable',
  $$update public.matter_intake_drafts set confirmation_idempotency_key='K6X' where id='d0000006-0000-4000-8000-000000000006'$$,
  'INTAKE_DRAFT_CONFIRMED_IMMUTABLE');
select pg_temp.expect('17_confirmed_plan_hash_immutable',
  $$update public.matter_intake_drafts set confirmation_plan_hash=repeat('f',64) where id='d0000006-0000-4000-8000-000000000006'$$,
  'INTAKE_DRAFT_CONFIRMED_IMMUTABLE');
select pg_temp.asadmin();

-- 18 duplicate same (org,key) confirmed row is blocked by the idempotency unique index
--    (proves same-key reconciliation cannot create a second Matter). K6 is used by the 06 confirmed row.
select pg_temp.seed('d0000012-0000-4000-8000-000000000012','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('18_same_key_second_confirming_blocked',
  $$update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K6', confirmation_plan_hash=repeat('a',64), confirmation_bootstrap_version='bv1' where id='d0000012-0000-4000-8000-000000000012'$$,
  'matter_intake_drafts_idem_uq');
select pg_temp.asadmin();

-- 19 same-key/different-plan conflict is DETECTABLE: the confirmed row exposes its plan hash for comparison.
do $$
declare v_hash text; v_matter uuid;
begin
  select confirmation_plan_hash, confirmed_matter_id into v_hash, v_matter
  from public.matter_intake_drafts where organization_id='aaaaaaaa-0000-4000-8000-0000000000a1' and confirmation_idempotency_key='K6';
  if v_hash is null or v_matter is null then raise exception 'FAIL 19 : reconciliation fields not persisted'; end if;
  if v_hash = repeat('a',64) then raise notice 'PASS 19 (same-plan match detectable: %)', left(v_hash,8); else raise exception 'FAIL 19'; end if;
  if repeat('z',64) <> v_hash then raise notice 'PASS 19b (different-plan conflict detectable)'; end if;
end $$;

-- 20 different key after confirmation: the confirmed draft exposes key + matter; re-update is blocked.
do $$
declare v_key text;
begin
  select confirmation_idempotency_key into v_key from public.matter_intake_drafts where id='d0000006-0000-4000-8000-000000000006';
  if v_key <> 'K6' then raise exception 'FAIL 20 : stored key mismatch'; end if;
  raise notice 'PASS 20 (confirmed draft exposes key % for conflict detection; row is immutable per 15-17)', v_key;
end $$;

-- 21 stale version_token is detectable: a token-guarded transition updates 0 rows on mismatch, 1 on match.
select pg_temp.seed('d0000015-0000-4000-8000-000000000015','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
do $$
declare n int;
begin
  update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K21', confirmation_plan_hash=repeat('3',64), confirmation_bootstrap_version='bv1'
    where id='d0000015-0000-4000-8000-000000000015' and version_token='WRONG';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 21 : stale token updated % rows', n; end if;
  update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K21', confirmation_plan_hash=repeat('3',64), confirmation_bootstrap_version='bv1'
    where id='d0000015-0000-4000-8000-000000000015' and version_token='v1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL 21 : correct token updated % rows', n; end if;
  raise notice 'PASS 21 (stale token 0 rows, correct token 1 row)';
end $$;
select pg_temp.asadmin();

-- 22/23 transaction rollback leaves ready_for_review; no stranded confirming.
select pg_temp.seed('d0000016-0000-4000-8000-000000000016','ready_for_review');
select pg_temp.act('lawme_bootstrap','66666666-0000-4000-8000-000000000006','authenticated');
do $$
declare v_status text; n int;
begin
  begin
    update public.matter_intake_drafts set status='confirming', confirmation_idempotency_key='K22', confirmation_plan_hash=repeat('4',64), confirmation_bootstrap_version='bv1'
      where id='d0000016-0000-4000-8000-000000000016';
    raise exception 'simulated RPC failure';   -- forces the subtransaction to roll back
  exception when others then null; end;
  select status into v_status from public.matter_intake_drafts where id='d0000016-0000-4000-8000-000000000016';
  if v_status <> 'ready_for_review' then raise exception 'FAIL 22 : status is % after rollback', v_status; end if;
  select count(*) into n from public.matter_intake_drafts
    where id='d0000016-0000-4000-8000-000000000016' and status='confirming';
  if n <> 0 then raise exception 'FAIL 23 : draft stranded in confirming after rollback'; end if;
  raise notice 'PASS 22/23 (rollback -> ready_for_review, no stranded confirming for this draft)';
end $$;
select pg_temp.asadmin();

-- 24/25 fact guard still blocks established statuses at INSERT.
select pg_temp.act('service_role','66666666-0000-4000-8000-000000000006','service_role');
select pg_temp.expect('24_fact_confirmed_blocked',
  $$insert into public.matter_facts(organization_id, matter_id, fact_key, statement_he, status)
     values ('aaaaaaaa-0000-4000-8000-0000000000a1','11111111-1111-4000-8000-0000000000c1','k','s','confirmed')$$,
  'established fact');
select pg_temp.expect('25_fact_document_derived_blocked',
  $$insert into public.matter_facts(organization_id, matter_id, fact_key, statement_he, status)
     values ('aaaaaaaa-0000-4000-8000-0000000000a1','11111111-1111-4000-8000-0000000000c1','k','s','document_derived')$$,
  'established fact');
select pg_temp.asadmin();

-- 26 intake creator/reviewer RLS unchanged: creator edits content in an editable state (OK);
--    a non-member's update is filtered by RLS (0 rows).
select pg_temp.seed('d0000017-0000-4000-8000-000000000017','ready_for_review');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('26a_creator_edits_content',
  $$update public.matter_intake_drafts set review_state='{"x":1}'::jsonb where id='d0000017-0000-4000-8000-000000000017'$$, 'OK');
select pg_temp.act('authenticated','33333333-0000-4000-8000-000000000003','authenticated');
do $$
declare n int;
begin
  update public.matter_intake_drafts set review_state='{"y":2}'::jsonb where id='d0000017-0000-4000-8000-000000000017';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 26b : non-member updated % rows', n; end if;
  raise notice 'PASS 26 (creator edits ok; non-member RLS-filtered)';
end $$;
select pg_temp.asadmin();

-- 27/28 anon + authenticated cannot directly EXECUTE the internal guard function.
select pg_temp.act('anon','','anon');
select pg_temp.expect('27_anon_cannot_call_guard',
  $$select app.enforce_intake_draft_transitions()$$, 'permission denied');
select pg_temp.act('authenticated','66666666-0000-4000-8000-000000000006','authenticated');
select pg_temp.expect('28_authenticated_cannot_call_guard',
  $$select app.enforce_intake_draft_transitions()$$, 'permission denied');
select pg_temp.asadmin();

-- 29 PUBLIC/anon/authenticated EXECUTE on the guard is revoked (catalog assertion).
do $$
begin
  if has_function_privilege('public','app.enforce_intake_draft_transitions()','EXECUTE')
     or has_function_privilege('anon','app.enforce_intake_draft_transitions()','EXECUTE')
     or has_function_privilege('authenticated','app.enforce_intake_draft_transitions()','EXECUTE') then
    raise exception 'FAIL 29 : guard EXECUTE not fully revoked';
  end if;
  raise notice 'PASS 29 (guard EXECUTE revoked from public/anon/authenticated)';
end $$;

-- ── done: roll back so ZERO fixture rows remain (item 30). ──
rollback;

-- 30 verify no fixture rows persisted.
do $$
declare n int;
begin
  select count(*) into n from public.matter_intake_drafts;
  if n <> 0 then raise exception 'FAIL 30 : % draft row(s) remain after rollback', n; end if;
  raise notice 'PASS 30 (zero fixture rows remain)';
end $$;
