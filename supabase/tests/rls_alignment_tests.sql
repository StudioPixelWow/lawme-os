-- LawME RLS Authorization Alignment — 65-point direct-RLS security matrix.
-- Run against the local cluster AFTER setup + the migration. Expect 0 failures.

create schema if not exists test;
drop table if exists test.results;
create table test.results(name text, expected int, actual int, ok bool);

-- read-count assertion under the authenticated role
create or replace function test.chk(p_name text, p_uid text, p_sql text, p_expected int) returns void language plpgsql as $$
declare cnt int;
begin
  perform set_config('test.uid', coalesce(p_uid,''), false);
  set local role authenticated;
  execute p_sql into cnt;
  reset role;
  insert into test.results values (p_name, p_expected, cnt, cnt = p_expected);
end $$;

-- write-denied assertion: blocked if it raises OR affects 0 rows
create or replace function test.blocked(p_name text, p_uid text, p_sql text) returns void language plpgsql as $$
declare rc int; is_blocked bool := false;
begin
  perform set_config('test.uid', coalesce(p_uid,''), false);
  begin
    set local role authenticated;
    execute p_sql;
    get diagnostics rc = row_count;
    is_blocked := (rc = 0);
  exception when others then
    is_blocked := true;
  end;
  begin reset role; exception when others then null; end;
  insert into test.results values (p_name, 1, case when is_blocked then 1 else 0 end, is_blocked);
end $$;

\set OWNER '11111111-0000-4000-8000-000000000001'
\set MEMBER '22222222-0000-4000-8000-000000000002'
\set NONMEMBER '33333333-0000-4000-8000-000000000003'
\set ADMIN '44444444-0000-4000-8000-000000000004'
\set TENANTB '55555555-0000-4000-8000-000000000005'
\set CREATOR '66666666-0000-4000-8000-000000000006'
\set REVIEWER '77777777-0000-4000-8000-000000000007'
\set M1 'a1111111-0000-4000-8000-000000000001'
\set M2 'a2222222-0000-4000-8000-000000000002'
\set MB 'b1111111-0000-4000-8000-000000000001'
\set D1 'd1111111-0000-4000-8000-000000000001'
\set D2 'd2222222-0000-4000-8000-000000000002'
\set DB 'db111111-0000-4000-8000-000000000001'

-- ===== MATTER READ (1-8) =====
select test.chk('01 owner reads M1',        :'OWNER',     'select count(*) from matters where id='''||:'M1'||'''', 1);
select test.chk('02 member reads M1',       :'MEMBER',    'select count(*) from matters where id='''||:'M1'||'''', 1);
select test.chk('03 non-member reads M1=0', :'NONMEMBER', 'select count(*) from matters where id='''||:'M1'||'''', 0);
select test.chk('04 admin (no assign) M1=0',:'ADMIN',     'select count(*) from matters where id='''||:'M1'||'''', 0);
select test.chk('05 cross-tenant M1=0',     :'TENANTB',   'select count(*) from matters where id='''||:'M1'||'''', 0);
select test.chk('06 anon M1=0',             '',           'select count(*) from matters where id='''||:'M1'||'''', 0);
select test.chk('07a priv M2 owner reads',  :'OWNER',     'select count(*) from matters where id='''||:'M2'||'''', 1);
select test.chk('07b priv M2 member=0',     :'MEMBER',    'select count(*) from matters where id='''||:'M2'||'''', 0);
select test.chk('08 unknown actor M1=0',    '99999999-0000-4000-8000-000000000099', 'select count(*) from matters where id='''||:'M1'||'''', 0);
select test.chk('05b orgA owner MB=0',      :'OWNER',     'select count(*) from matters where id='''||:'MB'||'''', 0);
select test.chk('05c tenantB reads MB',     :'TENANTB',   'select count(*) from matters where id='''||:'MB'||'''', 1);

-- ===== MATTER WRITE disabled (9-13) =====
select test.blocked('09 non-member cannot update M1', :'NONMEMBER', 'update matters set status=''archived'' where id='''||:'M1'||'''');
select test.blocked('10 member cannot self-assign owner', :'MEMBER', 'update matters set assigned_owner_id='''||:'MEMBER'||''' where id='''||:'M1'||'''');
select test.blocked('11 member cannot change confidentiality', :'MEMBER', 'update matters set confidentiality=''internal'' where id='''||:'M2'||'''');
select test.blocked('12 owner direct update disabled', :'OWNER', 'update matters set status=''archived'' where id='''||:'M1'||'''');
select test.blocked('13 owner direct delete disabled', :'OWNER', 'delete from matters where id='''||:'M1'||'''');

-- ===== MATTER MEMBERSHIP (14-19) =====
select test.blocked('14 member cannot add self to M2', :'MEMBER', 'insert into matter_members(organization_id,matter_id,profile_id) values(''aaaaaaaa-0000-4000-8000-000000000001'','''||:'M2'||''','''||:'MEMBER'||''')');
select test.blocked('15 member cannot set can_approve', :'MEMBER', 'update matter_members set can_approve=true where matter_id='''||:'M1'||''' and profile_id='''||:'MEMBER'||'''');
select test.blocked('16 admin cannot add member (direct)', :'ADMIN', 'insert into matter_members(organization_id,matter_id,profile_id) values(''aaaaaaaa-0000-4000-8000-000000000001'','''||:'M1'||''','''||:'ADMIN'||''')');
select test.blocked('17 member cannot delete owner-member', :'MEMBER', 'delete from matter_members where matter_id='''||:'M1'||'''');
select test.chk('18 member reads M1 membership', :'MEMBER', 'select count(*) from matter_members where matter_id='''||:'M1'||'''', 1);
select test.chk('18b non-member sees no membership', :'NONMEMBER', 'select count(*) from matter_members where matter_id='''||:'M1'||'''', 0);

-- ===== PARTICIPANTS (20-23) =====
select test.chk('20 member reads participants', :'MEMBER', 'select count(*) from matter_participants where matter_id='''||:'M1'||'''', 1);
select test.chk('21 non-member participants=0', :'NONMEMBER', 'select count(*) from matter_participants where matter_id='''||:'M1'||'''', 0);
select test.blocked('22 direct participant insert blocked', :'MEMBER', 'insert into matter_participants(organization_id,matter_id,contact_id,role) values(''aaaaaaaa-0000-4000-8000-000000000001'','''||:'M1'||''',gen_random_uuid(),''witness'')');

-- ===== DOCUMENTS (24-30) =====
select test.chk('24 owner reads D1', :'OWNER', 'select count(*) from matter_documents where id='''||:'D1'||'''', 1);
select test.chk('24b member reads D1', :'MEMBER', 'select count(*) from matter_documents where id='''||:'D1'||'''', 1);
select test.chk('25 non-member D1=0', :'NONMEMBER', 'select count(*) from matter_documents where id='''||:'D1'||'''', 0);
select test.chk('26 member cross-matter D2=0', :'MEMBER', 'select count(*) from matter_documents where id='''||:'D2'||'''', 0);
select test.chk('27 priv D2 owner reads', :'OWNER', 'select count(*) from matter_documents where id='''||:'D2'||'''', 1);
select test.chk('27b cross-tenant DB from orgA owner=0', :'OWNER', 'select count(*) from matter_documents where id='''||:'DB'||'''', 0);
select test.blocked('28 direct approval_state mutation denied', :'MEMBER', 'update matter_documents set approval_state=''approved'' where id='''||:'D1'||'''');
select test.blocked('29 direct confidentiality mutation denied', :'MEMBER', 'update matter_documents set confidentiality=''standard'' where id='''||:'D2'||'''');
select test.blocked('30 direct document delete denied', :'OWNER', 'delete from matter_documents where id='''||:'D1'||'''');

-- ===== NOTES (31-34) =====
select test.chk('31 member reads note', :'MEMBER', 'select count(*) from matter_notes where matter_id='''||:'M1'||'''', 1);
select test.chk('32 non-member note=0', :'NONMEMBER', 'select count(*) from matter_notes where matter_id='''||:'M1'||'''', 0);
select test.chk('33 privileged note not org-wide (admin=0)', :'ADMIN', 'select count(*) from matter_notes where matter_id='''||:'M1'||'''', 0);
select test.blocked('34 direct note confidentiality mutation denied', :'MEMBER', 'update matter_notes set confidentiality=''standard'' where matter_id='''||:'M1'||'''');

-- ===== FACTS (35-38) =====
select test.chk('35 member reads fact', :'MEMBER', 'select count(*) from matter_facts where matter_id='''||:'M1'||'''', 1);
select test.chk('36 non-member fact=0', :'NONMEMBER', 'select count(*) from matter_facts where matter_id='''||:'M1'||'''', 0);
select test.blocked('37 direct fact insert (confirmed) blocked', :'MEMBER', 'insert into matter_facts(organization_id,matter_id,status) values(''aaaaaaaa-0000-4000-8000-000000000001'','''||:'M1'||''',''confirmed'')');
select test.blocked('38 direct allegation->confirmed update denied', :'MEMBER', 'update matter_facts set status=''confirmed'' where matter_id='''||:'M1'||'''');

-- ===== DEADLINES (40-42) =====
select test.chk('40 member reads deadline', :'MEMBER', 'select count(*) from matter_deadlines where matter_id='''||:'M1'||'''', 1);
select test.chk('41 non-member deadline=0', :'NONMEMBER', 'select count(*) from matter_deadlines where matter_id='''||:'M1'||'''', 0);
select test.blocked('42 direct deadline insert denied', :'MEMBER', 'insert into matter_deadlines(organization_id,matter_id) values(''aaaaaaaa-0000-4000-8000-000000000001'','''||:'M1'||''')');

-- ===== EVIDENCE (43-46) =====
select test.chk('43 member reads evidence', :'MEMBER', 'select count(*) from matter_evidence where matter_id='''||:'M1'||'''', 1);
select test.chk('44 non-member evidence=0', :'NONMEMBER', 'select count(*) from matter_evidence where matter_id='''||:'M1'||'''', 0);
select test.blocked('45 direct evidence mutation denied', :'MEMBER', 'update matter_evidence set status=''collected'' where matter_id='''||:'M1'||'''');
select test.chk('46 cross-tenant evidence=0', :'TENANTB', 'select count(*) from matter_evidence where matter_id='''||:'M1'||'''', 0);

-- ===== OTHER CHILDREN (47-49) =====
select test.chk('47 member reads task', :'MEMBER', 'select count(*) from matter_tasks where matter_id='''||:'M1'||'''', 1);
select test.chk('47b member reads research link', :'MEMBER', 'select count(*) from matter_research_links where matter_id='''||:'M1'||'''', 1);
select test.chk('47c member reads activity', :'MEMBER', 'select count(*) from matter_activity where matter_id='''||:'M1'||'''', 1);
select test.chk('48 non-member task=0', :'NONMEMBER', 'select count(*) from matter_tasks where matter_id='''||:'M1'||'''', 0);
select test.chk('49 cross-tenant activity=0', :'TENANTB', 'select count(*) from matter_activity where matter_id='''||:'M1'||'''', 0);

-- ===== INTAKE reference unchanged (50-53) =====
select test.chk('50 intake creator reads', :'CREATOR', 'select count(*) from matter_intake_drafts', 1);
select test.chk('51 intake reviewer reads', :'REVIEWER', 'select count(*) from matter_intake_drafts', 1);
select test.chk('52 same-org non-reviewer draft=0', :'NONMEMBER', 'select count(*) from matter_intake_drafts', 0);
select test.chk('53 intake cross-tenant=0', :'TENANTB', 'select count(*) from matter_intake_drafts', 0);

-- ===== CONTACTS (org-scoped, aligned) =====
select test.chk('C1 orgA member reads contacts', :'NONMEMBER', 'select count(*) from contacts', 1);
select test.chk('C2 cross-tenant contacts=0', :'TENANTB', 'select count(*) from contacts', 0);
select test.blocked('C3 direct contact insert disabled', :'NONMEMBER', 'insert into contacts(organization_id) values(''aaaaaaaa-0000-4000-8000-000000000001'')');
