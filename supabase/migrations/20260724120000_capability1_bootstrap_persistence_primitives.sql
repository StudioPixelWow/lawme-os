-- ============================================================================
-- LawME — Capability 1 · Slice 1.0.3: Bootstrap PERSISTENCE PRIMITIVES
--   Additive/corrective migration for the ALREADY-LIVE table
--   public.matter_intake_drafts + a sanctioned Bootstrap transition channel.
--
-- STATUS: PREPARED FOR REVIEW — NOT YET APPLIED.
--   Apply target on approval: DEVELOPMENT project udispadsbxqicmawqcuk ONLY.
--   Production is NEVER touched. This file is committed only AFTER a founder-
--   approved Development apply (per the slice's commit policy).
--
-- WHY (the single blocker this slice removes)
--   app.enforce_intake_draft_transitions() (SECURITY INVOKER) blocks EVERY caller
--   — including service_role — from performing ready_for_review → confirming and
--   confirming → confirmed, and from writing confirmed_matter_id. auth.role()
--   inside a SECURITY DEFINER RPC still reflects the caller JWT, so a JWT/role
--   signal cannot open a safe channel. The future atomic RPC
--   app.bootstrap_matter_v1(jsonb) therefore cannot confirm a draft.
--
-- WHAT THIS DOES (purely additive — no RPC, no Matter/child inserts here)
--   1. Creates a dedicated NOLOGIN BYPASSRLS role `lawme_bootstrap` that will OWN
--      the future RPC. It is the sole sanctioned Bootstrap execution identity.
--   2. Adds a SANCTIONED CHANNEL to the guard: ONLY current_user = 'lawme_bootstrap'
--      may perform the two confirmation transitions, with hard invariants. Every
--      existing protection is preserved for every other caller (incl. service_role).
--   3. Adds the minimum durable plan-identity columns required for idempotency,
--      stale rejection, reconciliation and audit:
--        confirmation_plan_hash, confirmation_bootstrap_version, confirmed_at.
--   4. Adds immutability + consistency constraints and a 1:1 Draft↔Matter unique.
--
-- WHAT THIS DOES NOT DO (deferred to Slice 1.0.4+):
--   app.bootstrap_matter_v1(); any Matter/child INSERT; child-table GRANTs to the
--   role; the RPC result type; post-commit outbox; Workflow/Search/Notification
--   tables; capability persistence; any Production change.
--
-- SANCTIONED-CHANNEL THREAT MODEL (why current_user = 'lawme_bootstrap' is safe)
--   * A SECURITY DEFINER function switches current_user to its OWNER for the body;
--     nested SECURITY INVOKER triggers (this guard) observe that owner. So inside
--     app.bootstrap_matter_v1 (owned by lawme_bootstrap) current_user is exactly
--     'lawme_bootstrap' — and NOWHERE else, because:
--   * lawme_bootstrap is NOLOGIN: it is never a connection role.
--   * Only postgres/supabase_admin may SET ROLE to it (createrole+admin); the
--     PostgREST authenticator can SET ROLE only to authenticated/anon/service_role,
--     never to lawme_bootstrap. A browser user cannot reach it.
--   * The signal is NOT a JWT claim (auth.role()), NOT a request payload flag, NOT
--     a caller-settable GUC/current_setting, NOT service-role possession, and NOT
--     SECURITY DEFINER alone — it is the exact function-owner identity, verified by
--     the engine. It fails closed: unknown/other current_user ⇒ no channel.
--   * service_role STILL cannot confirm (current_user='service_role' ≠ owner) —
--     "service-role possession is not authorization" is preserved and hardened.
--
-- STABLE REASON CODES (message text; SQLSTATE P0001) — existing codes retained;
--   new codes added by this slice:
--     INTAKE_DRAFT_CONFIRMATION_INCOMPLETE   entering confirming without pinned
--                                            idempotency key / plan hash / version
--     INTAKE_DRAFT_CONFIRMATION_PINNED_IMMUTABLE
--                                            pinned confirmation fields changed
--                                            during confirming → confirmed
--
-- SINGLE TRANSACTION: any failure during apply rolls back automatically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Pre-flight — refuse to proceed on ANY schema drift from the expected baseline.
-- ----------------------------------------------------------------------------
do $$
declare
  v_secdef boolean;
  v_have_plan_hash boolean;
  v_have_version boolean;
  v_have_confirmed_at boolean;
  v_bad_confirmed bigint;
begin
  -- the guard must exist and be SECURITY INVOKER (prosecdef = false).
  select p.prosecdef into v_secdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'app' and p.proname = 'enforce_intake_draft_transitions';
  if v_secdef is null then
    raise exception 'preflight: app.enforce_intake_draft_transitions() not found — unexpected baseline';
  end if;
  if v_secdef is true then
    raise exception 'preflight: guard is SECURITY DEFINER — unexpected baseline (expected INVOKER)';
  end if;

  -- the three new columns must be ABSENT (this migration adds them).
  select
    bool_or(column_name = 'confirmation_plan_hash'),
    bool_or(column_name = 'confirmation_bootstrap_version'),
    bool_or(column_name = 'confirmed_at')
  into v_have_plan_hash, v_have_version, v_have_confirmed_at
  from information_schema.columns
  where table_schema = 'public' and table_name = 'matter_intake_drafts';
  if coalesce(v_have_plan_hash,false) or coalesce(v_have_version,false) or coalesce(v_have_confirmed_at,false) then
    raise exception 'preflight: a bootstrap column already exists — migration already (partly) applied?';
  end if;

  -- no already-confirmed drafts may exist (the new confirmed_at biconditional
  -- would otherwise fail); the confirm/confirmed_matter_id invariant is live.
  select count(*) into v_bad_confirmed
  from public.matter_intake_drafts
  where status = 'confirmed' or confirmed_matter_id is not null;
  if v_bad_confirmed > 0 then
    raise exception 'preflight: % confirmed draft(s) exist; reconcile before adding bootstrap primitives', v_bad_confirmed;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Dedicated Bootstrap execution role (NOLOGIN, BYPASSRLS). Owns the future
--    RPC. NOLOGIN + no client membership ⇒ unreachable except by owning the RPC.
--    BYPASSRLS is required because Capability 0.8 removed all authenticated write
--    policies on Matter tables; the RPC materializes the aggregate as this role.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lawme_bootstrap') then
    create role lawme_bootstrap nologin bypassrls;
  end if;
end;
$$;

comment on role lawme_bootstrap is
  'Capability 1 Bootstrap execution identity. NOLOGIN. Owns app.bootstrap_matter_v1 (Slice 1.0.4). current_user=lawme_bootstrap is the ONLY sanctioned Draft-confirmation channel.';

-- Minimum privileges for the sanctioned transition channel ONLY. Child-table
-- INSERT grants are deliberately DEFERRED to the RPC slice (1.0.4).
grant usage on schema public to lawme_bootstrap;
grant select, update on public.matter_intake_drafts to lawme_bootstrap;

-- ----------------------------------------------------------------------------
-- 2. Minimum durable plan-identity columns (idempotency / stale / reconcile).
--    All nullable; populated ONLY by the sanctioned channel when entering
--    confirming. version_token (existing) remains the stale-write primitive.
-- ----------------------------------------------------------------------------
alter table public.matter_intake_drafts
  add column confirmation_plan_hash         text,
  add column confirmation_bootstrap_version text,
  add column confirmed_at                   timestamptz;

comment on column public.matter_intake_drafts.confirmation_plan_hash is
  'SHA-256 of the MatterAggregatePlan (metadata.planHash). Distinguishes same-idempotency-key/different-plan conflicts. Set when entering confirming; immutable thereafter.';
comment on column public.matter_intake_drafts.confirmation_bootstrap_version is
  'Bootstrap engine version triple that produced the confirmation. Set when entering confirming; immutable thereafter.';
comment on column public.matter_intake_drafts.confirmed_at is
  'When the draft became confirmed. Set at confirming → confirmed; NULL otherwise.';

-- ----------------------------------------------------------------------------
-- 3. Consistency + immutability constraints (row-local; hard invariants).
-- ----------------------------------------------------------------------------
-- confirmed_at present  <=>  status = 'confirmed'.
alter table public.matter_intake_drafts
  add constraint matter_intake_drafts_confirmed_at_consistency
  check ((status = 'confirmed') = (confirmed_at is not null));

-- entering/holding a confirmation state REQUIRES the pinned plan identity.
alter table public.matter_intake_drafts
  add constraint matter_intake_drafts_confirmation_identity
  check (
    status not in ('confirming','confirmed')
    or (confirmation_idempotency_key is not null
        and confirmation_plan_hash is not null
        and confirmation_bootstrap_version is not null)
  );

-- plan hash is a 64-char lowercase hex SHA-256 when present.
alter table public.matter_intake_drafts
  add constraint matter_intake_drafts_plan_hash_format
  check (confirmation_plan_hash is null or confirmation_plan_hash ~ '^[0-9a-f]{64}$');

-- one Matter is produced by at most one Draft (1:1, immutable linkage). Also
-- indexes confirmed_matter_id for reverse lookup + reconciliation.
create unique index matter_intake_drafts_confirmed_matter_uq
  on public.matter_intake_drafts (confirmed_matter_id)
  where confirmed_matter_id is not null;

-- ----------------------------------------------------------------------------
-- 4. Guard replacement — adds the sanctioned Bootstrap channel; every other
--    caller keeps the exact Capability 2 Slice 2A behavior. SECURITY INVOKER,
--    search_path pinned empty, VOLATILE, fails closed with id-free reason codes.
-- ----------------------------------------------------------------------------
create or replace function app.enforce_intake_draft_transitions()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  -- verified JWT role claim (NOT a payload field).
  v_is_client boolean := (auth.role() = 'authenticated');
  -- SANCTIONED CHANNEL: the exact function-owner identity of the Bootstrap RPC.
  -- Inside app.bootstrap_matter_v1 (SECURITY DEFINER, owned by lawme_bootstrap)
  -- current_user is 'lawme_bootstrap'; nowhere a client can reach.
  v_is_bootstrap boolean := (current_user = 'lawme_bootstrap');
begin
  -- ==== INSERT: born only in an approved initial state (unchanged) ==========
  if tg_op = 'INSERT' then
    if new.status in ('confirming', 'confirmed') or new.confirmed_matter_id is not null then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
    end if;
    if v_is_client then
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
  --     channel, where current_user proves trusted RPC execution).
  if v_is_client and not v_is_bootstrap then
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

  -- (5) consistency backstop (confirming is a valid interim: linkage still null).
  if (new.status = 'confirmed') <> (new.confirmed_matter_id is not null) then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT';
  end if;

  return new;
end;
$$;

-- least-privilege EXECUTE: trigger machinery invokes it; no role needs direct EXECUTE.
revoke all on function app.enforce_intake_draft_transitions() from public;
revoke all on function app.enforce_intake_draft_transitions() from anon;
revoke all on function app.enforce_intake_draft_transitions() from authenticated;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe on a DB holding NO confirmed drafts):
--   begin;
--   drop index if exists public.matter_intake_drafts_confirmed_matter_uq;
--   alter table public.matter_intake_drafts
--     drop constraint if exists matter_intake_drafts_plan_hash_format,
--     drop constraint if exists matter_intake_drafts_confirmation_identity,
--     drop constraint if exists matter_intake_drafts_confirmed_at_consistency,
--     drop column if exists confirmed_at,
--     drop column if exists confirmation_bootstrap_version,
--     drop column if exists confirmation_plan_hash;
--   -- restore the pre-1.0.3 guard body (Capability 2 Slice 2A hardening form):
--   --   re-run the CREATE OR REPLACE from
--   --   20260717090000_capability2_slice2a_intake_drafts_hardening.sql (guard section),
--   --   then re-run its three REVOKEs.
--   revoke all on public.matter_intake_drafts from lawme_bootstrap;
--   revoke usage on schema public from lawme_bootstrap;
--   -- drop the role only if it owns nothing (the RPC is not created in this slice):
--   drop role if exists lawme_bootstrap;
--   commit;
-- The RPC, Matter/child inserts, and Production are untouched by this migration.
-- ============================================================================
