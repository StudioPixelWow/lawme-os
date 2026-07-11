# Supabase Advisors — Development Project (Epic 2, Phase 6)

**Project:** udispadsbxqicmawqcuk · run 2026-07-11, immediately after the
foundation + bucket migrations, and re-run after fixes.

## Round 1 findings and dispositions

### Security advisor

| Severity | Finding | Object | Disposition |
|---|---|---|---|
| WARN | function_search_path_mutable | app.touch_updated_at | **FIXED** — `set search_path = public` (20260711174702) |
| WARN | function_search_path_mutable | app.forbid_mutation | **FIXED** — same |
| WARN | extension_in_public | pg_trgm | **FIXED** — relocated to `extensions` schema |
| WARN | extension_in_public | vector | **FIXED** — relocated to `extensions` schema |
| INFO | rls_enabled_no_policy | legal_source_fetches | **ACCEPTED (intentional)** — ingestion telemetry is service-only by design; zero client policies IS the policy. Documented in LEGAL_INTELLIGENCE_POC_RLS.md |

### Performance advisor

| Severity | Finding | Objects | Disposition |
|---|---|---|---|
| WARN ×5 | auth_rls_initplan (per-row auth.uid()) | profiles select/insert/update · memberships select · sessions insert | **FIXED** — policies recreated with `(select auth.uid())` (20260711174702) |
| INFO ×8 | unindexed_foreign_keys | benchmark_results.task_id · claim_citations.document_id/version_id · document_files.document_id · research_results.document_id/version_id · sessions.created_by · source_fetches.document_id | **FIXED** — 8 covering indexes (partial where nullable) |
| INFO ×~20 | unused_index | all new indexes | **ACCEPTED** — the database is empty and unqueried; expected. Re-review after real usage |
| INFO | auth_db_connections_absolute | Auth server | **ACCEPTED (dev)** — instance-sizing tuning; revisit before production |

## Round 2 (post-fix) results
- **Security:** 1 finding — the intentional `rls_enabled_no_policy` INFO on
  legal_source_fetches. **Zero WARN, zero critical/high.**
- **Performance:** unindexed-FK findings resolved; remaining are the
  empty-database unused_index INFOs + the Auth connection INFO (accepted).

## Notes
- The `(select auth.uid())` pattern change is semantics-preserving — the
  same 11-test RLS suite passes locally after the equivalent change, and
  the remote RLS validation (Phase 7) ran AFTER the hardening migration.
- Nothing was suppressed without explanation; every finding above carries
  a fix or an explicit accepted-tradeoff rationale.
- The repo copy of the foundation migration retains the original policy
  syntax; the hardening migration (also in the repo) layers the fixes —
  local rebuilds replay both, matching the remote schema exactly.
