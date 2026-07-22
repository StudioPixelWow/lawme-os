# Resource Authorization Integration

Capability 0.8 · Slice 0.8.4 · `src/modules/identity/{infrastructure,authorization-integration}` + migrated Matter/Intake read paths

This slice wires the pure Slice-0.8.3 policy engine to real persisted facts and to
the focused Matter/Intake read flows. The runtime chain is:

```
request → resolve ActorContext → load normalized facts (RLS client)
        → canonical pure policy → require authorized → read/hydrate → safe result
```

No protected route contains a role/owner/membership/confidentiality branch; all
semantics stay in the policy engine.

## Runtime validation library — zod (chosen)

`zod@4` was added as the single runtime-validation dependency. These loaders run
**server-side only** (no browser bundle), so valibot's size edge is irrelevant;
zod's maturity, ubiquity, and ergonomics for parsing unknown DB rows into typed
immutable facts win. Usage is limited to authorization-fact loaders and migrated
route/loader inputs — not a platform-wide validation migration. Generated DB
types remain persistence typing, not runtime validation.

## Authorization fact loaders

`src/modules/identity/infrastructure/*-policy-facts-repository.ts` — one per
resource. Each: takes the ActorContext + resource id(s); uses the **authenticated
(RLS) client** (`AuthDb`), never `serviceClient()`; scopes every query by
`organization_id` even though RLS also exists; selects only policy-relevant
columns; validates rows with zod; returns `null` for absent/inaccessible (no
cross-tenant existence leak); and fails closed on malformed rows. Matter/Document/
Evidence bind the child to its parent matter (no cross-matter replay). The intake
and draft loaders never select `confidential_input` (or `structured_draft` for
authorization). One canonical id-vs-slug resolver (`isCanonicalUuid`) is shared by
the loaders and `MatterRepository.getHydrated`.

## Orchestration + enforcement

`authorization-integration/authorize-resource-request.ts` selects the loader,
loads facts, treats `null` as a safe denial, invokes the one canonical policy, and
records safe telemetry — with **no policy branches of its own**. `requireAuthorized`
throws a `ResourceAuthorizationError` on denial. Null facts are represented as
`RESOURCE_TENANT_MISMATCH`, which the error layer renders as the uniform
`RESOURCE_NOT_AVAILABLE`.

### Error mapping (safe, anti-enumeration)

| internal policy code | HTTP | external code | note |
| --- | --- | --- | --- |
| TENANT_MISMATCH / OWNER_OR_MEMBER / MEMBERSHIP / CONFIDENTIALITY / REVIEWER / INACTIVE_ASSIGNMENT / AUDIT_ACCESS / INVALID_POLICY_FACTS | 404 | `RESOURCE_NOT_AVAILABLE` | visibility denials render identically — a matter in another tenant and one you simply aren't on are indistinguishable |
| CAPABILITY_DENIED / ACTOR_TYPE_DENIED / APPROVAL_DENIED | 403 | `RESOURCE_FORBIDDEN` | about the actor's permission, not resource existence |
| STATUS_DENIED | 409 | `RESOURCE_STATUS_CONFLICT` | |
| ACTION_UNSUPPORTED | 400 | `RESOURCE_BAD_REQUEST` | programming error |
| (any thrown loader/store error) | 500 | `RESOURCE_INTERNAL_ERROR` | never leaks a DB/SQL/Supabase message |

The internal code is preserved on the error object for telemetry; the client only
ever sees `{ ok, code, messageHe, correlationId }`. **Deliberate choice:**
membership/confidentiality denials render as 404 (not 403) to honor the
"never reveal membership/confidentiality/existence" rule; flagged for founder
review (if 403-for-membership is preferred, it is a one-line change).

## Safe telemetry

`AuthorizationTelemetry` records only: correlation id, organization id, actor
profile id, resource type, action, decision code, policy version, facts stage,
allowed. It never logs matter titles, client names, reviewer ids, document
metadata, confidential text, or DB errors. Default is a no-op; a safe
single-line console logger is provided.

## Service-role remediation inventory (migrated flows)

| flow | before | after |
| --- | --- | --- |
| Matter **list** (`/matters`) | `serviceClient()` + org-only query | authenticated client + owner/member readable index (Strategy B) |
| Matter **room** (`/matters/[id]`) | `serviceClient()` + **`DEMO_SEED.organizationId`** | authenticated client + `matter.read` authorization before hydrate |
| Intake draft read | (none existed) | authenticated `DraftRepository`, authorize `intake.read` before reading reviewable payload |

`DEMO_SEED` and `serviceClient()` are fully removed from these migrated paths
(guarded by tests). **Not migrated this slice** (documented, deferred): the
document GET/POST/PATCH/DELETE route and storage (`documents/server-context.ts`,
`supabase-storage.ts`) still use `serviceClient()`; the Matter **create** route
still uses `serviceClient()` + demo org (deferred to Bootstrap). These are
unrelated to the migrated read flows and out of this slice's scope.

## RLS alignment table

| resource / table | application policy (0.8.3/0.8.4) | current RLS | mismatch | risk | proposed future RLS | blocks this slice? |
| --- | --- | --- | --- | --- | --- | --- |
| `matters` | owner OR active `matter_members` (+ confidentiality) | `matters_select`: `is_org_member(org)` | **RLS broader** — any org member | **HIGH**: a direct browser anon+JWT `select` could read any org matter, bypassing app policy | select gated by `assigned_owner_id = auth.uid() OR EXISTS matter_members(...)` (+ confidentiality) | No — app integration works; app policy is stricter |
| `matter_documents` | documents.read + parent-matter access + confidentiality | `is_org_member(org)` | RLS broader | HIGH (same browser-bypass) | gate select on parent-matter access | No |
| `matter_evidence` | evidence.read + parent-matter access | (read only via `getHydrated`; org-scoped) | RLS broader | MEDIUM | gate on parent-matter access | No |
| `matter_intake_drafts` | creator OR assigned reviewer | `app.can_access_intake_draft(...)` | **ALIGNED** | LOW | — | No |
| `matter_members` | (read by loaders) | `is_org_member(org)` | RLS broader (members visible org-wide) | LOW | scope to own matters | No |
| `contacts` | contacts.read + same org | `is_org_member(org)` | ALIGNED (org-scoped) | LOW | — | No |
| `audit_events` | audit.read + (matter access for matter audit) | `is_org_admin(org)` | RLS admin-only; app adds matter-scope | LOW (no reader yet) | add matter-scope when a reader lands | No |

**Blocker classification.** A browser Supabase anon client exists in the bundle
(from the 0.8.2 login flow), so **direct browser access could bypass the
application policy** for `matters`/`matter_documents`/`matter_evidence` whose RLS
is `is_org_member` only. Per the founder's criteria this is a **launch blocker**
— it must be closed by an RLS-hardening migration before real multi-user launch.
It does **not** block this slice: application integration is proven, the app
policy is strictly narrower than RLS, and no *new* browser-exposed read path is
introduced here. Defense-in-depth is therefore **NOT yet complete** — this is
stated plainly rather than claimed done. An RLS-hardening migration is proposed
above and deferred to a separately founder-approved migration (Slice 0.8.5).

## Live Development proof

Full end-to-end proof needs disposable authenticated identities + `matter_members`
rows, which require creating auth users (unsafe credential handling for the
automated agent) and seeded per-actor data. The read-only preconditions were
verified in Slice 0.8.3 (RLS enabled on all identity tables; `matter_members` has
`can_review`/`can_approve`; `matter_intake_drafts` RLS is creator/reviewer-scoped).

Manual founder runbook (Development only):
1. Create two disposable users A (owner) and B (same-org non-member) in the
   Supabase dashboard; add both as `active` org members.
2. Insert a `matters` row owned by A (`assigned_owner_id = A`); optionally add a
   `matter_members` row for a third user C with `can_approve=true`.
3. Sign in as A → `/matters` lists A's matter; opening it renders the room.
4. Sign in as B → `/matters` does NOT list A's matter; visiting its URL returns
   the uniform not-found (no enumeration).
5. Set the matter `confidentiality='privileged'`; confirm B (and any admin
   without membership) is still denied.
6. Point a matter id from another org → not-found.
7. Confirm no request used the service-role key (network tab shows the anon key +
   the user's JWT only).

## Limitations

- Defense-in-depth incomplete until the RLS-hardening migration (above).
- Document/Evidence/Contact/Audit have loaders + integration + tests but no
  migrated live route (no reader exists, or the route is a mixed read/write
  service-role route out of scope). The Matter room already gates the documents
  it hydrates via matter access.
- The frozen "demo" matter is a fictional showcase fixture available to any
  authenticated actor (no real client data); it is not subject to per-matter
  authorization.

## Slice 0.8.5 integration plan

Apply the proposed RLS-hardening migration (founder-approved) to align the DB
boundary with the application policy; migrate the document read route onto the
authenticated document authorization chain; extend to the write paths once their
facts/capabilities/repositories are complete. Bootstrap remains blocked until the
identity/authorization foundation is fully aligned.
