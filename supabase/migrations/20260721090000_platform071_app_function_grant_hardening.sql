-- ============================================================================
-- LawME — Platform 0.7.1: app.* function EXECUTE grant hardening
--   + reconciliation of one out-of-band search_path hardening.
--
-- STATUS: PREPARED FOR REVIEW — apply target on approval:
--   DEVELOPMENT project udispadsbxqicmawqcuk ONLY. Production is NEVER touched.
--
-- WHY
--   The Principal Platform Review found ~15 older app.* SECURITY DEFINER/trigger
--   helpers still carrying the default PUBLIC EXECUTE grant, while the Intake-era
--   helpers were hardened. This additive migration applies least-privilege
--   uniformly. It does NOT modify any historical migration file.
--
--   Classification (verified against live pg_proc + pg_policies, 2026-07-21):
--     * RLS-predicate helpers — called INSIDE `to authenticated` RLS policies, so
--       `authenticated` must retain EXECUTE. Policy-reference counts in ():
--         is_org_member(50), is_org_admin(10), can_read_document(7),
--         version_document(5), can_write_document(4), query_org(4),
--         claim_org(2), session_org(2).
--       -> REVOKE PUBLIC + anon; GRANT authenticated. (service_role bypasses RLS
--          and no application code calls these directly — grep: zero `.rpc(` in
--          src — so service_role is intentionally NOT granted: minimal.)
--     * Trigger functions — invoked by the trigger machinery, never called
--       directly; no client role needs EXECUTE:
--         enforce_child_matter_org, enforce_matter_participant_org,
--         forbid_established_fact_on_insert, forbid_mutation, touch_updated_at.
--       -> REVOKE PUBLIC + anon + authenticated.
--     * Unused helpers — referenced by NO policy and NO app code:
--         current_org_ids(0), matter_can_approve(0).
--       -> REVOKE PUBLIC + anon + authenticated. (If Capability 0.8 wires
--          matter_can_approve into RLS, that migration will grant it then.)
--
--   Already hardened by the Intake work (left untouched): can_access_intake_draft,
--   enforce_draft_matter_org, enforce_intake_draft_transitions.
--
-- RECONCILIATION (Slice 2 search_path drift)
--   `app.forbid_established_fact_on_insert()` had `set search_path = public` added
--   out-of-band to the live function AND baked into the historical migration
--   20260715120000 after apply. The historical file has been restored to its
--   originally-applied form (no search_path); this migration RECORDS the pinning
--   additively (idempotent — live already has it). This pins the trigger fn's
--   search_path, matching every other app.* SECURITY function.
--
-- SINGLE TRANSACTION: any failure during apply rolls back automatically.
-- ============================================================================

begin;

-- ── Reconciliation: record the out-of-band search_path pin (idempotent) ──────
create or replace function app.forbid_established_fact_on_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('confirmed', 'document_derived') then
    raise exception
      'intake may not create an established fact (status=%); confirmed/document_derived are reachable only through the evidence gate',
      new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ── RLS-predicate helpers: authenticated only (revoke PUBLIC/anon) ───────────
revoke all on function app.is_org_member(uuid)       from public, anon;
grant execute on function app.is_org_member(uuid)    to authenticated;
revoke all on function app.is_org_admin(uuid)        from public, anon;
grant execute on function app.is_org_admin(uuid)     to authenticated;
revoke all on function app.can_read_document(uuid)   from public, anon;
grant execute on function app.can_read_document(uuid) to authenticated;
revoke all on function app.can_write_document(uuid)  from public, anon;
grant execute on function app.can_write_document(uuid) to authenticated;
revoke all on function app.version_document(uuid)    from public, anon;
grant execute on function app.version_document(uuid) to authenticated;
revoke all on function app.session_org(uuid)         from public, anon;
grant execute on function app.session_org(uuid)      to authenticated;
revoke all on function app.query_org(uuid)           from public, anon;
grant execute on function app.query_org(uuid)        to authenticated;
revoke all on function app.claim_org(uuid)           from public, anon;
grant execute on function app.claim_org(uuid)        to authenticated;

-- ── Trigger functions: no direct EXECUTE for any client role ────────────────
revoke all on function app.enforce_child_matter_org()          from public, anon, authenticated;
revoke all on function app.enforce_matter_participant_org()    from public, anon, authenticated;
revoke all on function app.forbid_established_fact_on_insert() from public, anon, authenticated;
revoke all on function app.forbid_mutation()                   from public, anon, authenticated;
revoke all on function app.touch_updated_at()                  from public, anon, authenticated;

-- ── Unused helpers: no client EXECUTE (owner retains) ───────────────────────
revoke all on function app.current_org_ids()      from public, anon, authenticated;
revoke all on function app.matter_can_approve(uuid) from public, anon, authenticated;

commit;

-- ============================================================================
-- ROLLBACK GUIDANCE (restores the prior broad grants; strictly less safe):
--   begin;
--   grant execute on function app.is_org_member(uuid), app.is_org_admin(uuid),
--     app.can_read_document(uuid), app.can_write_document(uuid),
--     app.version_document(uuid), app.session_org(uuid), app.query_org(uuid),
--     app.claim_org(uuid), app.current_org_ids(), app.matter_can_approve(uuid),
--     app.enforce_child_matter_org(), app.enforce_matter_participant_org(),
--     app.forbid_established_fact_on_insert(), app.forbid_mutation(),
--     app.touch_updated_at() to public;
--   commit;
-- (The forbid_established_fact_on_insert search_path pin is intentionally NOT
--  reverted — it matches live and is strictly safer.)
-- ============================================================================
