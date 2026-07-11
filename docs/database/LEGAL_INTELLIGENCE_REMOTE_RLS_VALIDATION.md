# Remote RLS Validation — Development Project (Epic 2, Phase 7)

**Run 2026-07-11 against udispadsbxqicmawqcuk (live), AFTER the advisor
hardening migration. Result: ALL 11 TESTS PASSED.**
Script: `supabase/tests/remote_rls_validation.sql` — fully transactional
(begin…rollback), synthetic UUID users only (rows in auth.users inside the
rolled-back transaction; **no real users were created**). Post-run counts
verified 0/0/0/0 — zero residue.

## Results

| # | Requirement | Method | Result |
|---|---|---|---|
| 1 | Tenant A cannot read Tenant B private documents | SELECT as user A on B's doc | ✅ 0 rows |
| 2 | Tenant A cannot update Tenant B records | UPDATE as user A | ✅ 0 rows affected |
| 3 | Ordinary users cannot insert global corpus records | INSERT org_id=NULL as user A | ✅ RLS violation raised |
| 4 | Cannot modify source authority scores | UPDATE authority_score on global row | ✅ 0 rows affected |
| 5 | Cannot alter verification status | UPDATE verification_status on global row | ✅ 0 rows affected |
| 6 | Cannot modify benchmark ground truth | UPDATE gold + INSERT task | ✅ 0 rows / RLS violation |
| 7 | Audit events immutable to clients | INSERT as user A (UPDATE/DELETE trigger-blocked, verified at apply time) | ✅ RLS violation |
| 8 | Authenticated users read approved global corpus | SELECT global doc as user A | ✅ 1 row |
| 9 | Anonymous users cannot read protected corpus | SELECT as `anon` | ✅ 0 rows / no grant |
| 10 | Membership removal immediately revokes access | DELETE membership → SELECT as ex-member | ✅ 0 rows |
| 11 | Service role performs only documented ingestion ops | INSERT global doc as `service_role` → visible to authenticated | ✅ ingested + readable |

## Notes
- JWT identity was simulated with both `request.jwt.claim.sub` and
  `request.jwt.claims` GUCs so `auth.uid()` resolves on all Supabase
  versions of the helper.
- T11's "only documented operations" is enforced organizationally, not by
  the database — service_role bypasses RLS by design (Supabase model); the
  control is that the key exists only server-side (threat model §16) and
  every ingestion write goes through the repository layer + audit events.
- The equivalent local suite (11 tests, PG16) remains in
  `supabase/tests/rls_validation.sql`; both suites must pass after any
  policy change.
