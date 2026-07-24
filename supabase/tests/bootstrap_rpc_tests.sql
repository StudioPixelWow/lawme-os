-- LawME — Capability 1 · Slice 1.0.4 Atomic Bootstrap RPC: TRANSACTION HARNESS.
-- Run AFTER bootstrap_rpc_setup.sql + the 1.0.3 + 1.0.4 migrations.
-- Runs inside ONE transaction, ROLLED BACK at the end (zero residue).
-- Concurrency is proven separately (parallel connections) in the runner.
\set ON_ERROR_STOP on
begin;

create function pg_temp.seed_ready(did uuid, creator uuid) returns void language plpgsql as $$
begin
  insert into public.matter_intake_drafts(id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft)
  values (did, 'aaaaaaaa-0000-4000-8000-0000000000a1', creator,
          array['00000003-0000-4000-8000-000000000003']::uuid[], 'ready_for_review', 'intake-1', 'v1', '{}'::jsonb);
end $$;

create function pg_temp.mk_payload(p_draft uuid, p_ver text, p_key text, p_hash text) returns jsonb language sql as $$
  select jsonb_build_object(
    'rpcVersion','bootstrap-rpc-v1','bootstrapVersion','matter-bootstrap-v1','correlationId','11111111-1111-4000-8000-000000000abc',
    'draft', jsonb_build_object('id', p_draft::text, 'versionToken', p_ver, 'schemaVersion','matter-intake-contract-1.0.0'),
    'idempotency', jsonb_build_object('key', p_key, 'planHash', p_hash),
    'aggregate', jsonb_build_object(
      'aggregateVersion', 1, 'sourceInputHash', repeat('e',64),
      'metadata', jsonb_build_object('plannerVersion','matter-aggregate-planner-v1','validationVersion','bootstrap-validation-v1','planHash',p_hash),
      'matter', jsonb_build_object('titleHe','רונית לוי','procedureType','pregnancy_dismissal','topicHe','pregnancy_dismissal','legalDomain','labor','confidentiality','client_confidential','aiPolicy','allowed_with_review','forumHe','בית הדין','statusIntent','open'),
      'members', jsonb_build_array(jsonb_build_object('memberKey','member_x','slot','owner','matterRole',null,'canReview',true,'canApprove',true,'bindProfileTo','confirming_actor')),
      'contacts', jsonb_build_array(jsonb_build_object('contactKey','contact_a','classification','create_new','contactId',null,'kind','person','nameHe','רונית לוי','sourceItemIds',jsonb_build_array('c1'))),
      'participants', jsonb_build_array(jsonb_build_object('participantKey','participant_a','role','client','displayNameHe','רונית לוי','contactKey','contact_a','sourceItemId','c1','provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r1','span',null))),
      'facts', jsonb_build_array(jsonb_build_object('factPlanKey','fact_a','factKey','employment_duration','statementHe','עבדה שלוש שנים','status','client_alleged','sourceItemId','f1','provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r2','span',null))),
      'deadlines', jsonb_build_array(jsonb_build_object('deadlineKey','deadline_a','labelHe','הגשת כתב תביעה','dueAt','2026-08-01T00:00:00+03:00','source','statute','confidence','known','timezone','Asia/Jerusalem','strict',true,'basisHe','סעיף','sourceItemId','d1')),
      'evidence', jsonb_build_array(jsonb_build_object('evidenceKey','evidence_a','labelHe','תלוש שכר','mandatory',true,'status','required','sourceItemId','e1')),
      'audit', jsonb_build_object('auditKey','audit_a','sourceDraftId',p_draft::text)));
$$;

create function pg_temp.try(p jsonb) returns text language plpgsql as $$
declare r jsonb; begin
  begin r := app.bootstrap_matter_v1(p); return coalesce(r->>'code','NO_CODE');
  exception when others then return sqlerrm; end;
end $$;
grant execute on function pg_temp.try(jsonb) to authenticated, anon;
grant execute on function pg_temp.mk_payload(uuid,text,text,text) to authenticated, anon;

create function pg_temp.expect(tag text, got text, want text) returns void language plpgsql as $$
begin if got <> want then raise exception 'FAIL % : expected % got %', tag, want, got; end if; raise notice 'PASS % (%)', tag, want; end $$;

-- acting-role helpers
create function pg_temp.act(uid text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('test.uid',uid,true); perform set_config('test.role','authenticated',true); end $$;
create function pg_temp.asadmin() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); perform set_config('test.uid','',true); perform set_config('test.role','',true); end $$;

-- captured planHash constants
-- H1 = a*64 ; H2 = b*64

-- ============================================================================
-- T1 — happy path: owner confirms → BOOTSTRAP_CREATED + full aggregate + audit.
select pg_temp.asadmin();
select pg_temp.seed_ready('d1000001-0000-4000-8000-000000000001','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
select pg_temp.expect('T1_created',
  pg_temp.try(pg_temp.mk_payload('d1000001-0000-4000-8000-000000000001','v1','K1',repeat('a',64))), 'BOOTSTRAP_CREATED');
select pg_temp.asadmin();
do $$
declare v_mid uuid; n int;
begin
  select confirmed_matter_id into v_mid from public.matter_intake_drafts where id='d1000001-0000-4000-8000-000000000001';
  if v_mid is null then raise exception 'FAIL T1 : draft not linked'; end if;
  perform 1 from public.matter_intake_drafts where id='d1000001-0000-4000-8000-000000000001' and status='confirmed' and confirmed_at is not null and confirmation_plan_hash=repeat('a',64);
  if not found then raise exception 'FAIL T1 : draft not confirmed/pinned'; end if;
  select count(*) into n from public.matters where id=v_mid and assigned_owner_id='00000001-0000-4000-8000-000000000001' and current_stage_id='intake' and status='open'; if n<>1 then raise exception 'FAIL T1 matter'; end if;
  select count(*) into n from public.matter_members where matter_id=v_mid and profile_id='00000001-0000-4000-8000-000000000001' and matter_role='partner' and can_approve; if n<>1 then raise exception 'FAIL T1 owner member'; end if;
  select count(*) into n from public.matter_participants where matter_id=v_mid and role='client'; if n<>1 then raise exception 'FAIL T1 participant'; end if;
  select count(*) into n from public.matter_facts where matter_id=v_mid and status='client_alleged'; if n<>1 then raise exception 'FAIL T1 fact'; end if;
  select count(*) into n from public.matter_deadlines where matter_id=v_mid and confidence='known'; if n<>1 then raise exception 'FAIL T1 deadline'; end if;
  select count(*) into n from public.matter_evidence where matter_id=v_mid and evidence_type='document' and status='required'; if n<>1 then raise exception 'FAIL T1 evidence'; end if;
  select count(*) into n from public.audit_events where object_type='matter' and object_id=v_mid and event_type='matter.bootstrapped'; if n<>1 then raise exception 'FAIL T1 audit'; end if;
  raise notice 'PASS T1_aggregate (matter+owner+participant+fact+deadline+evidence+audit)';
end $$;

-- T11 — audit carries counts + hash, NOT confidential text.
do $$
declare p jsonb;
begin
  select payload into p from public.audit_events where object_type='matter' order by occurred_at desc limit 1;
  if (p->'counts'->>'facts')::int <> 1 or (p->>'planHash') <> repeat('a',64) then raise exception 'FAIL T11 metadata'; end if;
  if p::text like '%עבדה שלוש שנים%' or p::text like '%רונית%' then raise exception 'FAIL T11 : confidential text in audit'; end if;
  raise notice 'PASS T11_audit_safe';
end $$;

-- T2 — idempotent retry (same payload) → ALREADY_COMMITTED, no 2nd matter.
select pg_temp.act('00000001-0000-4000-8000-000000000001');
select pg_temp.expect('T2_already',
  pg_temp.try(pg_temp.mk_payload('d1000001-0000-4000-8000-000000000001','v1','K1',repeat('a',64))), 'BOOTSTRAP_ALREADY_COMMITTED');
select pg_temp.asadmin();
do $$ declare n int; begin select count(*) into n from public.matters; if n<>1 then raise exception 'FAIL T2 : % matters', n; end if; raise notice 'PASS T2_no_second_matter'; end $$;

-- T3 — same key, different plan on a committed draft → CONFLICT.
select pg_temp.act('00000001-0000-4000-8000-000000000001');
select pg_temp.expect('T3_conflict',
  pg_temp.try(pg_temp.mk_payload('d1000001-0000-4000-8000-000000000001','v1','K1',repeat('b',64))), 'BOOTSTRAP_IDEMPOTENCY_CONFLICT');
select pg_temp.asadmin();

-- T4 — stale version token → STALE, no matter.
select pg_temp.seed_ready('d1000004-0000-4000-8000-000000000004','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
select pg_temp.expect('T4_stale',
  pg_temp.try(pg_temp.mk_payload('d1000004-0000-4000-8000-000000000004','WRONG','K4',repeat('c',64))), 'BOOTSTRAP_STALE_DRAFT');
select pg_temp.asadmin();
do $$ begin perform 1 from public.matter_intake_drafts where id='d1000004-0000-4000-8000-000000000004' and status='ready_for_review'; if not found then raise exception 'FAIL T4 state'; end if; raise notice 'PASS T4_stale_no_change'; end $$;

-- T5 — same-org non-authorized (lawyer creator) → NOT_AVAILABLE.
select pg_temp.seed_ready('d1000005-0000-4000-8000-000000000005','00000002-0000-4000-8000-000000000002');
select pg_temp.act('00000002-0000-4000-8000-000000000002');
select pg_temp.expect('T5_unauthorized',
  pg_temp.try(pg_temp.mk_payload('d1000005-0000-4000-8000-000000000005','v1','K5',repeat('d',64))), 'BOOTSTRAP_NOT_AVAILABLE');
select pg_temp.asadmin();

-- T6 — cross-tenant linked contact → BOOTSTRAP_CROSS_TENANT, rollback (draft ready).
select pg_temp.seed_ready('d1000006-0000-4000-8000-000000000006','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
do $$
declare p jsonb; got text;
begin
  p := pg_temp.mk_payload('d1000006-0000-4000-8000-000000000006','v1','K6',repeat('6',64));
  p := jsonb_set(p, '{aggregate,contacts}', jsonb_build_array(jsonb_build_object(
        'contactKey','contact_a','classification','link_existing','contactId','c0000002-0000-4000-8000-0000000000b2','kind','person','nameHe','זר','sourceItemIds',jsonb_build_array('c1'))));
  got := pg_temp.try(p);
  if got <> 'BOOTSTRAP_CROSS_TENANT' then raise exception 'FAIL T6 : got %', got; end if;
  raise notice 'PASS T6_cross_tenant (%)', got;
end $$;
select pg_temp.asadmin();
do $$ declare n int; begin
  perform 1 from public.matter_intake_drafts where id='d1000006-0000-4000-8000-000000000006' and status='ready_for_review'; if not found then raise exception 'FAIL T6 : draft not rolled back'; end if;
  select count(*) into n from public.matters; if n<>1 then raise exception 'FAIL T6 : % matters (leak)', n; end if;
  raise notice 'PASS T6_rollback';
end $$;

-- T7 — malformed / version.
select pg_temp.seed_ready('d1000007-0000-4000-8000-000000000007','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
do $$
declare p jsonb; got text;
begin
  p := pg_temp.mk_payload('d1000007-0000-4000-8000-000000000007','v1','K7',repeat('7',64));
  got := pg_temp.try(jsonb_set(p,'{rpcVersion}',to_jsonb('bad'::text)));
  if got not like '%BOOTSTRAP_VERSION_UNSUPPORTED%' then raise exception 'FAIL T7a : %', got; end if;
  got := pg_temp.try(jsonb_set(p,'{idempotency,planHash}',to_jsonb('nothex'::text)));
  if got not like '%BOOTSTRAP_MALFORMED_PAYLOAD%' then raise exception 'FAIL T7b : %', got; end if;
  raise notice 'PASS T7_malformed_version';
end $$;
select pg_temp.asadmin();

-- T8/T9 — invalid fact state → INVALID_FACT_STATE; rollback; no stranded confirming.
select pg_temp.seed_ready('d1000008-0000-4000-8000-000000000008','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
do $$
declare p jsonb; got text;
begin
  p := pg_temp.mk_payload('d1000008-0000-4000-8000-000000000008','v1','K8',repeat('8',64));
  p := jsonb_set(p,'{aggregate,facts,0,status}', to_jsonb('confirmed'::text));
  got := pg_temp.try(p);
  if got not like '%BOOTSTRAP_INVALID_FACT_STATE%' then raise exception 'FAIL T8 : %', got; end if;
  raise notice 'PASS T8_invalid_fact (%)', got;
end $$;
select pg_temp.asadmin();
do $$ declare n int; begin
  perform 1 from public.matter_intake_drafts where id='d1000008-0000-4000-8000-000000000008' and status='ready_for_review'; if not found then raise exception 'FAIL T9 : not rolled back to ready'; end if;
  select count(*) into n from public.matter_intake_drafts where status='confirming'; if n<>0 then raise exception 'FAIL T9 : % stranded confirming', n; end if;
  raise notice 'PASS T9_rollback_no_stranded';
end $$;

-- T10 — unauthenticated (no auth.uid()).
select pg_temp.seed_ready('d1000010-0000-4000-8000-000000000010','00000001-0000-4000-8000-000000000001');
do $$ declare got text; begin
  perform set_config('role','authenticated',true); perform set_config('test.uid','',true); perform set_config('test.role','authenticated',true);
  got := pg_temp.try(pg_temp.mk_payload('d1000010-0000-4000-8000-000000000010','v1','K10',repeat('9',64)));
  if got not like '%BOOTSTRAP_UNAUTHENTICATED%' then raise exception 'FAIL T10 : %', got; end if;
  raise notice 'PASS T10_unauthenticated';
end $$;
select pg_temp.asadmin();

-- T12 — unsupported procedure type.
select pg_temp.seed_ready('d1000012-0000-4000-8000-000000000012','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
do $$ declare p jsonb; got text; begin
  p := pg_temp.mk_payload('d1000012-0000-4000-8000-000000000012','v1','K12',repeat('c',64));
  p := jsonb_set(p,'{aggregate,matter,procedureType}', to_jsonb('divorce'::text));
  got := pg_temp.try(p);
  if got not like '%BOOTSTRAP_UNSUPPORTED_PROCEDURE%' then raise exception 'FAIL T12 : %', got; end if;
  raise notice 'PASS T12_unsupported_procedure';
end $$;
select pg_temp.asadmin();

-- T13 — link_existing same-org contact → CREATED, participant linked to it.
select pg_temp.seed_ready('d1000013-0000-4000-8000-000000000013','00000001-0000-4000-8000-000000000001');
select pg_temp.act('00000001-0000-4000-8000-000000000001');
do $$ declare p jsonb; got text; v_mid uuid; n int; begin
  p := pg_temp.mk_payload('d1000013-0000-4000-8000-000000000013','v1','K13',repeat('d',64));
  p := jsonb_set(p,'{aggregate,contacts}', jsonb_build_array(jsonb_build_object(
        'contactKey','contact_a','classification','link_existing','contactId','c0000001-0000-4000-8000-0000000000c1','kind','person','nameHe','לקוח קיים','sourceItemIds',jsonb_build_array('c1'))));
  got := pg_temp.try(p);
  if got <> 'BOOTSTRAP_CREATED' then raise exception 'FAIL T13 : %', got; end if;
  select confirmed_matter_id into v_mid from public.matter_intake_drafts where id='d1000013-0000-4000-8000-000000000013';
  select count(*) into n from public.matter_participants where matter_id=v_mid and contact_id='c0000001-0000-4000-8000-0000000000c1'; if n<>1 then raise exception 'FAIL T13 link'; end if;
  raise notice 'PASS T13_link_existing';
end $$;
select pg_temp.asadmin();

-- T14 — grants: anon has no EXECUTE on the RPC; PUBLIC revoked; authenticated has it.
do $$ begin
  if has_function_privilege('anon','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('public','app.bootstrap_matter_v1(jsonb)','EXECUTE') then
    raise exception 'FAIL T14 : RPC EXECUTE not restricted';
  end if;
  if not has_function_privilege('authenticated','app.bootstrap_matter_v1(jsonb)','EXECUTE') then
    raise exception 'FAIL T14 : authenticated missing EXECUTE';
  end if;
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'FAIL T14 : RPC owner not lawme_bootstrap';
  end if;
  raise notice 'PASS T14_grants_owner';
end $$;

-- T16 — role-membership correctness after the ownership-prereq grant.
do $$
declare v_set boolean; v_admin boolean; n int;
begin
  -- postgres is a member of lawme_bootstrap with the SET option (for ownership mgmt).
  select set_option, admin_option into v_set, v_admin
  from pg_auth_members am
  join pg_roles g on g.oid=am.roleid and g.rolname='lawme_bootstrap'
  join pg_roles m on m.oid=am.member and m.rolname='postgres';
  if v_set is distinct from true then raise exception 'FAIL T16 : postgres lacks SET on lawme_bootstrap'; end if;
  -- lawme_bootstrap is NOT a member of postgres (no reverse membership).
  select count(*) into n from pg_auth_members am
    join pg_roles g on g.oid=am.roleid and g.rolname='postgres'
    join pg_roles m on m.oid=am.member and m.rolname='lawme_bootstrap';
  if n <> 0 then raise exception 'FAIL T16 : reverse membership lawme_bootstrap->postgres exists'; end if;
  -- no client role is a member of lawme_bootstrap.
  select count(*) into n from pg_auth_members am
    join pg_roles g on g.oid=am.roleid and g.rolname='lawme_bootstrap'
    join pg_roles m on m.oid=am.member and m.rolname in ('authenticated','anon','service_role');
  if n <> 0 then raise exception 'FAIL T16 : a client role is a member of lawme_bootstrap'; end if;
  -- lawme_bootstrap attributes unchanged: NOLOGIN, BYPASSRLS, nothing else.
  perform 1 from pg_roles where rolname='lawme_bootstrap'
    and rolcanlogin=false and rolbypassrls=true and rolsuper=false
    and rolcreaterole=false and rolcreatedb=false and rolreplication=false;
  if not found then raise exception 'FAIL T16 : lawme_bootstrap attributes drifted'; end if;
  raise notice 'PASS T16_role_membership (postgres SET=%, admin=%; no reverse/client membership; attrs intact)', v_set, v_admin;
end $$;

rollback;

-- T15 — zero residue after rollback.
do $$ declare n int; begin
  select count(*) into n from public.matters; if n<>0 then raise exception 'FAIL T15 : % matters remain', n; end if;
  select count(*) into n from public.matter_intake_drafts; if n<>0 then raise exception 'FAIL T15 : % drafts remain', n; end if;
  raise notice 'PASS T15_zero_residue';
end $$;
