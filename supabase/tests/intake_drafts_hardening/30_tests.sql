insert into public._results values (1,true,'historical 20260716120000 applied cleanly');
insert into public._results values (2,true,'hardening 20260717090000 applied once');
do $body$ declare v boolean:=false; begin begin alter table public.matter_intake_drafts add constraint matter_intake_drafts_confirm_consistency check(true); exception when others then v:=true; end; insert into public._results values (3, v, 'reapply/duplicate object blocked'); end $body$;
do $body$ declare k int; begin select count(*) into k from pg_trigger where tgrelid='public.matter_intake_drafts'::regclass and tgname='matter_intake_drafts_guard'; insert into public._results values (4, k=1, 'exactly one guard trigger (k='||k||')'); end $body$;
do $body$ declare live int; syn int; begin select count(*) into live from public.matter_intake_drafts where (status='confirmed')<>(confirmed_matter_id is not null); select count(*) into syn from (values ('confirmed'::text,null::uuid),('active'::text,'c1111111-1111-1111-1111-111111111111'::uuid)) t(s,c) where (s='confirmed')<>(c is not null); insert into public._results values (5, live=0 and syn=2, 'preflight: live_bad='||live||' synthetic_bad='||syn); end $body$;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','active','v','tok','{}'::jsonb); get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (6, v, 'creator inserts own active draft :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','active','v','tok','{}'::jsonb);
  exception when others then v:=true; c:=sqlerrm; end;
  insert into public._results values (7, v, 'insert created_by=other rejected :: '||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','needs_clarification','v','tok','{}'::jsonb);
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_TRANSITION_FORBIDDEN'); end;
  insert into public._results values (8, v, 'insert as needs_clarification blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','ready_for_review','v','tok','{}'::jsonb);
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_TRANSITION_FORBIDDEN'); end;
  insert into public._results values (9, v, 'insert as ready_for_review blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','confirming','v','tok','{}'::jsonb);
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (10, v, 'insert as confirming blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','confirmed','v','tok','{}'::jsonb);
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (11, v, 'insert as confirmed blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft,confirmed_matter_id) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','active','v','tok','{}'::jsonb,'c1111111-1111-1111-1111-111111111111');
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (12, v, 'insert with confirmed_matter_id blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    insert into public.matter_intake_drafts (organization_id,created_by,status,engine_version,version_token,structured_draft,confirmation_idempotency_key) values ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','active','v','tok','{}'::jsonb,'idem-1');
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (13, v, 'insert with confirmation idempotency key blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (14, k=1, 'creator reads own draft (n='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (15, k=1, 'assigned reviewer reads (n='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (16, k=0, 'same-org non-reviewer denied (n='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (17, k=0, 'cross-tenant denied (n='||k||')');
end $body$;
commit;
begin; set local role anon;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (18, k=0, 'anonymous denied (n='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set structured_draft='{"e":1}'::jsonb where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (19, v, 'creator content edit while active :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set review_state='{"r":1}'::jsonb where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (20, v, 'reviewer edits review_state while active :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='needs_clarification' where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (21, v, 'active -> needs_clarification :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='ready_for_review' where id='d2222222-2222-2222-2222-222222222222'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (22, v, 'needs_clarification -> ready_for_review :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='active' where id='d3333333-3333-3333-3333-333333333333'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (23, v, 'ready_for_review -> active :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='rejected' where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (24, v, 'active -> rejected :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin update public.matter_intake_drafts set version_token='hax' where id='d1111111-1111-1111-1111-111111111111'; exception when others then
    if sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN' then update public._scratch set a=true; end if; end;
end $body$;
commit;
begin; set local role service_role;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"role":"service_role"}', true);
  update public.matter_intake_drafts set version_token='srv-next' where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
  if k>=1 then update public._scratch set b=true; end if;
  update public.matter_intake_drafts set version_token='tok-1' where id='d1111111-1111-1111-1111-111111111111';
end $body$;
commit;
do $body$ declare a boolean; b boolean; begin select _scratch.a,_scratch.b into a,b from public._scratch; insert into public._results values (25, a and b, 'version concurrency: client_blocked='||a||' server_ok='||b); end $body$;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set reviewer_ids=array['a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003']::uuid[] where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN'); end;
  insert into public._results values (26, v, 'reviewer cannot add reviewer B :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set reviewer_ids='{}'::uuid[] where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN'); end;
  insert into public._results values (27, v, 'reviewer cannot remove reviewer A :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set reviewer_ids=array['a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003']::uuid[] where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN'); end;
  insert into public._results values (28, v, 'creator cannot mutate reviewer_ids (server-only) :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set created_by='a0000000-0000-0000-0000-000000000002' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_IDENTITY_IMMUTABLE'); end;
  insert into public._results values (29, v, 'created_by immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set organization_id='22222222-2222-2222-2222-222222222222' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_IDENTITY_IMMUTABLE'); end;
  insert into public._results values (30, v, 'organization_id immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set created_at=now()+interval '1 day' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_IDENTITY_IMMUTABLE'); end;
  insert into public._results values (31, v, 'created_at immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='confirming' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (32, v, 'active -> confirming blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='confirmed' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (33, v, 'active -> confirmed blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='confirming' where id='d3333333-3333-3333-3333-333333333333';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (34, v, 'ready_for_review -> confirming blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='active' where id='d4444444-4444-4444-4444-444444444444';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_TRANSITION_FORBIDDEN'); end;
  insert into public._results values (35, v, 'rejected -> active blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='active' where id='d5555555-5555-5555-5555-555555555555';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_TRANSITION_FORBIDDEN'); end;
  insert into public._results values (36, v, 'expired -> active blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='active' where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (37, v, 'confirmed -> active blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='expired' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_TRANSITION_FORBIDDEN'); end;
  insert into public._results values (38, v, 'unknown/unlisted transition blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set provider_mode='model_assisted' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (39, v, 'provider_mode mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set engine_version='x' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (40, v, 'engine_version mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set policy_snapshot='{"p":1}'::jsonb where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (41, v, 'policy_snapshot mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set provenance='[{"x":1}]'::jsonb where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (42, v, 'provenance mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set confirmation_idempotency_key='k' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (43, v, 'idempotency key mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set confirmed_matter_id='c1111111-1111-1111-1111-111111111111' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMATION_FORBIDDEN'); end;
  insert into public._results values (44, v, 'confirmed_matter_id direct mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set correlation_id=gen_random_uuid() where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (45, v, 'correlation_id mutation blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set structured_draft='{"t":1}'::jsonb where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (46, v, 'confirmed structured_draft immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set review_state='{"t":1}'::jsonb where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (47, v, 'confirmed review_state immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set clarification_rounds='[1]'::jsonb where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (48, v, 'confirmed clarification_rounds immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set confidential_input='x' where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (49, v, 'confirmed confidential_input immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set status='rejected', confirmed_matter_id=null where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (50, v, 'confirmed status immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set confirmed_matter_id='c1111111-1111-1111-1111-111111111111' where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (51, v, 'confirmed_matter_id replacement blocked :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set expires_at=now() where id='dccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_CONFIRMED_IMMUTABLE'); end;
  insert into public._results values (52, v, 'confirmed expires_at immutable :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  with d as (delete from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111' returning 1) select count(*) into k from d;
  insert into public._results values (53, k=0, 'creator cannot delete (c='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  with d as (delete from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111' returning 1) select count(*) into k from d;
  insert into public._results values (54, k=0, 'reviewer cannot delete (c='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
  with d as (delete from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111' returning 1) select count(*) into k from d;
  insert into public._results values (55, k=0, 'org admin cannot delete (c='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  with d as (delete from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111' returning 1) select count(*) into k from d;
  insert into public._results values (56, k=0, 'cross-tenant delete denied (c='||k||')');
end $body$;
commit;
begin; set local role anon;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  with d as (delete from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111' returning 1) select count(*) into k from d;
  insert into public._results values (57, k=0, 'anonymous delete denied (c='||k||')');
end $body$;
commit;
begin; set local role nobody_role;
do $body$ declare v boolean:=false;
begin
  begin perform app.can_access_intake_draft('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001', array['a0000000-0000-0000-0000-000000000002']::uuid[]); exception when others then v:=true; end;
  insert into public._results values (58, v, 'PUBLIC/ungranted cannot execute can_access');
end $body$;
commit;
begin; set local role anon;
do $body$ declare v boolean:=false;
begin
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  begin perform app.can_access_intake_draft('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001', array['a0000000-0000-0000-0000-000000000002']::uuid[]); exception when others then v:=true; end;
  insert into public._results values (59, v, 'anon cannot execute can_access');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; r boolean;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin r:=app.can_access_intake_draft('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',array['a0000000-0000-0000-0000-000000000002']::uuid[]); v:=true; exception when others then v:=false; end;
  insert into public._results values (60, v, 'authenticated executes RLS helper');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin perform app.enforce_intake_draft_transitions(); exception when others then v:=true; end;
  insert into public._results values (61, v, 'authenticated cannot directly invoke guard trigger fn');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare k int;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  select count(*) into k from public.matter_intake_drafts where id='d1111111-1111-1111-1111-111111111111';
  insert into public._results values (62, k=1, 'RLS still works after grant changes (n='||k||')');
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; k int; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set review_state='{"g":1}'::jsonb where id='d1111111-1111-1111-1111-111111111111'; get diagnostics k=row_count;
    if k>=1 then v:=true; end if;
    raise exception 'ROLLBACK_OK';
  exception when others then if sqlerrm<>'ROLLBACK_OK' then v:=false; c:=sqlerrm; end if; end;
  insert into public._results values (63, v, 'triggers still fire after grant changes :: '||coalesce(nullif(c,''),'ok'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare v boolean:=false; c text;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin
    update public.matter_intake_drafts set provider_mode='model_assisted' where id='d1111111-1111-1111-1111-111111111111';
  exception when others then c:=sqlerrm; v:=(sqlerrm='INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN'); end;
  insert into public._results values (64, v, 'representative: intended stable code returned :: got='||coalesce(nullif(c,''),'<no-error>'));
end $body$;
commit;
begin; set local role authenticated;
do $body$ declare c text; v boolean:=false;
begin
  perform set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  begin update public.matter_intake_drafts set status='confirming' where id='d1111111-1111-1111-1111-111111111111'; exception when others then c:=sqlerrm; end;
  v := c ~ '^INTAKE_DRAFT_[A-Z_]+$';
  insert into public._results values (65, v, 'guard error is a bare stable code: '||coalesce(c,'<none>'));
end $body$;
commit;
do $body$ declare k int; begin delete from public.matter_intake_drafts; select count(*) into k from public.matter_intake_drafts; insert into public._results values (66, k=0, 'zero intake-draft rows remain (n='||k||')'); end $body$;
do $body$ declare p int; t int; c int; begin select count(*) into p from pg_policies where tablename='matter_intake_drafts'; select count(*) into t from pg_trigger where tgrelid='public.matter_intake_drafts'::regclass and not tgisinternal; select count(*) into c from pg_constraint where conrelid='public.matter_intake_drafts'::regclass and conname='matter_intake_drafts_confirm_consistency'; insert into public._results values (67, p=3 and t=3 and c=1, 'objects intact: policies='||p||' triggers='||t||' consistency_check='||c); end $body$;
