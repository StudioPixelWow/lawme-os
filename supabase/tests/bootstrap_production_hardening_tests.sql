-- LawME — Capability 1 · Slice 1.0.F production-hardening harness.
-- Run AFTER: bootstrap_rpc_setup.sql + 1.0.3 + 1.0.4 + 1.0.4B + 1.0.F hardening,
--   under the RPC-harness model (authenticated may reach the internal RPC).
-- Proves the aggregate-limit backstop and the narrow slug-collision retry.
-- Runs in a txn; rolled back. Local disposable PG only.
\set ON_ERROR_STOP on
begin;

-- payload builder with explicit collection counts (all items valid + linked).
create function pg_temp.genpayload(
  p_draft uuid, p_key text, p_hash text,
  n_members int, n_contacts int, n_participants int, n_facts int, n_deadlines int, n_evidence int
) returns jsonb language sql as $$
  select jsonb_build_object(
    'rpcVersion','bootstrap-rpc-v1','bootstrapVersion','matter-bootstrap-v1','correlationId','11111111-1111-4000-8000-000000000abc',
    'draft', jsonb_build_object('id', p_draft::text, 'versionToken','v1','schemaVersion','matter-intake-contract-1.0.0'),
    'idempotency', jsonb_build_object('key', p_key, 'planHash', p_hash),
    'aggregate', jsonb_build_object('aggregateVersion',1,'sourceInputHash',repeat('e',64),
      'metadata', jsonb_build_object('plannerVersion','matter-aggregate-planner-v1','validationVersion','bootstrap-validation-v1','planHash',p_hash),
      'matter', jsonb_build_object('titleHe','x','procedureType','pregnancy_dismissal','topicHe','pregnancy_dismissal','legalDomain','labor','confidentiality','client_confidential','aiPolicy','allowed_with_review','forumHe','x','statusIntent','open'),
      'members', (select coalesce(jsonb_agg(jsonb_build_object('memberKey','m'||i,'slot','owner','matterRole',null,'canReview',true,'canApprove',true,'bindProfileTo','confirming_actor')),'[]'::jsonb) from generate_series(1,n_members) i),
      'contacts', (select coalesce(jsonb_agg(jsonb_build_object('contactKey','c'||i,'classification','create_new','contactId',null,'kind','person','nameHe','x','sourceItemIds',jsonb_build_array('s'||i))),'[]'::jsonb) from generate_series(1,n_contacts) i),
      'participants', (select coalesce(jsonb_agg(jsonb_build_object('participantKey','p'||i,'role','client','displayNameHe','x','contactKey','c1','sourceItemId','s'||i,'provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r','span',null))),'[]'::jsonb) from generate_series(1,n_participants) i),
      'facts', (select coalesce(jsonb_agg(jsonb_build_object('factPlanKey','f'||i,'factKey','k'||i,'statementHe','x','status','client_alleged','sourceItemId','s'||i,'provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r','span',null))),'[]'::jsonb) from generate_series(1,n_facts) i),
      'deadlines', (select coalesce(jsonb_agg(jsonb_build_object('deadlineKey','d'||i,'labelHe','x','dueAt','2026-08-01T00:00:00+03:00','source','statute','confidence','known','timezone','Asia/Jerusalem','strict',true,'basisHe','x','sourceItemId','s'||i)),'[]'::jsonb) from generate_series(1,n_deadlines) i),
      'evidence', (select coalesce(jsonb_agg(jsonb_build_object('evidenceKey','e'||i,'labelHe','x','mandatory',true,'status','required','sourceItemId','s'||i)),'[]'::jsonb) from generate_series(1,n_evidence) i),
      'audit', jsonb_build_object('auditKey','a','sourceDraftId',p_draft::text)));
$$;
grant execute on function pg_temp.genpayload(uuid,text,text,int,int,int,int,int,int) to authenticated;

-- set the JWT-claim GUCs only; run as the (privileged) test superuser so direct
-- fixture DML works. The RPC is SECURITY DEFINER (current_user=lawme_bootstrap inside)
-- and resolves the actor from the JWT GUC, so caller-role does not affect it.
create function pg_temp.act(uid text) returns void language plpgsql as $$
begin perform set_config('test.uid',uid,true); perform set_config('test.role','',true); end $$;
create function pg_temp.try(p jsonb) returns text language plpgsql as $$
declare r jsonb; begin begin r := app.bootstrap_matter_v1(p); return coalesce(r->>'code','NO_CODE'); exception when others then return 'RAISED:'||sqlerrm; end; end $$;
grant execute on function pg_temp.try(jsonb) to authenticated;
create function pg_temp.expect(tag text, got text, want text) returns void language plpgsql as $$
begin if got<>want then raise exception 'FAIL % : expected % got %', tag, want, got; end if; raise notice 'PASS % (%)', tag, want; end $$;

create function pg_temp.seed(did uuid) returns void language plpgsql as $$
begin insert into public.matter_intake_drafts(id,organization_id,created_by,reviewer_ids,status,engine_version,version_token,structured_draft)
  values (did,'aaaaaaaa-0000-4000-8000-0000000000a1','00000001-0000-4000-8000-000000000001','{}','ready_for_review','intake-1','v1','{}'); end $$;

do $$
declare owner constant text := '00000001-0000-4000-8000-000000000001'; h constant text := repeat('a',64); v text; n int;
begin
  -- sanity: normal payload → CREATED
  perform pg_temp.seed('d8000001-0000-4000-8000-000000000081'); perform pg_temp.act(owner);
  perform pg_temp.expect('HL_normal', pg_temp.try(pg_temp.genpayload('d8000001-0000-4000-8000-000000000081','K1',h,1,1,1,1,1,1)), 'BOOTSTRAP_CREATED');

  -- members != 1 → limit exceeded (0 and 2)
  perform pg_temp.seed('d8000002-0000-4000-8000-000000000082'); perform pg_temp.act(owner);
  perform pg_temp.expect('HL_members0', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K2',h,0,1,1,1,1,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  perform pg_temp.expect('HL_members2', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K2b',h,2,1,1,1,1,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');

  -- each collection limit+1 → limit exceeded, BEFORE any write (draft stays ready, no matter)
  perform pg_temp.act(owner);
  perform pg_temp.expect('HL_contacts101', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K3',h,1,101,1,1,1,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  perform pg_temp.expect('HL_participants101', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K4',h,1,1,101,1,1,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  perform pg_temp.expect('HL_facts501', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K5',h,1,1,1,501,1,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  perform pg_temp.expect('HL_deadlines201', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K6',h,1,1,1,1,201,1)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  perform pg_temp.expect('HL_evidence201', pg_temp.try(pg_temp.genpayload('d8000002-0000-4000-8000-000000000082','K7',h,1,1,1,1,1,201)), 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');

  -- no write happened for the over-limit draft d8000002
  select count(*) into n from public.matters m
    where m.id = (select confirmed_matter_id from public.matter_intake_drafts where id='d8000002-0000-4000-8000-000000000082');
  if n <> 0 then raise exception 'FAIL HL_no_write : over-limit created a matter'; end if;
  if (select status from public.matter_intake_drafts where id='d8000002-0000-4000-8000-000000000082') <> 'ready_for_review' then
    raise exception 'FAIL HL_no_write : draft not ready_for_review'; end if;
  raise notice 'PASS HL_no_write_on_limit';

  -- at-limit contacts=100 → CREATED (inclusive boundary), 100 contacts materialize
  perform pg_temp.seed('d8000003-0000-4000-8000-000000000083'); perform pg_temp.act(owner);
  perform pg_temp.expect('HL_contacts100_ok', pg_temp.try(pg_temp.genpayload('d8000003-0000-4000-8000-000000000083','K8',h,1,100,1,1,1,1)), 'BOOTSTRAP_CREATED');
  select count(*) into n from public.contacts where organization_id='aaaaaaaa-0000-4000-8000-0000000000a1';
  if n < 100 then raise exception 'FAIL HL_contacts100_ok : expected >=100 contacts, got %', n; end if;
  raise notice 'PASS HL_contacts100_materialized';

  -- narrow slug retry: pre-seed a Matter occupying the PRIMARY slug for draft d8000004,
  -- then bootstrap that draft → retry with the full-uuid slug → CREATED with the expanded slug.
  perform pg_temp.seed('d8000004-0000-4000-8000-000000000084');
  insert into public.matters(organization_id, slug, title_he, legal_domain, procedure_type, topic, current_stage_id, status, assigned_owner_id, confidentiality, ai_policy)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'm-'||replace(left('d8000004-0000-4000-8000-000000000084',18),'-',''), 'squatter','labor','pregnancy_dismissal','x','intake','open','00000001-0000-4000-8000-000000000001','client_confidential','allowed_with_review');
  perform pg_temp.act(owner);
  perform pg_temp.expect('HL_slug_retry', pg_temp.try(pg_temp.genpayload('d8000004-0000-4000-8000-000000000084','K9',h,1,1,1,1,1,1)), 'BOOTSTRAP_CREATED');
  select slug into v from public.matters where id=(select confirmed_matter_id from public.matter_intake_drafts where id='d8000004-0000-4000-8000-000000000084');
  if v <> 'm-'||replace('d8000004-0000-4000-8000-000000000084','-','') then raise exception 'FAIL HL_slug_retry : expected expanded slug, got %', v; end if;
  raise notice 'PASS HL_slug_retry_expanded (%)', v;

  raise notice 'PASS HL production-hardening harness';
end $$;
rollback;
