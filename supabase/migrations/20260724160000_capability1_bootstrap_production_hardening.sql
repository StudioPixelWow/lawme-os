-- ============================================================================
-- LawME — Capability 1 · Slice 1.0.F: Bootstrap PRODUCTION HARDENING
--   Additive migration. Does NOT modify or rerun any historical migration.
--   Development-only target on a SEPARATE founder apply gate. Production NEVER touched.
--
-- WHAT (hardening only — no new product functionality)
--   1. Aggregate-limit BACKSTOP in app.bootstrap_matter_v1: rejects an over-limit
--      aggregate (members must be exactly 1; contacts<=100, participants<=100,
--      facts<=500, deadlines<=200, evidence<=200) BEFORE any write, returning the
--      stable structured code BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED. Mirrors the pure
--      Validation Engine AggregateLimitPolicy v1 (CI-verified identical).
--   2. Graceful, NARROW Matter-slug collision handling: on the exact
--      (organization_id, slug) unique violation only, retry ONCE with the full-uuid
--      slug; any other unique violation re-raises (never swallowed). No change to
--      the canonical Matter identity model, idempotency, or transaction semantics.
--
--   No RLS change, no ownership-model change, no privilege change, no table-shape
--   change, no historical-migration change. The RPC remains SECURITY DEFINER owned
--   by lawme_bootstrap, resolves the actor via app.actor_uid(), search_path=''.
--
-- OWNERSHIP MECHANICS: replacing the lawme_bootstrap-owned function from the
--   non-superuser migration role requires acting AS that role with transient
--   CREATE on schema app (revoked before COMMIT) — the reviewed 1.0.4 pattern.
-- SINGLE TRANSACTION: any failure rolls back the whole migration.
-- ============================================================================

begin;

-- Pre-flight — the internal RPC must exist as the approved principal.
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='bootstrap_matter_v1'
         and p.prosecdef and pg_get_userbyid(p.proowner)='lawme_bootstrap') then
    raise exception 'preflight: app.bootstrap_matter_v1 (lawme_bootstrap SECURITY DEFINER) required';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='actor_uid') then
    raise exception 'preflight: app.actor_uid() required';
  end if;
end $$;

-- Replace the RPC (hardened body) AS its owner; CREATE granted transiently.
grant lawme_bootstrap to postgres with set true;   -- idempotent
grant create on schema app to lawme_bootstrap;       -- transient
set local role lawme_bootstrap;

create or replace function app.bootstrap_matter_v1(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  c_rpc_version         constant text := 'bootstrap-rpc-v1';
  c_bootstrap_version   constant text := 'matter-bootstrap-v1';
  c_planner_version     constant text := 'matter-aggregate-planner-v1';
  c_validation_version  constant text := 'bootstrap-validation-v1';

  v_actor       uuid := (select app.actor_uid());   -- actor via the postgres-owned wrapper (1.0.4B)
  v_actor_role  text;
  v_draft       public.matter_intake_drafts%rowtype;
  v_agg         jsonb := p_payload -> 'aggregate';
  v_matter      jsonb := v_agg -> 'matter';
  v_draft_id    uuid;
  v_version_tok text := p_payload -> 'draft' ->> 'versionToken';
  v_idem_key    text := p_payload -> 'idempotency' ->> 'key';
  v_plan_hash   text := p_payload -> 'idempotency' ->> 'planHash';
  v_org         uuid;
  v_matter_id   uuid;
  v_stage       text;
  v_slug        text;
  v_matter_role text;
  v_conf        text := v_matter ->> 'confidentiality';
  v_ai          text := v_matter ->> 'aiPolicy';
  v_proc        text := v_matter ->> 'procedureType';
  v_contact_ids jsonb := '{}'::jsonb;
  v_elem        jsonb;
  v_cid         uuid;
  v_ckey        text;
  v_status      text;
  v_n_contacts  int := 0;
  v_n_parts     int := 0;
  v_n_facts     int := 0;
  v_n_deadlines int := 0;
  v_n_evidence  int := 0;
  v_constraint  text;
begin
  if v_actor is null then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNAUTHENTICATED';
  end if;
  if p_payload ->> 'rpcVersion' is distinct from c_rpc_version
     or p_payload ->> 'bootstrapVersion' is distinct from c_bootstrap_version then
    raise exception using errcode='P0001', message='BOOTSTRAP_VERSION_UNSUPPORTED';
  end if;
  if v_agg is null or v_matter is null
     or (v_agg ->> 'aggregateVersion') is distinct from '1'
     or (v_agg -> 'metadata' ->> 'plannerVersion') is distinct from c_planner_version
     or (v_agg -> 'metadata' ->> 'validationVersion') is distinct from c_validation_version then
    raise exception using errcode='P0001', message='BOOTSTRAP_VERSION_UNSUPPORTED';
  end if;
  if v_idem_key is null or v_plan_hash is null or v_plan_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='P0001', message='BOOTSTRAP_MALFORMED_PAYLOAD';
  end if;

  -- Slice 1.0.F — aggregate-limit backstop (mirror of AggregateLimitPolicy v1).
  -- Reject an over-limit aggregate BEFORE any write. Equal-or-stricter than the
  -- Validation Engine ceilings; members must be exactly 1.
  if coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'members')='array' then v_agg->'members' else '[]'::jsonb end),0) <> 1
     or coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'contacts')='array' then v_agg->'contacts' else '[]'::jsonb end),0) > 100
     or coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'participants')='array' then v_agg->'participants' else '[]'::jsonb end),0) > 100
     or coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'facts')='array' then v_agg->'facts' else '[]'::jsonb end),0) > 500
     or coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'deadlines')='array' then v_agg->'deadlines' else '[]'::jsonb end),0) > 200
     or coalesce(jsonb_array_length(case when jsonb_typeof(v_agg->'evidence')='array' then v_agg->'evidence' else '[]'::jsonb end),0) > 200 then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED');
  end if;
  begin
    v_draft_id := (p_payload -> 'draft' ->> 'id')::uuid;
  exception when others then
    raise exception using errcode='P0001', message='BOOTSTRAP_MALFORMED_PAYLOAD';
  end;
  if v_draft_id is null or v_version_tok is null then
    raise exception using errcode='P0001', message='BOOTSTRAP_MALFORMED_PAYLOAD';
  end if;

  perform 1 from public.profiles where id = v_actor;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;

  select * into v_draft from public.matter_intake_drafts where id = v_draft_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;
  v_org := v_draft.organization_id;

  if v_draft.status = 'confirmed' or v_draft.confirmed_matter_id is not null then
    if v_draft.confirmation_idempotency_key is not distinct from v_idem_key
       and v_draft.confirmation_plan_hash is not distinct from v_plan_hash then
      return jsonb_build_object('ok', true, 'code', 'BOOTSTRAP_ALREADY_COMMITTED',
        'matterId', v_draft.confirmed_matter_id, 'draftId', v_draft_id,
        'idempotencyKey', v_idem_key, 'planHash', v_plan_hash);
    end if;
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_IDEMPOTENCY_CONFLICT', 'draftId', v_draft_id);
  end if;

  if not app.can_confirm_intake_draft(v_draft_id) then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;

  if v_draft.version_token is distinct from v_version_tok then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_STALE_DRAFT', 'draftId', v_draft_id);
  end if;

  select m.role into v_actor_role from public.organization_memberships m
    where m.organization_id = v_org and m.profile_id = v_actor and m.status = 'active';
  v_matter_role := 'partner';

  if v_conf not in ('internal','client_confidential','privileged') then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
  end if;
  if v_ai not in ('allowed','allowed_with_review','prohibited') then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
  end if;
  v_stage := app.initial_stage_for(v_proc);
  if v_stage is null then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNSUPPORTED_PROCEDURE';
  end if;
  v_slug := 'm-' || replace(left(v_draft_id::text, 18), '-', '');

  begin
    update public.matter_intake_drafts
      set status = 'confirming', confirmation_idempotency_key = v_idem_key,
          confirmation_plan_hash = v_plan_hash, confirmation_bootstrap_version = c_bootstrap_version
      where id = v_draft_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_IDEMPOTENCY_CONFLICT', 'draftId', v_draft_id);
  end;

  -- Slice 1.0.F — graceful, narrow slug-collision handling. The deterministic
  -- primary slug (truncated Draft uuid) is preserved when free; on the EXACT
  -- (organization_id, slug) collision only, retry ONCE with the full-uuid slug
  -- (collision-free for distinct Drafts). Any other unique violation re-raises.
  begin
    insert into public.matters (organization_id, slug, title_he, forum_he, legal_domain,
                                procedure_type, topic, current_stage_id, status, assigned_owner_id,
                                confidentiality, ai_policy)
    values (v_org, v_slug, v_matter ->> 'titleHe', v_matter ->> 'forumHe', 'labor',
            v_proc, coalesce(nullif(v_matter ->> 'topicHe',''), v_proc), v_stage, 'open', v_actor,
            v_conf, v_ai)
    returning id into v_matter_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint is distinct from 'matters_organization_id_slug_key' then raise; end if;
    v_slug := 'm-' || replace(v_draft_id::text, '-', '');
    insert into public.matters (organization_id, slug, title_he, forum_he, legal_domain,
                                procedure_type, topic, current_stage_id, status, assigned_owner_id,
                                confidentiality, ai_policy)
    values (v_org, v_slug, v_matter ->> 'titleHe', v_matter ->> 'forumHe', 'labor',
            v_proc, coalesce(nullif(v_matter ->> 'topicHe',''), v_proc), v_stage, 'open', v_actor,
            v_conf, v_ai)
    returning id into v_matter_id;
  end;

  insert into public.matter_members (organization_id, matter_id, profile_id, matter_role, can_review, can_approve)
  values (v_org, v_matter_id, v_actor, v_matter_role, true, true);

  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'contacts', '[]'::jsonb)) loop
    v_ckey := v_elem ->> 'contactKey';
    if (v_elem ->> 'classification') = 'link_existing' then
      select id into v_cid from public.contacts
        where id = (v_elem ->> 'contactId')::uuid and organization_id = v_org and archived_at is null;
      if v_cid is null then
        raise exception using errcode='P0001', message='BOOTSTRAP_CROSS_TENANT';
      end if;
    elsif (v_elem ->> 'classification') = 'create_new' then
      if (v_elem ->> 'kind') not in ('person','company') then
        raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
      end if;
      insert into public.contacts (organization_id, kind, name_he, created_by)
      values (v_org, v_elem ->> 'kind', v_elem ->> 'nameHe', v_actor)
      returning id into v_cid;
      v_n_contacts := v_n_contacts + 1;
    elsif (v_elem ->> 'classification') = 'deferred' then
      continue;
    else
      raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
    end if;
    v_contact_ids := v_contact_ids || jsonb_build_object(v_ckey, v_cid);
  end loop;

  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'participants', '[]'::jsonb)) loop
    v_ckey := v_elem ->> 'contactKey';
    v_cid := nullif(v_contact_ids ->> v_ckey, '')::uuid;
    if v_cid is null then
      raise exception using errcode='P0001', message='BOOTSTRAP_INVALID_REFERENCE';
    end if;
    insert into public.matter_participants (organization_id, matter_id, contact_id, role, created_by)
    values (v_org, v_matter_id, v_cid, v_elem ->> 'role', v_actor);
    v_n_parts := v_n_parts + 1;
  end loop;

  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'facts', '[]'::jsonb)) loop
    v_status := v_elem ->> 'status';
    if v_status not in ('client_alleged','opposing_alleged','disputed','unknown') then
      raise exception using errcode='P0001', message='BOOTSTRAP_INVALID_FACT_STATE';
    end if;
    insert into public.matter_facts (organization_id, matter_id, fact_key, statement_he, status, provenance, created_by)
    values (v_org, v_matter_id, v_elem ->> 'factKey', v_elem ->> 'statementHe', v_status,
            coalesce(v_elem -> 'provenance', '{}'::jsonb), v_actor);
    v_n_facts := v_n_facts + 1;
  end loop;

  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'deadlines', '[]'::jsonb)) loop
    insert into public.matter_deadlines (organization_id, matter_id, label_he, due_at, strict, basis_he,
                                        source, confidence, timezone, provenance, created_by)
    values (v_org, v_matter_id, v_elem ->> 'labelHe',
            nullif(v_elem ->> 'dueAt','')::timestamptz,
            coalesce((v_elem ->> 'strict')::boolean, false),
            v_elem ->> 'basisHe', v_elem ->> 'source', v_elem ->> 'confidence',
            coalesce(nullif(v_elem ->> 'timezone',''), 'Asia/Jerusalem'), '{}'::jsonb, v_actor);
    v_n_deadlines := v_n_deadlines + 1;
  end loop;

  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'evidence', '[]'::jsonb)) loop
    insert into public.matter_evidence (organization_id, matter_id, label_he, evidence_type, mandatory, status)
    values (v_org, v_matter_id, v_elem ->> 'labelHe', 'document',
            coalesce((v_elem ->> 'mandatory')::boolean, false), 'required');
    v_n_evidence := v_n_evidence + 1;
  end loop;

  insert into public.audit_events (organization_id, actor, actor_role, event_type, object_type, object_id, payload)
  values (v_org, v_actor, v_actor_role, 'matter.bootstrapped', 'matter', v_matter_id,
          jsonb_build_object(
            'draftId', v_draft_id,
            'idempotencyKeyHash', encode(extensions.digest(v_idem_key, 'sha256'), 'hex'),
            'planHash', v_plan_hash, 'bootstrapVersion', c_bootstrap_version,
            'plannerVersion', c_planner_version, 'validationVersion', c_validation_version,
            'aggregateVersion', 1, 'sourceInputHash', v_agg ->> 'sourceInputHash',
            'correlationId', p_payload ->> 'correlationId',
            'counts', jsonb_build_object('contacts', v_n_contacts, 'participants', v_n_parts,
                        'facts', v_n_facts, 'deadlines', v_n_deadlines, 'evidence', v_n_evidence)));

  update public.matter_intake_drafts
    set status = 'confirmed', confirmed_matter_id = v_matter_id, confirmed_at = now()
    where id = v_draft_id;

  return jsonb_build_object('ok', true, 'code', 'BOOTSTRAP_CREATED',
    'matterId', v_matter_id, 'draftId', v_draft_id, 'idempotencyKey', v_idem_key, 'planHash', v_plan_hash,
    'created', jsonb_build_object('contacts', v_n_contacts, 'participants', v_n_parts,
                'facts', v_n_facts, 'deadlines', v_n_deadlines, 'evidence', v_n_evidence),
    'committedAt', now(), 'bootstrapVersion', c_bootstrap_version);
end;
$fn$;

reset role;
revoke create on schema app from lawme_bootstrap;

-- re-assert the RPC ACL (CREATE OR REPLACE preserves it; explicit).
revoke all on function app.bootstrap_matter_v1(jsonb) from public;
revoke all on function app.bootstrap_matter_v1(jsonb) from anon;
grant execute on function app.bootstrap_matter_v1(jsonb) to authenticated;

-- Postconditions — fail on ANY drift from the approved model.
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='app' and p.proname='bootstrap_matter_v1';
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'post: RPC owner must remain lawme_bootstrap';
  end if;
  if v_def not like '%app.actor_uid()%' or v_def like '%auth.uid()%' or v_def like '%auth.role()%' then
    raise exception 'post: RPC must resolve actor via app.actor_uid() and not call auth.* directly';
  end if;
  if v_def not like '%BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED%' then
    raise exception 'post: aggregate-limit backstop missing';
  end if;
  if v_def not like '%matters_organization_id_slug_key%' then
    raise exception 'post: narrow slug-collision handling missing';
  end if;
  if not has_function_privilege('authenticated','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('anon','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('service_role','app.bootstrap_matter_v1(jsonb)','EXECUTE') then
    raise exception 'post: RPC EXECUTE ACL drifted';
  end if;
  if not has_schema_privilege('lawme_bootstrap','app','USAGE')
     or has_schema_privilege('lawme_bootstrap','app','CREATE')
     or has_schema_privilege('lawme_bootstrap','auth','USAGE') then
    raise exception 'post: lawme_bootstrap privilege drift';
  end if;
end $$;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe): re-run the 20260724140000 RPC body to restore the
--   pre-hardening function (as lawme_bootstrap with transient CREATE on schema app).
--   Historical migrations, Matter/child tables, and Production are untouched.
-- ============================================================================
