-- ============================================================================
-- LawME — Capability 1 · Slice 1.0.4B: Bootstrap RPC ACTOR RESOLUTION FIX
--   New additive migration. Does NOT modify or rerun 20260724120000 / 20260724130000.
--
-- STATUS: PREPARED FOR REVIEW — apply target on approval: DEVELOPMENT only.
--   Depends on 20260724130000. Production is NEVER touched.
--
-- WHY (Supabase platform compatibility constraint — not a design change)
--   app.bootstrap_matter_v1(jsonb) is owned by lawme_bootstrap and calls the
--   actor identity source auth.uid(). Schema `auth` is owned by supabase_admin;
--   the migration role `postgres` is NOT a superuser and cannot grant USAGE on
--   `auth`, so the 1.0.4 `grant usage on schema auth to lawme_bootstrap` produced
--   a WARNING and granted nothing. lawme_bootstrap therefore has NO USAGE on
--   `auth`, and the RPC fails at runtime with "permission denied for schema auth".
--
--   FIX (founder-approved Option 3): a narrowly scoped, postgres-owned SECURITY
--   DEFINER wrapper app.actor_uid() projects auth.uid() into schema `app` (which
--   lawme_bootstrap can use). The RPC resolves the actor via app.actor_uid()
--   instead of auth.uid() directly. auth.uid() remains the single identity
--   source. lawme_bootstrap is NEVER granted `auth` access. No raw JWT parsing,
--   no payload/ membership/ service-role identity, no Authorization Envelope.
--
--   The prior ineffective grants in 20260724130000 are left intact as historical
--   evidence of the incompatibility; this migration does not re-attempt them.
--
-- SECOND auth-schema dependency (founder-approved Option B — Minimum Required
--   Authority). The confirming/confirmed UPDATE fires the SECURITY INVOKER guard
--   app.enforce_intake_draft_transitions(), which — inside the RPC — runs as
--   current_user = lawme_bootstrap. Its 1.0.3 form EAGERLY initialized
--   v_is_client := (auth.role() = 'authenticated') before the execution path was
--   known, so the sanctioned Bootstrap path hit "permission denied for schema
--   auth" too. Option B refactors the guard so auth.role() is evaluated LAZILY,
--   ONLY inside the direct-client branches that actually need client-role
--   semantics, and NEVER on the current_user = lawme_bootstrap channel. No new
--   projection function is introduced (app.actor_role() is explicitly NOT
--   created); no auth-schema access is granted. Transition semantics, the state
--   machine, the current_user channel, and every confirmation invariant are
--   preserved byte-for-byte — only the unnecessary eager dependency is removed.
--
-- OWNERSHIP MECHANICS: replacing a lawme_bootstrap-owned function from a
--   non-superuser migration role requires acting AS that role; creating in schema
--   `app` requires CREATE there. Both are granted transiently and revoked before
--   COMMIT, leaving the reviewed steady state unchanged. The guard is owned by
--   postgres and is replaced in the ordinary postgres migration context (no role
--   switch, no CREATE grant needed — CREATE OR REPLACE of an owned function).
--
-- SINGLE TRANSACTION: any failure rolls back the whole fix automatically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Pre-flight — exact expected pre-fix state.
-- ----------------------------------------------------------------------------
do $$
begin
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'preflight: app.bootstrap_matter_v1 must be owned by lawme_bootstrap';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='app' and p.proname='actor_uid') then
    raise exception 'preflight: app.actor_uid already exists — fix already applied?';
  end if;
  if not exists (select 1 from pg_roles where rolname='lawme_bootstrap') then
    raise exception 'preflight: role lawme_bootstrap missing';
  end if;
  -- guard baseline: exists, SECURITY INVOKER, postgres-owned (Option B refactors it in place).
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='app' and p.proname='enforce_intake_draft_transitions'
                   and p.prosecdef = false
                   and pg_get_userbyid(p.proowner) = 'postgres') then
    raise exception 'preflight: app.enforce_intake_draft_transitions() must exist as a postgres-owned SECURITY INVOKER function';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Actor resolver — identity projection ONLY (postgres-owned; postgres has
--    USAGE on auth). No arguments, no tables, no JSON, no fallback, no logging.
-- ----------------------------------------------------------------------------
create or replace function app.actor_uid()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid()
$function$;

revoke all on function app.actor_uid() from public;
revoke all on function app.actor_uid() from anon;
revoke all on function app.actor_uid() from authenticated;
revoke all on function app.actor_uid() from service_role;
grant execute on function app.actor_uid() to lawme_bootstrap;

-- ----------------------------------------------------------------------------
-- 2. Replace ONLY the actor-resolution expression in the RPC. Body is identical
--    to 20260724130000 except: v_actor := (select app.actor_uid()).
--    Performed AS lawme_bootstrap so ownership is preserved; CREATE requires the
--    schema privilege transiently.
-- ----------------------------------------------------------------------------
grant lawme_bootstrap to postgres with set true;   -- idempotent (already present)
grant create on schema app to lawme_bootstrap;      -- transient
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

  insert into public.matters (organization_id, slug, title_he, forum_he, legal_domain,
                              procedure_type, topic, current_stage_id, status, assigned_owner_id,
                              confidentiality, ai_policy)
  values (v_org, v_slug, v_matter ->> 'titleHe', v_matter ->> 'forumHe', 'labor',
          v_proc, coalesce(nullif(v_matter ->> 'topicHe',''), v_proc), v_stage, 'open', v_actor,
          v_conf, v_ai)
  returning id into v_matter_id;

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

-- re-assert the RPC ACL (CREATE OR REPLACE preserves it; this makes it explicit).
revoke all on function app.bootstrap_matter_v1(jsonb) from public;
revoke all on function app.bootstrap_matter_v1(jsonb) from anon;
grant execute on function app.bootstrap_matter_v1(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Guard lazy-evaluation refactor (founder-approved Option B).
--    Replaces app.enforce_intake_draft_transitions() with a byte-for-byte
--    equivalent EXCEPT that auth.role() is no longer evaluated at variable
--    initialization. It is evaluated lazily, ONLY inside the direct-client
--    branches, and NEVER on the current_user = lawme_bootstrap channel. The guard
--    is owned by postgres; CREATE OR REPLACE of an owned function needs no role
--    switch and no CREATE grant. It stays SECURITY INVOKER with search_path = ''.
--
--    Behavioural equivalence proof:
--      * INSERT client block: `if v_is_client then` → `if (auth.role() =
--        'authenticated') then`. Order is irrelevant — the born-confirmed check
--        above it fires for every role first; and the only role lacking auth
--        USAGE (lawme_bootstrap) has NO INSERT privilege on this table, so it
--        never reaches this branch.
--      * UPDATE step (4): `if v_is_client and not v_is_bootstrap then` →
--        `if not v_is_bootstrap then / if (auth.role() = 'authenticated') then`.
--        Body runs iff (not bootstrap) AND (authenticated) — identical predicate,
--        with auth.role() reached only when not bootstrap.
--    All raised error codes, transitions, immutability and consistency invariants
--    are preserved verbatim.
-- ----------------------------------------------------------------------------
create or replace function app.enforce_intake_draft_transitions()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $guard$
declare
  -- SANCTIONED CHANNEL: the exact function-owner identity of the Bootstrap RPC.
  -- Inside app.bootstrap_matter_v1 (SECURITY DEFINER, owned by lawme_bootstrap)
  -- current_user is 'lawme_bootstrap'; nowhere a client can reach. This is a pure
  -- catalog check — it NEVER touches schema auth, so the sanctioned Bootstrap path
  -- has zero dependency on `auth`.
  v_is_bootstrap boolean := (current_user = 'lawme_bootstrap');
  -- Slice 1.0.4B (Option B — Minimum Required Authority): the verified JWT role
  -- claim auth.role() is NOT evaluated here at initialization. It is consulted
  -- lazily, and ONLY inside the direct-client branches below, so a caller with no
  -- USAGE on schema `auth` (lawme_bootstrap on Development) never reaches it.
  -- Client-role semantics are unchanged.
begin
  -- ==== INSERT: born only in an approved initial state (unchanged) ==========
  if tg_op = 'INSERT' then
    if new.status in ('confirming', 'confirmed') or new.confirmed_matter_id is not null then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
    end if;
    -- client-only restrictions; auth.role() consulted lazily in this client branch.
    if (auth.role() = 'authenticated') then
      if new.status <> 'active' then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_TRANSITION_FORBIDDEN';
      end if;
      if new.confirmation_idempotency_key is not null then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN';
      end if;
    end if;
    return new;
  end if;

  -- ==== UPDATE ==============================================================

  -- (1) a confirmed row is fully frozen against the table path — EVERY role,
  --     including lawme_bootstrap. Duplicate confirmation READS the row; it never
  --     re-UPDATEs it. Guarantees confirmed linkage/key/plan-hash immutability +
  --     no revert.
  if old.status = 'confirmed' or old.confirmed_matter_id is not null then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMED_IMMUTABLE';
  end if;

  -- (2) identity columns immutable after INSERT (every role).
  if new.organization_id is distinct from old.organization_id
     or new.created_by   is distinct from old.created_by
     or new.created_at   is distinct from old.created_at then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_IDENTITY_IMMUTABLE';
  end if;

  -- (3) CONFIRMATION CHANNEL --------------------------------------------------
  if v_is_bootstrap then
    -- ONLY the two exact sanctioned transitions, each with hard invariants.
    if old.status = 'ready_for_review' and new.status = 'confirming' then
      -- reserve: pin plan identity; no Matter linkage yet.
      if new.confirmed_matter_id is not null or new.confirmed_at is not null then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT';
      end if;
      if new.confirmation_idempotency_key is null
         or new.confirmation_plan_hash is null
         or new.confirmation_bootstrap_version is null then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCOMPLETE';
      end if;
    elsif old.status = 'confirming' and new.status = 'confirmed' then
      -- finalize: Matter linkage + confirmed_at required; pinned fields frozen.
      if new.confirmed_matter_id is null or new.confirmed_at is null then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT';
      end if;
      if new.confirmation_idempotency_key   is distinct from old.confirmation_idempotency_key
         or new.confirmation_plan_hash        is distinct from old.confirmation_plan_hash
         or new.confirmation_bootstrap_version is distinct from old.confirmation_bootstrap_version then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_PINNED_IMMUTABLE';
      end if;
    else
      -- any other transition / linkage change via the channel is forbidden.
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
    end if;
    -- content + server-owned identity are frozen throughout confirmation.
    if new.structured_draft      is distinct from old.structured_draft
       or new.review_state       is distinct from old.review_state
       or new.clarification_rounds is distinct from old.clarification_rounds
       or new.confidential_input  is distinct from old.confidential_input
       or new.reviewer_ids        is distinct from old.reviewer_ids
       or new.version_token       is distinct from old.version_token
       or new.engine_version      is distinct from old.engine_version
       or new.provider_mode       is distinct from old.provider_mode
       or new.policy_snapshot     is distinct from old.policy_snapshot then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN';
    end if;
  else
    -- non-bootstrap callers (authenticated AND service_role): confirmation is
    -- FORBIDDEN, exactly as before. Never gated on a spoofable signal.
    if new.confirmed_matter_id is distinct from old.confirmed_matter_id then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
    end if;
    if new.status in ('confirming', 'confirmed') and new.status is distinct from old.status then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
    end if;
  end if;

  -- (4) authenticated direct-client restrictions (skipped inside the sanctioned
  --     channel, where current_user proves trusted RPC execution). Option B:
  --     auth.role() is evaluated lazily and ONLY on the non-bootstrap path, so the
  --     sanctioned lawme_bootstrap confirmation path never touches schema auth.
  if not v_is_bootstrap then
    if (auth.role() = 'authenticated') then
      if new.reviewer_ids is distinct from old.reviewer_ids then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN';
      end if;
      if new.provider_mode  is distinct from old.provider_mode
         or new.engine_version is distinct from old.engine_version
         or new.policy_snapshot is distinct from old.policy_snapshot
         or new.provenance   is distinct from old.provenance
         or new.confirmation_idempotency_key is distinct from old.confirmation_idempotency_key
         or new.confirmation_plan_hash is distinct from old.confirmation_plan_hash
         or new.confirmation_bootstrap_version is distinct from old.confirmation_bootstrap_version
         or new.confirmed_at is distinct from old.confirmed_at
         or new.correlation_id is distinct from old.correlation_id
         or new.version_token  is distinct from old.version_token
         or new.expires_at    is distinct from old.expires_at then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN';
      end if;
      if new.status is distinct from old.status then
        if not (
             (old.status = 'active'              and new.status in ('needs_clarification', 'ready_for_review', 'rejected'))
          or (old.status = 'needs_clarification' and new.status in ('active', 'ready_for_review', 'rejected'))
          or (old.status = 'ready_for_review'    and new.status in ('active', 'needs_clarification', 'rejected'))
        ) then
          raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_TRANSITION_FORBIDDEN';
        end if;
      end if;
      if old.status not in ('active', 'needs_clarification', 'ready_for_review') then
        if new.structured_draft   is distinct from old.structured_draft
           or new.review_state    is distinct from old.review_state
           or new.clarification_rounds is distinct from old.clarification_rounds
           or new.confidential_input is distinct from old.confidential_input then
          raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONTENT_LOCKED';
        end if;
      end if;
    end if;
  end if;

  -- (5) consistency backstop (confirming is a valid interim: linkage still null).
  if (new.status = 'confirmed') <> (new.confirmed_matter_id is not null) then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT';
  end if;

  return new;
end;
$guard$;

-- least-privilege EXECUTE preserved (CREATE OR REPLACE keeps existing ACL; explicit).
revoke all on function app.enforce_intake_draft_transitions() from public;
revoke all on function app.enforce_intake_draft_transitions() from anon;
revoke all on function app.enforce_intake_draft_transitions() from authenticated;

-- ----------------------------------------------------------------------------
-- Postconditions — fail the migration on ANY drift from the approved model.
-- ----------------------------------------------------------------------------
do $$
begin
  -- actor_uid: postgres-owned, definer, lb-only execute.
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='actor_uid')) <> 'postgres' then
    raise exception 'post: app.actor_uid owner must be postgres';
  end if;
  if not has_function_privilege('lawme_bootstrap','app.actor_uid()','EXECUTE') then
    raise exception 'post: lawme_bootstrap must execute app.actor_uid';
  end if;
  if has_function_privilege('authenticated','app.actor_uid()','EXECUTE')
     or has_function_privilege('anon','app.actor_uid()','EXECUTE')
     or has_function_privilege('public','app.actor_uid()','EXECUTE')
     or has_function_privilege('service_role','app.actor_uid()','EXECUTE') then
    raise exception 'post: app.actor_uid must NOT be executable by browser/service roles';
  end if;
  -- RPC: owner + ACL unchanged.
  if pg_get_userbyid((select proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='app' and p.proname='bootstrap_matter_v1')) <> 'lawme_bootstrap' then
    raise exception 'post: RPC owner must remain lawme_bootstrap';
  end if;
  if not has_function_privilege('authenticated','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('anon','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('public','app.bootstrap_matter_v1(jsonb)','EXECUTE')
     or has_function_privilege('service_role','app.bootstrap_matter_v1(jsonb)','EXECUTE') then
    raise exception 'post: RPC EXECUTE ACL drifted';
  end if;
  -- lawme_bootstrap steady-state: USAGE (not CREATE) on app; NEVER auth usage.
  if not has_schema_privilege('lawme_bootstrap','app','USAGE')
     or has_schema_privilege('lawme_bootstrap','app','CREATE') then
    raise exception 'post: lawme_bootstrap app-schema privileges drifted';
  end if;
  if has_schema_privilege('lawme_bootstrap','auth','USAGE') then
    raise exception 'post: lawme_bootstrap must NOT have auth-schema USAGE';
  end if;
  -- guard: unchanged security posture — postgres-owned, SECURITY INVOKER, search_path=''.
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='app' and p.proname='enforce_intake_draft_transitions'
                   and p.prosecdef = false
                   and pg_get_userbyid(p.proowner) = 'postgres'
                   and coalesce(array_to_string(p.proconfig,','),'') like '%search_path=%') then
    raise exception 'post: guard must remain postgres-owned SECURITY INVOKER with a pinned search_path';
  end if;
  -- Option B: NO additional auth-schema projection function was introduced.
  -- app.actor_uid() remains the ONLY projection created by Bootstrap v1; a second
  -- projection (e.g. app.actor_role()) is explicitly forbidden.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='app' and p.proname='actor_role') then
    raise exception 'post: app.actor_role() must NOT exist (Option B forbids a second projection)';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='app' and p.proname='actor_uid') then
    raise exception 'post: app.actor_uid() (the single approved projection) must exist';
  end if;
end;
$$;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe on a DB holding NO confirmed drafts):
--   begin;
--   -- restore the guard to the 20260724120000 body (eager auth.role()) as postgres:
--   -- (re-run the 20260724120000 app.enforce_intake_draft_transitions() body)
--   -- restore the RPC to the 20260724130000 body (auth.uid()) as lawme_bootstrap:
--   grant create on schema app to lawme_bootstrap; set local role lawme_bootstrap;
--   -- (re-run the 20260724130000 RPC body) ; reset role;
--   revoke create on schema app from lawme_bootstrap;
--   drop function if exists app.actor_uid();
--   commit;
-- NOTE: rolling the guard back re-introduces the eager auth.role() dependency and
--   would again break the Bootstrap path on Development; rollback is only sensible
--   in tandem with rolling back the whole 1.0.4 RPC. Historical migrations,
--   Matter/child tables, and Production are untouched.
-- ============================================================================
