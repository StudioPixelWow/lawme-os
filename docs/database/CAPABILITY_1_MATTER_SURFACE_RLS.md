# Capability 1 — Matter Working Surface: Pre-Apply Security Review

Migration: `supabase/migrations/20260714194504_capability1_matter_working_surface.sql`
Target: **Development project `udispadsbxqicmawqcuk` (ap-south-1) only.** Production untouched.
Status: **APPLIED 2026-07-14 with founder approval** (recorded remote version
`20260714194504`). Post-apply validation all green (see below).

## Applied result (post-apply validation)

9 tables created, RLS enabled on all 9, 26 table policies + 1 storage read
policy (deny-by-default). Private `matter-documents` bucket created. Approver
helper `app.matter_can_approve` present; immutable-versions trigger present.
Transactional remote RLS test PASSED (cross-tenant read/write denied, child
rows org-scoped, immutable versions reject client + privileged mutation,
approver rights correct, anonymous denied; zero rows left after rollback).
Security advisors: no new findings (only the pre-existing INFO on
`legal_source_fetches`). Performance advisors: INFO-only — `unindexed_foreign_keys`
(the pre-agreed deferred owner/reviewer/org indexes) and `unused_index`
(expected for brand-new empty tables). `database.types.ts` regenerated;
typecheck + matter/view/workflow/documents test suites green. Existing 20
tenant/legal/audit tables and policies unchanged.

## Change record — Recommendation B (single small correction)

Before apply, four review-**outcome** columns were removed from
`matter_evidence`: `evidence_decision`, `approval_state`, `reviewer_id`,
`reviewer_he`. Rationale (now frozen): the reviewed artifact
(`matter_documents`) is the **single source of truth** for the evidentiary
decision and approval state; `matter_evidence` owns only the
requirement/input, and a requirement's satisfaction is **derived** from its
linked, approved documents. This removes the only decision-duplication in the
design and keeps the schema consistent with "persist inputs, derive outputs."
No other table, relationship, enum, policy, index, trigger, or storage rule
changed.

### Deferred additive improvements (NOT implemented in this change)

All reachable later with additive migrations — none require redesign:
cross-matter owner/reviewer indexes; an organization-consistency
CHECK/trigger (`child.organization_id = parent matter.organization_id`); a
future `matter_evidence_documents` many-to-many table; retention / legal-hold
columns; and time/org partitioning of Activity and Audit at firm scale.

## Scope

Purely additive. Creates nine `public.matter_*` tables, one private storage
bucket (`matter-documents`), and one `app.matter_can_approve()` helper. Reuses
the existing tenant model, `app.*` RLS helpers, and the immutable
`audit_events` table. No existing table, policy, function, or bucket is altered
or dropped.

## Tenant isolation

Every new table carries `organization_id` and enables RLS. Every client policy
is gated on `app.is_org_member(organization_id)` (SELECT/INSERT/UPDATE) — the
same predicate proven on `legal_documents`. There is no permissive
cross-tenant policy anywhere. Unknown/anonymous roles match no policy →
deny-by-default. A user with no membership in an org sees none of its matters.

## Write path

The trusted write path is the server (service_role bypasses RLS). Client
policies are defense-in-depth so that even a leaked authenticated client can
only read its own org and cannot tamper with another tenant. All materially
consequential mutations (evidence approval, fact confirmation) additionally
re-run the existing approval guard + Confirmation Dialog server-side before
persistence.

## Append-only / immutable trails

- `matter_document_versions`: `app.forbid_mutation()` trigger on UPDATE/DELETE →
  version lineage is immutable; a replacement file is a new row (originals
  preserved, `prev_version_id` chains).
- `matter_activity`: SELECT + INSERT policies only (no UPDATE/DELETE) → feed is
  append-only for clients.
- Immutable **audit** remains `public.audit_events` (existing `forbid_mutation`
  trigger, service-role insert, org-admin read). This migration adds no new
  audit table — Activity (human-readable) and Audit (immutable, security) stay
  separated as the spec requires.

## Roles / approver authority

Matter-level roles live on `matter_members` (`matter_role`, `can_review`,
`can_approve`). The frozen `organization_memberships.role` enum is **not**
altered. `matter_members` is managed only by org admins
(`app.is_org_admin`). `app.matter_can_approve()` is `SECURITY DEFINER` with
`search_path = public`, mirroring the existing helpers, and is consulted
server-side for approval authority.

## Storage

`matter-documents` is **private** (`public = false`) — no anonymous public
URLs. Read policy limits authenticated users to their org prefix
(`organizations/<organization_id>/matters/<matter_id>/...`) via
`app.is_org_member`. No client INSERT/UPDATE/DELETE policy exists on
`storage.objects` for this bucket — uploads go through server-side finalization
only. MIME allow-list: pdf, png, jpeg, txt, docx. 100 MB cap matches the
`byte_size` CHECK. No HTML/SVG/active content is permitted (defends against
script execution on preview); DOCX remains a download/card, not an executed
render.

## Content-safety CHECKs

Enum columns use closed `CHECK (… in (…))` constraints; `content_hash` /
`sha256` use `^[0-9a-f]{64}$`; sizes bounded 0–100 MB; text length-bounded
(titles ≤300, note body ≤20 000). Slugs restricted to `^[a-z0-9][a-z0-9-]{0,62}$`
(no traversal characters).

## Residual items (enforced in application code, not schema)

- Actor authentication, Matter membership refinement beyond org scope, and
  client AI-policy enforcement are applied in the server routes/repositories
  (Slice work), on top of these RLS floors.
- Demo seeding (an `org-demo` organization + a `demo` matter row) is a separate
  service-role data step, not part of this schema migration; `*_he` display
  columns + nullable `*_id` FKs let demo rows exist without real auth users.

## Post-apply validation plan

1. `npm run db:types` → regenerate `src/types/database.types.ts`.
2. Re-run `mcp__Supabase__get_advisors` (security + performance); expect no new
   `rls_enabled_no_policy` findings for the new tables (all have policies).
3. Run `supabase/tests/remote_rls_validation.sql`-style checks for the new
   tables (cross-tenant read denied; anon denied; append-only enforced).
4. Confirm production project is untouched (no calls target any other ref).

## Rollback

Single-transaction apply (auto-rollback on failure). Documented manual reverse
at the end of the migration file (drop new tables + bucket + helper in FK order;
existing objects untouched). Safe while no real Matter data exists.
