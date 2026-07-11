# Pre-Apply Review — Legal Intelligence POC Foundation (Epic 2, Phase 1)

**Migration:** `supabase/migrations/20260711155956_legal_intelligence_poc_foundation.sql`
**Reviewed:** 2026-07-11, immediately before apply. **Verdict: APPROVED to
apply to the DEVELOPMENT project only** (udispadsbxqicmawqcuk).

## Inventory (static-verified against the file)

| Item | Count | Notes |
|---|---|---|
| 1. Tables | **23** | exactly the approved POC set; zero CRM/finance/communication tables |
| 2. Extensions | 3 | pgcrypto, pg_trgm, vector — all bundled in Supabase PG17 |
| 3. Functions | 11 | app.touch_updated_at, app.forbid_mutation + 9 policy helpers |
| 4. Triggers | 9 | 7 × updated_at, 1 × audit immutability (UPDATE **and** DELETE), benchmark_tasks touch |
| 5. Indexes | 23 | org/source/case-number/type+date, FTS GIN, trigram GIN ×2, partial indexes on nullable FKs |
| 6. Constraints | CHECKs on every enum/range; FKs everywhere; uniques: slug, registry_code, (org,profile), (doc,version), storage path, (version,anchor), (entity_type,name), (query,rank), (run,task), task_code, canonical-URL partial unique for global docs |
| 7. RLS policies | **40**, RLS enabled on 23/23 tables | |
| 8. SECURITY DEFINER | 9/9 carry `set search_path = public` — none unsafe | |

## Policy-model review
- **9. Public-corpus policies:** global rows (org IS NULL) readable by
  authenticated; **no client write path exists** (no INSERT/UPDATE policy
  matches org IS NULL). Writes only via service_role (RLS bypass) —
  the documented ingestion path.
- **10. Organization-private policies:** all private reads/writes gated by
  `app.is_org_member`/`is_org_admin` (SECURITY DEFINER, search_path
  pinned); child tables delegate to parent-document/session helpers —
  tenancy logic lives in exactly one place.
- **11. Audit immutability:** trigger raises on UPDATE/DELETE (superuser
  paths included); clients also have no write policy.
- **12. Benchmark ground truth:** SELECT-only for clients; task/run/result
  writes are service-only.
- **13. Service-role assumptions:** Supabase service_role bypasses RLS —
  used ONLY server-side (never client, never repo, never logs). Explicit
  in LEGAL_INTELLIGENCE_POC_RLS.md.
- **14. Soft delete:** deleted_at on organizations/profiles/documents/
  research sessions; SELECT policies exclude deleted rows; no client
  DELETE policies anywhere.

## Static checks (Phase-1 required list)
| Check | Result |
|---|---|
| Missing RLS | none — 23/23 |
| Permissive `USING (true)` | 5 occurrences — ALL are SELECT-only on global reference data (legal_sources, legal_entities, benchmark_*) for `authenticated`; intentional & documented; zero write policies use it |
| Permissive `WITH CHECK (true)` | 0 |
| Missing org isolation | none — nullable org_id only on legal_documents (NULL=global by design) and audit_events (global events allowed) |
| Unsafe SECURITY DEFINER search_path | 0 (9/9 pinned) |
| Mutable audit records | blocked by trigger + no policies |
| Missing FK indexes | covered: org/source/version/query/claim/entity FKs all indexed (partial where nullable) |
| Nullable tenant IDs where not intended | none |
| Cascade-delete risks | single cascade: profiles ← auth.users (intentional identity cleanup); documents/sessions use RESTRICT-by-default FKs |
| Public grants | 0 grant statements; no anon/public policies |
| Insecure function EXECUTE | functions in `app` schema; Supabase grants EXECUTE per default privileges; helpers are read-only membership checks — accepted |

## 15. Storage requirements
Bucket creation is NOT in this migration (storage is a separate concern);
Phase 4 creates `legal-source-files` + policies in its own migration.
`legal_document_files` CHECK caps byte_size at 100MB.

## 16. Rollback
Single transaction (auto-rollback on failure); documented DROP script for
empty DBs; backup-restore rule for non-empty. Dev project holds zero data
pre-apply → rollback risk minimal.

## 17. Locking/performance risks
Empty database → all DDL instant; no table rewrites, no concurrent-index
needs, no long locks possible. Trigram GIN indexes are created empty
(cost arrives on future bulk ingest — acceptable, indexes exist first).

## 18. PostgreSQL 16 (local validation) vs 17.6 (dev project)
No version-sensitive constructs: no MERGE, no PG17-only syntax; generated
columns, gen_random_uuid, tsvector 'simple', pg_trgm, pgvector and
`set local check_function_bodies = off` behave identically on 16 and 17.
pgvector is bundled by Supabase on PG17. **No differences expected;**
post-apply verification confirms empirically.

## Conclusion
No critical issues. No changes required. Proceed to apply — DEVELOPMENT
project only, via the Supabase MCP migration path (records migration
history), no destructive commands.
