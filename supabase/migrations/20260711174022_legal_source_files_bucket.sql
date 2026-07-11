-- ============================================================================
-- LawME — legal-source-files storage bucket (Epic 2, Phase 4)
-- Migration: 20260711174022_legal_source_files_bucket
-- STATUS: APPLIED to the development project (udispadsbxqicmawqcuk) on
-- 2026-07-11 with founder approval (Epic 2).
--
-- Private bucket, service-written, tenant-aware read paths.
-- Docs: docs/database/LEGAL_INTELLIGENCE_STORAGE_MODEL.md
-- Logical prefixes: global/ · organizations/<organization_id>/ · fixtures/
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-source-files',
  'legal-source-files',
  false,                                   -- private: no anonymous public reads
  104857600,                               -- 100MB, matches legal_document_files CHECK
  array[
    'application/pdf',
    'text/html',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json'
  ]
)
on conflict (id) do nothing;

-- READ: authenticated users may read the global corpus + fixtures prefixes.
create policy legal_source_files_read_global on storage.objects
  for select to authenticated
  using (
    bucket_id = 'legal-source-files'
    and (name like 'global/%' or name like 'fixtures/%')
  );

-- READ: org members may read their organization's private prefix.
-- Path rule: organizations/<organization_id>/...
create policy legal_source_files_read_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'legal-source-files'
    and name like 'organizations/%'
    and app.is_org_member(((string_to_array(name, '/'))[2])::uuid)
  );

-- NO client INSERT/UPDATE/DELETE policies: writes happen only through the
-- server-side ingestion path (service_role bypasses RLS). Ordinary users
-- have no direct browser write access by construction.
