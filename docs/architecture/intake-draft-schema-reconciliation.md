# Intake-Draft Schema Reconciliation Audit

**Migration under audit:** `20260716120000_capability2_slice2a_intake_drafts`
**Scope:** read-only DB↔repository reconciliation for `public.matter_intake_drafts` on **Development** (`udispadsbxqicmawqcuk`) only. Production not referenced.
**Result:** **Verdict E** — live and repository have diverged (historical-record + missing hardening) and a corrective **additive** migration plus repository reconciliation is required. **Live security/immutability defects were found.**
**This run changed nothing** in the database or production code. All escalation tests ran inside transactions that were rolled back via `RAISE EXCEPTION`.

> This document is intentionally separate from `matter-bootstrap-engine-review.md`. Capability-0.8 implementation and Matter Bootstrap remain **paused/blocked** until this is reconciled (see "Why blocked").

---

## 0. What triggered this audit — honestly stated

Two founder observations were correct:
1. **The file header contradicts reality.** The migration file still reads `-- STATUS: PREPARED FOR REVIEW — NOT YET APPLIED. NOT COMMITTED.` yet the migration **was applied** to Development. That is a documentation defect I introduced.
2. **The applied schema lacks confirmed-state immutability and confirmation attribution.** Verified true (below).

One founder framing needs a precise correction: the fields `draft_owner`, `confirmed_by`, `confirmed_at`, `latest_review_hash` were **never part of the approved-and-applied v2 migration**. They appear only as *proposals* in the (not-yet-approved) `matter-bootstrap-engine-review.md`. So they are "absent because never added," not "approved then dropped." The underlying concern — the live schema is missing these invariants — is nonetheless valid and is treated here as a required hardening gap.

---

## 1. Exact live schema (source of truth: the live database)

### 1a. Columns (20)
| pos | column | type | null | default |
|---|---|---|---|---|
|1| id | uuid | NO | gen_random_uuid() |
|2| organization_id | uuid | NO | — |
|3| created_by | uuid | YES | — |
|4| reviewer_ids | uuid[] | NO | '{}' |
|5| status | text | NO | 'active' |
|6| provider_mode | text | NO | 'deterministic' |
|7| engine_version | text | NO | — |
|8| version_token | text | NO | — |
|9| policy_snapshot | jsonb | NO | '{}' |
|10| structured_draft | jsonb | NO | — |
|11| review_state | jsonb | NO | '{}' |
|12| clarification_rounds | jsonb | NO | '[]' |
|13| provenance | jsonb | NO | '[]' |
|14| confidential_input | text | YES | — |
|15| confirmation_idempotency_key | text | YES | — |
|16| confirmed_matter_id | uuid | YES | — |
|17| correlation_id | uuid | YES | — |
|18| created_at | timestamptz | NO | now() |
|19| updated_at | timestamptz | NO | now() |
|20| expires_at | timestamptz | YES | — |

**Absent remotely:** `draft_owner`, `confirmed_by`, `confirmed_at`, `latest_review_hash`.

### 1b. Constraints
- FK `organization_id → organizations(id)`, `created_by → profiles(id)`, `confirmed_matter_id → matters(id)`; PK `(id)`.
- CHECK `status ∈ {active, needs_clarification, ready_for_review, confirming, confirmed, rejected, expired}`.
- CHECK `provider_mode ∈ {deterministic, model_assisted, production_disabled}`.
- **No** confirmed↔matter consistency CHECK. **No** confirmed-attribution CHECK.

### 1c. Indexes
`pkey(id)`; unique partial `idem_uq (organization_id, confirmation_idempotency_key) where key not null`; `org_creator (organization_id, created_by)`; `org_status (organization_id, status)`; partial `expires (expires_at) where not null`.

### 1d. RLS policies (role `authenticated`)
- **SELECT** `using app.can_access_intake_draft(organization_id, created_by, reviewer_ids)`
- **INSERT** `check (app.is_org_member(organization_id) AND created_by = (select auth.uid()))`
- **UPDATE** `using app.can_access_intake_draft(...) with check app.can_access_intake_draft(...)` ← **the escalation vector: whole-row update, no column restriction, no immutability**
- **DELETE** `using ((can_access OR is_org_admin) AND status ∈ {rejected,expired} AND confirmed_matter_id IS NULL)`

### 1e. Triggers
- `matter_intake_drafts_touch` — BEFORE UPDATE → `app.touch_updated_at()`.
- `matter_intake_drafts_org_consistent` — BEFORE INSERT/UPDATE → `app.enforce_draft_matter_org()` (only checks `confirmed_matter_id`'s org == draft org).
- **No** confirmed-immutability trigger. **No** identity-immutability trigger. **No** transition-control trigger.

### 1f. Functions
- `app.can_access_intake_draft(uuid,uuid,uuid[])` — SQL, **STABLE, SECURITY DEFINER, search_path=public**, owner `postgres`. Body: `is_org_member(draft_org) AND (auth.uid()=draft_creator OR auth.uid()=ANY(reviewers))`. **EXECUTE granted to PUBLIC, authenticated, anon.**
- `app.enforce_draft_matter_org()` — plpgsql trigger, **STABLE, SECURITY DEFINER, search_path=public**, owner `postgres`. **EXECUTE granted to PUBLIC, authenticated, anon** (a trigger function needs none).

---

## 2. Required-field verification

| Field | remote | local file | types | founder-desired (v2/hardening) |
|---|---|---|---|---|
| created_by | ✅ | ✅ | ✅ | yes |
| draft_owner | ❌ | ❌ | ❌ | yes (hardening) |
| reviewer_ids | ✅ | ✅ | ✅ | yes |
| version_token | ✅ | ✅ | ✅ | yes |
| latest_review_hash | ❌ | ❌ | ❌ | yes (hardening) |
| confirmation_idempotency_key | ✅ | ✅ | ✅ | yes |
| confirmed_matter_id | ✅ | ✅ | ✅ | yes |
| confirmed_by | ❌ | ❌ | ❌ | yes (hardening) |
| confirmed_at | ❌ | ❌ | ❌ | yes (hardening) |
| provider_mode / engine_version / policy_snapshot / structured_draft / review_state / clarification_rounds / provenance / confidential_input / expires_at | ✅ | ✅ | ✅ | yes |

**Conclusion:** remote, local file, and generated types are **mutually consistent** on columns. The four hardening fields are absent in **all three** (never added).

---

## 3. Confirmation-invariant enforcement (all FAIL)

| # | Invariant | Enforced by | Status |
|---|---|---|---|
|1| status='confirmed' ⇒ confirmed_matter_id NOT NULL | — | **not enforced** |
|2| confirmed_matter_id NOT NULL ⇒ status='confirmed' | — | **not enforced** |
|3| confirmed_by required when confirmed | column absent | **not enforced** |
|4| confirmed_at required when confirmed | column absent | **not enforced** |
|5| confirmed_by/at immutable | — | **not enforced** |
|6| confirmed_matter_id immutable | — | **not enforced** |
|7| structured_draft immutable after confirm | — | **not enforced** (proven mutable) |
|8| review_state immutable after confirm | — | **not enforced** |
|9| clarification_rounds immutable after confirm | — | **not enforced** |
|10| organization_id/created_by/draft_owner immutable | org partial (confirmed_matter_id only) | **not enforced** (created_by proven mutable; org move blocked only by `is_org_member` in RLS check) |

**Application-code-only enforcement would be insufficient here — and today there is not even application code; the write path is the service role, which bypasses RLS entirely.**

---

## 4. Reviewer-ACL escalation test (live, rolled back)

Setup: creator + Reviewer A (assigned) + Reviewer B, org A. Acting as **Reviewer A** (`authenticated`, jwt sub = A):

| Attempt | Result |
|---|---|
| read draft | 1 (ok) |
| add Reviewer B to `reviewer_ids` | **ALLOWED — ACL ESCALATION** |
| change `created_by` | **ALLOWED — identity/attribution escalation** |
| move draft to another org | blocked (RLS `is_org_member`) |
| set `status='confirmed'` directly | **ALLOWED — bootstrap bypass** |
| set `confirmed_matter_id` (same-org) + confirmed | **ALLOWED — bootstrap bypass** |
| mutate `structured_draft` | **ALLOWED — reviewed content mutable** |

**Classification: LIVE SECURITY DEFECT.** Permission to *review* content currently grants permission to *administer the ACL*, *rewrite attribution*, and *confirm the draft* — violating the frozen access model ("review ≠ administer/confirm").

## 5. Creator-privilege test (live, rolled back)

Acting as **creator** (`authenticated`):

| Attempt | Result |
|---|---|
| add a **cross-tenant** UUID to `reviewer_ids` | **ALLOWED (no validation)** — harmless for *access* (reader still needs `is_org_member` of the draft org) but a data-integrity gap |
| mutate an **already-confirmed** draft's `structured_draft` | **ALLOWED — confirmed state NOT immutable** |
| reverse `confirmed → active` (clear matter) | **ALLOWED — terminal state reversible** |
| delete a `rejected` draft | rows=1, **audit_events delta = 0 — NO AUDIT ON DELETE** |

Classification per action: *technically allowed by RLS* for all; *intended by capability* for adding same-org reviewers only; **forbidden by founder policy** for confirming, attribution rewrite, confirmed mutation, and unaudited deletion. **RLS draft access is not equivalent to authorization for every state transition** — confirmed.

---

## 6. Function / grant security review

| Property | `can_access_intake_draft` | `enforce_draft_matter_org` |
|---|---|---|
| owner | postgres | postgres |
| SECURITY DEFINER | yes | yes |
| search_path pinned | `public` ✅ | `public` ✅ |
| volatility | STABLE (ok) | STABLE (acceptable for a read-only trigger; conventionally VOLATILE) |
| object qualification | `public.*` via search_path; calls `app.is_org_member` unqualified but search_path-safe | qualifies `public.matters` ✅ |
| EXECUTE to PUBLIC | **yes — should be revoked** | **yes — should be revoked (trigger fn needs none)** |
| EXECUTE to authenticated | yes (needed for RLS) | yes (unnecessary) |
| EXECUTE to anon | **yes — should be revoked** | **yes — should be revoked** |

**`can_access_intake_draft` information-leak analysis:** the function only ever answers about the **caller's own** identity/membership — `is_org_member(draft_org)` tests *the caller's* membership, and `auth.uid()=draft_creator/ANY(reviewers)` tests *the caller's* uid. Passing arbitrary `draft_creator`/`reviewers` for another user always yields false. So it is **not** an oracle about other users' relationships. The only self-knowledge leak is "am I a member of org X" for an arbitrary org X — low risk. **Recommendation:** `REVOKE EXECUTE … FROM PUBLIC, anon;` keep `authenticated` (required by RLS). Direct invocation is possible but not usefully abusable; revoking PUBLIC/anon is hygiene, not a critical fix.

**`enforce_draft_matter_org`:** a trigger function does not need any direct EXECUTE grant; direct invocation returns a trigger-context error and is useless. **Recommendation:** `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated;` (triggers still fire — they don't require the invoker to hold EXECUTE).

Neither function is a SQL-injection or search_path risk (both pinned; parameterized).

---

## 7. Checksum & migration-history proof (full SHA-256)

| Artifact | SHA-256 |
|---|---|
| **Reviewed-before-apply v2** (the body that executed) | `f01801494ad3c8d1ca822747b2516e44123c498a8a8a24de36c70d53ad4f0e5e` |
| **Current local file** (`…intake_drafts.sql`) | `bbee3c0a5b29943e38cf0548a5a552241166487a06035793d3aba219057bd18e` |
| **Reconstructed "as-executed"** (current file with the one initplan line reverted `(select auth.uid())` → `auth.uid()`) | `f01801494ad3c8d1ca822747b2516e44123c498a8a8a24de36c70d53ad4f0e5e` ✅ **matches row 1 exactly** |
| Migration-history `statements` note references | `f01801494ad3…` (the executed body) |

**Reconstruction (proven):** the current file differs from the executed body by exactly one line:
```
- with check (app.is_org_member(organization_id) and created_by = auth.uid());              # executed (f0180149)
+ with check (app.is_org_member(organization_id) and created_by = (select auth.uid()));     # current file (bbee3c0a)
```
**Sequence of events (certain):**
1. Version `20260716120000` executed the **`f0180149`** body (INSERT policy = bare `auth.uid()`).
2. The performance advisor flagged `auth_rls_initplan`; a **separate live `ALTER`/policy-replace** changed the live INSERT policy to `(select auth.uid())` — **not recorded as its own migration**.
3. The migration **file** was then edited to `bbee3c0a` to reflect the live state.

**Which scenario:** **C** — *the migration was applied and the local file was later changed* — but with the important nuance that the current file, applied fresh, **does** reproduce the current live objects (verified: live INSERT check = `(select auth.uid())`). So the file is **object-faithful to live** yet **not faithful to what version `20260716120000` executed as a unit**, and its header wrongly says "NOT YET APPLIED." Certainty is **achievable** (not scenario F): the executed body is byte-reconstructable and checksum-verified.

Earlier "the local file exactly matches live" was **essentially true object-by-object** but was asserted without the rigorous comparison now performed, and it glossed over (a) the wrong header and (b) the out-of-band ALTER not being its own migration. That overstatement is corrected here.

---

## 8. Generated-types reconciliation

`src/types/database.types.ts` `matter_intake_drafts.Row` has exactly the 20 live columns; `draft_owner`/`confirmed_by`/`confirmed_at`/`latest_review_hash` **absent**. **No** live-only, local-only, or type-only column; **no** nullable/type/default mismatch. Types are the same signal as live and file (consistent). Types are not the source of truth but here corroborate it.

---

## 9. Audit / delete conclusion

Draft deletion **does not** create an Audit event — proven (`audit_events` delta 0 on a `rejected` delete; no audit trigger exists). A DELETE **policy** alone cannot guarantee an audit record. **Recommendation:** deletion should occur only through a controlled `SECURITY DEFINER` RPC `app.delete_intake_draft(id)` that (a) writes an immutable `audit_events` row and (b) deletes in the same transaction; then the direct client DELETE policy should be **removed** (or narrowed to service-only). *Do not implement now.*

---

## 10. Reconciliation tables (summary)

**Columns:** file = live = types (consistent); 4 hardening fields absent in all three.
**Constraints:** file = live (2 CHECKs, 3 FKs, PK); **missing** confirmed↔matter + attribution CHECKs.
**Triggers:** file = live (`touch`, `org_consistent`); **missing** immutability/transition-control triggers.
**RLS:** file = live (S/I/U/D). INSERT differs from executed-body only by the initplan `(select auth.uid())` — present in file **and** live; **absent** in the recorded executed body. UPDATE policy is over-permissive (defect).
**Functions/grants:** file = live; **over-broad EXECUTE grants** (PUBLIC/anon) on both.

---

## 11. Final reconciliation verdict

**E — Live schema and repository artifact have diverged and require a corrective migration plus repository reconciliation.**

Precise breakdown: objectwise the current file **matches** live (not stale types, not a wrong file), but (1) the **historical record diverged** — the file was edited after apply, its header says "NOT YET APPLIED," an out-of-band `ALTER` (initplan fix) was applied without its own migration, and the history note's checksum (`f0180149`) ≠ the file (`bbee3c0a`); and (2) the live schema is **missing founder-required hardening** and carries **active security/immutability defects** (Sections 3–5). Both a corrective migration and a repository/historical reconciliation are required.

---

## 12. Corrective plan — DO NOT EXECUTE (for founder approval)

The recorded version `20260716120000` stays in remote history. **We never rewrite it as if it had executed changes it did not.** The plan therefore splits into historical accuracy + a new additive hardening migration.

### 12.1 Historical reconciliation (repository only; no DB change)
- **Revert** the `20260716120000` file's one initplan line back to `created_by = auth.uid()` so the file byte-equals what actually executed (`f0180149`), and **rewrite the header** to: `STATUS: APPLIED to Development (udispadsbxqicmawqcuk) on 2026-07-16; executed checksum f0180149…; the auth-initplan optimization and all hardening are recorded in the corrective migration 202607xx.` This makes the file an accurate record of the executed migration.
- Result: `20260716120000` file → `f0180149` (matches history note); the initplan fix + hardening move to the new migration.

### 12.2 Corrective **hardening** migration (new version) — additive only, RLS-first
Proposed name/version: **`20260717090000_capability2_slice2a_intake_drafts_hardening.sql`** (exact timestamp set at prepare time). Contents to **evaluate/prepare** (no SQL executed now):
- **Columns:** `draft_owner uuid references profiles(id)` (defaults to `created_by`); `confirmed_by uuid references profiles(id)`; `confirmed_at timestamptz`; `latest_review_hash text`.
- **CHECK (bidirectional):** `(confirmed_matter_id IS NOT NULL) = (status = 'confirmed')`.
- **CHECK (attribution):** `status <> 'confirmed' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)`.
- **INSERT policy replace** → `created_by = (select auth.uid())` (folds the out-of-band initplan fix into a recorded migration for fresh-apply parity).
- **Transition/immutability trigger** `app.enforce_intake_draft_transitions()` (BEFORE UPDATE): (a) block changes to `organization_id`, `created_by`, `draft_owner` (identity immutable); (b) if `OLD.status='confirmed'` block **all** field changes and any status change (confirmed = terminal + immutable content); (c) allow setting `status∈{confirming,confirmed}`, `confirmed_matter_id`, `confirmed_by`, `confirmed_at` **only** under a trusted bootstrap context flag (`current_setting('app.bootstrap',true)='on'`, set by the future bootstrap RPC) — i.e., **confirmation cannot happen via a direct client UPDATE**; (d) allow `reviewer_ids` changes **only** when `auth.uid()=created_by` OR `app.is_org_admin(organization_id)` (ACL administration ≠ review).
- **Controlled deletion (design):** add `app.delete_intake_draft(id)` RPC that audits-then-deletes; then **narrow** the direct DELETE policy to service/admin only. (May be a separate small migration.)
- **Grant hygiene:** `REVOKE EXECUTE ON app.can_access_intake_draft(...) FROM PUBLIC, anon;` and `REVOKE EXECUTE ON app.enforce_draft_matter_org() FROM PUBLIC, anon, authenticated;`.
- **`confirmed_at` DB-generated / `confirmed_by` RPC-derived:** confirmation attribution is set by the bootstrap RPC from the authenticated actor + `now()`, never from an arbitrary client update (enforced by the trigger's context-flag gate).

> Design note (matches the Bootstrap review): **do not overload RLS with confirmation-transition authorization.** Confirmation and ACL administration move to controlled server operations (the bootstrap RPC + trigger context flag); RLS keeps only read/edit access. This is why item (c)/(d) live in a trigger + RPC, not in the UPDATE policy.

### 12.3 Generated types
After the hardening migration is applied (on approval), regenerate `src/types/database.types.ts` (adds the 4 columns).

### 12.4 Remote-state fixture
Add/refresh a small SQL fixture capturing the exact remote object definitions for `matter_intake_drafts` (columns/constraints/policies/triggers/grants) so future drift is diffable.

### 12.5 Security regression tests
Re-run the reviewer-ACL and creator-privilege tests and assert they now **fail closed**: reviewer cannot add reviewers/change created_by/confirm/mutate; nobody can set `confirmed` outside the RPC; confirmed drafts are immutable; deletion writes audit.

### 12.6 Isolated commits
1. historical reconciliation (revert file + header) — one commit.
2. hardening migration (prepared, then applied on approval) — its own commit(s) with pre-apply review.
3. types regeneration — one commit.
4. fixture + security tests — one commit.

---

## 13. Files that would require change
- `supabase/migrations/20260716120000_capability2_slice2a_intake_drafts.sql` (revert initplan line + fix header — historical accuracy).
- **new** `supabase/migrations/20260717xxxxxx_capability2_slice2a_intake_drafts_hardening.sql` (hardening).
- `src/types/database.types.ts` (after hardening apply).
- **new** `supabase/tests/…` or `docs/database/…` remote-state fixture.
- (No application code changes required for the reconciliation itself.)

---

## 14. Founder decisions genuinely required
1. **Approve the corrective sequence** (historical revert + additive hardening migration). *Recommended: yes.* Blocks: bootstrap/Cap-0.8 until done.
2. **Confirmation may only occur via the bootstrap RPC (context-flag gate), not direct UPDATE** — confirm this model. *Recommended: yes* (it is what makes confirmation tamper-proof).
3. **`draft_owner` semantics** — is `draft_owner` a distinct transferable role, or just an alias of `created_by` for now? *Recommended:* add the column defaulting to `created_by`, make it immutable except via a future approved transfer RPC.
4. **Deletion path** — move to an audited RPC and remove the direct DELETE policy now, or defer to the retention-service slice? *Recommended:* defer the RPC but **narrow** the DELETE policy to admin/service in the hardening migration so unaudited creator deletes stop immediately. *(Founder decision: immediate narrow vs full defer.)*
5. **EXECUTE grant revocation** — approve revoking PUBLIC/anon EXECUTE on both functions. *Recommended: yes* (hygiene, low risk).

---

## 15. Why Capability 0.8 is paused / why Matter Bootstrap is blocked
- The Bootstrap Engine's safety depends on the draft being **tamper-proof at rest**: confirmation attribution, confirmed-state immutability, and "review ≠ confirm/administer." The live schema currently violates all three, so building Bootstrap on top would inherit an escalation path (a reviewer could self-confirm or rewrite attribution *before* the engine ever runs).
- The historical record is inaccurate (header + out-of-band ALTER), so proceeding would compound drift.
- Therefore: **reconcile first** (historical accuracy + hardening migration), **then** resume the Bootstrap plan. No implementation should begin until items 1–2 above are approved and the hardening migration is applied and re-tested.

---

## 16. Confirmation of no changes
No DDL/DML was committed to Development (all escalation tests were rolled back via `RAISE EXCEPTION`; verified zero net rows). No migration was applied. No repository file was edited in this audit run. No commit, push, or deploy. No production reference.
```

---

# PART II — Corrective Execution (2026-07-21)

Founder accepted **Verdict E** and approved the corrective sequence. This part records exactly what was prepared, locally validated, and left **un-applied / un-committed** pending founder review. No remote apply, no commit, no push, no production reference. Development database was **not** touched in this run (all validation ran on a disposable local PostgreSQL 16 cluster).

## 17. Founder decisions (as approved)

1. **Historical reconciliation approved.** `20260716120000` must represent the exact SQL originally executed against Development (`created_by = auth.uid()`, *not* the later out-of-band `(select auth.uid())`). Correct only non-executable header/metadata to state it truthfully as APPLIED. No future fields inserted.
2. **Additive hardening migration approved in principle** as `20260717090000_capability2_slice2a_intake_drafts_hardening.sql`.
3. **Direct confirmation through client UPDATE is forbidden.** No authenticated user may set `status='confirming'/'confirmed'`, `confirmed_matter_id` (or future `confirmed_by`/`confirmed_at`). Confirmation is reserved for the future founder-approved Matter Bootstrap RPC (after Capability 0.8 provides a real `ActorContext`). That RPC is **not** built now.
4. **Direct draft deletion disabled for this stage.** No partial deletion RPC now; authenticated client DELETE removed entirely. Retention deletion is a later controlled server/RPC path.
5. **Broad function EXECUTE privileges hardened** to the minimum required for RLS and trigger execution, proven still working — not blindly revoked.

## 18. Phase 1 — Historical reconciliation of `20260716120000`

**Executable body restored** to the originally-executed form: the INSERT policy is `created_by = auth.uid()` (the out-of-band InitPlan `(select auth.uid())` ALTER was removed from this historical file and is now recorded in `20260717090000`). Header rewritten to state: **APPLIED TO DEVELOPMENT**, project ref `udispadsbxqicmawqcuk`, version `20260716120000`, original executed checksum, production untouched, hardening recorded separately. No future fields added.

Checksum proof (full SHA-256 of the whole file):

| Artifact | Full-file SHA-256 |
|---|---|
| Original file as executed (old header + `auth.uid()`) — reproduced | `f01801494ad3c8d1ca822747b2516e44123c498a8a8a24de36c70d53ad4f0e5e` |
| Pre-reconciliation drifted file (old header + `(select auth.uid())`) | `bbee3c0a5b29943e38cf0548a5a552241166487a06035793d3aba219057bd18e` |
| **Reconciled historical file** (corrected header + `auth.uid()`) | `1a2bdebbe67b25bdb97b639dbe00786c8c21e525ad34b87a7803923a99ddf988` |

The **executable SQL** (comments stripped) of the reconciled file is byte-for-byte identical to the original executed body — both hash to `250b774cb18de59c5bdb319f8324f0db4d4cc36b9c6cd86179d7b7968df78624`. Only non-executable header comments changed; the executed behavior is unchanged. Object-by-object, the reconciled file recreates exactly the applied schema: functions `app.can_access_intake_draft`, `app.enforce_draft_matter_org`; table `matter_intake_drafts` (20 columns); indexes `org_status`, `org_creator`, `expires` (partial), `idem_uq` (partial unique); triggers `touch`, `org_consistent`; RLS enable + `select`/`insert`/`update`/`delete` policies — i.e. the state **before** the out-of-band InitPlan ALTER.

## 19. Phase 2 — Hardening migration `20260717090000`

Full-file SHA-256: **`da2a725fc45c2b3d75103367d463df6148ff41fb6275c9cd84d8402830f5d86c`**. Additive/corrective, single `begin;`…`commit;`, safe against the live 20-column schema (0 rows). Contents by objective:

- **Obj 1 — record InitPlan fix:** drop+recreate INSERT policy with `created_by = (select auth.uid())`, plus defense-in-depth `status not in ('confirming','confirmed') and confirmed_matter_id is null` on insert.
- **Obj 2 & 3 — ACL escalation + content/state separation (Approach C):** new `SECURITY INVOKER`, `VOLATILE`, `search_path=''` trigger `app.enforce_intake_draft_transitions()` on `BEFORE INSERT OR UPDATE`. Column-level guard tiers:
  - **A (all roles):** `organization_id`, `created_by`, `created_at` immutable after INSERT.
  - **B (all roles, until Bootstrap):** no transition into `confirming`/`confirmed`; no write to `confirmed_matter_id`.
  - **C (authenticated clients only):** `reviewer_ids`, `status`, `provider_mode`, `engine_version`, `policy_snapshot`, `confirmation_idempotency_key`, `correlation_id`, `expires_at` are server-managed; content (`structured_draft`, `review_state`, `clarification_rounds`, `provenance`, `confidential_input`) editable only while status ∈ {active, needs_clarification, ready_for_review}. Trusted server (service_role / null-jwt) bypasses Tier C via `auth.role()` — a signed JWT/role claim, **not** a client payload flag.
  - **D (all roles):** a confirmed draft (or any row with `confirmed_matter_id`) is fully immutable; no revert.
- **Obj 4 — confirmation lockdown:** Tier B blocks *every* caller (incl. service_role) from direct confirmation; the future Bootstrap migration will replace/extend the guard for its controlled context. No spoofable flag used.
- **Obj 5 — confirmed immutability:** Tier D freezes confirmed rows across all listed columns.
- **Obj 6 — status consistency:** CHECK `((status='confirmed') = (confirmed_matter_id is not null))`, with a pre-flight `DO` block that aborts with a safe error if any existing row would violate it.
- **Obj 7 — DELETE lockdown:** `matter_intake_drafts_delete` policy dropped; no replacement. Authenticated clients now delete 0 rows. (service_role maintenance is an operational concern, not a client policy.)
- **Obj 8 — grants + volatility:** `can_access_intake_draft` → REVOKE PUBLIC/anon, GRANT authenticated+service_role (required for RLS). `enforce_draft_matter_org` → REVOKE PUBLIC/anon/authenticated (trigger-invoked; no direct EXECUTE needed) and **volatility corrected STABLE→VOLATILE** (body unchanged). New guard fn → EXECUTE revoked from PUBLIC/anon/authenticated.
- **Obj 9 — safe errors:** all guard messages are generic; `enforce_draft_matter_org` messages sanitized to stop leaking the matter's owning-org UUID (cross-tenant leak). Stable SQLSTATEs (`23514` check_violation, `42501` insufficient_privilege).

**Explicitly NOT added:** `draft_owner`, `confirmed_by`, `confirmed_at`, `latest_review_hash`, any Bootstrap/deletion RPC, `intake_sessions`, `MatterSource`, `BootstrapPlan`, workflow/AI/provider network fields.

## 20. Local validation — 32/32 PASS

Disposable PostgreSQL 16 cluster; base = faithful model of the live foundation (`auth.uid()`/`auth.role()` JWT-claim stubs, Supabase roles `authenticated`/`anon`/`service_role`, `app.is_org_member`/`is_org_admin`, base tables); then applied the reconciled historical migration, table grants, and the hardening migration; then the live-state seed and the test suite.

All 32 required tests passed: migrations apply cleanly & atomically (1–3); read scoping creator/reviewer/non-reviewer/cross-tenant/anon (4–8); insert self-only (9–10); reviewer cannot administer ACL or set state (11–17); creator cannot self-confirm (18–19); allowed content edit works (20); confirmed immutability & no-revert (21–22); consistency CHECK (23); no client delete for creator/reviewer/admin/cross-tenant (24–27); RLS still works post grant-revoke (28); triggers still fire under authenticated despite EXECUTE revoked (29); anon & ungranted-PUBLIC direct helper EXECUTE denied (30–31); zero residual rows (32).

Root-cause spot checks confirmed each block fires for the **intended** reason (captured SQLSTATE + message), e.g. reviewer add-reviewer → `42501 reviewer assignment is managed by the server`; creator confirm → `23514 …confirmation is not permitted through this path`; confirmed tamper → `23514 a confirmed intake draft is immutable`; cross-tenant matter → `23514 confirmed_matter_id is not permitted for this draft` (sanitized). Same-tenant confirmation passes the org-consistency trigger once the guard is disabled — proving the future RPC path will function.

## 21. Advisor / static review — clean

Catalog verification on the applied local schema: `can_access_intake_draft` = STABLE/DEFINER/`search_path=public`, EXECUTE {postgres, authenticated, service_role}; `enforce_draft_matter_org` = VOLATILE/DEFINER/`search_path=public`, EXECUTE {postgres}; `enforce_intake_draft_transitions` = VOLATILE/INVOKER/`search_path=''`, EXECUTE {postgres}. No bare `auth.*()` remains in any policy expression → no `auth_rls_initplan` warning. RLS enabled. Biconditional CHECK present. DELETE policy absent. No trigger recursion (all BEFORE, no self-writes). Error messages id-free.

Two INFO-level notes (not defects): (a) `confirmed_matter_id` FK is unindexed — deferred, as confirmation is blocked and the column is always NULL until the Bootstrap path exists; add a partial index then. (b) the UPDATE RLS policy is intentionally broad (row-visibility only); column-level authorization is delegated to the guard trigger by design (Approach C), because RLS cannot express per-column rules.

## 22. Files changed in this run (uncommitted)

- `supabase/migrations/20260716120000_capability2_slice2a_intake_drafts.sql` — reconciled (header + policy line).
- `supabase/migrations/20260717090000_capability2_slice2a_intake_drafts_hardening.sql` — new hardening migration (not applied).
- `docs/architecture/intake-draft-schema-reconciliation.md` — this Part II.

## 23. Recommended verdict

**A — Safe to apply the hardening migration to Development** (after founder sign-off on this report). Apply order: `20260716120000` is already live and needs no re-apply; apply `20260717090000` once. Rollback guidance is embedded at the foot of the hardening file. Known limitations: no confirmation path yet (by design); unindexed confirmed-FK (deferred); lifecycle status transitions are server-only until the Bootstrap RPC lands.
```

---

# PART III — Hardening applied to Development (2026-07-21)

Final revision applied to DEVELOPMENT `udispadsbxqicmawqcuk` only; Production untouched.

## 24. Final artifact

`20260717090000_capability2_slice2a_intake_drafts_hardening.sql`
SHA-256 **`061375713be3f46790d7b581ed25ed5daa9054f88c5ca77fd1e187d02ef92a67`**.
The guard is a dumb **state-transition allowlist** + column-mutation matrix with
**stable P0001 reason codes** (`INTAKE_DRAFT_IDENTITY_IMMUTABLE`,
`_ACL_MUTATION_FORBIDDEN`, `_SERVER_FIELD_FORBIDDEN`, `_TRANSITION_FORBIDDEN`,
`_CONFIRMATION_FORBIDDEN`, `_CONFIRMED_IMMUTABLE`, `_CONTENT_LOCKED`,
`_CONFIRMATION_INCONSISTENT`; `_DELETE_FORBIDDEN` reserved). It carries **no**
business-role logic (deferred to Capability 0.8 — see ADR-0013).

Transition allowlist (authenticated direct updates; self always allowed):
`active → {needs_clarification, ready_for_review, rejected}`;
`needs_clarification → {active, ready_for_review, rejected}`;
`ready_for_review → {active, needs_clarification, rejected}`;
`rejected`/`expired`/`confirming`/`confirmed` are terminal to the client.
Confirmation (`confirming`/`confirmed`, `confirmed_matter_id`) is blocked for
**every** caller incl. service_role until `app.bootstrap_matter_v1()` (ADR-0012).

## 25. Local validation

**67/67** on both reconciliation paths (clean historical → hardening; and
historical + out-of-band InitPlan ALTER = live state → hardening). Full app
regression green: typecheck, lint, `next build`, and intake/persistence/matter/
view/workflow/documents/intelligence/dino/triad/legal-poc/legal-corpus suites +
intake benchmark. Harness committed at `supabase/tests/intake_drafts_hardening/`.

## 26. Development apply + verification

Applied via `execute_sql` (exact body) and stamped `supabase_migrations` version
`20260717090000` (the MCP auto-versioner cannot set a historical version).
Post-apply remote verification: migration history has `20260717090000` ×1 and
`20260716120000` ×1; INSERT policy uses the InitPlan-safe `(select auth.uid())`
form + born-state guards; **DELETE policy absent**; guard trigger present;
consistency CHECK present; RLS enabled; **0 bare `auth.*` in policies**. Functions:
`can_access_intake_draft` STABLE/DEFINER/`search_path=public`, EXECUTE
{authenticated, service_role}; `enforce_draft_matter_org` VOLATILE/DEFINER/
`search_path=public`, EXECUTE {postgres}; `enforce_intake_draft_transitions`
VOLATILE/INVOKER/`search_path=''`, EXECUTE {postgres}. Live behavioural probe
(fully rolled back, net-zero rows) returned every intended stable reason code and
allowed the one legal transition + a service-role reviewer_ids change.

Advisors: no ERROR/WARN introduced. Remaining INFO items are accepted (unindexed
`confirmed_matter_id` FK — deferred until confirmation exists; unused indexes —
table is empty; `created_by` FK matches the project-wide pattern). Regenerated
types: **empty diff** (no column-shape change).

## 27. Not done (frozen for later, per ADRs)

No Capability 0.8, no Matter Bootstrap, no `app.bootstrap_matter_v1()`, no
deletion RPC, no Workflow bootstrap, no LLM provider. Fields `confirmed_by`/
`confirmed_at`/`draft_owner`/`latest_review_hash` intentionally deferred to the
Capability 0.8 / Bootstrap migration that will own them.
