# RLS Authorization Alignment

Capability 0.8 · Slice 0.8.5 · **PREPARATION + LOCAL VALIDATION ONLY — NOT APPLIED**

Migration: `supabase/migrations/20260722120000_capability08_rls_authorization_alignment.sql`
SHA-256: `bd30a4ced83b643b666d660b40740bc031c4846685a3c8eeb7fd659df3862768`

The application Resource Authorization Policy Engine (`resource-authorization-v1`)
is stricter than the live database RLS: every Matter and Matter-child table gates
reads on `app.is_org_member(organization_id)` only, so a direct authenticated
Supabase client could read matters the actor does not own or belong to — bypassing
application policy. This slice designs and prepares an additive migration that
makes the database enforce the same **resource-visibility** outcomes.

The database enforces a **native projection** of the model, not the TypeScript
policy: RLS knows only persisted facts (tenant, ownership, membership,
confidentiality, parentage, immutability). It does **not** know the capability
map, UI roles, workflow, intelligence, or Bootstrap.

## Phase 2 — Actor identity in RLS (confirmed live)

`public.profiles.id` is a foreign key to `auth.users` (`profiles_id_fkey`,
confirmed live), so for a user actor `auth.uid() = profiles.id`. `(select auth.uid())`
is therefore the canonical, safe, InitPlan-optimized identity expression — **no
`app.current_profile_id()` helper is added** (it would be redundant). All
user-facing RLS fails closed when `auth.uid()` is null.

## Phase 1 — Exact current RLS (live Development)

Helpers (all `SECURITY DEFINER`, `STABLE`, `search_path=public`): `app.is_org_member(org)`
(active membership), `app.is_org_admin(org)` (role ∈ owner/partner/admin),
`app.can_access_intake_draft(org,creator,reviewers)`, `app.matter_can_approve(matter)`
(reads `matter_members.can_approve`; currently unused, grant-revoked),
`app.current_org_ids()` (unused). EXECUTE granted to `authenticated` for
is_org_member/is_org_admin/can_access_intake_draft only; `matter_can_approve`/
`current_org_ids` are postgres-only.

RLS is enabled on all target tables. Every child has an indexed `matter_id`;
`matter_members` has the `(matter_id, profile_id)` unique index; `deleted_at`
exists only on `matters` and `matter_documents`.

### Gap matrix

| Table | Op | Current RLS | Application policy | Mismatch | Risk | Target RLS | Migration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| matters | SELECT | `deleted_at is null AND is_org_member(org)` | owner OR active member (+confidentiality) | RLS broader | **HIGH** | `deleted_at is null AND can_read_matter(id)` | yes |
| matters | INS/UPD | `is_org_member(org)` | server + capability | RLS broader; approval-free writes | HIGH | disable authenticated (server-controlled) | yes |
| matter_members | SELECT | `is_org_member(org)` | members of readable matters | RLS broader | MED | `can_read_matter(matter_id)` | yes |
| matter_members | INS/UPD/DEL | `is_org_admin(org)` | server (capability-gated) | admin can self-assign/self-promote | **HIGH** | disable authenticated | yes |
| matter_participants | SELECT | `is_org_member(org)` | parent matter read | RLS broader | MED | `can_read_matter(matter_id)` | yes |
| matter_participants | INS/UPD | `is_org_admin(org)` | server | direct browser write | MED | disable authenticated | yes |
| matter_documents | SELECT | `deleted_at is null AND is_org_member(org)` | parent matter read (+conf) | RLS broader | **HIGH** | `deleted_at is null AND can_read_matter(matter_id)` | yes |
| matter_documents | INS/UPD | `is_org_member(org)` | server; approval authority | member can self-approve / change confidentiality | **HIGH** | disable authenticated | yes |
| matter_notes | SELECT | `is_org_member(org)` | parent matter read | privileged notes org-wide | HIGH | `can_read_matter(matter_id)` | yes |
| matter_notes | INS/UPD | `is_org_member(org)` | server | direct write | MED | disable authenticated | yes |
| matter_evidence | SELECT | `is_org_member(org)` | parent matter read | RLS broader | HIGH | `can_read_matter(matter_id)` | yes |
| matter_evidence | INS/UPD | `is_org_member(org)` | server; approval separate | direct approval/truth mutation | HIGH | disable authenticated | yes |
| matter_facts | SELECT | `is_org_member(org)` | parent matter read | RLS broader | HIGH | `can_read_matter(matter_id)` | yes |
| matter_facts | INS/UPD | `is_org_member(org)` (+insert guard trigger) | server; epistemic guard | direct allegation→confirmed on UPDATE | **HIGH** | disable authenticated (insert guard preserved) | yes |
| matter_tasks / research_links / deadlines / activity | SELECT | `is_org_member(org)` | parent matter read | RLS broader | MED | `can_read_matter(matter_id)` | yes |
| (same) | INS/UPD | `is_org_member(org)` | server | direct write | MED | disable authenticated | yes |
| contacts | SELECT | `is_org_member(org)` | same org + contacts.read (capability) | **ALIGNED** (org-scoped) | LOW | unchanged | no |
| contacts | INS/UPD | `is_org_member(org)` | server (no authorized route) | direct write | LOW | disable authenticated | yes |
| audit_events | SELECT | `org_id is not null AND is_org_admin(org)` | audit.read + matter access | no `matter_id` column to compose | LOW | **unchanged** (limitation) | no |
| matter_intake_drafts | ALL | creator/reviewer (`can_access_intake_draft`) | creator/reviewer | **ALIGNED** (reference) | LOW | **unchanged** | no |

## Target design

### Matter access predicate

```sql
app.can_read_matter(target_matter_id uuid) returns boolean  -- SECURITY DEFINER, search_path=public
  := matter exists AND not deleted
     AND is_org_member(matter.organization_id)          -- active membership of the matter's org
     AND ( matter.assigned_owner_id = (select auth.uid())      -- owner
           OR EXISTS matter_members(matter_id, profile_id=(select auth.uid())) )  -- member
```

Generic org membership is no longer sufficient. Confidentiality never **broadens**
access: for all values (`internal`/`client_confidential`/`privileged`) the persisted
result is identical — **owner or matter member**. No broad-read/compliance override
is invented (no persisted source). Fails closed on null `auth.uid()`. It is
`SECURITY DEFINER` (owner bypasses RLS on the inner reads → **no recursive RLS**),
uses the `(select auth.uid())` InitPlan form, is a PK + unique-index lookup, and
is granted EXECUTE to `authenticated` only (revoked from PUBLIC; not anon/service_role).

### Write model — why authenticated writes are disabled

The database does **not** persist the TypeScript capability map, so RLS cannot
enforce action-category capabilities (`matters.update`, `assign_owner`,
`documents.approve`, …). Rather than a partial/incorrect browser write model, the
migration **disables direct authenticated INSERT/UPDATE/DELETE** on every Matter
and Matter-child table (and contacts). This is safe and correct because **no
browser write path exists today** — every matter/document/child write goes through
the service role (which bypasses RLS) after application authorization. Disabling
authenticated writes also protects `approval_state`, `confidentiality`, and fact
status from direct member mutation **without column-level triggers**, and the
existing `matter_facts` insert guard + org-consistency triggers are preserved.

When a future slice enables capability-aware browser writes, it will add
`app.can_write_matter(uuid)` / reuse `app.matter_can_approve(uuid)` and narrow
INSERT/UPDATE policies (designed but intentionally NOT created now to avoid unused
functions).

### Application ↔ RLS division of authority

| Concern | Enforced by |
| --- | --- |
| Tenant isolation | RLS (`is_org_member` inside `can_read_matter`) |
| Matter ownership / membership visibility | **RLS** (`can_read_matter`) |
| Confidentiality (never broadens) | RLS (owner/member required at every tier) |
| Resource parentage (child ↔ matter) | RLS (`can_read_matter(child.matter_id)`) |
| Action-category capability (update/approve/assign) | **Application** (Policy Engine) — RLS cannot; capabilities not persisted |
| Approval authority (`can_approve`) | Application now; RLS-ready via `matter_can_approve` when writes are enabled |

RLS becomes authoritative for tenant/resource/confidentiality visibility; the
application remains authoritative for action-category capabilities. **Server routes
must still call the Policy Engine.** A direct browser client can no longer bypass
resource visibility.

## Limitations (honest)

- **audit_events**: no `matter_id`/classification column, so matter-scoped audit
  cannot be RLS-composed. Left at `is_org_admin` (org-scoped, immutable). A future
  Bootstrap-era audit may need an explicit `matter_id` reference — a **separate**
  proposal, not part of this migration.
- **Capabilities are not persisted**, so category-level authorization stays in the
  application. RLS is deliberately *more* restrictive (owner/member), never broader.
- **Writes are fully server-controlled** for these tables until a capability-aware
  write path is approved. This assumes no near-term browser (authenticated-client)
  write requirement — confirmed against the current codebase (all writes use the
  service role).
- **contacts** read stays org-scoped (correct: contacts are organization-level; the
  `contacts.read` capability is the application gate).

## Local validation (disposable PostgreSQL 16 cluster — never Development)

Applied the migration over a faithful baseline (live helper bodies + exact current
policies + seed) and ran a direct-RLS harness as the `authenticated` role with a
simulated `auth.uid()`:

- **61 behavioral assertions pass, 0 fail.** The blocking test holds: a same-org
  **non-member** receives **zero rows** for the Matter and every child
  (documents, notes, evidence, facts, deadlines, tasks, research links, activity,
  participants, members); **cross-tenant** receives zero; **anonymous** (null uid)
  receives zero; **owner/member** receive permitted rows; privileged matters and
  documents follow owner/member access; cross-matter document access is denied.
- **Write denials:** members cannot update matters, self-assign owner, change
  confidentiality, set `can_approve`, add/remove members, mutate `approval_state`,
  promote a fact to `confirmed`, or insert participants/deadlines/contacts; owner
  direct update/delete is also disabled (server-controlled).
- **Intake reference unchanged:** creator/reviewer read; same-org non-reviewer and
  cross-tenant denied.
- **Helper/grants/replacement:** `can_read_matter` executable by `authenticated`
  only (not PUBLIC/anon/service_role), SECURITY DEFINER + pinned search_path; **0**
  broad `is_org_member`/`is_org_admin` policies remain on matter tables; exactly one
  SELECT policy per table, zero authenticated write policies; RLS enabled on all;
  no recursion; test rows live only on the disposable cluster.

## Advisors (read-only Development baseline; post-apply re-run recommended)

Security: one pre-existing INFO (`rls_enabled_no_policy` on the unrelated
`legal_source_fetches`). Performance: only INFO — pre-existing `unindexed_foreign_keys`
(the migration's two new indexes cover `matters.assigned_owner_id` and
`matter_members.profile_id`) and `unused_index`. **No** `auth_rls_initplan` warning
(the helper uses `(select auth.uid())`), **no** `multiple_permissive_policies`
(one policy per command). The migration introduces no new WARN/ERROR.

## Apply order & rollback

Apply order: single atomic migration (preflight → `can_read_matter` + grants →
per-table DROP broad + CREATE narrow SELECT + drop authenticated write policies →
supporting indexes), inside one `BEGIN…COMMIT`. Rollback: recreate the prior broad
policies and drop `can_read_matter` + the two indexes (guidance inlined at the end
of the migration file).

## Status

Prepared, locally validated, **APPLIED TO DEVELOPMENT** (see post-apply section),
and verified. Awaiting founder review of the applied result before push.

---

# Post-Apply (Development)

- **Apply timestamp:** 2026-07-22 12:46 UTC (approx.)
- **Project:** LawME · ref `udispadsbxqicmawqcuk` · region ap-south-1 · **Development only**
- **Migration checksum (reviewed & applied):** `bd30a4ced83b643b666d660b40740bc031c4846685a3c8eeb7fd659df3862768`
- **Founder decision applied:** no near-term direct authenticated-browser writes; all
  protected writes go through server-side application paths; future atomic Matter
  creation via `app.bootstrap_matter_v1()` (not built here).

### Pre-apply gate (all passed)
HEAD `b44ecd7`; file checksum matched exactly; version `20260722120000` absent;
`app.can_read_matter` absent; baseline `matters_select` (is_org_member) present;
RLS enabled; `matter_members(matter_id,profile_id)` unique index present; all 11
target tables present; Production not referenced; preflight read-only.

### Migration history
`20260722120000 capability08_rls_authorization_alignment` appears **exactly once**.

### Helper (live)
`app.can_read_matter(uuid)` → `boolean`, **SECURITY DEFINER**, **STABLE**,
`search_path=public`; body uses `(select auth.uid())`, checks `is_org_member` of
the matter's org AND (`assigned_owner_id` OR `matter_members`), ignores deleted
matters, returns boolean only. Grants: **authenticated EXECUTE only** — PUBLIC
revoked, anon `false`, service_role `false`.

### Final policy matrix (live)
Every target table has RLS enabled with **exactly one SELECT policy** and **zero
authenticated write policies**:

| table | SELECT `using` | authenticated writes |
| --- | --- | --- |
| matters | `deleted_at is null AND can_read_matter(id)` | none |
| matter_members | `can_read_matter(matter_id)` | none |
| matter_participants | `can_read_matter(matter_id)` | none |
| matter_documents | `deleted_at is null AND can_read_matter(matter_id)` | none |
| matter_notes | `can_read_matter(matter_id)` | none |
| matter_evidence | `can_read_matter(matter_id)` | none |
| matter_facts | `can_read_matter(matter_id)` | none (insert guard trigger preserved) |
| matter_deadlines | `can_read_matter(matter_id)` | none |
| matter_tasks | `can_read_matter(matter_id)` | none |
| matter_research_links | `can_read_matter(matter_id)` | none |
| matter_activity | `can_read_matter(matter_id)` | none |
| contacts | `is_org_member(organization_id)` (unchanged) | none |
| matter_intake_drafts | `can_access_intake_draft(...)` (**unchanged**) | creator-only insert / access update (unchanged) |
| audit_events | `is_org_member`→admin (`is_org_admin`) (**unchanged**) | immutable (unchanged) |

Zero broad `is_org_member`/`is_org_admin` policies remain on Matter tables.
Indexes `matters_org_owner_idx` and `matter_members_profile_idx` created.

### Remote direct-RLS proof (live, transactional, rolled back)
Ran as the `authenticated` role with a simulated `auth.uid()` against the deployed
policies, using FK-disabled fixtures inside a transaction that was **rolled back**
(no auth users created; `auth.users` untouched). All assertions passed:

- Owner reads matter, privileged matter, document, privileged document → permitted.
- Explicit matter member reads matter, note → permitted.
- Same-org **non-member** → **zero rows** (matter, document, note).
- Same-org **admin without assignment** → **zero rows** (incl. privileged).
- **Cross-tenant** → **zero rows**. **Anonymous** (null uid) → **zero rows**.
- Member cross-matter (privileged doc of a matter they're not on) → **zero rows**.
- Writes as a member: update matter, approve document (`approval_state`), set
  `can_approve`, self-add membership → **all blocked** (0 rows / denied).

**Zero test rows remain** — post-probe counts returned to baseline (orgs 1,
profiles 0, auth_users 0, memberships 0, matters 1, matter_members 0, documents 0,
notes 0). *(These live probes complement the 61/61 local behavioral harness run
against the byte-identical migration.)*

### Regressions
lint ✓ · typecheck ✓ · build ✓ · full suite **573/573** (1 pre-existing skip). No
route-local role/confidentiality logic added; no serviceClient authorization added.
The 0.8.4 owner/member list + room reads remain correct under stricter RLS (they
read only owner/member matters, which `can_read_matter` permits).

### Advisors (post-apply Development)
Security: one pre-existing INFO (`legal_source_fetches`). Performance: only INFO —
**no** `auth_rls_initplan`, **no** `multiple_permissive_policies`, **no** recursive
RLS. The new `matter_members_profile_idx` **resolved** the `matter_members.profile_id`
unindexed-FK INFO; the two new indexes appear under `unused_index` only because
Development has near-zero data. `matters_assigned_owner_id_fkey` remains an INFO
(the composite `matters_org_owner_idx` leads with `organization_id` to serve the
owner/member read path; acceptable).

### Accepted limitations (unchanged from design)
Capabilities not persisted → action-category authorization remains in the
application (RLS stricter, never broader). Audit not matter-composable (no
`matter_id`). Direct authenticated writes fully disabled until a capability-aware
write path is approved.

### Production
Production was **not** queried, referenced, or modified at any point. All work was
on Development (`udispadsbxqicmawqcuk`).
