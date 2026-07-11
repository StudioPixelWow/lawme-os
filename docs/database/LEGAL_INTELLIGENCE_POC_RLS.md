# LawME — POC RLS Model

**Principle: no table is exposed without a documented policy. The global
public corpus and organization-private data never share a permissive
policy.** Validation: `supabase/tests/rls_validation.sql` (11 tests, all
passing locally).

## Roles
- **authenticated** — every signed-in user; everything below applies.
- **service_role** — Supabase's trusted server key; **bypasses RLS by
  design**. This IS the ingestion/benchmark/audit writer. It is never
  shipped to a client and never used from the browser (see
  docs/setup/SECRETS_AND_PERMISSIONS.md).
- **anon** — no policies anywhere → no access.

## Policy matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| organizations | members (not deleted) | — (service) | org admins | — (soft only) |
| profiles | self | self (id=auth.uid) | self | — |
| organization_memberships | own rows + rows of own orgs | org admins | org admins | org admins |
| legal_sources | any authenticated | — | — | — |
| legal_documents | global rows (org NULL) + own-org rows | **own-org private only** (org NOT NULL + member) | own-org private only | — (soft via UPDATE) |
| legal_document_versions/files/text/sections | via parent doc (can_read_document) | via parent doc (can_write_document → private docs only) | — | — |
| legal_entities | any authenticated | — | — | — |
| legal_document_entities | via parent doc | — (service) | — | — |
| legal_citations | via citing doc | — (service) | — | — |
| legal_source_fetches | — (service only) | — | — | — |
| legal_embeddings | via parent doc | — (service) | — | — |
| legal_research_sessions | org members | org members (created_by=self) | org members | — (soft) |
| legal_research_queries/results/answer_claims/claim_citations | org members via session chain | org members via session chain | — | — |
| benchmark_tasks/runs/results | any authenticated | — (service) | — | — |
| audit_events | **org admins, own org only** | — (service) | **trigger-forbidden** | **trigger-forbidden** |

## The seven denials the spec demands (all verified by tests)
1. Ordinary users cannot insert/alter **global** legal documents (T6, T7).
2. Cannot change **authority scores** or **verification status** on global
   rows — no UPDATE policy matches org_id IS NULL (T7).
3. Cannot touch another organization's private records (T3, T4, T5, T8).
4. Cannot alter **benchmark ground truth** (T9).
5. Cannot change **audit records** — trigger raises even outside RLS (T11).
6. Cannot write the **source registry** or fetch telemetry (T10).
7. Anonymous users have no path to anything (no anon policies).

## Mechanics worth knowing
- Membership checks go through **SECURITY DEFINER helpers**
  (`app.is_org_member`, `app.is_org_admin`, `app.can_read_document`,
  `app.session_org`…) to avoid recursive policy evaluation and to keep
  every policy one-line auditable.
- Child tables never re-implement tenancy — they delegate to the parent
  document/session helper, so the split lives in exactly one place.
- **Supabase grants note:** hosted Supabase grants table privileges to
  `authenticated` via default privileges; a bare local cluster needs
  `grant select, insert, update, delete on all tables in schema public to
  authenticated` before running the validation suite (the harness does
  this).

## Admin/partner behavior
Partners/owners/admins are ordinary members for corpus data (no elevated
document access), elevated only for: organization settings, memberships,
and audit-log reading. Deliberate: legal-knowledge access is role-flat in
the POC; matter-level permissions arrive with the Matter workspace.

## Future work (not POC)
Storage-bucket policies for legal_document_files objects (bucket ACLs),
JWT org claims to avoid membership lookups per request, matter-level
sharing, and anon read tiers for a public product surface — all founder
decisions later.
