-- ============================================================================
-- LawME — Capability 2 · Slice 2A: Intake Draft SECURITY HARDENING
--   Additive/corrective migration for the ALREADY-LIVE table
--   public.matter_intake_drafts (created by 20260716120000).
--
-- STATUS: PREPARED FOR REVIEW — apply target on approval:
--   DEVELOPMENT project udispadsbxqicmawqcuk ONLY. Production is NEVER touched.
--
-- WHY
--   The reconciliation audit (docs/architecture/intake-draft-schema-reconciliation.md)
--   found live security defects in the applied 20-column table:
--     * an out-of-band auth_rls_initplan ALTER never recorded as a migration;
--     * an assigned reviewer could administer access & set confirmation state;
--     * a creator could directly confirm a draft or mutate a confirmed one;
--     * no status <-> confirmed_matter_id consistency invariant;
--     * authenticated client DELETE was allowed;
--     * two SECURITY DEFINER functions retained EXECUTE for PUBLIC/anon.
--
-- DESIGN (founder-approved, final revision)
--   The guard is a DUMB, explicit STATE-TRANSITION ALLOWLIST + column-mutation
--   matrix with STABLE reason codes. It knows only: OLD/NEW values, the caller's
--   JWT role (authenticated vs trusted infra) where strictly needed, immutable
--   columns, allowed transitions, confirmed invariants. It contains NO business
--   role/capability logic — that belongs to Capability 0.8 and future controlled
--   RPCs (app.bootstrap_matter_v1()).
--
--   Confirmation (status -> confirming/confirmed, or writing confirmed_matter_id)
--   is blocked for EVERY caller in this stage — including service_role — and is
--   NOT gated on any spoofable payload flag. The future Bootstrap migration will
--   REPLACE/EXTEND the guard to permit confirmation from its controlled context.
--
-- STABLE REASON CODES (message text; SQLSTATE P0001). No ids / no values / no SQL:
--   INTAKE_DRAFT_IDENTITY_IMMUTABLE        immutable identity column changed
--   INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN    client tried to change reviewer_ids
--   INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN    client tried to change a server-only field
--   INTAKE_DRAFT_TRANSITION_FORBIDDEN      status transition not in the allowlist
--   INTAKE_DRAFT_CONFIRMATION_FORBIDDEN    direct confirmation attempted (any role)
--   INTAKE_DRAFT_CONFIRMED_IMMUTABLE       any update to a confirmed row (table path)
--   INTAKE_DRAFT_CONTENT_LOCKED            content edit in a non-editable state
--   INTAKE_DRAFT_CONFIRMATION_INCONSISTENT status/confirmed_matter_id inconsistent
--   INTAKE_DRAFT_DELETE_FORBIDDEN          (reserved) future controlled-deletion RPC
--
-- NOT ADDED (need Capability 0.8 / Matter Bootstrap): draft_owner, confirmed_by,
--   confirmed_at, latest_review_hash, any confirmation/deletion RPC, intake_sessions,
--   MatterSource, BootstrapPlan, workflow/AI/provider network fields.
--
-- SINGLE TRANSACTION: any failure during apply rolls back automatically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Pre-flight — refuse to proceed on inconsistent existing data (Obj 6 / status).
--   The status <-> confirmed_matter_id invariant is added below as a CHECK.
--   If any live row already violates it, STOP with a clear, non-leaky error.
-- ----------------------------------------------------------------------------
do $$
declare v_bad bigint;
begin
  select count(*) into v_bad
  from public.matter_intake_drafts
  where (status = 'confirmed') <> (confirmed_matter_id is not null);
  if v_bad > 0 then
    raise exception 'hardening aborted: % existing row(s) violate the confirmed/confirmed_matter_id invariant; reconcile data first', v_bad
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Obj 1 — record the previously OUT-OF-BAND auth_rls_initplan fix in history.
--   Replace the INSERT policy: bare auth.uid() -> (select auth.uid()). Behaviour
--   unchanged; wrapped form is evaluated once per statement (InitPlan). Also
--   defense-in-depth born-state constraints (the guard is authoritative).
-- ----------------------------------------------------------------------------
drop policy if exists matter_intake_drafts_insert on public.matter_intake_drafts;
create policy matter_intake_drafts_insert on public.matter_intake_drafts
  for insert to authenticated
  with check (
    app.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and status not in ('confirming', 'confirmed')
    and confirmed_matter_id is null
  );

-- ----------------------------------------------------------------------------
-- Obj 2/3/4/5 — the state-transition + column-mutation guard.
--   SECURITY INVOKER (reads only OLD/NEW + auth.role(); needs no privilege).
--   search_path pinned empty; the only schema object referenced (auth.role())
--   is fully qualified. VOLATILE (correct for a trigger fn). Fails closed with
--   stable, id-free reason codes.
--
--   TRANSITION ALLOWLIST for AUTHENTICATED direct updates (self always allowed):
--     active              -> needs_clarification | ready_for_review | rejected
--     needs_clarification -> active | ready_for_review | rejected
--     ready_for_review    -> active | needs_clarification | rejected
--     rejected            -> (terminal; no direct client reopen)
--     expired             -> (terminal; no direct client restore)
--     confirming          -> (reserved for Bootstrap RPC; client cannot enter/leave)
--     confirmed           -> (immutable)
--   Anything not listed fails. Permission is NEVER inferred from status ordering.
-- ----------------------------------------------------------------------------
create or replace function app.enforce_intake_draft_transitions()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  -- 'authenticated' for a signed end-user JWT; 'service_role'/NULL for trusted
  -- infrastructure. This is a verified role claim, NOT a client payload field.
  v_is_client boolean := (auth.role() = 'authenticated');
begin
  -- ==== INSERT: born only in an approved initial state ======================
  if tg_op = 'INSERT' then
    -- no caller may create an already-confirmed / pre-linked draft.
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

  -- (1) a confirmed row is fully frozen against the normal table path — any
  --     UPDATE (including a no-op) is rejected. Future minimization/retention
  --     must use a dedicated controlled operation, not the table UPDATE path.
  if old.status = 'confirmed' or old.confirmed_matter_id is not null then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMED_IMMUTABLE';
  end if;

  -- (2) identity columns are immutable after INSERT (every role).
  if new.organization_id is distinct from old.organization_id
     or new.created_by   is distinct from old.created_by
     or new.created_at   is distinct from old.created_at then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_IDENTITY_IMMUTABLE';
  end if;

  -- (3) confirmation lockdown (every role, incl. service_role, until Bootstrap).
  if new.confirmed_matter_id is distinct from old.confirmed_matter_id then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
  end if;
  if new.status in ('confirming', 'confirmed') and new.status is distinct from old.status then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_FORBIDDEN';
  end if;

  -- (4) authenticated direct-client restrictions ----------------------------
  if v_is_client then
    -- ACL: reviewer assignment is server-managed (no business-role logic here).
    if new.reviewer_ids is distinct from old.reviewer_ids then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_ACL_MUTATION_FORBIDDEN';
    end if;
    -- server-only fields (incl. version_token: optimistic-concurrency token is
    -- owned by trusted server updates — no current client route sets it).
    if new.provider_mode  is distinct from old.provider_mode
       or new.engine_version is distinct from old.engine_version
       or new.policy_snapshot is distinct from old.policy_snapshot
       or new.provenance   is distinct from old.provenance
       or new.confirmation_idempotency_key is distinct from old.confirmation_idempotency_key
       or new.correlation_id is distinct from old.correlation_id
       or new.version_token  is distinct from old.version_token
       or new.expires_at    is distinct from old.expires_at then
      raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_SERVER_FIELD_FORBIDDEN';
    end if;
    -- state-transition allowlist (confirming/confirmed already handled in (3)).
    if new.status is distinct from old.status then
      if not (
           (old.status = 'active'              and new.status in ('needs_clarification', 'ready_for_review', 'rejected'))
        or (old.status = 'needs_clarification' and new.status in ('active', 'ready_for_review', 'rejected'))
        or (old.status = 'ready_for_review'    and new.status in ('active', 'needs_clarification', 'rejected'))
      ) then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_TRANSITION_FORBIDDEN';
      end if;
    end if;
    -- content is editable ONLY in an editable state.
    if old.status not in ('active', 'needs_clarification', 'ready_for_review') then
      if new.structured_draft   is distinct from old.structured_draft
         or new.review_state    is distinct from old.review_state
         or new.clarification_rounds is distinct from old.clarification_rounds
         or new.confidential_input is distinct from old.confidential_input then
        raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONTENT_LOCKED';
      end if;
    end if;
  end if;

  -- (5) consistency backstop (stable code; the CHECK below is the hard invariant).
  if (new.status = 'confirmed') <> (new.confirmed_matter_id is not null) then
    raise exception using errcode = 'P0001', message = 'INTAKE_DRAFT_CONFIRMATION_INCONSISTENT';
  end if;

  return new;
end;
$$;

-- least-privilege EXECUTE: a trigger fn is invoked by the trigger machinery.
revoke all on function app.enforce_intake_draft_transitions() from public;
revoke all on function app.enforce_intake_draft_transitions() from anon;
revoke all on function app.enforce_intake_draft_transitions() from authenticated;

create trigger matter_intake_drafts_guard
  before insert or update on public.matter_intake_drafts
  for each row execute function app.enforce_intake_draft_transitions();

-- ----------------------------------------------------------------------------
-- Obj 6 — status <-> confirmed_matter_id consistency (hard row-local CHECK).
--   Biconditional: confirmed  <=>  confirmed_matter_id IS NOT NULL.
-- ----------------------------------------------------------------------------
alter table public.matter_intake_drafts
  add constraint matter_intake_drafts_confirm_consistency
  check ((status = 'confirmed') = (confirmed_matter_id is not null));

-- ----------------------------------------------------------------------------
-- Obj 7 — DELETE lockdown. Remove ALL authenticated/client DELETE; no
--   replacement policy. Retention deletion is a later controlled server/RPC
--   path (INTAKE_DRAFT_DELETE_FORBIDDEN is reserved for that path's denials).
-- ----------------------------------------------------------------------------
drop policy if exists matter_intake_drafts_delete on public.matter_intake_drafts;

-- ----------------------------------------------------------------------------
-- Obj 8 — function EXECUTE grant hardening (minimum viable).
--   can_access_intake_draft is called inside the RLS SELECT/UPDATE policies, so
--   the querying role must retain EXECUTE. enforce_draft_matter_org is a trigger
--   fn (no direct-call EXECUTE needed). Correct its volatility STABLE->VOLATILE
--   and sanitize its error text (no cross-tenant org id leak) — Obj 9.
-- ----------------------------------------------------------------------------
revoke all on function app.can_access_intake_draft(uuid, uuid, uuid[]) from public;
revoke all on function app.can_access_intake_draft(uuid, uuid, uuid[]) from anon;
grant execute on function app.can_access_intake_draft(uuid, uuid, uuid[]) to authenticated;
grant execute on function app.can_access_intake_draft(uuid, uuid, uuid[]) to service_role;

create or replace function app.enforce_draft_matter_org()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  matter_org uuid;
begin
  if new.confirmed_matter_id is null then
    return new;
  end if;
  select m.organization_id into matter_org from public.matters m where m.id = new.confirmed_matter_id;
  -- id-free, safe errors (do NOT echo the matter's owning-org id — cross-tenant leak).
  if matter_org is null then
    raise exception 'confirmed_matter_id is not valid' using errcode = 'foreign_key_violation';
  end if;
  if new.organization_id <> matter_org then
    raise exception 'confirmed_matter_id is not permitted for this draft' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function app.enforce_draft_matter_org() from public;
revoke all on function app.enforce_draft_matter_org() from anon;
revoke all on function app.enforce_draft_matter_org() from authenticated;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (safe on a DB holding no confirmed drafts):
--   begin;
--   drop trigger if exists matter_intake_drafts_guard on public.matter_intake_drafts;
--   drop function if exists app.enforce_intake_draft_transitions();
--   alter table public.matter_intake_drafts
--     drop constraint if exists matter_intake_drafts_confirm_consistency;
--   -- restore the original client DELETE policy:
--   create policy matter_intake_drafts_delete on public.matter_intake_drafts
--     for delete to authenticated
--     using ((app.can_access_intake_draft(organization_id, created_by, reviewer_ids)
--             or app.is_org_admin(organization_id))
--            and status in ('rejected','expired') and confirmed_matter_id is null);
--   -- restore the pre-hardening INSERT policy form ((select auth.uid()) InitPlan):
--   drop policy if exists matter_intake_drafts_insert on public.matter_intake_drafts;
--   create policy matter_intake_drafts_insert on public.matter_intake_drafts
--     for insert to authenticated
--     with check (app.is_org_member(organization_id) and created_by = (select auth.uid()));
--   -- (grants/volatility/message reverts intentionally omitted — strictly safer.)
--   commit;
-- ============================================================================
