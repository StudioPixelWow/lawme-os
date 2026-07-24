-- ============================================================================
-- LawME — Capability 1 · Slice 1.0.4: ATOMIC BOOTSTRAP RPC
--   app.bootstrap_matter_v1(jsonb) + app.can_confirm_intake_draft
--   + app.initial_stage_for + child-table grants to lawme_bootstrap.
--
-- STATUS: PREPARED FOR REVIEW — NOT YET APPLIED.
--   Depends on 20260724120000 (persistence primitives: role, channel, columns).
--   Apply target on approval: DEVELOPMENT project udispadsbxqicmawqcuk ONLY.
--   Production is NEVER touched.
--
-- MODEL (founder-frozen v1): dedicated-role model. The Authorization Envelope was
--   rejected. Capability 0.8 remains the ONLY authorization engine; this RPC does
--   NOT implement a second capability engine — it performs persisted-STATE
--   revalidation and enforces immutable persistence invariants. It never runs
--   Validation/Planner logic, AI, Workflow, Timeline, Search, Notifications, or
--   any post-commit effect. It executes ONE declarative MatterAggregatePlan.
--
-- OWNERSHIP: app.bootstrap_matter_v1 is SECURITY DEFINER owned by lawme_bootstrap
--   (created in 1.0.3). current_user='lawme_bootstrap' opens the sanctioned Draft
--   transition channel; auth.uid() (the user JWT) still identifies the actor.
--   EXECUTE is granted to authenticated only (never anon/PUBLIC). Direct browser
--   invocation is safe: actor=auth.uid(), org derived from the Draft, authority
--   re-checked via app.can_confirm_intake_draft, cross-tenant blocked by triggers.
--
-- RESULT MODEL (hybrid): expected domain outcomes RETURN a stable jsonb union
--   (created / already_committed / stale / idempotency_conflict / not_available);
--   impossible/security/schema failures RAISE stable P0001 codes and abort the tx
--   (so `confirming` is never a committed stranded state).
--
-- SINGLE TRANSACTION: any failure rolls back the whole bootstrap automatically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Pre-flight — require the 1.0.3 primitives + the role to exist.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lawme_bootstrap') then
    raise exception 'preflight: role lawme_bootstrap missing — apply 20260724120000 first';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='matter_intake_drafts'
      and column_name in ('confirmation_plan_hash','confirmation_bootstrap_version','confirmed_at')
    having count(*) = 3
  ) then
    raise exception 'preflight: bootstrap primitive columns missing — apply 20260724120000 first';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. app.can_confirm_intake_draft — persisted confirm-authority (Capability 0.8
--    intake.confirm expressed in SQL: owner|partner + creator/reviewer +
--    ready_for_review + active membership). SECURITY DEFINER so it can read
--    memberships regardless of the caller's RLS visibility. Uses auth.uid().
-- ----------------------------------------------------------------------------
create or replace function app.can_confirm_intake_draft(p_draft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matter_intake_drafts d
    join public.organization_memberships m
      on m.organization_id = d.organization_id
     and m.profile_id = (select auth.uid())
     and m.status = 'active'
     and m.role in ('owner','partner')          -- intake.confirm = legal authority
    where d.id = p_draft_id
      and d.status = 'ready_for_review'
      and ( d.created_by = (select auth.uid())
            or (select auth.uid()) = any(coalesce(d.reviewer_ids, '{}'::uuid[])) )
  );
$$;
revoke all on function app.can_confirm_intake_draft(uuid) from public;
revoke all on function app.can_confirm_intake_draft(uuid) from anon;
grant execute on function app.can_confirm_intake_draft(uuid) to lawme_bootstrap;

-- ----------------------------------------------------------------------------
-- 2. app.initial_stage_for — canonical initial Matter stage. Mirrors the
--    application default (`current_stage_id = 'intake'`); validates the procedure
--    type against the 12 EmploymentProcedureType values (unknown ⇒ NULL ⇒ the RPC
--    rejects with BOOTSTRAP_UNSUPPORTED_PROCEDURE). No procedure-graph logic in SQL.
-- ----------------------------------------------------------------------------
create or replace function app.initial_stage_for(p_procedure_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_procedure_type in (
      'pre_dismissal_dispute','pregnancy_dismissal','hearing_before_dismissal',
      'severance_claim','wage_overtime_claim','pension_rights_claim',
      'discrimination_claim','harassment_complaint','regional_labor_court_civil',
      'appeal_to_national_labor_court','national_insurance_claim','settlement_enforcement'
    ) then 'intake'
    else null
  end;
$$;
revoke all on function app.initial_stage_for(text) from public;
revoke all on function app.initial_stage_for(text) from anon;
grant execute on function app.initial_stage_for(text) to lawme_bootstrap;

-- ----------------------------------------------------------------------------
-- 3. Least-privilege grants to the RPC owner (writes materialize the plan;
--    schema/function access for auth.uid(), the app helpers, and the audit hash).
--    BYPASSRLS (on the role) handles RLS; these are the table-level privileges.
-- ----------------------------------------------------------------------------
grant usage on schema app, auth, extensions to lawme_bootstrap;
grant execute on function auth.uid() to lawme_bootstrap;
grant execute on function extensions.digest(text, text) to lawme_bootstrap;
grant select on public.profiles, public.organization_memberships, public.contacts, public.matters to lawme_bootstrap;
grant insert on public.matters, public.matter_members, public.contacts, public.matter_participants,
                public.matter_facts, public.matter_deadlines, public.matter_evidence, public.audit_events to lawme_bootstrap;

-- ----------------------------------------------------------------------------
-- 4. THE RPC. SECURITY DEFINER owned (via ALTER below) by lawme_bootstrap.
--    search_path='' → every object fully qualified. No dynamic SQL. Untrusted
--    payload; all authoritative org/actor values are server-derived.
-- ----------------------------------------------------------------------------
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

  v_actor       uuid := (select auth.uid());
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
begin
  -- ==== envelope of versions + shape (impossible/tamper ⇒ RAISE) ============
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
  begin
    v_draft_id := (p_payload -> 'draft' ->> 'id')::uuid;
  exception when others then
    raise exception using errcode='P0001', message='BOOTSTRAP_MALFORMED_PAYLOAD';
  end;
  if v_draft_id is null or v_version_tok is null then
    raise exception using errcode='P0001', message='BOOTSTRAP_MALFORMED_PAYLOAD';
  end if;

  -- actor must resolve to a real profile (anti-enumeration otherwise below).
  perform 1 from public.profiles where id = v_actor;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;

  -- ==== lock the Draft; derive org server-side ==============================
  select * into v_draft from public.matter_intake_drafts where id = v_draft_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;
  v_org := v_draft.organization_id;

  -- ==== idempotent reconciliation (already committed) =======================
  if v_draft.status = 'confirmed' or v_draft.confirmed_matter_id is not null then
    if v_draft.confirmation_idempotency_key is not distinct from v_idem_key
       and v_draft.confirmation_plan_hash is not distinct from v_plan_hash then
      return jsonb_build_object('ok', true, 'code', 'BOOTSTRAP_ALREADY_COMMITTED',
        'matterId', v_draft.confirmed_matter_id, 'draftId', v_draft_id,
        'idempotencyKey', v_idem_key, 'planHash', v_plan_hash);
    end if;
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_IDEMPOTENCY_CONFLICT', 'draftId', v_draft_id);
  end if;

  -- ==== authorization (persisted) — anti-enumeration collapses to NOT_AVAILABLE
  if not app.can_confirm_intake_draft(v_draft_id) then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_NOT_AVAILABLE');
  end if;

  -- ==== stale-plan rejection (optimistic concurrency) =======================
  if v_draft.version_token is distinct from v_version_tok then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_STALE_DRAFT', 'draftId', v_draft_id);
  end if;

  -- resolve actor's org role (owner|partner guaranteed by can_confirm) → matter role.
  select m.role into v_actor_role from public.organization_memberships m
    where m.organization_id = v_org and m.profile_id = v_actor and m.status = 'active';
  v_matter_role := 'partner';

  -- ==== header enums + derived stage/slug ===================================
  if v_conf not in ('internal','client_confidential','privileged') then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
  end if;
  if v_ai not in ('allowed','allowed_with_review','prohibited') then
    -- matters.ai_policy CHECK is the 3-value set; restricted_no_private_context is
    -- not persistable here — reject rather than silently downgrade.
    raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
  end if;
  v_stage := app.initial_stage_for(v_proc);
  if v_stage is null then
    raise exception using errcode='P0001', message='BOOTSTRAP_UNSUPPORTED_PROCEDURE';
  end if;
  -- deterministic, per-org-unique slug derived from the (1:1) Draft id.
  v_slug := 'm-' || replace(left(v_draft_id::text, 18), '-', '');

  -- ==== pin identity + enter confirming (sanctioned channel) ================
  begin
    update public.matter_intake_drafts
      set status = 'confirming',
          confirmation_idempotency_key = v_idem_key,
          confirmation_plan_hash = v_plan_hash,
          confirmation_bootstrap_version = c_bootstrap_version
      where id = v_draft_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'BOOTSTRAP_IDEMPOTENCY_CONFLICT', 'draftId', v_draft_id);
  end;

  -- ==== materialize the aggregate (atomic) ==================================
  insert into public.matters (organization_id, slug, title_he, forum_he, legal_domain,
                              procedure_type, topic, current_stage_id, status, assigned_owner_id,
                              confidentiality, ai_policy)
  values (v_org, v_slug, v_matter ->> 'titleHe', v_matter ->> 'forumHe', 'labor',
          v_proc, coalesce(nullif(v_matter ->> 'topicHe',''), v_proc), v_stage, 'open', v_actor,
          v_conf, v_ai)
  returning id into v_matter_id;

  -- owner membership (the confirming actor). No permissions invented beyond the
  -- legal-authority slot; org-role authority was proven by can_confirm.
  insert into public.matter_members (organization_id, matter_id, profile_id, matter_role, can_review, can_approve)
  values (v_org, v_matter_id, v_actor, v_matter_role, true, true);

  -- contacts (classify + map plan-local key → persisted id).
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
      continue;  -- no contact, no participant
    else
      raise exception using errcode='P0001', message='BOOTSTRAP_UNKNOWN_ENUM';
    end if;
    v_contact_ids := v_contact_ids || jsonb_build_object(v_ckey, v_cid);
  end loop;

  -- participants (reference contacts by plan-local key).
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

  -- facts (intake epistemic states ONLY; fact guard is the backstop).
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

  -- deadlines (verbatim; DB CHECKs enforce known/unknown date rules).
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

  -- evidence (current matter_evidence schema; evidence_type defaults to 'document').
  for v_elem in select * from jsonb_array_elements(coalesce(v_agg -> 'evidence', '[]'::jsonb)) loop
    insert into public.matter_evidence (organization_id, matter_id, label_he, evidence_type, mandatory, status)
    values (v_org, v_matter_id, v_elem ->> 'labelHe', 'document',
            coalesce((v_elem ->> 'mandatory')::boolean, false), 'required');
    v_n_evidence := v_n_evidence + 1;
  end loop;

  -- audit (mandatory; non-confidential metadata only).
  insert into public.audit_events (organization_id, actor, actor_role, event_type, object_type, object_id, payload)
  values (v_org, v_actor, v_actor_role, 'matter.bootstrapped', 'matter', v_matter_id,
          jsonb_build_object(
            'draftId', v_draft_id,
            'idempotencyKeyHash', encode(extensions.digest(v_idem_key, 'sha256'), 'hex'),
            'planHash', v_plan_hash,
            'bootstrapVersion', c_bootstrap_version,
            'plannerVersion', c_planner_version,
            'validationVersion', c_validation_version,
            'aggregateVersion', 1,
            'sourceInputHash', v_agg ->> 'sourceInputHash',
            'correlationId', p_payload ->> 'correlationId',
            'counts', jsonb_build_object('contacts', v_n_contacts, 'participants', v_n_parts,
                        'facts', v_n_facts, 'deadlines', v_n_deadlines, 'evidence', v_n_evidence)
          ));

  -- ==== finalize: confirming → confirmed (sanctioned channel) ===============
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

----------------------------------------------------
-- Temporary ownership-transfer prerequisite.
--
-- PostgreSQL requires the future function owner to
-- hold CREATE on the target schema while ownership
-- is transferred by a non-superuser migration role.
--
-- This privilege escalation is temporary and is
-- fully revoked before COMMIT.
----------------------------------------------------
grant lawme_bootstrap to postgres with set true;
grant create on schema app to lawme_bootstrap;
alter function app.bootstrap_matter_v1(jsonb)
owner to lawme_bootstrap;
revoke create on schema app from lawme_bootstrap;

-- least-privilege EXECUTE on the RPC.
revoke all on function app.bootstrap_matter_v1(jsonb) from public;
revoke all on function app.bootstrap_matter_v1(jsonb) from anon;
grant execute on function app.bootstrap_matter_v1(jsonb) to authenticated;

-- Steady-state privilege verification (fails the migration on any drift).
do $$
begin
  if has_schema_privilege('lawme_bootstrap','app','CREATE') then
    raise exception 'post-apply: lawme_bootstrap must NOT retain CREATE on schema app';
  end if;
  if not has_schema_privilege('lawme_bootstrap','app','USAGE') then
    raise exception 'post-apply: lawme_bootstrap must retain USAGE on schema app';
  end if;
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'post-apply: RPC owner must be lawme_bootstrap';
  end if;
  perform 1 from pg_roles where rolname='lawme_bootstrap'
    and rolcanlogin=false and rolbypassrls=true and rolsuper=false
    and rolcreaterole=false and rolcreatedb=false and rolreplication=false;
  if not found then raise exception 'post-apply: lawme_bootstrap role attributes drifted'; end if;
end;
$$;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe on a DB holding NO confirmed drafts):
--   begin;
--   drop function if exists app.bootstrap_matter_v1(jsonb);
--   drop function if exists app.can_confirm_intake_draft(uuid);
--   drop function if exists app.initial_stage_for(text);
--   revoke insert on public.matters, public.matter_members, public.contacts,
--     public.matter_participants, public.matter_facts, public.matter_deadlines,
--     public.matter_evidence, public.audit_events from lawme_bootstrap;
--   revoke select on public.profiles, public.organization_memberships,
--     public.contacts, public.matters from lawme_bootstrap;
--   commit;
-- The 1.0.3 primitives, Matter/child tables, and Production are untouched.
-- ============================================================================
