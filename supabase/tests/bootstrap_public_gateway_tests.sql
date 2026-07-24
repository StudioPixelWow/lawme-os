-- LawME — Capability 1 · Slice 1.0.5 public Bootstrap gateway security harness.
-- Run AFTER: bootstrap_rpc_setup.sql + 1.0.3 + 1.0.4 + 1.0.4B + the gateway
--   migration (20260724150000), under the DEVELOPMENT privilege model:
--     revoke usage on schema app  from authenticated, anon, service_role;
--     revoke usage on schema auth from lawme_bootstrap;
-- Proves the gateway is the only browser entry point, preserves auth.uid(), and
-- widens nothing. Local disposable PG only. Runs in a txn; rolled back at the end.
\set ON_ERROR_STOP on
begin;

-- payload builder mirroring the applied RPC shape.
create function pg_temp.gwmk(p_draft uuid, p_ver text, p_key text, p_hash text) returns jsonb language sql as $$
  select jsonb_build_object(
    'rpcVersion','bootstrap-rpc-v1','bootstrapVersion','matter-bootstrap-v1','correlationId','11111111-1111-4000-8000-000000000abc',
    'draft', jsonb_build_object('id', p_draft::text, 'versionToken', p_ver, 'schemaVersion','matter-intake-contract-1.0.0'),
    'idempotency', jsonb_build_object('key', p_key, 'planHash', p_hash),
    'aggregate', jsonb_build_object('aggregateVersion',1,'sourceInputHash',repeat('e',64),
      'metadata', jsonb_build_object('plannerVersion','matter-aggregate-planner-v1','validationVersion','bootstrap-validation-v1','planHash',p_hash),
      'matter', jsonb_build_object('titleHe','x','procedureType','pregnancy_dismissal','topicHe','pregnancy_dismissal','legalDomain','labor','confidentiality','client_confidential','aiPolicy','allowed_with_review','forumHe','x','statusIntent','open'),
      'members', jsonb_build_array(jsonb_build_object('memberKey','m','slot','owner','matterRole',null,'canReview',true,'canApprove',true,'bindProfileTo','confirming_actor')),
      'contacts', jsonb_build_array(jsonb_build_object('contactKey','c','classification','create_new','contactId',null,'kind','person','nameHe','x','sourceItemIds',jsonb_build_array('c1'))),
      'participants', jsonb_build_array(jsonb_build_object('participantKey','p','role','client','displayNameHe','x','contactKey','c','sourceItemId','c1','provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r','span',null))),
      'facts', jsonb_build_array(jsonb_build_object('factPlanKey','f','factKey','k','statementHe','x','status','client_alleged','sourceItemId','f1','provenance',jsonb_build_object('origin','intelligent_intake','draftId',p_draft::text,'ruleId','r','span',null))),
      'deadlines', jsonb_build_array(jsonb_build_object('deadlineKey','d','labelHe','x','dueAt','2026-08-01T00:00:00+03:00','source','statute','confidence','known','timezone','Asia/Jerusalem','strict',true,'basisHe','x','sourceItemId','d1')),
      'evidence', jsonb_build_array(jsonb_build_object('evidenceKey','e','labelHe','x','mandatory',true,'status','required','sourceItemId','e1')),
      'audit', jsonb_build_object('auditKey','a','sourceDraftId',p_draft::text)));
$$;
grant execute on function pg_temp.gwmk(uuid,text,text,text) to authenticated;

-- run a statement as a role with JWT-claim GUCs, capturing the outcome text.
create function pg_temp.as_role(p_role text, p_uid text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('test.uid', p_uid, true);
  perform set_config('test.role', p_role, true);
  perform set_config('role', p_role, true);
  begin execute p_sql into v; exception when others then v := 'ERR:'||sqlerrm; end;
  perform set_config('role','postgres', true);
  return v;
end $$;

create function pg_temp.expect(tag text, got text, want text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL % : expected % got %', tag, want, got; end if; raise notice 'PASS % (%)', tag, want; end $$;

-- seed a committed-in-txn ready draft owned by the owner member (fixtures from bootstrap_rpc_setup).
insert into public.matter_intake_drafts(id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft)
values ('d7000001-0000-4000-8000-000000000071','aaaaaaaa-0000-4000-8000-0000000000a1','00000001-0000-4000-8000-000000000001','{}','ready_for_review','intake-1','v1','{}');

do $$
declare owner_uid constant text := '00000001-0000-4000-8000-000000000001';
        h constant text := repeat('a',64); v text; def text; n int;
begin
  -- G25 authenticated CAN execute the public gateway (happy path via the gateway) -> BOOTSTRAP_CREATED
  v := pg_temp.as_role('authenticated', owner_uid,
        format('select (public.bootstrap_matter_v1(pg_temp.gwmk(%L,%L,%L,%L)))->>%L','d7000001-0000-4000-8000-000000000071','v1','KG1',h,'code'));
  perform pg_temp.expect('G25 authenticated_executes_gateway', v, 'BOOTSTRAP_CREATED');

  -- G31 gateway preserved auth.uid(): the created Matter owner == the JWT subject.
  select assigned_owner_id::text into v from public.matters
    where id = (select confirmed_matter_id from public.matter_intake_drafts where id='d7000001-0000-4000-8000-000000000071');
  perform pg_temp.expect('G31 gateway_preserves_auth_uid', v, owner_uid);

  -- G26/G27 anon & service_role cannot execute the gateway.
  v := pg_temp.as_role('anon', owner_uid, 'select (public.bootstrap_matter_v1(''{}''::jsonb))->>''code''');
  if v not like 'ERR:%permission denied for function%' then raise exception 'FAIL G26 anon: %', v; end if; raise notice 'PASS G26 anon_denied';
  v := pg_temp.as_role('service_role', owner_uid, 'select (public.bootstrap_matter_v1(''{}''::jsonb))->>''code''');
  if v not like 'ERR:%permission denied for function%' then raise exception 'FAIL G27 service_role: %', v; end if; raise notice 'PASS G27 service_role_denied';

  -- G28 PUBLIC has no execute; G25 grant is authenticated-only.
  if has_function_privilege('public','public.bootstrap_matter_v1(jsonb)','EXECUTE') then raise exception 'FAIL G28 PUBLIC executable'; end if;
  raise notice 'PASS G28 public_denied';

  -- G29 authenticated has NO broad USAGE on schema app.
  if has_schema_privilege('authenticated','app','USAGE') then raise exception 'FAIL G29 authenticated has app USAGE'; end if;
  raise notice 'PASS G29 no_app_usage';

  -- G30 authenticated cannot execute app.bootstrap_matter_v1 directly (blocked by schema-app usage).
  v := pg_temp.as_role('authenticated', owner_uid, 'select (app.bootstrap_matter_v1(''{}''::jsonb))->>''code''');
  if v not like 'ERR:%permission denied for schema app%' then raise exception 'FAIL G30 direct app call: %', v; end if;
  raise notice 'PASS G30 direct_internal_denied';

  -- G32/G33/G34 static: forwards ONLY to app.bootstrap_matter_v1, pinned search_path, no dynamic SQL.
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
    where nsp.nspname='public' and p.proname='bootstrap_matter_v1';
  if def not like '%app.bootstrap_matter_v1(%' then raise exception 'FAIL G32 does not forward to internal RPC'; end if;
  -- no other app.* function referenced (count of 'app.' tokens that are not app.bootstrap_matter_v1)
  if (length(def) - length(replace(def,'app.',''))) / 4 <> (length(def) - length(replace(def,'app.bootstrap_matter_v1','')))/length('app.bootstrap_matter_v1') then
    raise exception 'FAIL G32 references an app.* symbol other than app.bootstrap_matter_v1';
  end if;
  raise notice 'PASS G32 forwards_only_internal_rpc';
  select coalesce(array_to_string(p.proconfig,','),'') into v from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
    where nsp.nspname='public' and p.proname='bootstrap_matter_v1';
  if v not like '%search_path=%' then raise exception 'FAIL G33 search_path not pinned'; end if;
  raise notice 'PASS G33 pinned_search_path';
  select prosrc into def from pg_proc p join pg_namespace nsp on nsp.oid=p.pronamespace
    where nsp.nspname='public' and p.proname='bootstrap_matter_v1';
  if def ~* '(execute|format\()' then raise exception 'FAIL G34 dynamic SQL present'; end if;
  raise notice 'PASS G34 no_dynamic_sql';

  -- G36 raw Matter writes remain denied for authenticated (RLS deny-by-default; no write policy).
  v := pg_temp.as_role('authenticated', owner_uid,
        'select (insert_result) from (select 1 insert_result)'  -- placeholder; real attempt below
      );
  v := pg_temp.as_role('authenticated', owner_uid,
        format('with x as (insert into public.matters(organization_id,slug,title_he,legal_domain,procedure_type,topic,current_stage_id,status,assigned_owner_id,confidentiality,ai_policy) values (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L) returning 1) select count(*)::text from x',
          'aaaaaaaa-0000-4000-8000-0000000000a1','hack-gw','x','labor','pregnancy_dismissal','x','intake','open',owner_uid,'client_confidential','allowed_with_review'));
  if v not like 'ERR:%' then raise exception 'FAIL G36 raw matter insert not denied: %', v; end if;
  raise notice 'PASS G36 raw_matter_write_denied';

  raise notice 'PASS G25-G36 public gateway security harness';
end $$;

rollback;
