-- ============================================================================
-- LawME — advisor hardening (Epic 2, Phase 6)
-- Migration: 20260711174702_advisor_hardening
-- STATUS: APPLIED to the development project (udispadsbxqicmawqcuk) on
-- 2026-07-11. Fixes every WARN + unindexed-FK INFO from the Supabase
-- advisors run. Docs: docs/database/LEGAL_INTELLIGENCE_SUPABASE_ADVISORS.md
-- ============================================================================

-- 1. function_search_path_mutable (WARN ×2): pin search_path on the two
--    trigger functions that lacked it.
alter function app.touch_updated_at() set search_path = public;
alter function app.forbid_mutation() set search_path = public;

-- 2. extension_in_public (WARN ×2): relocate pg_trgm + vector to the
--    dedicated extensions schema (Supabase default search_path includes it).
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
alter extension vector set schema extensions;

-- 3. auth_rls_initplan (WARN ×5): re-create the flagged policies with
--    (select auth.uid()) so the value is computed once per statement.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy organization_memberships_select on public.organization_memberships;
create policy organization_memberships_select on public.organization_memberships
  for select to authenticated
  using (profile_id = (select auth.uid()) or app.is_org_member(organization_id));

drop policy legal_research_sessions_insert on public.legal_research_sessions;
create policy legal_research_sessions_insert on public.legal_research_sessions
  for insert to authenticated
  with check (app.is_org_member(organization_id) and created_by = (select auth.uid()));

-- 4. unindexed_foreign_keys (INFO ×8): covering indexes.
create index benchmark_results_task_idx        on public.benchmark_results (task_id);
create index legal_claim_citations_doc_idx     on public.legal_claim_citations (document_id);
create index legal_claim_citations_version_idx on public.legal_claim_citations (version_id)
  where version_id is not null;
create index legal_document_files_doc_idx      on public.legal_document_files (document_id);
create index legal_research_results_doc_idx    on public.legal_research_results (document_id);
create index legal_research_results_ver_idx    on public.legal_research_results (version_id)
  where version_id is not null;
create index legal_research_sessions_creator_idx on public.legal_research_sessions (created_by);
create index legal_source_fetches_doc_idx      on public.legal_source_fetches (document_id)
  where document_id is not null;
