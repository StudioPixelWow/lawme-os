-- Capability 0.8 · Slice 0.8.5 — RLS Authorization Alignment (ADDITIVE)
--
-- STATUS: PREPARED, NOT YET APPLIED. Requires founder approval before apply.
--
-- Purpose: make PostgreSQL RLS enforce the same RESOURCE-VISIBILITY outcomes as
-- the application Resource Authorization Policy Engine (resource-authorization-v1),
-- so a direct authenticated Supabase client cannot bypass application authorization.
--
-- What it does:
--   * Adds ONE database-native matter-read predicate: app.can_read_matter(uuid)
--     — active org membership for the matter's org AND (assigned owner OR an
--     explicit matter_members row). Generic org membership is NO LONGER enough.
--   * Replaces every broad `is_org_member`/`is_org_admin` SELECT policy on the
--     Matter and Matter-child tables with a narrow `can_read_matter(matter_id)`
--     policy (deny-by-default).
--   * DISABLES direct authenticated INSERT/UPDATE/DELETE on those tables. There
--     is no browser write path today (all writes use the service role after
--     application authorization); the service role bypasses RLS, so server flows
--     are unaffected. This also protects approval_state / confidentiality / fact
--     status from direct member mutation WITHOUT column-level triggers.
--
-- What it deliberately does NOT do (documented limitations):
--   * It does not persist or evaluate the TypeScript capability map. RLS enforces
--     TENANT + RESOURCE (ownership/membership/confidentiality) boundaries; the
--     APPLICATION layer remains authoritative for action-CATEGORY capabilities
--     (matters.update, assign_owner, documents.approve, …). Server routes must
--     still call the Policy Engine.
--   * It does not touch matter_intake_drafts (already creator/reviewer aligned).
--   * It does not change audit_events (org-admin scoped; no matter_id column to
--     compose on — limitation recorded in the alignment doc).
--   * It creates no capabilities table, no Identity tables, no
--     app.bootstrap_matter_v1(), and changes no legal-domain data.
--
-- Idempotency: uses DROP POLICY IF EXISTS + CREATE, CREATE OR REPLACE FUNCTION,
-- CREATE INDEX IF NOT EXISTS. Re-running is safe.
--
-- Rollback: see the paired guidance at the end of this file.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- PREFLIGHT — stop on unexpected schema/policy drift.
-- ─────────────────────────────────────────────────────────────────────────────
do $preflight$
begin
  if to_regprocedure('app.is_org_member(uuid)') is null then
    raise exception 'preflight: app.is_org_member(uuid) is missing';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='matters' and column_name='assigned_owner_id') then
    raise exception 'preflight: matters.assigned_owner_id is missing';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='matter_members' and column_name='profile_id') then
    raise exception 'preflight: matter_members.profile_id is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.matters'::regclass) then
    raise exception 'preflight: RLS is not enabled on public.matters';
  end if;
  -- baseline broad policy we intend to replace must be present (else drift)
  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='matters' and policyname='matters_select') then
    raise exception 'preflight: baseline policy matters_select not found (unexpected drift)';
  end if;
end
$preflight$;

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER — app.can_read_matter(uuid): the ONE canonical DB matter-read predicate.
-- SECURITY DEFINER (owner bypasses RLS on the inner reads → no recursive RLS).
-- Uses (select auth.uid()) InitPlan form. Fails closed when auth.uid() is null.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.can_read_matter(target_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select exists (
    select 1
    from public.matters m
    where m.id = target_matter_id
      and m.deleted_at is null
      and app.is_org_member(m.organization_id)      -- active membership of the matter's org
      and (
        m.assigned_owner_id = (select auth.uid())   -- owner
        or exists (                                 -- OR explicit matter member
          select 1 from public.matter_members mm
          where mm.matter_id = m.id
            and mm.profile_id = (select auth.uid())
        )
      )
  );
$fn$;

revoke all on function app.can_read_matter(uuid) from public;
grant execute on function app.can_read_matter(uuid) to authenticated;
-- service_role/postgres bypass RLS and do not need this grant.

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTERS — narrow SELECT to owner/member; disable direct authenticated writes.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matters_select on public.matters;
drop policy if exists matters_insert on public.matters;
drop policy if exists matters_update on public.matters;
create policy matters_select on public.matters
  for select to authenticated
  using (deleted_at is null and app.can_read_matter(id));
-- No authenticated INSERT/UPDATE/DELETE: matter writes are server-controlled.

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_MEMBERS — read only for matters you can read; NO direct authenticated
-- mutation (prevents self-assignment / self-promotion / can_approve on self).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_members_select on public.matter_members;
drop policy if exists matter_members_insert on public.matter_members;
drop policy if exists matter_members_update on public.matter_members;
drop policy if exists matter_members_delete on public.matter_members;
create policy matter_members_select on public.matter_members
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_PARTICIPANTS — legal-case parties; read via parent matter; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_participants_select on public.matter_participants;
drop policy if exists matter_participants_insert on public.matter_participants;
drop policy if exists matter_participants_update on public.matter_participants;
create policy matter_participants_select on public.matter_participants
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_DOCUMENTS — read via parent matter (+ not soft-deleted); writes server.
-- Disabling authenticated UPDATE protects approval_state / confidentiality.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_documents_select on public.matter_documents;
drop policy if exists matter_documents_insert on public.matter_documents;
drop policy if exists matter_documents_update on public.matter_documents;
create policy matter_documents_select on public.matter_documents
  for select to authenticated
  using (deleted_at is null and app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_NOTES — restricted/privileged notes no longer org-wide; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_notes_select on public.matter_notes;
drop policy if exists matter_notes_insert on public.matter_notes;
drop policy if exists matter_notes_update on public.matter_notes;
create policy matter_notes_select on public.matter_notes
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_EVIDENCE — read via parent matter; writes server (approval/truth safe).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_evidence_select on public.matter_evidence;
drop policy if exists matter_evidence_insert on public.matter_evidence;
drop policy if exists matter_evidence_update on public.matter_evidence;
create policy matter_evidence_select on public.matter_evidence
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_FACTS — read via parent matter; writes server. Disabling authenticated
-- writes blocks direct allegation→confirmed promotion; the insert guard trigger
-- (forbid_established_fact_on_insert) and org-consistency trigger are preserved.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_facts_select on public.matter_facts;
drop policy if exists matter_facts_insert on public.matter_facts;
drop policy if exists matter_facts_update on public.matter_facts;
create policy matter_facts_select on public.matter_facts
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_DEADLINES — read via parent matter; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_deadlines_select on public.matter_deadlines;
drop policy if exists matter_deadlines_insert on public.matter_deadlines;
drop policy if exists matter_deadlines_update on public.matter_deadlines;
create policy matter_deadlines_select on public.matter_deadlines
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_TASKS — read via parent matter; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_tasks_select on public.matter_tasks;
drop policy if exists matter_tasks_insert on public.matter_tasks;
drop policy if exists matter_tasks_update on public.matter_tasks;
create policy matter_tasks_select on public.matter_tasks
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_RESEARCH_LINKS — read via parent matter; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_research_links_select on public.matter_research_links;
drop policy if exists matter_research_links_insert on public.matter_research_links;
drop policy if exists matter_research_links_update on public.matter_research_links;
create policy matter_research_links_select on public.matter_research_links
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER_ACTIVITY — read via parent matter; writes server.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists matter_activity_select on public.matter_activity;
drop policy if exists matter_activity_insert on public.matter_activity;
create policy matter_activity_select on public.matter_activity
  for select to authenticated
  using (app.can_read_matter(matter_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTACTS — org-scoped SELECT stays (aligned: contacts are organization-level;
-- the contacts.read CAPABILITY remains the application-layer gate). Disable
-- direct authenticated writes (no authorized browser write route exists).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists contacts_insert on public.contacts;
drop policy if exists contacts_update on public.contacts;
-- contacts_select (app.is_org_member(organization_id)) is intentionally kept.

-- ─────────────────────────────────────────────────────────────────────────────
-- SUPPORTING INDEXES — for the authenticated owner/member read path RLS governs.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists matters_org_owner_idx
  on public.matters (organization_id, assigned_owner_id) where deleted_at is null;
create index if not exists matter_members_profile_idx
  on public.matter_members (profile_id);

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK GUIDANCE (manual; run only if the alignment must be reverted)
-- ─────────────────────────────────────────────────────────────────────────────
-- begin;
--   -- restore the prior BROAD policies
--   drop policy if exists matters_select on public.matters;
--   create policy matters_select on public.matters for select to authenticated
--     using (deleted_at is null and app.is_org_member(organization_id));
--   create policy matters_insert on public.matters for insert to authenticated
--     with check (app.is_org_member(organization_id));
--   create policy matters_update on public.matters for update to authenticated
--     using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));
--   -- ... repeat the analogous prior policies for every table above
--   -- (matter_members/participants used is_org_admin for writes; children used
--   --  is_org_member; contacts_insert/update used is_org_member) ...
--   drop function if exists app.can_read_matter(uuid);
--   drop index if exists public.matters_org_owner_idx;
--   drop index if exists public.matter_members_profile_idx;
-- commit;
