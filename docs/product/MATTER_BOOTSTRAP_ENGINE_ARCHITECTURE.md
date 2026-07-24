# Matter Bootstrap Engine — Principal Architecture & Execution Design

Capability 1 · Slice 1.0.0 · **ARCHITECTURE-ONLY** (no code, no migration, no RPC, no DB change).
Grounded in the live repo (HEAD `0a47a87`) and Development schema (`udispadsbxqicmawqcuk`),
**after** Capability 0.8 (Identity / ActorContext / Resource Authorization Policy Engine /
authorization integration / RLS alignment) is complete and applied. Every schema/contract
name below was verified against source or the live database; absent things are marked **[ABSENT]**
and never invented.

---

## Section 1 — Executive verdict

The Matter Bootstrap Engine is the single, authorization-gated, deterministic, idempotent, atomic
path that turns **one approved Intake Draft** into **one initialized Matter aggregate** (header +
owner membership + participants/contacts + intake-grade facts + deadlines + evidence rows + the
draft→confirmed transition + an immutable audit event), followed by **retryable, non-authoritative**
post-commit derivation (Intelligence, Timeline, Workflow, notifications).

**What Capability 0.8 already gives us (no longer gaps):** server-verified `ActorContext`
(`auth.getUser()`), active-organization resolution, the pure Resource Authorization Policy Engine
(`resource-authorization-v1`) with the **existing `intake.confirm` capability + `authorizeIntakeDraft`
policy**, the authorization-integration service, and the 0.8.5 RLS lockdown where **direct
authenticated browser writes to Matter tables are disabled** (writes are server-controlled).

**What already exists for Bootstrap:** the pure planner `buildConfirmationPlan(draft, approvals):
CanonicalWritePlan` (`src/modules/matter/intake/confirm-plan.ts`) — deterministic, enforces
intake-only fact statuses, refuses `confirmed`/`document_derived`, keeps `dueAt=null` for
ambiguous dates. The draft table `matter_intake_drafts` is live with `confirmed_matter_id`
(FK→matters), a **unique** `confirmation_idempotency_key`, and a hardened transition trigger.
The DB child tables (`matters`, `matter_members`, `matter_participants`, `contacts`, `matter_facts`,
`matter_deadlines`, `matter_evidence`, `matter_activity`, `audit_events`) all exist with the exact
columns/CHECKs this design targets.

**Blockers / required work before implementation:**

1. **Atomicity requires a `SECURITY DEFINER` RPC.** The runtime uses `@supabase/supabase-js`; a
   repo-wide `.rpc(` search returns nothing and PostgREST cannot span a multi-table transaction.
   One RPC — `app.bootstrap_matter_v1(jsonb)` — is required and is **sufficient** (one call, one
   transaction). **[ABSENT — build in Slice 1.0.3]**
2. **The confirmation channel is locked for everyone.** `app.enforce_intake_draft_transitions()`
   raises `INTAKE_DRAFT_CONFIRMATION_FORBIDDEN` on any transition to `confirming`/`confirmed` or any
   set of `confirmed_matter_id` — for **every** caller, including a `SECURITY DEFINER` function
   (because `auth.role()` still reads `authenticated` from the JWT inside a definer). A **narrow
   trigger migration** must open a *tamper-proof* bootstrap channel (see §6/§11/§12). This is the
   one true architectural gate.
3. **Six child-table writers + extended hydration do not exist** in app code (`MatterRepository.create`
   writes only the header; `getHydrated` ignores facts/deadlines/participants/client). The RPC
   replaces the writers; hydration must be extended in the use-case slice. **[ABSENT]**

**Verdict: B — Ready after a narrowly scoped migration.** The migration is genuinely small: (a)
update `enforce_intake_draft_transitions` to permit `ready_for_review→confirming→confirmed` +
`confirmed_matter_id` **only** inside the bootstrap definer context; (b) create
`app.bootstrap_matter_v1(jsonb)`. **No new tables are required** for the MVP (idempotency reuses
`confirmed_matter_id` + `confirmation_idempotency_key`; audit reuses `object_type/object_id`). No
policy addition is required (`intake.confirm` + `authorizeIntakeDraft` already model confirmation).

**Recommended slice sequence:** 1.0.1 contracts+planner (pure, no DB) → 1.0.2 the trigger+RPC
migration (SQL + local harness, applied only on approval) → 1.0.3 the RPC body → 1.0.4 use-case
integration (ActorContext → policy → planner → RPC adapter → confirm route + extended hydration) →
1.0.5 post-commit outbox + Intelligence/Timeline refresh → 1.0.6 Workflow bootstrap (separate,
after Workflow persistence is designed).

---

## Section 2 — Bootstrap responsibility boundary

| Bootstrap OWNS | Bootstrap does NOT own |
| --- | --- |
| Command validation (shape, id formats, sizes) | Extraction / clarification / source spans (Intake Pipeline) |
| Authorization precondition (ActorContext → policy → requireAuthorized) | Free-form AI reasoning, legal research, summaries |
| Draft locking (`FOR UPDATE`) + stale-review detection | Matter scoring / posture / narrative (Matter Intelligence — derived) |
| Deterministic plan verification (input hash, version compat) | UI presentation, redirect rendering |
| Atomic creation of authoritative aggregate state | Notification delivery, search indexing (post-commit effects) |
| Idempotency (draft↔matter 1:1) | Ongoing workflow execution / lifecycle (Workflow Engine) |
| Audit identity + immutable audit event | Ongoing Matter edits after creation |
| Draft `ready_for_review→confirming→confirmed` transition | Document processing / evidence **approval** |
| Stable `MatterBootstrapResult` | **Fact confirmation** beyond approved intake source semantics |

Invariant: Bootstrap creates **allegation-grade** authoritative state only. Promotion of any fact to
`confirmed`/`document_derived` is owned **exclusively** by the evidence-approval gate and is
impossible here by DB trigger.

---

## Section 3 — Canonical command

`BootstrapMatterCommand` (application layer, TS). Field provenance is strict — the browser supplies
only *references and reviewer decisions*, never authority:

| Field | Source | Notes |
| --- | --- | --- |
| `intakeDraftId` | **client request** | Canonical UUID; validated `isPlausibleResourceId`; must belong to active org (RLS + RPC re-check) |
| `expectedDraftVersion` | **client request** | The `matter_intake_drafts.version_token` the reviewer saw; stale ⇒ reject |
| `idempotencyKey` | **client request** (or server-derived) | Written to `confirmation_idempotency_key` (unique); ≤ 200 chars, `[A-Za-z0-9_-]` |
| `approvals` (`IntakeApprovals`) | **client request** | Per-item confirm decisions (matter header, participants, facts, deadlines, evidence) — validated against the persisted `structured_draft` |
| `organizationId` | **ActorContext** | NEVER from client; `actor.organization.id` |
| `requestedByProfileId` | **ActorContext** | `actor.actor.profileId`; NEVER from client |
| `capabilities` / `membership.role` | **ActorContext** | Used only by the policy engine |
| `correlationId` | **ActorContext** | `actor.request.correlationId` |
| `assignmentDecision` (owner) | **client request**, constrained | Optional; must resolve to an authorized default (see §26); target validated server-side |
| `bootstrapEngineVersion`, `policyVersion` | **server** | Stamped by the engine, not accepted from client |

Runtime validation: `zod` (already a dependency) at the command boundary — id formats, enum
membership (approvals reference ids present in the draft), size caps (approvals arrays bounded, e.g.
≤ 200 items total), no unknown keys. **Client `organizationId`/`actorId`/`capabilities`/
`confirmed_matter_id` are rejected outright if present.**

---

## Section 4 — Bootstrap context

Immutable `BootstrapContext` assembled server-side after authorization:

| Value | Persisted? | In audit? | From browser? | Telemetry-safe? |
| --- | --- | --- | --- | --- |
| actor projection (profileId, org id, membership role) | via authored rows | actor+org | **never** | profileId (opaque), org id |
| active organization id | on every row | yes | never | yes |
| correlationId | audit + activity | yes | never (server) | yes |
| idempotencyKey | `confirmation_idempotency_key` | yes (hash) | yes (reference only) | yes |
| policy versions (`resource-authorization-v1`, capability map) | audit payload | yes | never | yes |
| bootstrap engine version | audit payload | yes | never | yes |
| draft id | rows + audit | yes | yes (reference) | yes |
| command timestamp | server `now()` | via `created_at` | never | yes |
| input hash (SHA-256 of normalized plan) | audit payload + reused for idempotency compare | yes | never | yes |

Never accepted from the browser: actor id, organization authority, capabilities, confirmed matter
id, engine/policy versions, timestamps. Confidential draft text is **never** placed in
`BootstrapContext`, audit, or logs.

---

## Section 5 — Authorization chain

```
request → getServerActorContext()  (auth.getUser(); fails closed)
        → validate BootstrapMatterCommand (zod)
        → loadIntakeDraftPolicyFacts(actor, draftId)     [existing 0.8.4 loader]
        → authorizeResourceRequest(actor, {intake_draft, intake.confirm, draftId})
        → requireAuthorized(decision)                    [existing 0.8.4 enforcement]
        → enter bootstrap use-case (server) → RPC
```

The **existing** `authorizeIntakeDraft` policy for action `intake.confirm` already enforces exactly
the right rule (0.8.3): requires the `intake.confirm` **capability** AND the actor is the draft
**creator or an assigned reviewer** AND the draft status is `ready_for_review`. In the role map,
`intake.confirm` is **legal authority** granted only to `owner`/`partner` (not `lawyer`/`admin`/
`paralegal`). So **who may confirm** = an owner/partner who is the draft's creator or an assigned
reviewer. **No new policy action is required.**

Never authorize from: same organization alone, admin role, service-role possession, draft RLS
success, or draft status alone. The RPC **re-verifies** identity + org + draft eligibility from
persisted facts (defense-in-depth); the policy decision is the application gate, the RPC checks are
the DB gate. **Precise gap:** none in the policy vocabulary. (Optional future refinement: a distinct
`matter.bootstrap` action if confirmation and creation ever diverge — not needed now.)

---

## Section 6 — Draft state machine

```
ready_for_review ──(authorized confirm command)──▶ confirming ──(atomic success)──▶ confirmed
        ▲                                              │
        └──────────────(transaction rollback)──────────┘   (row reverts atomically; status stays ready_for_review)
```

- **Allowed start state: `ready_for_review` only.** `active`/`needs_clarification`/`rejected`/
  `expired`/`confirmed`/`confirming` are ineligible (fail closed). `ready_for_review` is *review
  completeness*, not legal confirmation — confirmation is the human **command**, gated by
  `intake.confirm`.
- **Trigger:** the authorized confirm command (§5), executed by the bootstrap use-case, never a
  direct client write.
- **Concurrency:** the RPC does `SELECT … FOR UPDATE` on the draft row first; a second concurrent
  confirm blocks, then observes `confirming`/`confirmed` and returns the idempotent result.
- **Stale review:** `expectedDraftVersion` is compared to `version_token`; a mismatch (draft edited
  after the reviewer looked) fails closed with `DRAFT_STALE`. The reviewer must re-review.
- **`confirming` inside the transaction:** yes — the transition to `confirming` and then to
  `confirmed` both happen **inside** the RPC transaction. On rollback the row reverts to
  `ready_for_review` automatically (single transaction; no compensating write needed).
- **Terminal ineligibility:** `confirmed` is immutable (trigger `INTAKE_DRAFT_CONFIRMED_IMMUTABLE`;
  CHECK `(status='confirmed') = (confirmed_matter_id is not null)`); `rejected`/`expired` never
  transition to `confirmed`. `confirmed → second Matter` is impossible (`confirmed_matter_id` is
  set once and immutable; unique idempotency key).
- **Duplicate confirmation requests:** return the original `MatterBootstrapResult` (idempotent —
  §10).

**Sanctioned-channel requirement (the migration).** The current trigger blocks
`ready_for_review→confirming`, `→confirmed`, and any `confirmed_matter_id` set for **all** callers.
The narrow migration updates the trigger to **permit** this exact transition sequence **only** when
executing inside the bootstrap definer context — detected tamper-proof by `current_user` equal to
the bootstrap function's owner role (a browser/`authenticated` client can never assume it; a session
GUC would be client-settable and is therefore rejected) — and only when the consistency invariant
`(new.status='confirmed') = (confirmed_matter_id is not null)` holds. All other confirmation writes
remain forbidden.

---

## Section 7 — Deterministic bootstrap planner

`planMatterBootstrap(input): BootstrapPlan` — a pure TS function generalizing the existing
`buildConfirmationPlan`. **No DB, no LLM, no serviceClient.** Inputs: the authorized persisted
draft snapshot (`structured_draft`), the reviewer `approvals`, organization defaults, and
assignment context.

Output is **typed operations**, never SQL strings. Operation set (aligned to real tables):
`createMatter`, `assignOwner`, `addMatterMember`, `linkExistingContact`, `createContact`,
`createParticipant`, `createFact`, `createDeadline`, `createEvidence`, `appendActivity`,
`appendAuditEvent`, `transitionDraft`, `enqueuePostCommitEffect`.

Every planned entity carries: a deterministic **plan key** (stable hash of type+source item id), the
**source draft field/item id**, the **source span** where available (into `provenance`), an
**epistemic classification** (facts only — §8), **required/optional**, **validation issues**, and a
**dedup key** (§9 per-entity). The whole plan hashes to a stable **input hash** (SHA-256 over the
canonicalized operation list) reused for idempotency comparison.

Issue taxonomy: **error** = plan cannot be built (abort, nothing persists); **blocking issue** = a
specific operation is dropped and the matter still bootstraps (e.g., a fact with an illegal status —
dropped and reported, as `buildConfirmationPlan` already does); **warning** = persisted-but-notable
(e.g., ambiguous date kept `dueAt=null`); **informational note** = advisory only. Determinism: the
same (draft, approvals, defaults) always yields the same plan and hash.

---

## Section 8 — Epistemic safety

**Actual `matter_facts.status` vocabulary** (DB CHECK): `client_alleged`, `opposing_alleged`,
`disputed`, `unknown` (intake-allowed) and `confirmed`, `document_derived` (**established**). There
is **no** `reported`/`inferred` status — those are not invented. `matter_facts` has no `confidence`
column; provenance/uncertainty live in the `provenance` jsonb.

- **Intake statements → facts:** may become only `client_alleged` / `opposing_alleged` / `disputed`
  / `unknown` (the reviewer's approved status). The planner drops any attempt at
  `confirmed`/`document_derived` and records the reason; the DB trigger
  `forbid_established_fact_on_insert` is a second, absolute barrier (`errcode=check_violation`).
- **Can any intake statement become `confirmed`? No.** `confirmed`/`document_derived` are reachable
  **only** through the evidence-approval gate (a persisted approved `matter_documents`/evidence
  source), never through Bootstrap. Default rule: **intake text alone never becomes a confirmed
  fact.**
- **Source spans** are preserved in `matter_facts.provenance` (`{origin:"intelligent_intake",
  draftId, span, rule}`) — exactly what `buildConfirmationPlan` already emits.
- **Contradictions:** the draft's `contradictions` are *not* forced into a single fact; opposing
  assertions persist as separate `client_alleged`/`opposing_alleged` facts, or a `disputed` fact
  where the reviewer marks it so. No auto-resolution.
- **Uncertain dates:** deadlines with `confidence='unknown'` persist with `due_at=null` (DB CHECK
  `unknown_no_date`); `known` requires a date (CHECK `known_has_date`); `estimated` may carry a
  best date. No fabricated dates.
- **Legal conclusions / AI summaries** are excluded from authoritative facts entirely — they are
  derived (Matter Intelligence) and never written to `matter_facts`.

**Provenance sufficiency:** the `provenance jsonb` on facts/deadlines/evidence is sufficient for
spans and origin today — **no migration needed** for epistemic provenance.

---

## Section 9 — Entity mapping

### Matter (`matters`)
Source: `approvals.matter` + draft. Required: `organization_id` (ActorContext), `slug` (server
`m-<8hex>`), `title_he` (`approvals.matter.titleHe`, 1–300), `procedure_type`, `topic`,
`current_stage_id` (procedure default), `legal_domain='labor'`, `confidentiality`
(`approvals.matter.confidentiality` — reviewer's explicit choice), `ai_policy`. `status='open'`,
`assigned_owner_id` (§ Members), `opened_at=now()`. Dedup: 1:1 with the draft (§10). Failure: any
constraint violation aborts the whole transaction. Provenance: draft id in the audit event.

### Contacts (`contacts`)
`linkExistingContact` when `approvals.participants[].linkToContactId` is set — the id **must belong
to the active organization** (RPC re-check; cross-tenant id ⇒ abort). `createContact` otherwise
(`kind` person/company, `name_he`). **Exact-match only; no fuzzy auto-merge.** Ambiguous match is
never auto-resolved — the reviewer either linked an explicit contact or a new one is created. Contact
creation is optional per item. Tenant boundary enforced in the RPC (org id stamped, ids validated).

### Participants (`matter_participants`)
Source: approved participants. Role ∈ `client|opposing_party|related_party|witness|expert|counsel|
mediator|insurer` (the actual CHECK; there is no plaintiff/defendant enum — labor-court parties map
to `client`/`opposing_party`). `contact_id` links the (linked or newly created) contact. Dedup:
UNIQUE(`matter_id`,`contact_id`,`role`) — the planner de-dups by that key. Unknown/unsupported roles
are a blocking issue for that item (dropped + reported), never coerced.

### Matter members (`matter_members`)
Owner membership is always created (`assign_owner`): a `matter_members` row for the owner profile
with `matter_role` and `can_review`/`can_approve` per the assignment decision. **No self-granted
authority:** `can_approve` is set only by the authorized plan, never by the confirming actor for
themselves outside policy. Default team assignment (reviewer→member) is a **founder decision** (§26,
recommended default: the confirming owner/partner becomes owner+member; assigned reviewer optionally
added as a member without `can_approve`).

### Facts (`matter_facts`)
Per §8. Required: `fact_key` (1–120), `statement_he` (1–4000), `status` (intake-only), `provenance`.
Dedup: by `fact_key` within the matter (planner drops duplicates). Failure: illegal status dropped
by planner; DB trigger is the backstop.

### Deadlines (`matter_deadlines`)
Required: `label_he` (1–300), `source` (statute/court_order/contract/estimated/user_supplied),
`confidence` (known/estimated/unknown), `timezone` (default `Asia/Jerusalem`), `strict`. `due_at`
follows the CHECKs (`known⇒date`, `unknown⇒null`). **No fabricated statutory calculation** —
Bootstrap persists only reviewer-approved user/source-supplied deadlines; statutory computation is a
future Workflow/engine concern. Overdue is derived, not stored.

### Evidence (`matter_evidence`)
**Only `matter_evidence` exists; there is no separate requirement table [ABSENT].** `matter_evidence`
*is* the requirement row: `label_he`, `evidence_type`, `mandatory`, `status` (default `required`),
`provenance`. It has **no** approval/review/decision columns (review/approval outcomes live on
`matter_documents`; satisfaction is derived from linked approved documents). Bootstrap can safely
create **evidence requirements** as `matter_evidence` rows with `status='required'`, `mandatory` per
the reviewer. It must **not** invent approval state or evidence validity. Recommendation: keep
requirements as `matter_evidence` rows now; a dedicated requirement/Workflow-task model is deferred
until Workflow persistence is designed (§16).

### Audit (`audit_events`)
`event_type='matter.bootstrapped'` (free text, ≤120). `actor` = profileId, `actor_role` = membership
role, `organization_id`. **`audit_events` has no `matter_id`/classification column** — link via the
existing `object_type='matter'` + `object_id=<matterId>` (and the draft id in `payload`). `payload`
(jsonb, non-confidential): draft id, engine/policy versions, idempotency hash, correlation id,
created-entity counts, warning count, result status. Immutable (trigger `app.forbid_mutation`). Also
append a human-readable `matter_activity` row (`kind='matter_bootstrapped'`, `correlation_id`,
`source_action='bootstrap'`). **No confidential draft text in either.**

---

## Section 10 — Idempotency

Requirement: the same draft must never create two matters. **Recommended model = A (+ the existing
unique key), no new table for MVP:**

- **`matter_intake_drafts.confirmed_matter_id`** (FK→matters, set once, immutable via trigger) is the
  durable **draft→matter 1:1** relationship. A second confirm sees it set and returns that matter.
- **`matter_intake_drafts.confirmation_idempotency_key`** (unique) absorbs duplicate network
  retries: the same key ⇒ same outcome; a **different** key with the **same draft** still can't
  create a second matter (confirmed_matter_id already set).
- Uniqueness boundary: per draft (which is per organization). Concurrent confirms serialize on the
  `FOR UPDATE` draft lock; the loser returns the winner's matter.
- Reused idempotency key with **changed input** (different input hash): **conflict** →
  `IDEMPOTENCY_INPUT_MISMATCH` (do not silently create). The stored input hash (in the audit payload
  / optionally on the draft) is compared.
- Function retry after an ambiguous connection failure: safe — re-invoking with the same key returns
  the original `confirmed_matter_id` deterministically.

**Deferred (optional) B — `matter_bootstrap_runs` table** (run status: started/committed/failed,
input hash, result matter id, timestamps, whether failed attempts are persisted). Recommended
**only** when richer reconciliation/telemetry is needed (§23). Not required to be safe. **D**
(unique `source_intake_draft_id` on matters) is redundant with `confirmed_matter_id` and not
recommended. Idempotency is **durable in the database**, never application memory.

---

## Section 11 — Transaction design (the smallest safe atomic core)

The atomic transaction contains **only authoritative state whose partial creation would be invalid**.
Ordered steps inside `app.bootstrap_matter_v1`:

1. (Outside tx) Server resolves ActorContext + authorizes (§5); builds the plan (§7). *Not in tx.*
2. **Begin** (implicit in the RPC).
3. Re-resolve identity from `auth.uid()`; assert non-null (`UNAUTHENTICATED`).
4. `SELECT … FROM matter_intake_drafts WHERE id=$draft FOR UPDATE` (row lock).
5. Validate `organization_id = actor's active org` and actor membership active (`is_org_member`).
6. Validate draft `status='ready_for_review'` and not already `confirmed_matter_id` (else return
   idempotent result).
7. Validate `version_token = expectedDraftVersion` (else `DRAFT_STALE`) and input hash.
8. Idempotency: if `confirmation_idempotency_key` already set to this key with matching hash → return
   existing; if set with different input → conflict.
9. `UPDATE … status='confirming'` (sanctioned channel).
10. Insert `matters` header.
11. Insert owner `matter_members` row(s).
12. Link/insert `contacts` (org-scoped, ids validated).
13. Insert `matter_participants`.
14. Insert `matter_facts` (intake statuses; trigger backstop).
15. Insert `matter_deadlines`.
16. Insert `matter_evidence` requirement rows.
17. Insert immutable `audit_events` + `matter_activity`.
18. `UPDATE matter_intake_drafts SET confirmed_matter_id=<new>, confirmation_idempotency_key=<key>`.
19. `UPDATE … status='confirmed'` (consistency CHECK enforced).
20. **Commit.**
21. (Outside tx) Enqueue/run post-commit effects (§15).

**Challenge of each candidate:** Matter/owner-member/participants/contacts/facts/deadlines/evidence
+ draft transition + audit + idempotency link are all **authoritative and interdependent** →
**in-tx**. Intelligence/Timeline/Workflow/search/notifications are **derived/retryable** → **post-commit**.
Isolation: default `READ COMMITTED` + the explicit `FOR UPDATE` lock (sufficient; the lock serializes
the only contended row). Unique constraints relied on: draft `confirmation_idempotency_key`,
`matters.slug` (per org), `matter_participants(matter_id,contact_id,role)`, `matter_members(matter_id,
profile_id)`. Expected failure codes: `P0001` (draft transition guards), `check_violation` (fact
guard), `unique_violation` (idempotency/slug), FK violations (cross-tenant/injected ids). No partial
aggregate state (single transaction). Payload/limits: bound approvals (≤ ~200 items), reject oversized
JSON before the RPC; statement timeout guard on the RPC.

---

## Section 12 — RPC design (blueprint only — no SQL written this run)

**Recommendation: `app.bootstrap_matter_v1(p_plan jsonb) RETURNS jsonb`** — a single JSONB-in/JSONB-out
`SECURITY DEFINER` function executing a **validated plan** built in TypeScript. JSONB (not explicit
params) because the plan is a variable-length aggregate; typed params would be unwieldy and versioned
per shape. The RPC contains **no business planning** — only identity revalidation, precondition/invariant
checks, idempotency, atomic inserts, and stable result construction.

- **Input contract:** `{ v:1, draftId, expectedVersion, idempotencyKey, inputHash, matter{…},
  owner{…}, members[], contacts[], participants[], facts[], deadlines[], evidence[], audit{…} }` —
  the serialized `BootstrapPlan` (org id and actor id are **not** trusted from the payload; derived
  from `auth.uid()` and the draft).
- **Result contract:** `{ ok:true, matterId, slug, draftId, createdCounts{…}, idempotent:boolean,
  bootstrapVersion }` or a structured error `{ ok:false, code, … }` via a raised exception mapped to
  a stable code.
- **Stable SQL error codes:** reuse `P0001` message tokens (`INTAKE_DRAFT_*`) + new bootstrap tokens
  (`BOOTSTRAP_ORG_MISMATCH`, `BOOTSTRAP_DRAFT_STALE`, `BOOTSTRAP_IDEMPOTENCY_CONFLICT`,
  `BOOTSTRAP_CONTACT_CROSS_TENANT`, `BOOTSTRAP_OWNER_UNAUTHORIZED`) — mapped to safe app errors (§14).
- **Security:** `SECURITY DEFINER`, `SET search_path = ''` (fully-qualify everything, as the existing
  triggers do), revoke PUBLIC/anon, **grant EXECUTE to `authenticated` only** (server calls it with
  the user's JWT via the authenticated client so `auth.uid()` is the real actor); service_role not
  required. Revalidate `auth.uid()`, org membership, draft eligibility, and that **every** payload
  resource id (contact ids, owner/member profile ids) belongs to the active org. The function owner
  role is the sanctioned confirmation channel for the draft trigger (§6).
- **Versioning:** `_v1` in the name; a future `_v2` is a new function + a new migration; the plan
  carries `v:` so the RPC rejects incompatible plan versions. Never silently reinterpret an old plan.

---

## Section 13 — SQL vs TypeScript responsibilities

| TypeScript owns | PostgreSQL / RPC owns |
| --- | --- |
| Command validation (zod) | `auth.uid()` verification |
| Policy authorization (`authorizeResourceRequest` + `requireAuthorized`) | Tenant/org membership validation |
| Draft review validation (version, approvals ⊆ draft) | `FOR UPDATE` draft lock + state-transition validation |
| Deterministic planning + input hash | Idempotency uniqueness (`confirmation_idempotency_key`, `confirmed_matter_id`) |
| Domain mapping (draft → typed operations) | FK integrity, cross-tenant id rejection |
| Warnings + user-facing error mapping (Hebrew) | Atomic inserts + immutable linkage |
| Post-commit scheduling | Commit/rollback + stable DB error codes |

Neither layer duplicates free-form business rules: the epistemic/date/role rules live in the planner
(and are *backstopped*, not re-implemented, by DB CHECKs/triggers).

---

## Section 14 — Failure model

| Category | Internal code | HTTP | Safe Hebrew | Retryable | Draft stays ready_for_review? | Matter may exist? |
| --- | --- | --- | --- | --- | --- | --- |
| Auth failure | `UNAUTHENTICATED`/`SESSION_EXPIRED` | 401 | "נדרשת הזדהות." | after re-auth | yes | no |
| Authorization denied | `RESOURCE_FORBIDDEN` (capability) | 403 | "אין לך הרשאה לפעולה זו." | no | yes | no |
| Draft unavailable / cross-tenant | `RESOURCE_NOT_AVAILABLE` | 404 | "המשאב אינו זמין." | no | n/a | no |
| Draft state conflict | `BOOTSTRAP_DRAFT_STATE` | 409 | "הטיוטה אינה במצב המתאים לאישור." | no | yes | no |
| Stale draft version | `BOOTSTRAP_DRAFT_STALE` | 409 | "הטיוטה עודכנה מאז הסקירה. יש לסקור מחדש." | after re-review | yes | no |
| Invalid reviewed payload | `BOOTSTRAP_INVALID_PLAN` | 422 | "בקשת האישור אינה תקינה." | no | yes | no |
| Idempotency conflict | `BOOTSTRAP_IDEMPOTENCY_CONFLICT` | 409 | "בקשת אישור כפולה עם קלט שונה." | no | maybe (original) | **maybe** |
| Duplicate confirm (same key) | (not an error) | 200 | — returns original | idempotent | no (confirmed) | **yes** |
| Contact ambiguity/cross-tenant | `BOOTSTRAP_CONTACT_INVALID` | 409 | "אנשי קשר בבקשה אינם תקפים." | no | yes | no |
| Invalid participant/fact/deadline | `BOOTSTRAP_INVALID_ENTITY` | 422 | "פריט בבקשה אינו תקין." | no | yes | no |
| DB constraint failure | `BOOTSTRAP_DB_CONSTRAINT` | 409/500 | "אירעה שגיאה באישור." | maybe | yes | no |
| Schema drift | `BOOTSTRAP_SCHEMA_DRIFT` | 500 | "אירעה שגיאה בלתי צפויה." | no | yes | no |
| Transaction timeout | `BOOTSTRAP_TIMEOUT` | 504 | "האישור ארך זמן רב מדי. נסו שוב." | yes | yes | **ambiguous → §23** |
| Post-commit effect failure | `BOOTSTRAP_POSTCOMMIT` (non-fatal) | 200 (matter created) | "התיק נוצר; חלק מהעיבוד יושלם ברקע." | background | no (confirmed) | **yes** |
| Unknown internal | `BOOTSTRAP_INTERNAL` | 500 | "אירעה שגיאה בלתי צפויה." | no | yes | maybe → §23 |

The atomic core guarantees: **either** the draft stays `ready_for_review` and no matter exists, **or**
the draft is `confirmed` and exactly one matter exists. Only ambiguous *transport* failures (timeout /
lost response after commit) leave uncertainty, resolved by the reconciliation lookup (§23). Anti-enumeration
(0.8.5) is preserved: cross-tenant/absent drafts render as `RESOURCE_NOT_AVAILABLE`.

---

## Section 15 — Post-commit effects

Authoritative core commits first; derived work is retryable and **must not** corrupt it.

| Effect | Sync/Async | Authoritative? | Retry | Dedup | Bootstrap waits? |
| --- | --- | --- | --- | --- | --- |
| Extend hydration + return result | sync | — (read) | — | — | yes (read of committed rows) |
| Matter Intelligence recompute | derived-at-load (client `useMemo`) | no | n/a | n/a | **no** |
| Timeline projection | derived (pure engine over deadlines) | no | n/a | n/a | no |
| Workflow initialization | async, deferred | no (§16) | yes | by matter id | no |
| Search indexing | async | no | yes | by matter id | no |
| Notifications | async | no | yes | by (matter, event) | no |
| Analytics / future webhook | async | no | yes | by event id | no |

**Outbox recommendation:** do **not** build a message bus. A **minimal transactional outbox** is the
right tool once async effects exist: a single `bootstrap_outbox`/`matter_outbox` table whose rows are
inserted **in the same RPC transaction** (so "matter created" and "effects to run" commit atomically),
drained by a simple worker with at-least-once delivery + idempotent handlers. **For Slice 1.0.4 the
outbox is optional** (Intelligence/Timeline are derived-at-load, needing no effect); introduce the
outbox in **Slice 1.0.5** when the first real async effect (Workflow/search/notifications) lands. Until
then, Bootstrap returns as soon as the committed matter is hydrated.

---

## Section 16 — Workflow bootstrap boundary

Workflow persistence is **[ABSENT]** (in-memory `WorkflowInstance`, no table, chosen by `detect(matter)`).
- Initial workflow state is **not authoritative** for Matter existence.
- **Matter creation must NOT fail if Workflow initialization fails.** Recommended default.
- Workflow may initialize **after** commit (post-commit effect / outbox), idempotently keyed by matter
  id.
- Minimal workflow reference in the Matter transaction: **none** required now (no workflow table). If a
  future workflow row is authoritative, it joins the transaction only after Workflow persistence is
  designed (Slice 1.0.6, separate capability).
- Duplicate workflow init prevented by a unique (matter_id) key on the future workflow table.

---

## Section 17 — Timeline boundary

Timeline is a **pure projection** (`engines/timeline.ts` over `matter.deadlines`); there is **no
timeline table**.
- Authoritative events created during Bootstrap: `matter_deadlines` rows and the `matter_activity`
  feed row — these are the *inputs* to the projection, not timeline cards.
- Projection trigger: computed at Matter-room load (derived); rebuildable any time from the persisted
  facts/deadlines/activity. Idempotent and order-stable by event timestamp + id.
- `matter_activity` is the **human-readable feed** (presentation-oriented), while `audit_events` is the
  **immutable authoritative** trail. Bootstrap writes both; Timeline **never** persists arbitrary
  cards.

---

## Section 18 — Matter Intelligence boundary

Matter Intelligence is **pure + derived** (`buildMatterProfile` → `assessMatter` →
score/actions/narrative), recomputed client-side; nothing is persisted.
- Minimum persisted inputs: the matter header + facts + deadlines + participants + evidence created by
  Bootstrap. That is all Intelligence needs.
- Recompute trigger: at room load (no post-commit persistence needed today).
- Stale/unavailable intelligence: the room honestly renders `insufficient_facts` / open blockers for a
  freshly bootstrapped (allegation-only) matter — correct, not an error.
- **No bootstrap rollback if intelligence "fails"** (it can't fail the transaction — it's derived).
- **No AI-generated conclusion is ever written to an authoritative Matter field.** UI shows "Matter
  created; intelligence preparing" only if a future persisted-intelligence cache is added (deferred).

---

## Section 19 — Auditability

Record (non-confidential): actor profileId, org id, intake draft id, created matter id, bootstrap
engine version, policy version(s), idempotency key **hash**, correlation id, timestamp, created-entity
counts, warning count, result status. **No confidential intake contents** in the payload.

**`audit_events` limitation:** no `matter_id`/classification column. **Recommendation: use the
existing `object_type='matter'` + `object_id=<matterId>` (and `payload.source_intake_draft_id`)** — no
schema change needed → **not a Bootstrap blocker.** An explicit nullable `matter_id` +
`source_intake_draft_id` on `audit_events` is a *nice-to-have* for indexed matter-audit queries and is
**deferred** (it also unblocks matter-scoped audit RLS, per the 0.8.5 alignment note). Documented
limitation, not a gate.

---

## Section 20 — Security model

Boundaries: **browser** (references + reviewer decisions only) → **server route/action** (resolves
ActorContext) → **Policy Engine** (`intake.confirm`) → **authenticated Supabase client** (RLS on) →
**`SECURITY DEFINER` RPC** (revalidates everything) → **RLS** (0.8.5 lockdown) → **service role**
(not used for authorization) → **post-commit worker** (derived only).

Rules: the browser cannot submit actor id / org authority / capabilities / confirmed matter id; the
RPC revalidates `auth.uid()`, org membership, and draft creator/reviewer/confirm rights from persisted
facts; **every** payload resource id must belong to the active org (contact ids, owner/member profile
ids — cross-tenant ⇒ FK/precheck abort); owner cannot be assigned without the authorized decision; no
service-role key in the browser; service role never replaces ActorContext authorization; logs contain
no confidential draft text.

**Threat scenarios → mitigation:**
- Duplicate confirmation → idempotent `confirmed_matter_id` + unique key (§10).
- Cross-tenant draft id → RLS (`can_access_intake_draft`) + RPC org check → `RESOURCE_NOT_AVAILABLE`.
- Injected contact id → RPC verifies the contact's `organization_id` = active org → abort.
- Injected owner/member id → RPC verifies target profile has active membership in the org → abort.
- Draft changed after review → `expectedDraftVersion`/`version_token` mismatch → `DRAFT_STALE`.
- Replayed old plan → input-hash mismatch vs stored, or `confirmed_matter_id` already set → conflict/idempotent.
- Tampered epistemic state / forged confirmed fact → planner drops it + `forbid_established_fact_on_insert` trigger (absolute).
- Partial transaction → impossible (single atomic RPC).
- RPC called directly from browser → EXECUTE granted to `authenticated`, but the RPC still enforces
  policy-equivalent checks (org/draft/creator-reviewer) and the draft trigger; a direct call cannot
  bypass authorization because the RPC re-derives identity and eligibility. (The application route
  additionally runs the full Policy Engine before calling.)
- Malicious large payload → zod size caps + RPC statement timeout + bounded arrays.

---

## Section 21 — Versioning

| Artifact | Version field | Compatibility rule |
| --- | --- | --- |
| Bootstrap command | `commandVersion` (const in code) | reject unknown |
| Bootstrap plan | `plan.v` (int) | RPC rejects incompatible plan versions |
| RPC | function name `_v1` (→ `_v2` = new fn + migration) | callers pin the version |
| Policy | `resource-authorization-v1` (existing) | decision carries it; bump ⇒ re-review |
| Draft schema | `matter_intake_drafts.engine_version` + `version_token` | a draft assembled under an incompatible `engine_version` must not silently bootstrap → `BOOTSTRAP_ENGINE_INCOMPAT` |
| Extraction schema | `draft.engineVersion` | planner asserts compatibility |
| Audit event | `payload.bootstrapVersion` | additive |
| Post-commit payload | `outbox.payload.v` (when introduced) | additive; handlers version-aware |

A **historical draft** (older `engine_version`) must not bootstrap under incompatible semantics — the
planner/RPC compares `engine_version` against the current supported set and fails closed if incompatible.

---

## Section 22 — Observability

Safe telemetry (allow-list): correlation id, actor profileId (opaque), org id, draft id, matter id
(post-commit), bootstrap version, policy version, phase (`authorize`/`plan`/`rpc`/`postcommit`),
duration, created-entity counts, stable error code, retry count. **Never log:** client narrative, fact
text, participant names, document metadata, privileged content, raw SQL errors, access tokens. This
extends the existing `AuthorizationTelemetry` seam (0.8.4).

Metrics: bootstrap success rate; p50/p95 duration; duplicate-retry rate; validation-failure rate;
stale-draft-conflict rate; post-commit effect failure rate; reconciliation count.

---

## Section 23 — Reconciliation

Ambiguous failures (client times out after commit; RPC succeeded but response lost; matter exists but
post-commit failed; outbox worker stuck; draft `confirming` unexpectedly):

- **Idempotency-status lookup use-case** `getBootstrapStatus(draftId)` (read-only): returns
  `{ status: ready_for_review|confirming|confirmed, matterId? }` from
  `matter_intake_drafts.status`/`confirmed_matter_id`. A client that lost the response calls this and,
  if `confirmed`, navigates to the existing matter (safe, idempotent).
- **Safe retry:** re-invoke Bootstrap with the same idempotency key → returns the original matter.
- **Repair command (operator):** for a rare `confirming`-stuck draft (RPC crashed mid-transaction —
  which rolls back, so the draft should already be `ready_for_review`; a true stuck `confirming` would
  indicate a partial commit that the single-transaction design prevents). If ever observed, an
  operator use-case (audited) re-drives or resets the draft — **not** manual DB editing.
- Immutable audit trail: every attempt's outcome is in `audit_events`/`matter_activity`.
- Manual DB editing is explicitly **not** the normal resolution path.

The optional `matter_bootstrap_runs` table (§10-B) makes reconciliation richer (persisted failed
attempts + input hash) and is the recommended addition **if** ambiguous-failure telemetry proves
necessary in production.

---

## Section 24 — Implementation slices

| Slice | Scope | Files/modules | Migrations | Tests | Forbidden | Stop gate |
| --- | --- | --- | --- | --- | --- | --- |
| **1.0.1 Contracts + planner** | `BootstrapMatterCommand`, `BootstrapPlan`, typed operations, `planMatterBootstrap` (generalize `buildConfirmationPlan`), validators, mapping | `src/modules/matter/bootstrap/{command,plan,planner,validate}.ts` (+ tests) | none | pure planner + validator (§25) | any DB write, RPC, route | pure planner green; no DB |
| **1.0.2 Persistence/trigger migration** | update `enforce_intake_draft_transitions` (open sanctioned channel); (optional) `matter_bootstrap_runs`; audit uses object_type/object_id (no change) | `supabase/migrations/*` + `supabase/tests/*` | **1 additive migration** (prepared, applied only on approval) | local SQL harness (transition channel; idempotency) | the RPC body; routes | migration + local proof; **founder approval before apply** |
| **1.0.3 Atomic RPC** | `app.bootstrap_matter_v1(jsonb)` — transaction, security, grants, RLS-compat | `supabase/migrations/*` + SQL harness | **1 migration** | direct-RPC security + atomicity harness (§25) | app route integration | RPC proven locally; approval before apply |
| **1.0.4 Use-case integration** | ActorContext → policy → planner → RPC adapter → confirm route/action → **extended hydration** | `src/modules/matter/bootstrap/use-case.ts`, `src/app/api/.../confirm/route.ts`, hydration in `matter-loader`/`MatterRepository` | none (or types) | route/authz/transaction integration | Workflow persistence; LLM | one Matter created end-to-end; idempotent |
| **1.0.5 Post-commit effects** | minimal outbox (if needed), Intelligence/Timeline refresh triggers, reconciliation lookup | `src/modules/matter/bootstrap/postcommit.ts` (+ outbox migration if introduced) | maybe 1 (outbox) | effect-once/retry/reconciliation | full Workflow | effects idempotent; matter unaffected by effect failure |
| **1.0.6 Workflow bootstrap** | separate — **only after** Workflow persistence design approved | `src/modules/workflow/*` | TBD | TBD | starting before Workflow persistence design | deferred |

Dependencies: 1.0.2/1.0.3 depend on 1.0.1's contracts; 1.0.4 depends on 1.0.3; 1.0.5 depends on 1.0.4;
1.0.6 depends on a separate Workflow-persistence design.

---

## Section 25 — Test strategy

**Pure planner:** minimal/complex/incomplete drafts; duplicate participants (dedup); uncertain dates
(`dueAt=null`); allegation mapping; **no confirmed fact from intake** (dropped + reported);
deterministic output; stable plan hash; warnings; invalid source spans. **Authorization:**
creator/reviewer/approver permitted; same-org unauthorized denied; cross-tenant denied; stale
membership denied; system/service actors denied; no admin bypass. **Transaction (SQL harness):** one
Matter created; duplicate request returns same Matter; concurrent requests create one; stale draft
rejected; wrong org rejected; injected contact rejected; injected owner rejected; one child failure
rolls back all; draft `confirmed` only on full commit; zero partial rows. **Security:** direct RPC
call still enforces checks; malformed/oversized JSON rejected; tampered plan version rejected; forged
fact state blocked; cross-tenant ids rejected; missing `auth.uid()` fails closed; grant + `search_path`
inspection; RLS holds after commit. **Post-commit:** effect rows once; retry; duplicate delivery;
intelligence failure never removes Matter; timeline rebuild; reconciliation lookup. **Regression:**
Capability 0.8 (policy/integration/RLS harness), Intake, Matter, Documents, Evidence, Intelligence,
Dino, Triad, Workflow, preview security, legal suites.

---

## Section 26 — Founder decisions required (with recommended defaults)

| Decision | Recommended default | Security | Product | Impl | Blocks impl? |
| --- | --- | --- | --- | --- | --- |
| Who may confirm a draft | Owner/partner (holds `intake.confirm`) who is the draft **creator or assigned reviewer** — the existing policy | high — legal authority + resource access | matches labor-firm practice | **none** (reuses 0.8 policy) | **No** |
| Contact creation automatic? | Yes for reviewer-approved new contacts; **link** when an explicit contact id is chosen; **never fuzzy-merge** | prevents cross-tenant/merge errors | reviewer stays in control | planner + RPC id checks | No |
| Assigned reviewer becomes a Matter member? | Yes, as a member **without** `can_approve` | no self-granted authority | team continuity | one member row | No |
| Default Matter owner | The confirming owner/partner (unless an explicit authorized assignment is provided) | owner = authorized actor | sensible default | assignment decision | No |
| Initial deadlines authoritative? | Yes — only reviewer-approved user/source-supplied deadlines; **no statutory computation** | no fabricated dates | honest matter start | planner honors CHECKs | No |
| Evidence Requirements persisted now? | Yes, as `matter_evidence` rows (`status='required'`); requirement/Workflow-task model deferred | no invented approval state | requirements visible immediately | inserts only | No |
| Minimal outbox in Bootstrap? | **No** in 1.0.4 (effects derived-at-load); introduce in 1.0.5 when first async effect lands | at-least-once later | ships sooner | outbox in same tx later | No |
| `audit_events` explicit `matter_id`/`source_draft_id`? | **Defer** — use `object_type/object_id` now | adequate | — | avoids a migration | No |
| Persist failed bootstrap attempts? | **No** for MVP (single-tx rollback leaves no trace); add `matter_bootstrap_runs` only if reconciliation telemetry is needed | — | — | optional table later | No |

**The one decision that unlocks the migration:** confirm the sanctioned-channel mechanism for the
draft trigger — recommended **`current_user` = the bootstrap RPC owner** (tamper-proof), which the
1.0.2 migration implements. (Everything else has a safe default and does not block.)

---

## Section 27 — Implementation readiness checklist (for Slice 1.0.1)

- [x] Authorization action exists — `intake.confirm` + `authorizeIntakeDraft` (0.8.3).
- [x] Draft versioning exists — `version_token` + `engine_version`.
- [x] Canonical structured draft contract exists — `MatterIntakeDraft` + `structured_draft` jsonb.
- [x] Epistemic mapping frozen — `client_alleged/opposing_alleged/disputed/unknown` (intake) vs
      `confirmed/document_derived` (evidence-only); guard trigger present.
- [x] Idempotency model selected — `confirmed_matter_id` + unique `confirmation_idempotency_key`
      (Model A; no new table for MVP).
- [x] Transaction boundary approved (this doc) — §11.
- [ ] RPC input/result contract approved — §12 (blueprint; founder to confirm JSONB-in/out `_v1`).
- [x] Contact/Participant rules approved — exact-match link or create; no fuzzy merge.
- [x] Audit linkage approved — `object_type='matter'`/`object_id` + non-confidential payload.
- [x] Post-commit boundary approved — Intelligence/Timeline derived; outbox deferred to 1.0.5.
- [ ] **Required schema migration identified** — (1) `enforce_intake_draft_transitions` sanctioned
      channel, (2) `app.bootstrap_matter_v1(jsonb)`. Both additive; applied only on founder approval
      in 1.0.2/1.0.3.

The only open items before 1.0.1 are the two founder confirmations (RPC contract shape + the trigger
sanctioned-channel mechanism); neither blocks writing the pure contracts/planner in 1.0.1.

---

# SLICE 1.0.3 — BOOTSTRAP PERSISTENCE PRIMITIVES (finalized, prepared-not-applied)

This section supersedes earlier assumptions about the sanctioned transition channel
and the confirmation columns. Prepared migration:
`supabase/migrations/20260724120000_capability1_bootstrap_persistence_primitives.sql`
(SHA-256 `2ec283b1a4995894b6f50b5d18de9eed1ccb6d96480ca1458b84548baaf02863`). PREPARED FOR
REVIEW — not applied to Development; committed only after a founder-approved apply.

## Sanctioned transition channel — FINAL mechanism

The blocker is confirmed live: `app.enforce_intake_draft_transitions()` is **SECURITY
INVOKER** and unconditionally blocks `→confirming/confirmed` and any `confirmed_matter_id`
write for **every** caller, including `service_role` (`auth.role()` reflects the caller
JWT even inside a SECURITY DEFINER RPC — verified).

Chosen channel: **`current_user = 'lawme_bootstrap'`**, a dedicated **NOLOGIN BYPASSRLS**
role that will OWN `app.bootstrap_matter_v1` (Slice 1.0.4). Inside that SECURITY DEFINER
RPC, `current_user` becomes the owner role, and the nested SECURITY INVOKER guard observes
it. The signal is **not** a JWT claim, **not** a payload flag, **not** a caller-settable
GUC, **not** service-role possession, and **not** SECURITY DEFINER alone. Grounded facts
(Development): the migration role `postgres` has `createrole`+`bypassrls` (can create the
role); `authenticated`/`anon`/`service_role` cannot `SET ROLE` to `lawme_bootstrap`; the
PostgREST authenticator can only assume authenticated/anon/service_role. BYPASSRLS is
required because Capability 0.8 removed all authenticated write policies on Matter tables.

The role receives **only** `SELECT, UPDATE on matter_intake_drafts` in this slice; child-
table INSERT grants are **deferred to 1.0.4** with the RPC.

## Confirmation columns (minimum durable set) — added by 1.0.3

`confirmation_plan_hash text` (SHA-256 of `MatterAggregatePlan.metadata.planHash`),
`confirmation_bootstrap_version text`, `confirmed_at timestamptz`. Existing `version_token`
(stale primitive), `confirmed_matter_id` (linkage) and `confirmation_idempotency_key`
(unique per org,key) are reused. **No `matters.source_intake_draft_id`** — instead a UNIQUE
partial index on `matter_intake_drafts(confirmed_matter_id)` gives immutable 1:1 without a
circular FK. **No `matter_bootstrap_runs` table.**

## Two-step atomic transition + invariants

`ready_for_review → confirming` (pins idempotency key + plan hash + bootstrap version; no
Matter yet) → RPC creates Matter + children → `confirming → confirmed` (sets
`confirmed_matter_id` + `confirmed_at`; pinned fields frozen). All in ONE transaction, so
`confirming` is transient and never a committed stranded state. Guard + CHECKs enforce:
confirmed row fully frozen (linkage/key/plan-hash immutable, no revert); entering confirming
requires the pinned identity (`INTAKE_DRAFT_CONFIRMATION_INCOMPLETE`); confirmed requires
linkage + `confirmed_at`; new stable codes `INTAKE_DRAFT_CONFIRMATION_INCOMPLETE` and
`INTAKE_DRAFT_CONFIRMATION_PINNED_IMMUTABLE`.

## Child-table readiness (no schema change; RPC-side bindings)

`matters` needs server-resolved `slug` + `current_stage_id` + `assigned_owner_id`
(`current_stage_id` cannot be computed by the pure planner — the RPC resolves it from the
procedure graph via the integration layer). `matter_evidence.evidence_type` is NOT NULL and
absent from the plan — the RPC supplies a safe default (recommend `'document'`) OR the
planner is later extended; **no schema change**. `audit_events` already supports
`object_type='matter'` + `object_id` + non-confidential `payload` jsonb — **ready**. Fact
guard (`forbid_established_fact_on_insert`) and org-consistency triggers are untouched; the
sanctioned channel never bypasses them.

---

# ATOMIC BOOTSTRAP RPC ARCHITECTURE (Slice 1.0.3B — architecture-only)

Implementation-grade design for `app.bootstrap_matter_v1(...)`. Nothing here was built,
applied, or committed. Security-dense material (grounded execution model, ownership-model
comparison, direct-exposure proof, threat matrix) is in
`docs/product/BOOTSTRAP_RPC_SECURITY_APPENDIX.md`. Live Development was read only.

## R1. Caller model & exposure — RESOLVED

The RPC is **`SECURITY DEFINER`, `EXECUTE` granted to `authenticated`** (not `anon`,
not `PUBLIC`). It is safe under direct PostgREST invocation because it re-derives every
authoritative value server-side and revalidates every fact against persisted state
(appendix §4). The **only** new authorization primitive required is
`app.can_confirm_intake_draft(draft_id)` — a `SECURITY DEFINER` helper encoding the
persisted `intake.confirm` rule (owner/partner + creator/reviewer + `ready_for_review`;
appendix §2). This is possible because `intake.confirm` is granted only to `owner`/`partner`
and `organization_memberships.role` is a persisted column. The application path
(ActorContext → policy → `requireAuthorized` → validate → plan → RPC) still runs first and
remains mandatory; the RPC is the independent in-DB backstop.

## R2. Ownership / channel — RECOMMENDED

**Model A**: a dedicated `lawme_bootstrap NOLOGIN BYPASSRLS` role owns the RPC;
`current_user = 'lawme_bootstrap'` is the sanctioned transition channel (the only signal
not controllable by a caller — appendix §1/§3). `postgres`-ownership is rejected
(channel too broad); server-only/service-role is rejected (loses `auth.uid()`, violates
rule 11); a signed envelope is unnecessary (authority is persisted-expressible). Optional
refinement: own only a minimal `app.bootstrap_confirm_transition()` with `lawme_bootstrap`
(channel) while the RPC is `postgres`-owned (free writes via owner-exemption), shrinking
the BYPASSRLS surface to the two transition UPDATEs. **This is a founder decision** (the
BYPASSRLS attribute); Model C (no BYPASSRLS + explicit grants + per-role permissive
policies) is the fallback if BYPASSRLS is disallowed.

## R3. Sanctioned transition channel

`current_user = 'lawme_bootstrap'` gates exactly `ready_for_review → confirming` and
`confirming → confirmed`, with the pinned-identity + linkage + immutability invariants
already implemented in the prepared 1.0.3 guard. Rejected signals (all caller-controllable
or ambiguous): `auth.role()`, payload flags, `current_setting`/GUC, advisory locks,
`pg_backend_pid`, trigger depth, temp tables, SECURITY DEFINER alone. Retained.

## R4. Exact input contract

`app.bootstrap_matter_v1(p_payload jsonb) returns jsonb`. One `jsonb` param (the aggregate
is variable-shape; typed params would be unwieldy and versioning-hostile). Accepted top-level
keys **only**: `rpcVersion`, `bootstrapVersion`, `draft{id,versionToken,schemaVersion}`,
`idempotency{key,planHash}`, `aggregate{aggregateVersion,plannerVersion,validationVersion,
sourceInputHash,matter,members,participants,contacts,facts,deadlines,evidence,audit,metadata}`.
Unknown keys at any level ⇒ reject (`BOOTSTRAP_MALFORMED_PAYLOAD`). **Rejected/ignored
inputs** (never authoritative): `actorId`, any `organizationId`, `assignedOwnerId`, arbitrary
profile ids, `confirmedMatterId`, audit actor, capability/role labels, SQL identifiers, table
names, `commands[]`/`operations[]`, free-form expressions. Hard bounds (v1): payload ≤ **256 KB**;
JSON depth ≤ **12**; participants ≤ **200**, contacts ≤ **200**, facts ≤ **500**, deadlines ≤ **200**,
evidence ≤ **200**, members = **1** (owner) for v1; strings: title ≤ 300, statement ≤ 4000,
label ≤ 300; UUIDs regex-checked; `planHash`/`sourceInputHash` = `^[0-9a-f]{64}$`; plan-local
keys = `^[a-z]+_[0-9a-f]{16}$`; enums validated against live CHECK vocabularies; every
`contactKey`/participant reference must resolve within the payload (cross-section integrity).

## R5. Plan trust model — Option C (planHash for idempotency only)

The payload is **fully untrusted**. The RPC does **not** recompute `planHash` (avoids
reimplementing TS canonical JSON + SHA-256 in SQL — high divergence risk) and does **not**
reconstruct the plan from the Draft (would reimplement the TS planner in SQL). Instead it
**independently revalidates**: versions (rpc/bootstrap/aggregate/planner/validation) against
accepted constants; `draft.id`+`versionToken`+`status` against the locked row; org derived
from the Draft; actor from `auth.uid()`; owner bound to the actor; contact orgs (trigger);
fact statuses (enum + guard); deadline CHECKs; evidence type (R11); enum allow-lists; key
uniqueness + cross-refs; counts/limits. Security-sensitive values are **server-derived and
override the payload**; non-security content is inserted as-is, bounded by CHECKs. `planHash`
is stored and compared only to detect same-key/different-plan (appendix §4 explains why this
is safe: content tampering is self-scoped, not escalation).

## R6. Transaction algorithm (ordered; single tx)

Pre-lock: (1) parse+shape-validate envelope & bounds; (2) `auth.uid()` non-null → resolve
`profiles` row; (3) version constants accepted. Lock: (4) `SELECT … FROM matter_intake_drafts
WHERE id=:id FOR UPDATE` (opaque not-available if absent/inaccessible). Post-lock, pre-write:
(5) derive org from Draft; (6) `app.can_confirm_intake_draft` (membership active + owner/partner
+ creator/reviewer); (7) `status='ready_for_review'`; (8) `version_token=:versionToken` else
stale; (9) if already `confirmed`/`confirmed_matter_id` set → **reconcile** (compare stored
`confirmation_plan_hash`/key → return original Matter or conflict); (10) idempotency (org,key)
probe. Pin+reserve: (11) `UPDATE … status='confirming', confirmation_idempotency_key,
confirmation_plan_hash, confirmation_bootstrap_version` (sanctioned channel; pins identity).
Materialize (all as owner/bypass, org-consistency triggers active): (12) resolve
`current_stage_id` (R10); (13) INSERT `matters`; (14) INSERT owner into `matter_members`;
(15) link/create `contacts` (R9) → key→id map; (16) INSERT `matter_participants`; (17) INSERT
`matter_facts` (intake statuses only); (18) INSERT `matter_deadlines`; (19) INSERT
`matter_evidence` (R11); (20) INSERT `audit_events` (R12). Finalize: (21) `UPDATE … status
='confirmed', confirmed_matter_id, confirmed_at` (sanctioned channel; `confirmed_matter_id`
unique). (22) return success union. (23) COMMIT. Isolation **READ COMMITTED** + the `FOR
UPDATE` Draft lock serializes concurrent confirmations of the same Draft; `statement_timeout`
and an overall guard (≤ ~5 s target) bound duration; any failure rolls the whole tx back, so
`confirming` is never a committed stranded state.

## R7. Idempotency & retry (never a 2nd Matter)

Same Draft/same key/same plan: before commit → serialized by `FOR UPDATE`; after commit →
`BOOTSTRAP_ALREADY_COMMITTED` with the original `matterId`. Same key/different plan → stored
`confirmation_plan_hash` differs → `BOOTSTRAP_IDEMPOTENCY_CONFLICT`. Different key on a
committed Draft → Draft frozen → returns the original Matter (or conflict on key mismatch).
Stale `version_token` before commit → `BOOTSTRAP_STALE_DRAFT`. Different Draft/same key/same
org → unique `(org,key)` index blocks a 2nd row → conflict. Different org/same key → allowed
(scoped per org). Connection loss before/during/after commit → client retries same key →
reconciles to the original Matter. The unique `(org,key)` index + unique `confirmed_matter_id`
+ confirmed-row immutability guarantee at-most-one Matter per Draft.

## R8. Cross-tenant defenses

Every authoritative org/actor value is server-derived (Draft org; `auth.uid()`); payload
copies are ignored. Foreign `contactId`, participant→foreign-contact, member/profile
injection, org injection, procedure/stage injection, reused-plan-from-another-Draft (version
token), reused-plan-from-another-actor (`can_confirm` + owner bound to actor), plan-local-key
collision (uniqueness check) — all rejected by server derivation + the org-consistency triggers
+ CHECKs (appendix §5).

## R9. Contact materialization

`link_existing`: validate the `contactId` exists **and** belongs to the Draft's org (the
`enforce_matter_participant_org` trigger is the hard wall; the RPC also pre-checks for a clean
error); map plan-local `contactKey`→id. `create_new`: validate fields (kind∈person/company,
name 1–300), org = Draft org, INSERT, map key→id. `deferred`: create no Contact and no
participant for it (retained only in audit metadata; a participant must always resolve to a
persisted contact — no unlinked participants in v1). No fuzzy matching; no email/phone dedup.

## R10. Matter & stage materialization

`current_stage_id` is **not** in the pure plan and cannot be resolved from untrusted JSON. v1:
a small `SECURITY DEFINER` map `app.initial_stage_for(procedure_type)` returns the canonical
root stage id per the 12 `EmploymentProcedureType` values (deterministic; mirrors the TS
procedure-graph roots; versioned with the graph). `slug` is server-generated (deterministic
from title + a plan-local suffix; retried on the per-org unique constraint). `assigned_owner_id`
= the confirming actor. Unsupported/absent procedure type ⇒ `BOOTSTRAP_UNSUPPORTED_PROCEDURE`.
**Founder decision** (map vs application-supplied validated stage); does not block the migration.

## R11. Fact / deadline / evidence safety

Facts: only `client_alleged|opposing_alleged|disputed|unknown` (enum + `forbid_established_
fact_on_insert`); `confirmed`/`document_derived` impossible; no statutory/legal inference; no
merge. Deadlines: `source`/`confidence` enum-checked; `known⇒date`, `unknown⇒no date` (existing
CHECKs); no statutory calculation; timezone defaulted to `Asia/Jerusalem` when blank. **Evidence
— genuine gap:** the plan lacks `evidence_type` but `matter_evidence.evidence_type` is NOT NULL.
Recommended v1: **fixed `evidence_type='document'`** as an explicitly approved domain rule (most
intake evidence requirements are documents; `mandatory`+`label` carry the meaning; refine
post-bootstrap). **Founder decision**; blocks RPC implementation until approved; does **not**
require a schema change.

## R12. Audit

One `audit_events` row inside the transaction: `event_type='matter.bootstrapped'`,
`object_type='matter'`, `object_id=<matterId>`, `organization_id`, `actor=auth.uid()`,
`actor_role`, and a non-confidential `payload` jsonb = `{draftId, idempotencyKeyHash, planHash,
bootstrapVersion, plannerVersion, aggregateVersion, validationVersion, sourceInputHash,
correlationId, counts}`. **No** narrative, fact/participant/contact/deadline/evidence text.
Audit insert failure **rolls back** the bootstrap (audit is mandatory, not best-effort).

## R13. Result & error model

Hybrid. **Expected domain outcomes return a `jsonb` result union** (never raise): success
`{ok:true, code:'BOOTSTRAP_CREATED', matterId, draftId, idempotencyKey, planHash, created:{…counts},
committedAt, bootstrapVersion}`; idempotent `{ok:true, code:'BOOTSTRAP_ALREADY_COMMITTED', …}`;
conflicts `{ok:false, code:'BOOTSTRAP_IDEMPOTENCY_CONFLICT'|'BOOTSTRAP_STALE_DRAFT'|
'BOOTSTRAP_NOT_AVAILABLE', correlationId}`. **Impossible/security/schema failures raise stable
`P0001` messages** (mirroring the guard convention) so the tx aborts: e.g.
`BOOTSTRAP_UNAUTHENTICATED`, `BOOTSTRAP_MALFORMED_PAYLOAD`, `BOOTSTRAP_VERSION_UNSUPPORTED`,
`BOOTSTRAP_CROSS_TENANT`, `BOOTSTRAP_INVALID_FACT_STATE`, `BOOTSTRAP_INVALID_DEADLINE`,
`BOOTSTRAP_UNSUPPORTED_EVIDENCE`, `BOOTSTRAP_UNSUPPORTED_PROCEDURE`, `BOOTSTRAP_AUDIT_FAILED`,
`BOOTSTRAP_INTERNAL`. **Anti-enumeration**: draft-absent and draft-unauthorized both map to the
single opaque `BOOTSTRAP_NOT_AVAILABLE`. Results never contain confidential text, other users,
org internals, raw SQL errors, tokens, or full aggregate rows. Application maps codes to Hebrew
copy; retryable = stale/conflict-after-fix only.

## R14. Grants, hardening, performance, reconciliation

**Grants**: RPC in schema `app` (or `public` for PostgREST), owner `lawme_bootstrap`; `REVOKE
ALL FROM PUBLIC, anon`; `GRANT EXECUTE TO authenticated`; **no** `service_role` grant needed;
internal helpers (`can_confirm_intake_draft`, `initial_stage_for`, transition helper) `REVOKE
ALL FROM PUBLIC/anon/authenticated`; child-table write grants (or owner-exemption) attach to the
owner only; no sequences (all `gen_random_uuid`). **Hardening**: `search_path=''`, every object
fully qualified (incl. `extensions.digest` if ever used), **no dynamic SQL / no `format()` over
untrusted text / no `EXECUTE`**, `jsonb` accessors only, array iteration bounded by R4 limits,
sanitized exceptions. **Performance**: single Draft `FOR UPDATE` (no cross-Draft contention);
bulk `insert … select from jsonb_array_elements` per child section; idempotency + confirmed
lookups covered by existing/added unique indexes; target ≤ ~5 s within limits. **Reconciliation
(`getBootstrapStatus`)**: a **read-only server use-case over `DraftRepository`** (not a new RPC)
returning not-committed / committed(+matterId if the caller may read the Draft) / conflict /
stale / not-available — plus the RPC's own `BOOTSTRAP_ALREADY_COMMITTED` retry path. Anti-
enumeration preserved (Draft RLS gates visibility).

## R15. Prepared-migration reconciliation (Slice 1.0.3)

| Prepared primitive | Still needed | Change required | Reason |
| --- | --- | --- | --- |
| `confirmation_plan_hash` | Yes | None | idempotency conflict detection (R5/R7) |
| `confirmation_bootstrap_version` | Yes | None | audit + compatibility |
| `confirmed_at` | Yes | None | audit/reconciliation |
| unique `confirmed_matter_id` | Yes | None | 1:1, at-most-one Matter |
| hardened transition invariants | Yes | None | R3/R6 depend on them |
| sanctioned channel (`current_user`) | Yes | None | R2/R3 |
| `lawme_bootstrap` role | Yes **if Model A** | Depends on founder ownership choice | drop/replace only under Model C |
| BYPASSRLS attribute | Yes **if Model A** | Under review | see appendix §3 |
| draft grants (SELECT,UPDATE) | Yes | None | transition channel |
| **`app.can_confirm_intake_draft`** | Yes (**new, 1.0.4**) | Add in the RPC slice | in-DB confirm authority (R1) |
| **`app.initial_stage_for`** | Yes (**new, 1.0.4**) | Add in the RPC slice | server-derived stage (R10) |
| **child-table write grants** | Yes (**new, 1.0.4**) | Add in the RPC slice | deferred per 1.0.3 scope |

The prepared 1.0.3 migration is correct for the primitives. Under **Model A it needs no
change**; the RPC slice (1.0.4) *adds* the RPC + two helpers + child grants. Under a non-A
ownership choice, 1.0.3 needs a narrow revision (drop BYPASSRLS; add grants + per-role policies).

## R16. Founder decisions required

1. **RPC exposure** → *authenticated direct* (recommended; safe per R1/appendix). Impact:
   simplest, JWT-grounded. Blocks migration: no. Blocks RPC: no.
2. **RPC owner** → *Model A: dedicated NOLOGIN BYPASSRLS* (recommended); alt Model C.
   The one genuinely privileged approval. Blocks migration apply: **yes** (role creation).
   Blocks RPC: yes (owner must exist).
3. **In-DB capability proof** → *persisted narrow authority via `app.can_confirm_intake_draft`*
   (recommended; owner/partner rule). Blocks migration: no. Blocks RPC: yes (must exist).
4. **Plan integrity** → *planHash for idempotency only* (recommended, R5). Blocks: no.
5. **Evidence type** → *fixed `evidence_type='document'` domain rule* (recommended, R11);
   alt: extend the 1.0.2 planner contract. Blocks migration: no. Blocks RPC: **yes**.
6. **Procedure initial stage** → *canonical `app.initial_stage_for` map* (recommended, R10);
   alt: application-supplied validated stage. Blocks migration: no. Blocks RPC: yes.

## R17. Verdict

**B — RPC architecture approved; the prepared 1.0.3 migration requires (at most) a narrow,
ownership-contingent revision.** If the founder approves **Model A**, the prepared migration
proceeds **unchanged** and Slice 1.0.4 adds the RPC + `can_confirm_intake_draft` +
`initial_stage_for` + child grants. If the founder rejects BYPASSRLS, 1.0.3 is revised to
Model C (no BYPASSRLS + explicit grants + per-role write policies). No blocker prevents the
architecture; decisions #2, #5, #6 must be settled before RPC implementation (1.0.4).

---

# DECISION — AUTHORIZATION ENVELOPE vs DEDICATED ROLE (Slice 1.0.3C)

Full analysis: `docs/product/BOOTSTRAP_AUTHORIZATION_ENVELOPE_ARCHITECTURE.md`.

**Verdict: C — retain the dedicated-role model; do NOT adopt a signed envelope.** Grounded
in live Development: in-DB signature verification is **HMAC-only** (no Ed25519/ECDSA/RSA verify
in pgcrypto), so an envelope forces a **symmetric secret into the database** (Vault) — a worse
secret posture than a secretless NOLOGIN role. The envelope's core benefit (prove a capability
SQL cannot check) is **redundant**: `intake.confirm` = owner/partner is SQL-expressible via
`app.can_confirm_intake_draft`. Critically, an envelope **does not grant RLS write privilege**
and **does not remove the `current_user` transition channel**, so a privileged function owner is
still required — the envelope replaces only the trivial capability helper while adding a signer,
key rotation, canonical byte-binding, and a key-compromise blast radius.

**The BYPASSRLS concern is resolved without an envelope:** own the RPC with `postgres` (writes
via owner-exemption, since Matter tables are `postgres`-owned with `FORCE ROW LEVEL SECURITY`
off) and own only a minimal `app.bootstrap_confirm_transition()` helper with a dedicated
**NOLOGIN (no BYPASSRLS)** role for the `current_user` channel + one permissive draft policy.
This retires BYPASSRLS with less machinery than an envelope.

**Next step:** proceed to Slice 1.0.4 (Atomic Bootstrap RPC) under the dedicated-role model.
Open founder decisions unchanged from 1.0.3B: (#9) dedicated role — BYPASSRLS **or** the
owner-exemption + minimal-helper variant; (#5) evidence_type default; (#6) initial-stage map.

---

## Applied-State Reconciliation — Slice 1.0.4B (Development)

*Recorded after the Development forward-fix apply and complete live proof. This
section reconciles the architecture above (authored as ARCHITECTURE-ONLY) with the
state actually applied to the Development project `udispadsbxqicmawqcuk`. Production
was never touched. Application Integration has not started.*

### Final applied migration chain (Development, registered exactly once each)

| Version | Name | SHA-256 |
|---|---|---|
| `20260724120000` | capability1_bootstrap_persistence_primitives | `2ec283b1a4995894b6f50b5d18de9eed1ccb6d96480ca1458b84548baaf02863` |
| `20260724130000` | capability1_bootstrap_matter_rpc | `aa34e7d756f4bff5da9f2c91832097bee0177040864d5b4b7dbe0c678d47f2d1` |
| `20260724140000` | capability1_bootstrap_actor_resolution_fix | `804974d02fc3fafb4d1f506b01222d51617f213baeb857dacc711c564445f627` |

The first two are immutable historical migrations; 1.0.4B is an **additive forward
fix** that does not modify or rerun them.

### Supabase platform compatibility constraints (not new authorization architecture)

Two independent runtime failures on Development traced to a single platform fact: the
migration role `postgres` is **not** a superuser, and schema `auth` is owned by
`supabase_admin`, so `postgres` cannot grant `lawme_bootstrap` USAGE on `auth`. The
1.0.4 `grant usage on schema auth to lawme_bootstrap` therefore no-op'd (warning), and
any code path that reached into schema `auth` from the `lawme_bootstrap` execution
context failed with *permission denied for schema auth*. Neither fix changes the
authorization model — the actor is still `auth.uid()`, authorization is still
Capability 0.8 + the persisted-state revalidation in the RPC.

1. **auth.uid() compatibility wrapper (`app.actor_uid()`).** A narrowly scoped,
   **postgres-owned** `SECURITY DEFINER STABLE` function, `search_path = ''`, body is
   exactly `select auth.uid()` — no tables, no dynamic SQL, no fallback. EXECUTE is
   granted **only** to `lawme_bootstrap` (revoked from PUBLIC/anon/authenticated/
   service_role). The RPC resolves the actor via `app.actor_uid()` instead of calling
   `auth.uid()` directly. `auth.uid()` remains the single identity source.

2. **Lazy `auth.role()` correction (Option B — Minimum Required Authority).** The
   `SECURITY INVOKER` guard `app.enforce_intake_draft_transitions()` previously
   initialized `v_is_client := (auth.role() = 'authenticated')` **eagerly**, before the
   execution path was known. Inside the RPC the guard runs as
   `current_user = lawme_bootstrap`, so the eager call hit the same auth-schema denial.
   Option B evaluates `auth.role()` **lazily, only inside the direct-client branches**
   (INSERT client checks; the non-bootstrap UPDATE branch guarded by
   `not v_is_bootstrap`), and **never** on the sanctioned `lawme_bootstrap` channel.
   Transition semantics, the state machine, the `current_user` channel, and every
   confirmation invariant are preserved verbatim; only the unnecessary eager dependency
   was removed.

**Why no `app.actor_role()` exists.** Option B removes the eager dependency rather than
adding a second projection. `app.actor_uid()` remains the **only** auth projection
introduced for Bootstrap v1. A parallel `app.actor_role()` was explicitly rejected and
is asserted absent by the migration postconditions and the actor-resolution tests.

### Ownership prerequisites (transient; end-state privileges unchanged)

Replacing a `lawme_bootstrap`-owned function from the non-superuser `postgres` role
requires two grants inside the migration transaction:

1. `grant lawme_bootstrap to postgres with set true;` — gives `postgres` the SET option
   on `lawme_bootstrap` membership so it can `SET ROLE lawme_bootstrap` to preserve
   function ownership. (Idempotent; established in 1.0.4.)
2. `grant create on schema app to lawme_bootstrap;` … `revoke create on schema app from
   lawme_bootstrap;` — **transient** CREATE, revoked before COMMIT. End state:
   `lawme_bootstrap` holds **USAGE only** on schema `app` (no CREATE).

The guard is `postgres`-owned, so it is replaced with an ordinary `CREATE OR REPLACE`
in the `postgres` context (no role switch, no CREATE grant).

### Final ownership, grants, and role privileges (verified live on Development)

- `app.actor_uid()` — owner **postgres**, SECURITY DEFINER, STABLE, `search_path=''`;
  EXECUTE → `lawme_bootstrap` only.
- `app.bootstrap_matter_v1(jsonb)` — owner **lawme_bootstrap**, SECURITY DEFINER,
  `search_path=''`; EXECUTE → `authenticated` only (anon/PUBLIC/service_role = false);
  resolves the actor via `app.actor_uid()`; contains **no** direct `auth.uid()` / `auth.role()`.
- `app.enforce_intake_draft_transitions()` — owner **postgres**, **SECURITY INVOKER**,
  `search_path=''`; unchanged transition rules.
- `lawme_bootstrap` role — **NOLOGIN, BYPASSRLS**; no SUPERUSER / CREATEROLE / CREATEDB /
  REPLICATION; **USAGE on schema `app` only** (no CREATE); **no USAGE on schema `auth`**;
  no reverse role membership (only `postgres` may `SET ROLE` it).

### Development live-proof results (isolated fixtures, cleaned to baseline)

- **Actor resolution:** `app.actor_uid()` returns the exact JWT `sub`; null without a
  subject; anon/authenticated/service_role/PUBLIC cannot execute it; `lawme_bootstrap`
  cannot call `auth.uid()` directly (no auth USAGE) yet Bootstrap succeeds via the
  wrapper; the sanctioned path never evaluates `auth.role()`; the direct-client path
  still enforces `auth.role()`.
- **Happy path:** `BOOTSTRAP_CREATED` — exactly one Matter, org derived from the Draft,
  `assigned_owner_id` = confirming actor, one membership (`partner`, review+approve),
  participant `client`, fact `client_alleged`, deadline `known`/strict, evidence
  `evidence_type = 'document'`/required, initial stage **`intake`**, one
  `matter.bootstrapped` audit row whose payload carries only counts/versions/plan hash/
  correlation/idempotency-key **hash** (no Draft narrative). Draft → `confirmed` with all
  pinned fields set.
- **Idempotency:** same key+plan → `BOOTSTRAP_ALREADY_COMMITTED`; same key/different
  plan and different key → `BOOTSTRAP_IDEMPOTENCY_CONFLICT`; no second Matter, no
  duplicate children.
- **Concurrency:** one-authoritative-Matter invariant. Enforcing primitives verified on
  Development (row `FOR UPDATE` + unique partial indexes `…_confirmed_matter_uq`,
  `…_idem_uq`); genuine two-connection simultaneous proof executed on a local disposable
  cluster running the identical chain → `BOOTSTRAP_CREATED` + `BOOTSTRAP_IDEMPOTENCY_CONFLICT`,
  exactly one Matter.
- **Authorization (all opaque `BOOTSTRAP_NOT_AVAILABLE`):** ordinary member; reviewer
  without owner/partner authority; owner/partner who is neither creator nor reviewer;
  cross-tenant actor; suspended (inactive) membership; no membership; JWT subject with no
  profile. Authorized owner and partner succeed. Payload `actorId`/`organizationId`/
  `ownerId` are ignored (Matter uses the JWT actor and the Draft org).
- **Stale/state:** wrong version token → `BOOTSTRAP_STALE_DRAFT`; rejected/expired/active/
  needs_clarification → `BOOTSTRAP_NOT_AVAILABLE`; confirmed reconciles safely.
- **Tampering (all rejected, atomic rollback):** foreign/invalid contact →
  `BOOTSTRAP_CROSS_TENANT`; broken plan-local ref → `BOOTSTRAP_INVALID_REFERENCE`;
  invalid/`document_derived`/`confirmed` fact status → `BOOTSTRAP_INVALID_FACT_STATE`;
  unsupported procedure → `BOOTSTRAP_UNSUPPORTED_PROCEDURE`; missing key / invalid plan
  hash → `BOOTSTRAP_MALFORMED_PAYLOAD`; bad version → `BOOTSTRAP_VERSION_UNSUPPORTED`;
  bad enum → `BOOTSTRAP_UNKNOWN_ENUM`. (Duplicate plan-local keys and payload size limits
  are enforced upstream by the Validation/Aggregate-Planner engines, which produce the
  validated aggregate the RPC trusts.)
- **Atomic rollback:** forcing a child failure after the Draft entered `confirming` left
  the Draft back at `ready_for_review` with all pinned fields null and no Matter/child/
  audit residue; retry then succeeded.
- **Boundary:** anon and service_role RPC invocation denied; raw INSERT/UPDATE into
  `matters` and child tables denied (RLS, no authenticated write policy); raw Draft
  confirmation UPDATE denied by the guard; browser cannot assume `lawme_bootstrap`
  (role membership) or execute `app.actor_uid()`.

### Advisors

Security and performance advisors after 1.0.4B show **no new ERROR or WARN**. All lints
are pre-existing INFO items (one RLS-enabled/no-policy on `legal_source_fetches`;
unindexed-FK / unused-index notices on tables from earlier capabilities; the auth
connection-strategy note). 1.0.4B added only functions (no tables/indexes/FKs), and
`app.actor_uid()` has a pinned `search_path` (no mutable-search-path lint).

### Accepted v1 decisions (unchanged)

- `lawme_bootstrap` = **NOLOGIN, BYPASSRLS** dedicated transition role.
- `evidence_type = 'document'` for all Bootstrap-created evidence.
- Initial Matter stage = **`intake`**.
- **Authorization Envelope rejected for v1** (see `BOOTSTRAP_AUTHORIZATION_ENVELOPE_ARCHITECTURE.md`).

### Scope boundary

Production untouched. Historical migrations unmodified. No Application Integration, no
Post-Commit Effects, no Workflow persistence, no LLM provider, no broad `authenticated`
write policy. The browser-facing invocation path (a `public` wrapper or schema exposure
so `authenticated` can reach the RPC) is deferred to Application Integration — today only
`lawme_bootstrap` holds USAGE on schema `app`, which is the intended internal boundary.
