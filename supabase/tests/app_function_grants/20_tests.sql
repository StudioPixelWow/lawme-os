-- Grant-hardening validation (runs AFTER grant_base.sql + mig_grant.sql).
-- UserA member of org1; UserB member of org2; matter M1 in org1.

-- 1. PUBLIC/ungranted role cannot execute protected helper
begin; set local role nobody_role;
do $body$ declare v boolean:=false; begin
  begin perform app.is_org_member('11111111-1111-1111-1111-111111111111'); exception when others then v:=true; end;
  insert into public._results values (1, v, 'PUBLIC/nobody cannot execute is_org_member');
end $body$; commit;

-- 2. anon cannot execute protected helpers
begin; set local role anon;
do $body$ declare v boolean:=false; begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  begin perform app.is_org_member('11111111-1111-1111-1111-111111111111'); exception when others then v:=true; end;
  insert into public._results values (2, v, 'anon cannot execute is_org_member');
end $body$; commit;

-- 3. authenticated MAY execute is_org_member (required by RLS)
begin; set local role authenticated;
do $body$ declare r boolean; v boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin r:=app.is_org_member('11111111-1111-1111-1111-111111111111'); v:=(r=true); exception when others then v:=false; end;
  insert into public._results values (3, v, 'authenticated executes is_org_member (member=true)');
end $body$; commit;

-- 4a. trigger touch_updated_at still fires (authenticated update)
begin; set local role authenticated;
do $body$ declare n int; v boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin update public.matters set title='M1b' where id='cccccccc-cccc-cccc-cccc-cccccccccccc'; get diagnostics n=row_count; v:=(n=1); exception when others then v:=false; end;
  insert into public._results values (4, v, 'touch_updated_at trigger fires after grant revoke');
end $body$; commit;

-- 5. forbid_established_fact trigger still fires: allegation allowed, established blocked
begin; set local role authenticated;
do $body$ declare okAll boolean:=false; blockEst boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin insert into public.matter_facts(organization_id,matter_id,status) values ('11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','client_alleged'); okAll:=true; exception when others then okAll:=false; end;
  begin insert into public.matter_facts(organization_id,matter_id,status) values ('11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','confirmed'); blockEst:=false; exception when others then blockEst:=true; end;
  insert into public._results values (5, okAll and blockEst, 'forbid_established_fact trigger fires (allegation ok, confirmed blocked)');
end $body$; commit;

-- 6. RLS still evaluates: member sees own org matter
begin; set local role authenticated;
do $body$ declare k int; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  select count(*) into k from public.matters where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
  insert into public._results values (6, k=1, 'RLS: org member sees own matter (n='||k||')');
end $body$; commit;

-- 7. cross-tenant read blocked
begin; set local role authenticated;
do $body$ declare k int; begin
  perform set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  select count(*) into k from public.matters where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
  insert into public._results values (7, k=0, 'RLS: cross-tenant member sees 0 (n='||k||')');
end $body$; commit;

-- 8. anon sees nothing (no policy)
begin; set local role anon;
do $body$ declare k int; begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  select count(*) into k from public.matters where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
  insert into public._results values (8, k=0, 'RLS: anon sees 0 (n='||k||')');
end $body$; commit;

-- 9. unused helpers revoked from authenticated too (matter_can_approve, current_org_ids)
begin; set local role authenticated;
do $body$ declare v1 boolean:=false; v2 boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin perform app.matter_can_approve('cccccccc-cccc-cccc-cccc-cccccccccccc'); exception when others then v1:=true; end;
  begin perform app.current_org_ids(); exception when others then v2:=true; end;
  insert into public._results values (9, v1 and v2, 'unused helpers (matter_can_approve/current_org_ids) not executable by authenticated');
end $body$; commit;

-- 10. trigger functions not directly invocable by authenticated
begin; set local role authenticated;
do $body$ declare v boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin perform app.forbid_mutation(); exception when others then v:=true; end;
  insert into public._results values (10, v, 'trigger fn forbid_mutation not directly executable by authenticated');
end $body$; commit;

-- 11. authenticated retains the RLS predicates it needs (spot-check version_document + query_org exist & execute)
begin; set local role authenticated;
do $body$ declare v boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  begin perform app.version_document('cccccccc-cccc-cccc-cccc-cccccccccccc'); perform app.query_org('cccccccc-cccc-cccc-cccc-cccccccccccc'); v:=true; exception when others then v:=false; end;
  insert into public._results values (11, v, 'authenticated retains EXECUTE on RLS-predicate helpers');
end $body$; commit;

-- 12. anon cannot execute an RLS predicate helper (version_document)
begin; set local role anon;
do $body$ declare v boolean:=false; begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  begin perform app.version_document('cccccccc-cccc-cccc-cccc-cccccccccccc'); exception when others then v:=true; end;
  insert into public._results values (12, v, 'anon cannot execute version_document');
end $body$; commit;

-- forbid_established_fact_on_insert has search_path pinned (reconciliation record)
do $body$ declare cfg text; begin
  select array_to_string(proconfig,',') into cfg from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app' and proname='forbid_established_fact_on_insert';
  insert into public._results values (13, cfg='search_path=public', 'forbid_established_fact search_path pinned (cfg='||coalesce(cfg,'none')||')');
end $body$;
