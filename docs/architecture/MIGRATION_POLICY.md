# LawME — Migration Policy (canonical)

Status: Adopted · Platform 0.7.1 · 2026-07-21

This is the canonical database-migration discipline for LawME. It exists because
migration history is a **legal-grade record**: it must describe the live database
honestly. Two real incidents motivate it — the **Intake Draft reconciliation**
(`docs/architecture/intake-draft-schema-reconciliation.md`, an out-of-band
`auth_rls_initplan` ALTER baked into a historical file) and the **Slice 2
`search_path` drift** (a `set search_path = public` added to
`app.forbid_established_fact_on_insert()` in a historical file after apply). Both
are the same failure: editing an already-applied migration to make it *look* as
if later changes were part of it. This policy prevents recurrence.

## 1. Historical migrations are immutable once applied
Once a migration has been applied to any environment, its **executable SQL is
frozen**. It represents exactly what ran. It is never edited to add, remove, or
alter executable statements.

## 2. Comment-only corrections
Non-executable header/comment text (e.g. a stale `STATUS: NOT YET APPLIED`, a
wrong version number) MAY be corrected **only** when (a) the executable SQL is
unchanged byte-for-byte, and (b) the remote truth has been verified (the version
is present in `supabase_migrations.schema_migrations` and the live objects match
the file). Comment corrections state: APPLIED TO DEVELOPMENT, the project ref,
the applied version, that Production is untouched, and the verified checksum.

## 3. Executable corrections require a NEW additive migration
Any change to executable behaviour — a new column, a policy change, a
`search_path` pin, a grant, a function body — is a **new, timestamped, additive
migration**. Never an edit to an applied file.

## 4. No conceptual rewriting of history
A historical file must never be rewritten so that later hardening appears to have
originated in it. When drift is found, the historical file is **restored to the
exact applied form** and the delta is captured in a new additive migration (the
Intake and Slice 2 reconciliations are the reference implementations).

## 5. Every migration
- uses a unique timestamp/version (matching its filename);
- is a single transaction where possible (`begin; … commit;`);
- contains explicit ROLLBACK GUIDANCE;
- pins `search_path` on every `SECURITY DEFINER` function (and on trigger
  functions that resolve unqualified objects);
- explicitly reviews `SECURITY DEFINER` usage and function EXECUTE grants
  (revoke PUBLIC/anon unless required; grant `authenticated` only where an RLS
  predicate needs it; `service_role` only where operationally necessary);
- is RLS-first (deny by default; tenant-scoped);
- contains no secrets;
- is validated locally before any remote apply.

## 6. Before remote apply
- verify the target project/ref is the intended DEVELOPMENT project
  (`udispadsbxqicmawqcuk`); **Production is never a migration target here**;
- verify the new version is absent from remote history;
- verify the expected pre-state (objects/rows the migration assumes);
- compute the full SHA-256 of the exact artifact;
- present the exact SQL diff;
- obtain explicit founder approval when the change is gated (all remote applies,
  RLS/grant/function changes are gated).

## 7. After apply
- verify the migration version appears **exactly once** in remote history;
- verify the created/altered object definitions match the file;
- run transactional security probes (rolled back; zero residual rows);
- run security **and** performance advisors — resolve any new ERROR/WARN;
- regenerate `src/types/database.types.ts`; if the shape is unchanged, confirm an
  empty diff and explain any metadata-only difference;
- verify test-data cleanup (no fixtures left behind);
- reconcile repository artifacts (fixtures, remote-state notes);
- **record the applied checksum** in the migration header / reconciliation doc.

## 8. Out-of-band SQL
Direct SQL against a remote database (outside a recorded migration) is
**prohibited** except for a genuine emergency correction. If it happens, it must
be (a) audited immediately, (b) captured in a new additive migration that brings
history back in step with live, and (c) **never** hidden by editing an old
migration. Generated types and live objects are checked to confirm reconciliation.

## 9. Commit boundaries
- one commit reconciles database-state/metadata (historical header corrections,
  reconciliation docs, regenerated types for the current live shape);
- one commit per corrective/hardening **migration** (the additive SQL + its
  security tests + post-apply notes);
- implementation code lives in its own commits;
- no unrelated files ride along. Commits are not squashed.

## 10. Production policy
Development first, always. Production is touched only under a separate, explicit
founder approval, with a backup/rollback plan and no implicit promotion from
Development. There is no automatic Dev→Prod migration flow.

## 11. Generated types are evidence, not truth
`database.types.ts` is a *regenerated artifact* used to detect shape changes. It
is never the schema source of truth and is never hand-edited to represent a shape
the database does not have.

## 12. The live database is the operational source of truth
Migration history must describe the live database honestly. When they disagree,
the reconciliation restores that honesty (revert historical to applied form +
additive migration), never a fiction.

---

### Reference precedents
- **Intake Draft reconciliation** — `docs/architecture/intake-draft-schema-reconciliation.md`
  (out-of-band InitPlan ALTER; historical file reverted to executed body; additive
  hardening migration `20260717090000`; executed-body SHA-256 recorded).
- **Slice 2 `search_path` drift** — Platform 0.7.1 (this slice): the out-of-band
  `set search_path = public` on `app.forbid_established_fact_on_insert()` removed
  from the historical file (restored to applied SHA-256
  `62a35d6c38e784d43a3cac089ca18a642d2b50d14fdfdadee5d303022f3c4f0e`) and recorded
  in the additive `…_platform071_app_function_grant_hardening.sql`.
