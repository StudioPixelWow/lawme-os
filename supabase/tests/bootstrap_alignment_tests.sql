-- LawME — Capability 1 · Slice 1.0.F cross-layer alignment (SQL runtime side).
-- Run AFTER bootstrap_rpc_setup.sql + 1.0.3 (+ later chain). Proves the SQL
-- helpers actually behave as their text claims, over the FULL membership
-- vocabulary and every procedure type. Paired with the TS alignment test that
-- compares these authoritative contracts to the TypeScript surfaces.
\set ON_ERROR_STOP on
begin;

-- distinct profiles + memberships covering every membership role.
insert into public.profiles(id) values
  ('a0000001-0000-4000-8000-0000000000a1'),('a0000002-0000-4000-8000-0000000000a2'),
  ('a0000003-0000-4000-8000-0000000000a3'),('a0000004-0000-4000-8000-0000000000a4'),
  ('a0000005-0000-4000-8000-0000000000a5')
on conflict do nothing;
insert into public.organization_memberships(organization_id, profile_id, role, status) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1','a0000001-0000-4000-8000-0000000000a1','owner','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','a0000002-0000-4000-8000-0000000000a2','partner','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','a0000003-0000-4000-8000-0000000000a3','admin','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','a0000004-0000-4000-8000-0000000000a4','lawyer','active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1','a0000005-0000-4000-8000-0000000000a5','paralegal','active')
on conflict do nothing;

do $$
declare
  roles text[] := array['owner','partner','admin','lawyer','paralegal'];
  profs text[] := array['a0000001-0000-4000-8000-0000000000a1','a0000002-0000-4000-8000-0000000000a2','a0000003-0000-4000-8000-0000000000a3','a0000004-0000-4000-8000-0000000000a4','a0000005-0000-4000-8000-0000000000a5'];
  procs text[] := array['pre_dismissal_dispute','pregnancy_dismissal','hearing_before_dismissal','severance_claim','wage_overtime_claim','pension_rights_claim','discrimination_claim','harassment_complaint','regional_labor_court_civil','appeal_to_national_labor_court','national_insurance_claim','settlement_enforcement'];
  i int; did uuid; expected boolean; got boolean; p text;
begin
  -- AUTHORITY: can_confirm accepts owner|partner only, across the whole vocabulary.
  for i in 1..array_length(roles,1) loop
    did := ('a1000000-0000-4000-8000-0000000000'||lpad(i::text,2,'0'))::uuid;
    insert into public.matter_intake_drafts(id,organization_id,created_by,reviewer_ids,status,engine_version,version_token,structured_draft)
      values (did,'aaaaaaaa-0000-4000-8000-0000000000a1',profs[i]::uuid,'{}','ready_for_review','intake-1','v1','{}');
    perform set_config('test.uid', profs[i], true);
    got := app.can_confirm_intake_draft(did);
    expected := roles[i] in ('owner','partner');
    if got is distinct from expected then
      raise exception 'FAIL authority : role % expected can_confirm=% got=%', roles[i], expected, got;
    end if;
    raise notice 'PASS authority role=% can_confirm=%', roles[i], got;
  end loop;
  perform set_config('test.uid','', true);

  -- PROCEDURES: every supported type resolves to intake; an unsupported one is null.
  foreach p in array procs loop
    if app.initial_stage_for(p) is distinct from 'intake' then
      raise exception 'FAIL procedure : % did not resolve to intake', p;
    end if;
  end loop;
  if app.initial_stage_for('not_a_real_procedure') is not null then
    raise exception 'FAIL procedure : unsupported type resolved non-null';
  end if;
  raise notice 'PASS procedures (12 supported -> intake; unsupported -> null)';

  raise notice 'PASS bootstrap alignment (SQL runtime side)';
end $$;
rollback;
