# LawME — POC Migration Review

**File:** `supabase/migrations/20260711155956_legal_intelligence_poc_foundation.sql`
**Reviewed:** 2026-07-11 · **Verdict: ready for founder approval — NOT applied.**

## Review checklist

| Check | Result |
|---|---|
| Applies cleanly on PostgreSQL 16 + pgvector + pg_trgm | ✅ local cluster, single transaction |
| 23 tables, exactly the approved POC set (no CRM/finance/etc.) | ✅ |
| RLS enabled on every table | ✅ 23/23 |
| Every exposure documented | ✅ 40 policies + LEGAL_INTELLIGENCE_POC_RLS.md |
| Cross-tenant leakage tests | ✅ 11/11 pass (supabase/tests/rls_validation.sql) |
| UUID PKs, timestamptz, CHECKs, FKs, uniques, partial indexes | ✅ |
| Soft-delete aware | ✅ deleted_at + policy exclusion |
| Hebrew-safe lexical plan | ✅ simple FTS generated column + pg_trgm |
| pgvector-ready | ✅ dimension-flexible embedding column, ANN index deferred to model choice |
| Provenance & citation anchors | ✅ fetches table, parser_version, sections/anchor_key, claim citations |
| Public/private separation without a shared permissive policy | ✅ org_id NULL-ness + can_read/can_write helpers |
| No secrets, no data, no seeds | ✅ DDL only |
| Rollback guidance | ✅ in-file (transaction auto-rollback + documented DROP script + backup rule) |

## Notes & known limitations (honest)
1. **`set local check_function_bodies = off`** is required because
   SECURITY DEFINER helpers reference tables created later in the same
   file — standard for single-file bootstraps; helpers were exercised by
   the RLS tests afterward.
2. **Hebrew FTS uses the `simple` config** — no stemming. Acceptable for
   the POC (trigram + application-side normalization compensate); a
   dedicated Hebrew analyzer is a future decision.
3. **Embedding column is un-dimensioned** — intentionally; an ANN index
   (ivfflat/hnsw) requires a fixed dimension and arrives with the real
   model in its own migration.
4. **Storage-bucket policies** for `legal_document_files` objects are out
   of scope here (bucket creation is a Supabase dashboard/CLI action, not
   a SQL migration) — flagged for the apply-time checklist.
5. **Supabase grant model assumed**: hosted projects grant table
   privileges to `authenticated` by default; the RLS policies are the
   actual gate. Local validation replicates the grants explicitly.
6. `anon` has zero policies → zero access. If a public marketing surface
   ever needs corpus reads, that is a new, deliberate policy.

## Apply procedure (WHEN the founder approves)
1. `npm run build && npm run env:check` green.
2. `npx supabase db push` against the dev project (udispadsbxqicmawqcuk).
3. Run Supabase advisors (read-only MCP) — must stay clean; RLS-off
   findings are release blockers (DATABASE_WORKFLOW.md).
4. Create the storage bucket(s) for document files + bucket policies.
5. `npm run db:types` → commit regenerated types with the migration.
6. Record the apply in docs/setup/CONNECTION_STATUS.md.

## Rollback procedure
- Failure during apply: nothing to do (transactional).
- After apply, empty DB: run the documented DROP script (bottom of the
  migration file).
- After apply, with data: **restore from backup** — never the DROP path.
