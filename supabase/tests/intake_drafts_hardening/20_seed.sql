-- Deterministic fixtures. Fixed UUIDs referenced by the generated test file.
insert into auth.users (id) values
 ('a0000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000002'),
 ('a0000000-0000-0000-0000-000000000003'),
 ('a0000000-0000-0000-0000-000000000004'),
 ('b0000000-0000-0000-0000-000000000001');
insert into public.profiles (id, display_name) values
 ('a0000000-0000-0000-0000-000000000001','creator'),
 ('a0000000-0000-0000-0000-000000000002','reviewer'),
 ('a0000000-0000-0000-0000-000000000003','other'),
 ('a0000000-0000-0000-0000-000000000004','admin'),
 ('b0000000-0000-0000-0000-000000000001','outsider');
insert into public.organizations (id, name) values
 ('11111111-1111-1111-1111-111111111111','Org One'),
 ('22222222-2222-2222-2222-222222222222','Org Two');
insert into public.organization_memberships (organization_id, profile_id, role, status) values
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','lawyer','active'),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002','lawyer','active'),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','lawyer','active'),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000004','admin','active'),
 ('22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-000000000001','lawyer','active');
insert into public.matters (id, organization_id, title_he) values
 ('c1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','תיק אחד'),
 ('c2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','תיק שתיים');

-- Non-confirmed drafts seeded normally (guard permits these states on INSERT for
-- the trusted/owner context). One per lifecycle state for transition testing.
insert into public.matter_intake_drafts
  (id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft)
values
 ('d1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'active','intake-1.0.0','tok-1','{"x":1}'::jsonb),
 ('d2222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'needs_clarification','intake-1.0.0','tok-2','{"x":2}'::jsonb),
 ('d3333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'ready_for_review','intake-1.0.0','tok-3','{"x":3}'::jsonb),
 ('d4444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'rejected','intake-1.0.0','tok-4','{"x":4}'::jsonb),
 ('d5555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'expired','intake-1.0.0','tok-5','{"x":5}'::jsonb);

-- Confirmed draft: guard blocks confirmed-on-insert for every role, so seed it
-- with the guard temporarily disabled (a legitimate fixture technique).
alter table public.matter_intake_drafts disable trigger matter_intake_drafts_guard;
insert into public.matter_intake_drafts
  (id, organization_id, created_by, reviewer_ids, status, engine_version, version_token, structured_draft, confirmed_matter_id)
values
 ('dccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[],'confirmed','intake-1.0.0','tok-c','{"x":9}'::jsonb,'c1111111-1111-1111-1111-111111111111');
alter table public.matter_intake_drafts enable trigger matter_intake_drafts_guard;

create table public._results (test_no int, passed boolean, detail text);
grant insert on public._results to authenticated, anon, service_role, nobody_role;
grant usage on schema public, app to nobody_role;
-- scratch for the two-role version-concurrency test (25).
create table public._scratch (a boolean default false, b boolean default false);
insert into public._scratch default values;
grant select, update on public._scratch to authenticated, service_role;
