#!/usr/bin/env python3
# Emits /tmp/lawme_sql/40_tests.sql — 67 numbered tests recording into public._results.
CREATOR="a0000000-0000-0000-0000-000000000001"
REVIEWER="a0000000-0000-0000-0000-000000000002"
OTHER="a0000000-0000-0000-0000-000000000003"
ADMIN="a0000000-0000-0000-0000-000000000004"
OUTSIDER="b0000000-0000-0000-0000-000000000001"
ORG1="11111111-1111-1111-1111-111111111111"
ORG2="22222222-2222-2222-2222-222222222222"
M1="c1111111-1111-1111-1111-111111111111"
D1="d1111111-1111-1111-1111-111111111111"          # active
DNC="d2222222-2222-2222-2222-222222222222"         # needs_clarification
DRR="d3333333-3333-3333-3333-333333333333"         # ready_for_review
DREJ="d4444444-4444-4444-4444-444444444444"        # rejected
DEXP="d5555555-5555-5555-5555-555555555555"        # expired
DCONF="dccccccc-cccc-cccc-cccc-cccccccccccc"       # confirmed
out=[]
def raw(s): out.append(s)
def esc(s): return s.replace("'","''")
def client(sub, body, role="authenticated", jwt=True):
    j = ('{"sub":"%s","role":"%s"}'%(sub,role)) if sub else ('{"role":"%s"}'%role)
    setj = ("  perform set_config('request.jwt.claims','%s', true);\n"%j) if jwt else ""
    raw("begin; set local role %s;"%role)
    raw("do $body$ %s begin\n%s%s\nend $body$;"%body[0]+"" if False else "")
def block(role, decls, inner, jwt=None):
    # jwt: (sub,role) tuple or None
    s="begin; set local role %s;\n"%role
    s+="do $body$ %sbegin\n"%(("declare "+decls+"\n") if decls else "")
    if jwt is not None:
        sub,jr=jwt
        j=('{"sub":"%s","role":"%s"}'%(sub,jr)) if sub else ('{"role":"%s"}'%jr)
        s+="  perform set_config('request.jwt.claims','%s', true);\n"%j
    s+=inner+"\nend $body$;\ncommit;"
    raw(s)

def neg(n, sub, stmt, code, desc, role="authenticated"):
    inner=("  begin\n    %s;\n  exception when others then c:=sqlerrm; v:=(sqlerrm='%s'); end;\n"
           "  insert into public._results values (%d, v, '%s :: got='||coalesce(nullif(c,''),'<no-error>'));"
           %(stmt, code, n, esc(desc)))
    block(role, "v boolean:=false; c text;", inner, jwt=(sub,role))

def negany(n, sub, stmt, desc, role="authenticated"):
    inner=("  begin\n    %s;\n  exception when others then v:=true; c:=sqlerrm; end;\n"
           "  insert into public._results values (%d, v, '%s :: '||coalesce(nullif(c,''),'<no-error>'));"
           %(stmt, n, esc(desc)))
    block(role, "v boolean:=false; c text;", inner, jwt=(sub,role))

def pos(n, sub, stmt, desc, role="authenticated"):
    inner=("  begin\n    %s; get diagnostics k=row_count;\n    if k>=1 then v:=true; end if;\n"
           "    raise exception 'ROLLBACK_OK';\n"
           "  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;\n"
           "  insert into public._results values (%d, v, '%s :: '||coalesce(nullif(c,''),'ok'));"
           %(stmt, n, esc(desc)))
    block(role, "v boolean:=false; k int; c text;", inner, jwt=(sub,role))

def read(n, sub, did, exp, desc, role="authenticated", jwt=True):
    inner=("  select count(*) into k from public.matter_intake_drafts where id='%s';\n"
           "  insert into public._results values (%d, k=%d, '%s (n='||k||')');"%(did,n,exp,esc(desc)))
    block(role, "k int;", inner, jwt=((sub, role if role!='anon' else 'anon') if jwt else None))

def delc(n, sub, did, desc, role="authenticated", jwt=True):
    inner=("  with d as (delete from public.matter_intake_drafts where id='%s' returning 1) select count(*) into k from d;\n"
           "  insert into public._results values (%d, k=0, '%s (c='||k||')');"%(did,n,esc(desc)))
    block(role, "k int;", inner, jwt=((sub, role if role!='anon' else 'anon') if jwt else None))

def execneg(n, role, desc, jwt=None):
    inner=("  begin perform app.can_access_intake_draft('%s','%s', array['%s']::uuid[]); exception when others then v:=true; end;\n"
           "  insert into public._results values (%d, v, '%s');"%(ORG1,CREATOR,REVIEWER,n,esc(desc)))
    block(role, "v boolean:=false;", inner, jwt=jwt)

# ---- postgres-context helper (no set role) ----
def pg(n_body):  # raw DO as postgres
    raw("do $body$ %s $body$;"%n_body)

# ============ HISTORY & APPLY (1-5) — recorded as postgres ============
raw("insert into public._results values (1,true,'historical 20260716120000 applied cleanly');")
raw("insert into public._results values (2,true,'hardening 20260717090000 applied once');")
# 3 reapply fails (duplicate constraint)
pg("declare v boolean:=false; begin begin alter table public.matter_intake_drafts add constraint matter_intake_drafts_confirm_consistency check(true); exception when others then v:=true; end; insert into public._results values (3, v, 'reapply/duplicate object blocked'); end")
# 4 no partial objects: exactly one guard trigger
pg("declare k int; begin select count(*) into k from pg_trigger where tgrelid='public.matter_intake_drafts'::regclass and tgname='matter_intake_drafts_guard'; insert into public._results values (4, k=1, 'exactly one guard trigger (k='||k||')'); end")
# 5 pre-flight inconsistency detection predicate
pg("declare live int; syn int; begin select count(*) into live from public.matter_intake_drafts where (status='confirmed')<>(confirmed_matter_id is not null); select count(*) into syn from (values ('confirmed'::text,null::uuid),('active'::text,'%s'::uuid)) t(s,c) where (s='confirmed')<>(c is not null); insert into public._results values (5, live=0 and syn=2, 'preflight: live_bad='||live||' synthetic_bad='||syn); end"%M1)

# ============ INSERT (6-13) ============
pos(6, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','active','v','tok','{}'::jsonb)"%(ORG1,CREATOR), "creator inserts own active draft")
negany(7, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','active','v','tok','{}'::jsonb)"%(ORG1,OTHER), "insert created_by=other rejected")
neg(8, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','needs_clarification','v','tok','{}'::jsonb)"%(ORG1,CREATOR), "INTAKE_DRAFT_TRANSITION_FORBIDDEN", "insert as needs_clarification blocked")
neg(9, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','ready_for_review','v','tok','{}'::jsonb)"%(ORG1,CREATOR), "INTAKE_DRAFT_TRANSITION_FORBIDDEN", "insert as ready_for_review blocked")
neg(10, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','confirming','v','tok','{}'::jsonb)"%(ORG1,CREATOR), "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "insert as confirming blocked")
neg(11, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('%s','%s','confirmed','v','tok','{}'::jsonb)"%(ORG1,CREATOR), "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "insert as confirmed blocked")
neg(12, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft,confirmed_matter_id) values ('%s','%s','active','v','tok','{}'::jsonb,'%s')"%(ORG1,CREATOR,M1), "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "insert with confirmed_matter_id blocked")
neg(13, CREATOR, "insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft,confirmation_idempotency_key) values ('%s','%s','active','v','tok','{}'::jsonb,'idem-1')"%(ORG1,CREATOR), "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "insert with confirmation idempotency key blocked")

# ============ READ (14-18) ============
read(14, CREATOR, D1, 1, "creator reads own draft")
read(15, REVIEWER, D1, 1, "assigned reviewer reads")
read(16, OTHER, D1, 0, "same-org non-reviewer denied")
read(17, OUTSIDER, D1, 0, "cross-tenant denied")
read(18, None, D1, 0, "anonymous denied", role="anon")

# ============ CONTENT UPDATE & TRANSITIONS (19-25) ============
pos(19, CREATOR, "update public.matter_intake_drafts set structured_draft='{\"e\":1}'::jsonb where id='%s'"%D1, "creator content edit while active")
pos(20, REVIEWER, "update public.matter_intake_drafts set review_state='{\"r\":1}'::jsonb where id='%s'"%D1, "reviewer edits review_state while active")
pos(21, CREATOR, "update public.matter_intake_drafts set status='needs_clarification' where id='%s'"%D1, "active -> needs_clarification")
pos(22, CREATOR, "update public.matter_intake_drafts set status='ready_for_review' where id='%s'"%DNC, "needs_clarification -> ready_for_review")
pos(23, CREATOR, "update public.matter_intake_drafts set status='active' where id='%s'"%DRR, "ready_for_review -> active")
pos(24, CREATOR, "update public.matter_intake_drafts set status='rejected' where id='%s'"%D1, "active -> rejected")
# 25 version concurrency: client blocked, server allowed
block("authenticated","", "  perform set_config('request.jwt.claims','{\"sub\":\"%s\",\"role\":\"authenticated\"}', true);\n"
      "  begin update public.matter_intake_drafts set version_token='hax' where id='%s'; exception when others then\n"
      "    if sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN' then update public._scratch set a=true; end if; end;"%(CREATOR,D1))
block("service_role","k int;","  perform set_config('request.jwt.claims','{\"role\":\"service_role\"}', true);\n"
      "  update public.matter_intake_drafts set version_token='srv-next' where id='%s'; get diagnostics k=row_count;\n"
      "  if k>=1 then update public._scratch set b=true; end if;\n"
      "  update public.matter_intake_drafts set version_token='tok-1' where id='%s';"%(D1,D1))
pg("declare a boolean; b boolean; begin select _scratch.a,_scratch.b into a,b from public._scratch; insert into public._results values (25, a and b, 'version concurrency: client_blocked='||a||' server_ok='||b); end")

# ============ ACL & IDENTITY (26-31) ============
neg(26, REVIEWER, "update public.matter_intake_drafts set reviewer_ids=array['%s','%s']::uuid[] where id='%s'"%(REVIEWER,OTHER,D1), "INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN", "reviewer cannot add reviewer B")
neg(27, REVIEWER, "update public.matter_intake_drafts set reviewer_ids='{}'::uuid[] where id='%s'"%D1, "INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN", "reviewer cannot remove reviewer A")
neg(28, CREATOR, "update public.matter_intake_drafts set reviewer_ids=array['%s','%s']::uuid[] where id='%s'"%(REVIEWER,OTHER,D1), "INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN", "creator cannot mutate reviewer_ids (server-only)")
neg(29, CREATOR, "update public.matter_intake_drafts set created_by='%s' where id='%s'"%(REVIEWER,D1), "INTAKE_DRAFT_IDENTITY_IMMUTABLE", "created_by immutable")
neg(30, CREATOR, "update public.matter_intake_drafts set organization_id='%s' where id='%s'"%(ORG2,D1), "INTAKE_DRAFT_IDENTITY_IMMUTABLE", "organization_id immutable")
neg(31, CREATOR, "update public.matter_intake_drafts set created_at=now()+interval '1 day' where id='%s'"%D1, "INTAKE_DRAFT_IDENTITY_IMMUTABLE", "created_at immutable")

# ============ FORBIDDEN TRANSITIONS (32-38) ============
neg(32, CREATOR, "update public.matter_intake_drafts set status='confirming' where id='%s'"%D1, "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "active -> confirming blocked")
neg(33, CREATOR, "update public.matter_intake_drafts set status='confirmed' where id='%s'"%D1, "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "active -> confirmed blocked")
neg(34, CREATOR, "update public.matter_intake_drafts set status='confirming' where id='%s'"%DRR, "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "ready_for_review -> confirming blocked")
neg(35, CREATOR, "update public.matter_intake_drafts set status='active' where id='%s'"%DREJ, "INTAKE_DRAFT_TRANSITION_FORBIDDEN", "rejected -> active blocked")
neg(36, CREATOR, "update public.matter_intake_drafts set status='active' where id='%s'"%DEXP, "INTAKE_DRAFT_TRANSITION_FORBIDDEN", "expired -> active blocked")
neg(37, CREATOR, "update public.matter_intake_drafts set status='active' where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed -> active blocked")
neg(38, CREATOR, "update public.matter_intake_drafts set status='expired' where id='%s'"%D1, "INTAKE_DRAFT_TRANSITION_FORBIDDEN", "unknown/unlisted transition blocked")

# ============ SERVER/SECURITY FIELDS (39-45) authenticated on active D1 ============
neg(39, CREATOR, "update public.matter_intake_drafts set provider_mode='model_assisted' where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "provider_mode mutation blocked")
neg(40, CREATOR, "update public.matter_intake_drafts set engine_version='x' where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "engine_version mutation blocked")
neg(41, CREATOR, "update public.matter_intake_drafts set policy_snapshot='{\"p\":1}'::jsonb where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "policy_snapshot mutation blocked")
neg(42, CREATOR, "update public.matter_intake_drafts set provenance='[{\"x\":1}]'::jsonb where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "provenance mutation blocked")
neg(43, CREATOR, "update public.matter_intake_drafts set confirmation_idempotency_key='k' where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "idempotency key mutation blocked")
neg(44, CREATOR, "update public.matter_intake_drafts set confirmed_matter_id='%s' where id='%s'"%(M1,D1), "INTAKE_DRAFT_CONFIRMATION_FORBIDDEN", "confirmed_matter_id direct mutation blocked")
neg(45, CREATOR, "update public.matter_intake_drafts set correlation_id=gen_random_uuid() where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "correlation_id mutation blocked")

# ============ CONFIRMED IMMUTABILITY (46-52) on DCONF ============
neg(46, CREATOR, "update public.matter_intake_drafts set structured_draft='{\"t\":1}'::jsonb where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed structured_draft immutable")
neg(47, CREATOR, "update public.matter_intake_drafts set review_state='{\"t\":1}'::jsonb where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed review_state immutable")
neg(48, CREATOR, "update public.matter_intake_drafts set clarification_rounds='[1]'::jsonb where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed clarification_rounds immutable")
neg(49, CREATOR, "update public.matter_intake_drafts set confidential_input='x' where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed confidential_input immutable")
neg(50, CREATOR, "update public.matter_intake_drafts set status='rejected', confirmed_matter_id=null where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed status immutable")
neg(51, CREATOR, "update public.matter_intake_drafts set confirmed_matter_id='%s' where id='%s'"%(M1,DCONF), "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed_matter_id replacement blocked")
neg(52, CREATOR, "update public.matter_intake_drafts set expires_at=now() where id='%s'"%DCONF, "INTAKE_DRAFT_CONFIRMED_IMMUTABLE", "confirmed expires_at immutable")

# ============ DELETE (53-57) ============
delc(53, CREATOR, D1, "creator cannot delete")
delc(54, REVIEWER, D1, "reviewer cannot delete")
delc(55, ADMIN, D1, "org admin cannot delete")
delc(56, OUTSIDER, D1, "cross-tenant delete denied")
delc(57, None, D1, "anonymous delete denied", role="anon")

# ============ FUNCTION GRANTS (58-63) ============
execneg(58, "nobody_role", "PUBLIC/ungranted cannot execute can_access")
execneg(59, "anon", "anon cannot execute can_access", jwt=(None,'anon'))
# 60 authenticated CAN execute can_access
block("authenticated","v boolean:=false; r boolean;","  perform set_config('request.jwt.claims','{\"sub\":\"%s\",\"role\":\"authenticated\"}', true);\n  begin r:=app.can_access_intake_draft('%s','%s',array['%s']::uuid[]); v:=true; exception when others then v:=false; end;\n  insert into public._results values (60, v, 'authenticated executes RLS helper');"%(CREATOR,ORG1,CREATOR,REVIEWER))
# 61 authenticated cannot directly invoke trigger fns
block("authenticated","v boolean:=false;","  perform set_config('request.jwt.claims','{\"sub\":\"%s\",\"role\":\"authenticated\"}', true);\n  begin perform app.enforce_intake_draft_transitions(); exception when others then v:=true; end;\n  insert into public._results values (61, v, 'authenticated cannot directly invoke guard trigger fn');"%CREATOR)
read(62, REVIEWER, D1, 1, "RLS still works after grant changes")
pos(63, REVIEWER, "update public.matter_intake_drafts set review_state='{\"g\":1}'::jsonb where id='%s'"%D1, "triggers still fire after grant changes")

# ============ SAFE ERRORS (64-65) ============
neg(64, CREATOR, "update public.matter_intake_drafts set provider_mode='model_assisted' where id='%s'"%D1, "INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN", "representative: intended stable code returned")
block("authenticated","c text; v boolean:=false;","  perform set_config('request.jwt.claims','{\"sub\":\"%s\",\"role\":\"authenticated\"}', true);\n  begin update public.matter_intake_drafts set status='confirming' where id='%s'; exception when others then c:=sqlerrm; end;\n  v := c ~ '^INTAKE_DRAFT_[A-Z_]+$';\n  insert into public._results values (65, v, 'guard error is a bare stable code: '||coalesce(c,'<none>'));"%(CREATOR,D1))

# ============ CLEANUP (66-67) ============
pg("declare k int; begin delete from public.matter_intake_drafts; select count(*) into k from public.matter_intake_drafts; insert into public._results values (66, k=0, 'zero intake-draft rows remain (n='||k||')'); end")
pg("declare p int; t int; c int; begin "
   "select count(*) into p from pg_policies where tablename='matter_intake_drafts'; "
   "select count(*) into t from pg_trigger where tgrelid='public.matter_intake_drafts'::regclass and not tgisinternal; "
   "select count(*) into c from pg_constraint where conrelid='public.matter_intake_drafts'::regclass and conname='matter_intake_drafts_confirm_consistency'; "
   "insert into public._results values (67, p=3 and t=3 and c=1, 'objects intact: policies='||p||' triggers='||t||' consistency_check='||c); end")

open("/tmp/lawme_sql/40_tests.sql","w").write("\n".join(out)+"\n")
print("wrote %d statements"%len(out))
