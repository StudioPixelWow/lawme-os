# Bootstrap RPC — Security Appendix

Capability 1 · Slice 1.0.3B (architecture-only). Companion to the *Atomic Bootstrap
RPC Architecture* section of `MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md`. This appendix
holds the security-dense material: the grounded execution model, the ownership-model
comparison, the direct-exposure proof, and the threat matrix. No code, no migration,
no database change was produced by this run.

## 1. Grounded execution model (live Development, read-only)

| Fact | Value | Source |
| --- | --- | --- |
| PostgreSQL | **17.6** (local harness was 16.13 — semantics identical for this design) | `version()` |
| `postgres` (migration role) | `rolsuper=false`, **`rolbypassrls=true`**, **`rolcreaterole=true`** | `pg_roles` |
| `service_role` | `bypassrls=true`, NOLOGIN | `pg_roles` |
| `authenticated` / `anon` | `bypassrls=false`, NOLOGIN | `pg_roles` |
| Matter tables owner | **`postgres`**, `relforcerowsecurity = false` (all 9) | `pg_class` |
| Guard `enforce_intake_draft_transitions` | **SECURITY INVOKER**, `search_path=''`, VOLATILE, owner `postgres` | `pg_proc` |
| Matter write policies (post-0.8.5) | **none** (INSERT/UPDATE/DELETE) on any Matter table | `pg_policies` |
| `pgcrypto` / `digest()` | installed in schema **`extensions`** | `pg_extension` / `pg_proc` |
| `lawme_bootstrap` role | **does not exist** | `pg_roles` |

Two consequences drive the design:

1. **Owner bypasses RLS.** Because the tables are owned by `postgres` and
   `FORCE ROW LEVEL SECURITY` is off, a `postgres`-owned `SECURITY DEFINER` function
   performs DML **without RLS applying** (owner exemption) — independent of the
   `BYPASSRLS` attribute. So RLS is *not* the mechanism that would block the RPC's
   writes; the **org-consistency triggers + CHECK constraints are the authoritative
   walls** (`enforce_child_matter_org`, `enforce_matter_participant_org`,
   `enforce_draft_matter_org`, `forbid_established_fact_on_insert`, deadline CHECKs).

2. **`current_user` is the only safe channel signal.** A `SECURITY DEFINER` function
   sets `current_user` to its owner; nested `SECURITY INVOKER` triggers observe it.
   `auth.role()` reflects the caller JWT even inside the RPC (so it is *not* a usable
   signal). No built-in exposes "am I inside function X" to a trigger
   (`pg_trigger_depth()` counts nesting only; there is no safe call-stack predicate).
   Therefore the sanctioned channel must be an **owner identity distinct from
   `postgres`** — i.e. a dedicated role.

## 2. The confirmation-authority rule IS persisted-expressible

`intake.confirm` is a **legal-authority** capability granted to **`owner` and `partner`
only** (`role-capabilities.ts`: admin/lawyer/paralegal do **not** receive it), and it is
`resourceAuthorizationRequired` (composes with creator-or-reviewer + `ready_for_review`).
Every input is a persisted DB fact:

```
can_confirm(draft) :=
     app.is_org_member(draft.organization_id)                          -- active membership
 AND EXISTS (organization_memberships m WHERE m.organization_id = draft.organization_id
             AND m.profile_id = auth.uid() AND m.status='active'
             AND m.role IN ('owner','partner'))                        -- legal authority
 AND (auth.uid() = draft.created_by OR auth.uid() = ANY(draft.reviewer_ids))  -- creator/reviewer
 AND draft.status = 'ready_for_review'
```

This closes the "capability map is not in the DB" gap: a narrow `SECURITY DEFINER`
helper `app.can_confirm_intake_draft(draft_id)` encodes exactly this. It is the **only**
new authorization primitive required, and it duplicates a small, stable rule already
mirrored in SQL elsewhere (`app.matter_can_approve`, `app.can_read_matter`). The one
coupling to manage: the SQL helper and `role-capabilities.ts` must be bumped together
(version both) if the confirm-authority role set ever changes.

## 3. Ownership-model comparison

| Model | Safe? | Why / blockers | Recommended |
| --- | --- | --- | --- |
| **A. Dedicated `lawme_bootstrap` NOLOGIN BYPASSRLS owns RPC** | ✅ | Clean channel (`current_user='lawme_bootstrap'`); free writes; NOLOGIN + no client membership ⇒ unreachable except by owning the RPC; blast radius bounded by the one audited RPC; cross-tenant/fact/immutability walls are triggers+CHECKs (run regardless of RLS). Con: RLS is off *for that role* globally. | **Primary** |
| **B. `postgres` owns RPC** | ❌ | Free writes (owner), but `current_user='postgres'` is indistinguishable from migrations/admin/other definer functions ⇒ an **overly broad sanctioned channel**. Rejected. | No |
| **C. Dedicated NOLOGIN owner, NO BYPASSRLS** | ✅ (heavier) | Clean channel; RLS stays "on" for the role, so it needs explicit INSERT/UPDATE/SELECT grants on ~9 tables **plus a permissive `TO lawme_bootstrap WITH CHECK (true)` policy per write target** (effectively bypass, but visible/auditable and per-table). More surface; must be extended for every future Matter child table. | Alternative if BYPASSRLS is disallowed |
| **D. SECURITY INVOKER RPC + controlled internal function** | ➖ | Moves the privilege into the internal function without removing it; the internal function still needs a distinguishable owner + write path. No net gain over A. | No |
| **E. Server-only trusted identity (no `authenticated` EXECUTE)** | ❌ | True server-only means `service_role` ⇒ `auth.uid()` is **null**, so the actor must ride in the payload ⇒ **service-role possession becomes authorization** (violates frozen rule 11). Calling with the *user's* JWT instead == "authenticated EXECUTE" (Models A/C), not server-only. | No |
| **F. Authenticated RPC + signed authorization envelope (HMAC)** | ➖ | Works but adds an HMAC secret, rotation, replay windows, and in-DB verification. Unnecessary because §2 shows authority is directly persisted-expressible. Avoid unless a future non-persistable capability appears. | No |

**Recommended: Model A**, with an optional blast-radius refinement — own only a minimal
`app.bootstrap_confirm_transition()` helper with `lawme_bootstrap` (giving the channel)
while the main RPC is `postgres`-owned (free writes as owner); then `lawme_bootstrap`
needs only `UPDATE` on `matter_intake_drafts` + BYPASSRLS-on-that-table. This shrinks the
BYPASSRLS surface to the two-line transition. Either form is acceptable; the migration in
Slice 1.0.3 already implements the direct Model A form.

## 4. Why direct `authenticated` exposure is safe (the proof)

The RPC is `SECURITY DEFINER`, `EXECUTE` granted to `authenticated` (not `anon`). It is
safe under direct PostgREST invocation because **every authoritative security value is
re-derived server-side and every fact is re-checked against persisted state**, treating
the entire payload as untrusted:

- **Actor** = `auth.uid()` (JWT-grounded, unspoofable). Payload `actorId`/`profileId`
  fields are **ignored**.
- **Organization** = derived from the locked Draft row, **never** from the payload.
- **Confirm authority** = `app.can_confirm_intake_draft(draft_id)` (§2) — owner/partner +
  creator/reviewer + `ready_for_review`, all persisted. Independent of the TS map.
- **Owner binding** = the confirming actor; payload `assignedOwnerId` is ignored.
- **Cross-tenant** = org-consistency triggers reject any child/contact whose org ≠ the
  Draft's org (a foreign `contactId` is refused at insert).
- **Fact epistemic** = enum allow-list + `forbid_established_fact_on_insert` (confirmed/
  document_derived impossible).
- **State machine** = the sanctioned channel + CHECKs (only `ready_for_review→confirming
  →confirmed`, pinned identity, immutable once confirmed, 1:1 linkage).

Residual: a malicious caller can alter **non-security content** (a fact statement, a
label) in the submitted plan. This is **not** a privilege escalation — they can only do it
for **their own** authorized Draft, in **their own** org, producing content they could
have typed into that Draft anyway. It is bounded by length/enum CHECKs. Therefore
`planHash` is used for **idempotency conflict detection only**, not as a trust anchor
(the RPC does not recompute it and does not need to); security rests on server-derived
values + persisted revalidation, not on trusting the plan's self-consistency.

## 5. Threat matrix (direct-invocation)

| Attacker | Vector | Defense | Outcome |
| --- | --- | --- | --- |
| Anonymous | call RPC | no `anon` EXECUTE | denied |
| `service_role` holder | call RPC to confirm | `current_user≠lawme_bootstrap` for the channel; `auth.uid()` null ⇒ no actor ⇒ abort | denied |
| Authenticated, same-org non-owner/partner | direct call | `can_confirm_intake_draft` false (role∉owner/partner) | denied (uniform not-available) |
| Authenticated creator without confirm authority | direct call | same as above | denied |
| Cross-tenant user | Draft id from another org | membership check + anti-enumeration ⇒ opaque not-available | denied, no existence leak |
| Stale ex-member | Draft in a left org | `status='active'` membership check | denied |
| Tamperer | payload `organizationId`/`actorId`/`assignedOwnerId` injection | all derived server-side; payload copies ignored | ignored |
| Tamperer | foreign `contactId` in a participant | `enforce_matter_participant_org` | insert rejected, tx aborts |
| Tamperer | fact `status='confirmed'` | enum + fact guard | rejected |
| Tamperer | plan for a **different** Draft (wrong `versionToken`) | token check ⇒ 0 rows | stale, aborts |
| Replayer | resend a committed confirmation | Draft frozen + idempotency (org,key) | returns original Matter, no 2nd |
| Same key, different plan | idempotency collision | stored `confirmation_plan_hash` differs | conflict returned |
| Caller | set a GUC / payload flag to fake the channel | channel is `current_user` only | no effect |

## 6. Frozen-rule compliance

Direct authenticated writes to Matter tables remain disabled (the RPC is the *only* write
path and it revalidates everything). Application authorization (Capability 0.8) stays
mandatory and runs first (better UX + defense-in-depth). Service-role possession is never
sufficient (the RPC uses the user's JWT; service_role cannot confirm). RLS remains
defense-in-depth (unchanged; the RPC's owner-exemption is the intended trusted path).
Intake text never becomes a confirmed fact; evidence approval remains the only route to
established facts. No LLM, no legal reasoning, no `commands[]`.

---

## Applied-State Reconciliation — Slice 1.0.4B (Development)

*The Atomic Bootstrap RPC and its transition guard are applied on Development
(`udispadsbxqicmawqcuk`). Full applied-state record: see the "Applied-State
Reconciliation" section of `MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md`. Production
untouched. These are Supabase platform compatibility constraints, not a new
authorization architecture.*

**Actor resolution.** `lawme_bootstrap` has no USAGE on schema `auth` (the non-superuser
`postgres` cannot grant it). The RPC therefore resolves the actor through
`app.actor_uid()` — a postgres-owned `SECURITY DEFINER STABLE` projection
(`search_path=''`, body `select auth.uid()`), EXECUTE granted only to `lawme_bootstrap`.
`auth.uid()` remains the single identity source; no raw JWT parsing, no payload/
membership/service-role identity, no Authorization Envelope. No `app.actor_role()` was
introduced.

**Transition guard.** `app.enforce_intake_draft_transitions()` remains `SECURITY
INVOKER`, `postgres`-owned, `search_path=''`. Option B evaluates `auth.role()` **lazily**,
only in the direct-client branches, and never on the `current_user = lawme_bootstrap`
channel — so the sanctioned Bootstrap path has zero dependency on schema `auth`. All
transition rules, field-locking, and confirmation invariants are unchanged.

**Ownership prerequisites (transient).** `grant lawme_bootstrap to postgres with set
true` (SET-option membership for ownership-preserving `SET ROLE`) and a transient
`grant/revoke create on schema app to lawme_bootstrap` (revoked before COMMIT). End
state: `lawme_bootstrap` = NOLOGIN, BYPASSRLS, **USAGE-only** on `app`, **no** `auth`
USAGE, no CREATE, no SUPERUSER/CREATEROLE/CREATEDB/REPLICATION, no reverse membership.

**Grants (verified live).** `app.actor_uid()` EXECUTE → `lawme_bootstrap` only;
`app.bootstrap_matter_v1(jsonb)` EXECUTE → `authenticated` only (anon/PUBLIC/service_role
= false).

**Boundary proofs (Development).** anon and service_role RPC invocation denied
(*permission denied for schema app*); raw INSERT/UPDATE into `matters` and child tables
denied (RLS deny-by-default; no `authenticated` write policy exists); raw Draft
confirmation UPDATE denied by the guard (`INTAKE_DRAFT_CONFIRMATION_FORBIDDEN`); browser
roles are not members of `lawme_bootstrap` and cannot execute `app.actor_uid()`.
Service-role possession alone is never sufficient. Capability 0.8 remains the application
authorization source; the RPC proves persisted-state boundaries only.
