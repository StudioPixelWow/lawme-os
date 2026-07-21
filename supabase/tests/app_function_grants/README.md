# app.* function EXECUTE grant hardening — validation harness

Self-contained local-PostgreSQL harness proving migration
`20260721090000_platform071_app_function_grant_hardening.sql` preserves RLS and
trigger execution while removing accidental PUBLIC/anon EXECUTE.

## Run order (throwaway local Postgres)

```
psql -f 00_base.sql                                                         # app.* fns + RLS + triggers, PUBLIC default
psql -f ../../migrations/20260721090000_platform071_app_function_grant_hardening.sql
psql -f 20_tests.sql                                                        # 13 checks -> public._results
psql -c "select test_no, passed, detail from public._results order by test_no;"
```

Result: **13/13**. Covers: PUBLIC/anon cannot execute protected helpers;
`authenticated` retains EXECUTE on RLS predicates; trigger functions still fire
(`touch_updated_at`, `forbid_established_fact_on_insert`); RLS still evaluates;
cross-tenant + anon reads denied; unused helpers (`current_org_ids`,
`matter_can_approve`) and trigger fns not client-executable; `forbid_established_
fact_on_insert` search_path pinned.

## Post-apply remote-state fixture (Development udispadsbxqicmawqcuk, 2026-07-21)

Effective EXECUTE grants after apply (`app.*`):

| function group | functions | grants |
|---|---|---|
| RLS predicates | is_org_member, is_org_admin, can_read_document, can_write_document, version_document, session_org, query_org, claim_org | postgres, authenticated |
| trigger fns | enforce_child_matter_org, enforce_matter_participant_org, forbid_established_fact_on_insert, forbid_mutation, touch_updated_at | postgres |
| unused | current_org_ids, matter_can_approve | postgres |
| intake (unchanged) | can_access_intake_draft | postgres, authenticated, service_role |

`has_function_privilege` confirmed: authenticated CAN exec is_org_member/version_document
(+ intake can_access); anon CANNOT; authenticated CANNOT exec touch_updated_at/matter_can_approve.
Security + performance advisors: no new ERROR/WARN.
