# Matter Bootstrap Engine — Principal Architecture Review

**Capability 2 · Slice 2A · Part 2 — pre-implementation architecture (design only; no code, no migration, no DB change).**
Status: FOR FOUNDER REVIEW. Verdict at the end (Section: Final Verdict).

This document is grounded in the actual codebase at HEAD `564f99f`. Every claim about existing behavior was verified against source; where something does **not** exist yet it is marked **[GAP]**. APIs that do not exist are never invented — they are listed as missing methods to be built.

---

## Codebase facts this review is built on (verified, not assumed)

1. **The runtime client cannot do multi-table transactions.** The app uses `@supabase/supabase-js` (`serviceClient()` in `src/modules/matter/persistence/supabase-server.ts`). A repo-wide grep for `.rpc(` returns **nothing**. supabase-js/PostgREST cannot span `BEGIN/COMMIT` across multiple `.insert()` calls, and there is no transaction helper. **True atomicity is only achievable via a Postgres function invoked with `.rpc()` — which does not exist yet. [GAP]**
2. **Every child-table writer is missing.** `MatterRepository.create` inserts the `matters` header only. There is **zero** app code writing `contacts`, `matter_participants`, `matter_facts`, `matter_deadlines`, `matter_members`, or `matter_activity`. `matter_evidence` has only a demo-seed upsert. `matter_documents` and `audit_events` have writers. **[GAP for 6 tables]**
3. **Hydration ignores the new tables.** `getHydrated`/`hydrateMatter` read only `matters` + `matter_evidence` + `matter_documents`; `facts`/`deadlines`/`participants`/`client` hydrate to empty/placeholder. Bootstrapped data will not render until hydration is extended. **[GAP]**
4. **Matter Intelligence is already pure + derived.** `buildMatterProfile(matter)` → `assessMatter` → `computeMatterScore`/`prioritizeActions`/`buildNarrative`. No DB writes, no caching; recomputed **client-side** in `room-store.tsx` via `useMemo`. Timeline is a pure engine (`engines/timeline.ts`) over `matter.deadlines`; there is **no timeline table**.
5. **The planner already exists.** `buildConfirmationPlan(draft, approvals): CanonicalWritePlan` (`src/modules/matter/intake/confirm-plan.ts`) is pure and already enforces intake-only fact statuses, hearing/event-date exclusion, and `dueAt` honesty. It is computed for preview in the intelligent-intake page but **never executed** (no confirm endpoint). **[GAP: executor + endpoint]**
6. **There is no auth.** No `auth.getUser`, no session, no cookies. Both API routes run as `DEMO_SEED.organizationId` through the **service role (RLS bypassed)**; `actorId` is never resolved. The `matter_members` capability table (`can_review`/`can_approve`, `matter_role`) and `app.matter_can_approve()` exist in SQL but **no app code reads them**. **[GAP: authentication + actor/org resolution]**
7. **The draft table is live but un-wired.** `matter_intake_drafts` (creator/reviewer RLS, `confirmation_idempotency_key` unique, `confirmed_matter_id` back-link) has **zero** app code. **[GAP: draft repository]**
8. **Workflow is in-memory + detection-based.** `createInstance(def, matter)` + `applyEvent(...)` in `workflow/engine.ts`; state lives on the in-memory `WorkflowInstance` (`audit[]`), **no workflow table**, and workflows are chosen by `detect(matter)`, not by procedure. Only two definitions exist (both evidence-review).
9. **Audit is immutable and matter-scoped audit is undefined.** `audit_events` has an immutability trigger (`app.forbid_mutation`) and is written only by legal-knowledge (`Audit.appendAuditEvent`). `matter_activity` is never written. There is **no matter audit/activity vocabulary** yet — this document defines it.

These facts drive the two most important decisions: **(a) atomicity requires a `SECURITY DEFINER` bootstrap RPC (a function migration)**, and **(b) authorization/actor resolution must be built, because it does not exist** — the single biggest founder decision.

---

## Section 1 — Executive Architecture

### What it is

The **Matter Bootstrap Engine** is the single, source-independent, authorization-gated, atomic path that turns an **approved source package** into an **operational Matter** with its canonical child records, audit, and a hydrated Matter Room. It is *not* a "confirmation service": a confirmation service is intake-coupled and one-directional (draft → matter). The Bootstrap Engine is the **inverse-funnel**: many future sources (manual, website, email, WhatsApp, call transcript, API, legacy import, referral) normalize into **one Bootstrap Input Contract** and pass through **one** creation path. Intelligent Intake is merely the first source.

### What it owns

Authorization of the create action; draft/source **locking**; stale-state and review-hash validation; **idempotency**; Contact resolution execution; the **atomic** creation of Matter + participants + facts + deadlines + evidence requirements + members + initial activity + immutable audit; the draft→confirmed transition and `confirmed_matter_id` back-link; and the assembly of a `MatterBootstrapResult` (including redirect target). It orchestrates — but does not implement — post-commit derivation.

### What it explicitly does **not** own

Extraction, source spans, epistemic *suggestion*, clarification, provider metadata (owned by the **Intake Pipeline**). Derived interpretation — Score, Narrative, Posture, Timeline, blockers, actions (owned by **Matter Intelligence**, and only *derived*, never stored). Lifecycle/workflow state (owned by the **Workflow Engine**). Promotion of an allegation to a confirmed fact (owned **only** by the evidence-approval path). It never invents facts, deadlines, conclusions, or citations, and never lets a provider write to Matter tables.

### Relationships

- **Intake** produces a reviewed `MatterIntakeDraft` + a per-item `IntakeApprovals` selection. The engine consumes them via the existing pure planner `buildConfirmationPlan`, generalized into a `BootstrapPlan`.
- **Matter repositories**: the engine calls the atomic write path (new RPC) and, for reads, the *extended* `getHydrated`.
- **Matter Intelligence**: the engine triggers nothing to persist; the Room recomputes `buildMatterProfile` at load. A bootstrapped matter with allegations honestly reports `insufficient_facts` / open blockers.
- **Workflow Engine**: the engine may *request* initialization but must not duplicate its logic. Recommendation is **no** workflow bootstrap in Part 2 (Section 12).
- **Activity/Audit/Timeline**: the engine writes `matter_activity` (human feed) and `audit_events` (immutable) inside the atomic core; Timeline is derived, never written.
- **Future channels** reuse the engine unchanged because they normalize to the same `MatterBootstrapRequest` referencing a generic `SourceArtifact` (Section 24), not a draft-table FK.

### Canonical lifecycle

```
Source Input ──▶ Source Normalization ──▶ Reviewable Draft ──▶ Human Confirmation
     (src-specific)      (src-specific)        (persisted)         (UI action)
   ──▶ Bootstrap Request ──▶ Bootstrap Validation ──▶ Bootstrap Plan
        (src-independent)      (src-independent, pre-tx)   (pure, validated)
   ──▶ Atomic Persistence ──▶ Post-Commit Hydration ──▶ Intelligence Recompute
        (transactional RPC)     (read, sync)               (derived at load)
   ──▶ Workflow Bootstrap ──▶ Matter Ready ──▶ Matter Room
        (optional/deferred)     (state)          (render)
```

| Arrow | sync | transactional | derived | retriable | auditable | optional | source-specific |
|---|---|---|---|---|---|---|---|
| Source Input → Normalization | ✓ | – | – | ✓ | ✓ | – | **yes** |
| Normalization → Reviewable Draft | ✓ | – | – | ✓ | ✓ | – | **yes** |
| Draft → Human Confirmation | ✓ | – | – | ✓ | ✓ | – | no |
| Confirmation → Bootstrap Request | ✓ | – | – | ✓ | ✓ | – | no |
| Request → Validation | ✓ | – | – | ✓ | ✓ | – | no |
| Validation → Plan | ✓ | – | pure | ✓ | ✓ | – | no |
| Plan → Atomic Persistence | ✓ | **✓** | – | ✓ (idempotent) | ✓ | – | no |
| Persistence → Hydration | ✓ | – | read | ✓ | – | – | no |
| Hydration → Intelligence | ✓ | – | **derived** | ✓ | – | – | no |
| → Workflow Bootstrap | – | – | – | ✓ | ✓ | **optional** | no |
| → Matter Ready → Room | ✓ | – | – | ✓ | – | – | no |

---

## Section 2 — System Boundaries

### Intake Pipeline
**Owns:** extraction, source spans, epistemic *suggestion*, clarification rounds, per-item review state, provider metadata, draft lifecycle (`active…ready_for_review`).
**Does not own:** Matter creation, Contact merge, Fact *confirmation*, Workflow lifecycle, Matter Intelligence, final legal conclusions.

### Matter Bootstrap Engine — ownership decisions
| Concern | Owns? | Notes |
|---|---|---|
| Authorization of the create action | **✓** | fail-closed; **[GAP: needs actor/session]** |
| Draft/source locking | **✓** | `status='confirming'` + version bump |
| Stale-state / review-hash validation | **✓** | version_token + review_hash |
| Idempotency | **✓** | `confirmation_idempotency_key` unique + RPC pre-check |
| Contact resolution execution | **✓** | link/create/ignore; no auto-merge |
| Matter creation | **✓** | inside atomic core |
| Participant / Fact / Deadline / Evidence-Req creation | **✓** | inside atomic core |
| Ownership / team (`matter_members`) assignment | **✓** | inside atomic core; validated |
| Initial `matter_activity` | **✓** | inside atomic core |
| Immutable `audit_events` | **✓** | inside atomic core |
| Draft confirmation linkage (`confirmed_matter_id`, status) | **✓** | inside atomic core |
| Transaction orchestration | **✓** | via RPC |
| Post-commit triggers | **✓ (orchestrates)** | does not implement derivation |
| Hydration result | **✓ (reads)** | via extended `getHydrated` |
| Failure recovery | **✓** | idempotent retry |

### Matter Intelligence
Owns **only derived interpretation after persistence** (`buildMatterProfile`). No writes. Already pure. The engine never asks it to persist.

### Workflow Engine
Owns lifecycle + workflow state. The Bootstrap Engine may *request* initialization but must not write workflow state or duplicate transitions. **Today workflow has no table and is detection-based** — see Section 12.

### Timeline
**Decision: Timeline is DERIVED, never written by the engine.** Confirmed by code: `engines/timeline.ts` derives from `matter.deadlines`; there is no timeline table and no `Matter.timeline` field. The engine writes canonical rows (deadlines, activity); the timeline projects them. No timeline rows are created.

---

## Section 3 — Domain Contracts (typed pseudo-contracts)

```ts
// Source of a bootstrap. Only intelligent_intake is implemented now.
type BootstrapSource =
  | "intelligent_intake" | "manual_intake" | "website_intake" | "email_intake"
  | "whatsapp_intake" | "call_transcript" | "api_import" | "legacy_import" | "internal_referral";

// Generic reference to the reviewed source — NOT a table-specific FK (Section 24).
interface SourceArtifact {
  source: BootstrapSource;
  sourceId: string;          // e.g. matter_intake_drafts.id for intelligent_intake
  versionToken: string;      // optimistic-concurrency token from the source
  reviewHash: string;        // hash of the exact reviewed selection
}

interface MatterBootstrapRequest {
  requestId: string;
  organizationId: string;
  actorId: string;                       // resolved from session [GAP today]
  artifact: SourceArtifact;
  confirmationIdempotencyKey: string;    // client-generated, unique per (org,key)
  correlationId: string;

  requestedMatterOwnerId: string | null; // must be an authorized org member
  requestedTeamAssignments: Array<{ profileId: string; matterRole: MatterRole; canReview?: boolean; canApprove?: boolean }>;

  contactResolutions: ContactResolution[];
  approvedParticipants: Array<{ draftItemId: string; role: ParticipantRole }>;
  approvedFacts: Array<{ draftItemId: string; statementHe?: string; status?: IntakeFactStatus }>;
  approvedDeadlines: Array<{ draftItemId: string }>;
  approvedEvidenceRequirements: Array<{ draftItemId: string }>;

  matter: { titleHe: string; procedureType: EmploymentProcedureType | null;
            forumHe?: string | null;
            confidentiality: "internal" | "client_confidential" | "privileged";
            aiPolicy: "allowed" | "allowed_with_review" | "prohibited"; };

  selectedWorkflowTemplate?: string | null; // deferred (Section 12)
  clientRequestMetadata?: { userAgentHash?: string; submittedAtISO: string };
}

interface ContactResolution {
  draftItemId: string;
  mode: "link_existing" | "create_new" | "ignore";
  existingContactId?: string;            // required for link_existing; must be same-org
  role: ParticipantRole;                 // required for link_existing / create_new
  // create_new derives identity fields from the draft contact item (validated)
}

// The validated, canonical, source-INDEPENDENT plan (generalization of CanonicalWritePlan).
interface BootstrapPlan {
  matter: MatterWrite;                    // mandatory
  contacts: ContactWrite[];              // create_new only; link_existing carries an id
  participants: ParticipantWrite[];      // mandatory shape, may be empty
  facts: FactWrite[];                    // intake statuses only
  deadlines: DeadlineWrite[];            // kind∈{deadline,estimated}; dueAt honesty preserved
  evidenceRequirements: EvidenceWrite[];
  members: MemberWrite[];                // owner + team
  activity: ActivityWrite;              // one "matter_created" row (mandatory)
  audit: AuditWrite[];                  // immutable events (mandatory)
  draftTransition: { draftId: string; toStatus: "confirmed"; setConfirmedMatter: true };
  workflowBootstrap?: WorkflowBootstrapRequest | null; // OPTIONAL (deferred)
  recompute: { kind: "derived_at_load" };              // marker; no persistence
  mandatory: string[];   // ["matter","activity","audit","draftTransition"]
  optional: string[];    // ["workflowBootstrap"]
}

interface MatterBootstrapResult {
  matterId: string; matterSlug: string; organizationId: string;
  bootstrapRequestId: string; idempotencyKey: string; draftId: string;
  createdEntityCounts: { contacts: number; participants: number; facts: number;
                         deadlines: number; evidenceRequirements: number; members: number };
  activityId: string; auditEventIds: string[];      // safe references (ids only)
  workflowBootstrapStatus: "skipped" | "requested" | "initialized" | "failed";
  intelligenceStatus: "derived_at_load";            // never blocks
  hydrationStatus: "ready" | "degraded";
  redirectTarget: string;                            // `/matters/<slug>`
  warnings: string[]; correlationId: string;
  reused: boolean;                                   // true if idempotent replay returned existing matter
}

type BootstrapFailureKind =
  | "authorization" | "draft_not_found" | "draft_stale" | "review_hash_mismatch"
  | "invalid_item_selection" | "illegal_fact_status" | "invalid_deadline"
  | "contact_resolution_error" | "duplicate_confirmation" | "transaction_failure"
  | "workflow_bootstrap_failure" | "intelligence_recompute_failure" | "hydration_failure"
  | "provider_policy_violation" | "tenant_mismatch";

interface BootstrapFailure {
  kind: BootstrapFailureKind; phase: "pre_tx" | "in_tx" | "post_commit";
  messageHe: string; correlationId: string; retriable: boolean;
}
```

**Failure phase classification.** *Pre-tx:* authorization, draft_not_found, draft_stale, review_hash_mismatch, invalid_item_selection, illegal_fact_status, invalid_deadline, contact_resolution_error (validation), provider_policy_violation, tenant_mismatch. *In-tx:* duplicate_confirmation (unique violation → resolves to idempotent replay), transaction_failure, contact_resolution_error (FK/uniqueness). *Post-commit:* workflow_bootstrap_failure, intelligence_recompute_failure, hydration_failure — **none of these may delete or hide the Matter.**

---

## Section 4 — State Machines

### Intake Draft state machine

Persisted states (from `matter_intake_drafts.status`): `active`, `needs_clarification`, `ready_for_review`, `confirming`, `confirmed`, `rejected`, `expired`.

```
active ⇄ needs_clarification ──▶ ready_for_review ──▶ confirming ──▶ confirmed
   │            │                      │                  │  ▲            (terminal)
   └────────────┴──────────────────────┴───────┐          │  └── (rollback on pre-commit failure)
                                    reject ▼    ▼ expire   ▼ commit failure
                                        rejected     expired   → back to ready_for_review
```

| Transition | Initiator | Preconditions | Authz | version_token | review_hash | Audit | Reversible | Retry |
|---|---|---|---|---|---|---|---|---|
| create → active | creator | — | org member | set | — | activity | n/a | n/a |
| active↔needs_clarification | creator/reviewer | draft owned/assigned | creator or reviewer | bump on save | recompute | activity | yes | safe |
| →ready_for_review | creator | all mandatory clarifications answered | creator | bump | set canonical hash | audit | yes | safe |
| ready_for_review→**confirming** | confirmer | not stale; review_hash matches; idempotency key fresh | **confirm capability** | **must match** | **must match** | audit | yes (to ready) | **idempotent** |
| confirming→**confirmed** | engine (RPC) | atomic core committed | engine | frozen | frozen | audit | **no (terminal)** | idempotent replay returns same matter |
| confirming→ready_for_review | engine | pre-commit failure | engine | unchanged | unchanged | audit | yes | safe |
| any(non-terminal)→rejected | creator/reviewer | — | creator or reviewer | bump | — | audit | no | n/a |
| any(non-terminal)→expired | retention job | `expires_at < now` | server/retention | — | — | audit | no | n/a |

**Locking during confirmation.** Entering `confirming` (a) sets `status='confirming'`, (b) bumps `version_token`, (c) freezes `review_hash`. This is a **soft application lock**; the *hard* guarantees are: the RPC re-reads the draft `FOR UPDATE` and verifies `status='confirming' ∧ version_token=expected ∧ review_hash=expected ∧ confirmed_matter_id IS NULL`. This prevents:
- **simultaneous edits while confirming** — edits require `status∈{active,needs_clarification,ready_for_review}`; `confirming` rejects writes (policy/precondition).
- **two confirmations → two matters** — the `confirmation_idempotency_key` unique index + the `confirmed_matter_id IS NULL` guard inside the RPC's `FOR UPDATE` read serialize them; the loser gets an idempotent replay of the winner's matter.
- **stale tab confirming old review** — `review_hash` mismatch → `review_hash_mismatch` (pre-tx).
- **reviewer changing selection after confirm begins** — selection changes bump `version_token`; the frozen token no longer matches → `draft_stale`.
- **confirmed draft mutation** — `confirmed` is terminal; no update policy path transitions out of it; app + RPC both reject.

### Matter Bootstrap state machine

`requested → validating → planned → persisting → committed → enriching → ready` with `partially_enriched`, `failed_before_commit`, `failed_after_commit`.

**Decision: do NOT persist a bootstrap-state table.** Bootstrap progress is represented by (a) the draft `status` (`confirming`→`confirmed`), (b) `audit_events` rows, and (c) the synchronous request/response. Enrichment ("enriching"/"partially_enriched") is *derived at load* (intelligence) or *detection-based* (workflow) — neither needs a durable job row for Part 2. **Rationale:** a bootstrap-state table would duplicate what `audit_events` + draft status already record, add a write to the hot path, and create its own consistency problem. If Part 2 later needs durable background jobs (email, indexing), introduce an **outbox** table then (Section 14), not a bootstrap-state table now.

---

## Section 5 — Transaction Design

**Non-negotiable:** *no partial Matter may survive a failed atomic bootstrap* (principle #13). Because supabase-js cannot transact, the atomic core must run inside **one Postgres function** (a plpgsql function body is a single implicit transaction).

### Mandatory atomic core (one RPC, all-or-nothing)
1. Re-read draft `FOR UPDATE`; verify status/version/review_hash/`confirmed_matter_id IS NULL`.
2. **Idempotency claim** — if `confirmed_matter_id` already set, **return that matter** (replay), commit nothing new.
3. Contact **create_new** rows (`link_existing` just validated same-org).
4. `matters` row (slug, procedure, forum, confidentiality, ai_policy).
5. `matter_participants` (each resolved contact + role).
6. `matter_facts` (intake statuses only; the DB trigger is the backstop).
7. `matter_deadlines` (kind∈{deadline,estimated}; `dueAt` honesty).
8. `matter_evidence` (evidence requirements).
9. `matter_members` (owner + validated team).
10. one `matter_activity` "matter_created" row.
11. `audit_events` (immutable) — `matter_bootstrapped`, `draft_confirmed`.
12. `matter_intake_drafts`: `status='confirmed'`, `confirmed_matter_id=<new>`.

If **any** step raises, the whole function rolls back → draft stays `confirming` (app then flips it back to `ready_for_review`), **no matter, no orphan**.

### Post-commit synchronous work (safe after commit, served in the same request)
- Extended `getHydrated(matter)` read; `buildMatterProfile` runs at Room render (client). If hydration read fails, return `hydrationStatus:"degraded"` but still redirect — **the matter exists**.

### Post-commit asynchronous / retriable work (must not affect matter existence)
- Workflow initialization (deferred — Section 12), search indexing, notifications, analytics, legal-research enrichment. **None in the atomic core; none block creation.**

| Concern | Placement |
|---|---|
| Matter Intelligence / Score / Narrative / Posture | **derived at load** (no job) |
| Timeline | derived at load |
| Workflow init | post-commit async / **deferred** |
| Search indexing / notifications / analytics / research enrichment | post-commit async (future outbox) |

**What the user sees if the matter commits but a derived subsystem fails:** the Matter Room opens and shows honest degraded states (e.g., "intelligence recomputing" or blockers), never a missing matter. Derived failures are non-fatal by construction because derivation is pure and re-runnable at any later load.

---

## Section 6 — Database Execution Model

**Options.** (A) application-layer transaction via repository methods; (B) one Postgres RPC orchestrating the bootstrap; (C) hybrid — app validates/builds the plan, a Postgres RPC executes the atomic write, app triggers post-commit derivation.

| Criterion | A (app tx) | B (pure RPC) | C (hybrid) |
|---|---|---|---|
| Atomicity | ❌ impossible (no client tx) | ✅ | ✅ |
| Testability | ✅ | ⚠️ SQL-only | ✅ (plan pure in TS, RPC tested in SQL) |
| Authorization | app | in-DB | app pre-checks + in-DB re-check |
| RLS | bypassed (service) | function can enforce | both |
| Service-role risk | high (broad writes) | contained to one function | contained |
| Transaction control | none | full | full |
| Type safety | ✅ TS | ❌ | ✅ (TS plan → typed RPC args) |
| Maintainability | writers scattered | logic in SQL | plan+validation in TS, write in SQL |
| Observability | app logs | limited | app logs + RPC result |
| Rollback | manual sagas (unsafe) | native | native |
| Future-source reuse | duplicated writers | one entry | **one entry, source-independent plan** |
| Coupling to Supabase | low | high | medium |

**DECISION: C — Hybrid.** Rationale: atomicity (#13) is impossible in option A with this stack (proven: no `.rpc()`, no client tx). B buries validation and typing in SQL and is hard to test. C keeps the **pure, unit-tested planner/validator in TypeScript** (reusing `buildConfirmationPlan`) and puts **only the atomic write** in one function.

### RPC design (to be introduced by a migration, on approval)
- **Name:** `app.bootstrap_matter_v1(plan jsonb, idempotency_key text)` returns `jsonb`.
- **Input:** the validated `BootstrapPlan` serialized to `jsonb` + the idempotency key. (Actor/org are taken from the plan and re-validated; see below.)
- **Authorization model:** the app resolves + authorizes the actor (Section 7) *before* calling. The function additionally **re-validates tenant consistency** (every row's `organization_id` equals the plan's org; requested owner/team are members of that org; `existingContactId` belongs to the org) and refuses on mismatch. Belt-and-suspenders.
- **SECURITY DEFINER vs INVOKER:** **SECURITY DEFINER**, `set search_path = public`, owned by a role that can write the tables. Reason: it must perform cross-table writes atomically as a trusted path (the server already writes via service role today); INVOKER would require the caller to be `authenticated` with RLS INSERT on six tables, which is a broader client surface. The function is the *only* sanctioned multi-table writer and does its own tenant checks — narrower and safer than exposing six INSERT policies to clients. **[Consistent with existing `app.*` SECURITY DEFINER helpers.]**
- **RLS interaction:** the function bypasses RLS (definer) but enforces tenant rules explicitly; it never trusts client-passed org/actor without re-checking membership.
- **Returned result:** `{ matter_id, matter_slug, created_counts{…}, activity_id, audit_event_ids[], reused: bool }`.
- **Error behavior:** raises typed `errcode`s the app maps to `BootstrapFailureKind` (`check_violation`→invalid_*, `unique_violation` on idempotency→idempotent replay, `foreign_key_violation`→contact/tenant error).
- **Idempotency:** first statement locks the draft `FOR UPDATE`; if already `confirmed` with `confirmed_matter_id`, return that matter with `reused:true`. The `confirmation_idempotency_key` unique index is the hard backstop.
- **Migration implications:** one additive migration creating `app.bootstrap_matter_v1` (function only; **no new tables**). RLS-consistent; requires founder approval to apply (per standing gate).
- **Test strategy:** SQL behavioral tests (local Postgres, as used for Slice 2/2A): commit success, idempotent replay returns same matter, stale/version mismatch aborts, tenant mismatch aborts, illegal fact status aborts, partial failure leaves zero rows. Plus TS unit tests for the planner/validator that build the `plan` jsonb.

**Honesty note:** I did **not** find any existing transaction facility in the stack; option A is therefore rejected on correctness grounds, not preference.

---

## Section 7 — Authorization Model

**[GAP — the biggest one.] There is no authentication today.** No session, no `auth.getUser`; API routes run as `DEMO_SEED.organizationId` via the service role. The authorization model below is the *target*; **implementing actor/org resolution is a prerequisite** and a founder decision (below).

Distinct identities (must not be conflated): **created_by** (drafted it), **draft_owner** (currently responsible; may equal reviewer set), **reviewer** (assigned in `reviewer_ids`), **confirmer** (who pressed confirm), **matter owner** (`requestedMatterOwnerId`), **confirmed_by/confirmed_at** (immutable audit facts).

| Stage | Who may act | Rule |
|---|---|---|
| Draft analysis | org member (creator) | creates own draft (`created_by = actor`) |
| Draft review | creator or assigned reviewer | `app.can_access_intake_draft` (already enforced) |
| **Confirmation request** | a **confirmer** with create-matter capability | *not* mere draft access — see below |
| Contact lookup | org member | same-org only (RLS) |
| Contact linking | confirmer | `existingContactId` must be same-org |
| Contact creation | confirmer | inside atomic core |
| Matter ownership assignment | confirmer | `requestedMatterOwnerId` must be active org member |
| Team assignment | confirmer | each `profileId` an active org member; role in enum |
| Matter creation | confirmer | create-matter capability |
| Post-commit Matter access | matter members / org policy | future RLS on matters (out of Part 2 scope; noted) |
| Workflow init | deferred | — |
| Audit visibility | compliance/admin | audit read policy (future) |

**Confirmed invariants:**
- Draft *access* does **not** grant matter *creation* — creation requires a create-matter **capability**, separate from `can_access_intake_draft`.
- A reviewer may review but not necessarily confirm (confirm ⇒ create-matter capability).
- A creator may draft but not necessarily be matter owner (owner is explicitly requested and independently validated).
- Requested owner/team must be authorized org members (validated pre-tx **and** in-RPC).
- Cross-tenant Contact lookup/linking is impossible (RLS + in-RPC org check).
- `confirmed_by`/`confirmed_at` are written to immutable `audit_events`.

**Capability model.** The platform has a latent capability model in `matter_members` (`can_review`/`can_approve`, `matter_role`) + `organization_memberships.role`, but **no matter exists yet at confirmation time**, so matter-level capability can't gate creation. **Decision:** create-matter capability derives from **org role** (`organization_memberships.role ∈ {owner, partner, admin, lawyer}` — *not* paralegal by default). This is the smallest defensible rule using existing data; refine later. **FOUNDER DECISION REQUIRED:** exact create-matter capability set (recommend `{owner, partner, admin, lawyer}`).

---

## Section 8 — Contact Resolution

For every approved participant the reviewer must choose `link_existing | create_new | ignore`.

- **Duplicate suggestions** are computed **at review time** (read-only), not at confirm. Signals allowed for *suggestion*: normalized `name_he`, optional `id_number_he` (Teudat Zehut/company number via the `israeli-id-validator` skill), optional contact info. **A suggestion is never a merge.**
- **No auto-merge.** No cross-tenant visibility (RLS). No silent duplicate suppression except the DB's existing partial-unique `contacts_org_idnum_active_uq` (one active contact per `(org, id_number)`), which is an approved identity rule — a `create_new` that collides surfaces as `contact_resolution_error` for the reviewer to resolve (link instead), never a silent merge.
- **Two users choose the same existing contact:** harmless — both `link_existing` to the same `contact_id`; participants are distinct rows; the `matter_participants` unique `(matter, contact, role)` prevents a true duplicate role.
- **Contact deleted/merged before confirm:** `link_existing` with a missing/archived `existingContactId` → in-RPC FK/`archived_at` check → `contact_resolution_error`; the reviewer re-resolves.
- **Stale contact selection:** detected by the same `review_hash`/`version_token`; a changed contact set invalidates the frozen hash.
- **Org ownership enforced** at RLS and re-checked in-RPC.
- **Contact creation is INSIDE the atomic core** — a matter must never commit with dangling participant references, and a created contact must never survive a rolled-back matter.

---

## Section 9 — Fact and Epistemic Safety

Allowed at intake: `client_alleged | opposing_alleged | disputed | unknown`. Forbidden: `confirmed | document_derived`.

- **Illegal status invalidates the FULL confirmation** (not a silent per-item drop). *Decision + reconciliation:* the existing `buildConfirmationPlan` currently *drops* an illegal-status item and records a reason (defense in depth). The Bootstrap **validator** upgrades this to **reject the entire request** with `illegal_fact_status` and retains the draft — because a client submitting `confirmed` indicates tampering or a UI bug, and failing closed on the whole request is safer than partial acceptance. Silent coercion is forbidden (it would launder an allegation into a fact). The DB trigger `app.forbid_established_fact_on_insert` remains the last backstop.
- **Source spans + provenance survive persistence:** each `matter_facts.provenance` jsonb stores `{ origin:"intelligent_intake", draftId, span, ruleId }` (already produced by `buildConfirmationPlan`). Raw client text inside the span is client content, tenant-isolated with the matter.
- **Original vs attorney-edited wording:** persist the attorney-approved `statement_he`; keep the original extraction in `provenance.originalStatementHe` so both are auditable. **[Small addition to the existing FactRow provenance — noted for Part 2.2.]**
- **Contradictions:** represented as `disputed` status on the conflicting facts (already computed by the pipeline); no separate contradiction table in Part 2.
- **Promotion:** only the evidence-approval path may later set `confirmed`/`document_derived` (in-memory today; a *persisted* promotion is out of Part 2 scope and blocked by the trigger until built).
- **Intelligence interpretation:** engines treat only `CONFIRMED_STATUSES = {confirmed, document_derived}` as established; allegations correctly yield `insufficient_facts`/open posture. No allegation is ever treated as truth.

Canonical Fact mapping: `FactWrite { organization_id, matter_id, fact_key, statement_he, status: IntakeFactStatus, provenance jsonb, created_by }`.

---

## Section 10 — Date and Deadline Safety

Distinguish: event date, incident date, hearing date, procedural/contractual/statutory deadline, estimated preparation date, relative reference, ambiguous date, unresolved deadline.

| Draft `kind` | Persisted as | Rule |
|---|---|---|
| `deadline` | `matter_deadlines` | with source/confidence/basis/provenance/timezone |
| `estimated_prep_date` | `matter_deadlines` (confidence=`estimated`) | visibly labeled estimated |
| `unknown_ambiguous` (relative/ambiguous) | `matter_deadlines` with `due_at=NULL` **only if the reviewer explicitly approves it as a deadline**; else stays draft-only | never invented |
| `event_date` / incident date | **NOT a deadline** → activity/event metadata or draft-only | excluded by planner today |
| `hearing_date` | **NOT a deadline** (Hearing entity deferred) → draft-only | excluded by planner today |

- `due_at = NULL` is valid (an unresolved/unknown deadline row may exist with a label and null date). The DB CHECKs enforce `known⇒date`, `unknown⇒no date`.
- Estimated status is a first-class `confidence` value.
- Legal/procedural basis attaches via `basis_he` + `provenance`.
- Timezone defaults to `Asia/Jerusalem`.
- **No statutory calculation** in Part 2 — a deadline is persisted only from an approved date or explicit user input; automatic statutory computation waits for sourced deterministic rules.
- **No date becomes a deadline merely because a date extractor found it** — only reviewer-approved items of the right kind persist.

---

## Section 11 — Evidence Requirements

- An **Evidence Requirement is not Evidence**; a **mentioned document is not an uploaded Document**; a **reportedly-held document is not verified**; a **future upload must not auto-satisfy** a requirement without approved matching/review.
- Approved evidence gaps persist to `matter_evidence` (requirement/input side only) **inside the atomic core**.
- They affect Score/Posture/Blockers through the existing engines (a mandatory unmet requirement is a blocker) — derived, not stored.
- **No workflow tasks initialized in Part 2** (Section 12); the existing evidence-review workflow will *detect* the gap at load once requirements exist.
- Priority/ownership: `mandatory` flag from the draft; owner defaults to matter owner (nullable).
- Duplicates avoided by `(matter_id, label_he)` de-dup in the planner (app-side; no unique constraint added in Part 2).

---

## Section 12 — Workflow Bootstrap

Ground truth: workflow state is **in-memory**, **no table**, chosen by `detect(matter)`, recomputed client-side; `createInstance` is detection-based, not procedure-initialized; only two evidence workflows exist.

Resolved questions: workflow creation is **not** mandatory at matter creation; it does **not** belong in the atomic core; there is no persistence to duplicate; a "default workflow by procedure" **does not exist**; forcing one would invent lifecycle state the engine can't persist.

**DECISION: Option A — No workflow initialization in Slice 2A Part 2.** Justification: (1) workflows have no durable store, so "bootstrapping" one would create nothing persistent and could not survive refresh; (2) the existing detection model already surfaces the evidence-review workflow *derived at load* once `matter_evidence` requirements exist — so a bootstrapped matter with evidence gaps will naturally show the workflow without any bootstrap write; (3) this preserves "Workflow Engine owns lifecycle" and avoids duplicating logic. The `BootstrapPlan.workflowBootstrap` field is reserved (optional/null) so Option B/C can be added additively later (when a workflow table exists). **FOUNDER DECISION REQUIRED (low stakes):** confirm Option A for Part 2.

---

## Section 13 — Matter Intelligence Recomputation

Ground truth: `buildMatterProfile` is pure and already recomputed **client-side** at Room render; nothing is cached or persisted.

- **Trigger:** Room load (server hydrates canonical rows → client `useMemo(buildMatterProfile)`).
- **Synchronous?** At render, yes; it is not part of the create transaction.
- **Transactional?** No.
- **Failure blocks creation?** **No** — derivation is pure and re-runnable; a bootstrapped matter always renders.
- **Stale intelligence:** impossible to persist stale state (nothing is cached); the profile is a pure function of the current `Matter` + `asOf`.
- **Retry:** trivial — reload recomputes.
- **UI states:** computing (brief) / ready / degraded (if hydration read failed) — the matter still exists.
- **Cached projections?** **No** — keep derived-only (principles #5–#9).
- **Invalidation:** n/a (no cache).
- Allegations → confidence/posture reflect unestablished facts; missing evidence → blockers; unresolved deadlines → risk; insufficient legal coverage stays visible. **The system never invents a recommendation to fill an empty state** — engines already emit honest `insufficient_*` states.

**Requirement [GAP]:** extend `getHydrated`/`hydrateMatter` to read `matter_facts`, `matter_deadlines`, `matter_participants`, and derive `client` from the `client`-role participant. Without this, a bootstrapped matter renders empty. This is a **required Part 2.4 work item**, not optional.

---

## Section 14 — Activity, Audit, and Events

Four distinct records:
- **User-facing Activity** → `matter_activity` (human-readable feed).
- **Immutable Audit** → `audit_events` (compliance, append-only via `app.forbid_mutation`).
- **Internal domain events** → none persisted in Part 2 (see outbox note).
- **Derived Timeline** → projection, no rows.

**Vocabulary (defined here; none exists today).** `audit_events.event_type` (matter domain): `matter_bootstrapped`, `draft_confirmed`, `bootstrap_failed`, `bootstrap_replayed`, `draft_rejected`, `draft_expired`, `draft_deleted`. `matter_activity.kind`: `matter_created`, `participant_added`, `fact_recorded`, `deadline_recorded`, `evidence_requirement_added`, `team_assigned`. (Workflow/intelligence recompute activity remains derived from the in-memory workflow feed; not persisted in Part 2.)

Which records per event:

| Event | matter_activity | audit_events |
|---|---|---|
| draft created/analyzed/clarified/review changed | — (draft-scoped; optional draft activity later) | optional |
| confirmation started | — | `draft_confirming` (optional) |
| **matter created** | `matter_created` (+ per-child rows optional) | `matter_bootstrapped`, `draft_confirmed` |
| participant/fact/deadline/evidence created | optional per-child activity | folded into `matter_bootstrapped` payload counts |
| workflow initialized | — (deferred) | — |
| intelligence recomputed | — (derived) | — |
| bootstrap failed / retry succeeded | — | `bootstrap_failed` / `bootstrap_replayed` |
| draft rejected/expired/deleted | — | `draft_rejected`/`draft_expired`/`draft_deleted` |

**Redaction/minimization (mandatory):** never copy `confidential_input`, client names, fact text, or source-span client text into `audit_events.payload` or `matter_activity`. Payloads carry **counts, ids, kinds, statuses, correlationId** only. `matter_activity.description_he` uses templated, non-confidential Hebrew (e.g., "התיק נוצר מאינטייק חכם") — not the client's story.

**Outbox pattern:** not needed for Part 2 (no async side-effects in scope). **Upgrade path:** when notifications/indexing/email arrive, add an `outbox_events` table written *inside* the bootstrap RPC (same transaction) and drained by a worker — additive, no redesign.

---

## Section 15 — Idempotency and Concurrency

Mechanisms: `confirmation_idempotency_key` (unique per org), `version_token`, `review_hash`, the unique index, `FOR UPDATE` row lock on the draft, immutable `confirmed_matter_id`, `correlationId`.

Protections:
- **Double-click / browser retry / network timeout after commit** — same idempotency key → RPC finds `confirmed_matter_id` set → returns the same matter (`reused:true`).
- **Two reviewers simultaneously** — `FOR UPDATE` serializes; first sets `confirmed_matter_id`; second reads it and replays.
- **Stale tab** — `review_hash`/`version_token` mismatch → `draft_stale`/`review_hash_mismatch` (pre-tx).
- **Draft/contact edited during confirm** — edits blocked in `confirming`; if they slipped in before lock, version mismatch aborts.
- **Permission revoked during confirm** — re-checked pre-tx and in-RPC (org membership) → `authorization`.
- **Worker/workflow/intelligence retry** — post-commit work is idempotent or derived (no dup).
- **Duplicate Activity/Audit** — created once inside the atomic core; a replay does not re-insert (guarded by `confirmed_matter_id` short-circuit).

### Sequence descriptions

**1. Successful confirmation**
```
UI → POST /confirm (idemKey, draftId, versionToken, reviewHash, approvals)
App: authorize actor+org; load draft; set status=confirming, bump version, freeze hash
App: buildConfirmationPlan → validate → serialize plan
App → rpc app.bootstrap_matter_v1(plan, idemKey)
RPC: lock draft FOR UPDATE; checks pass; write contacts…members, activity, audit;
     draft.status=confirmed, confirmed_matter_id=M; RETURN {M, slug, counts, reused:false}
App: result → redirect /matters/<slug>; Room hydrates + recomputes profile
```

**2. Duplicate confirmation after successful commit**
```
UI (retry) → POST /confirm (same idemKey)
App → rpc(plan, idemKey)
RPC: lock draft; confirmed_matter_id already = M → RETURN {M, slug, reused:true}  (no new rows)
App: same redirect; user lands on the same Matter
```

**3. Simultaneous confirmations (A and B)**
```
A,B → rpc(plan, idemKey) concurrently
RPC(A): FOR UPDATE acquires; writes; sets confirmed_matter_id=M; commits; releases lock
RPC(B): FOR UPDATE waits; reads confirmed_matter_id=M → RETURN reused:true
        (or, if same idemKey inserted concurrently, unique_violation → replay path)
Result: exactly ONE matter.
```

**4. Failure before commit (e.g., invalid participant)**
```
App validate → invalid_item_selection (pre-tx) → 4xx; draft flipped back to ready_for_review; no RPC call
(or) RPC raises check_violation → whole function rolls back → zero rows → app flips draft to ready_for_review
```

**5. Network timeout after commit**
```
RPC committed M; response lost. UI retries with same idemKey → replay returns M (reused:true).
No second matter. No orphan.
```

**6. Post-commit intelligence failure**
```
M committed; redirect issued. Room hydrate read throws → hydrationStatus=degraded;
Room still opens; profile recomputes on next load. Matter never disappears.
```

---

## Section 16 — Failure and Recovery Matrix

| Stage | Failure | Committed? | User result | Draft state | Matter state | Retry? | Idempotency | Audit | Operator? | Cleanup? |
|---|---|---|---|---|---|---|---|---|---|---|
| pre-tx | unauthorized actor | no | 403 | unchanged | none | after fix | n/a | `bootstrap_failed` | no | no |
| pre-tx | draft missing | no | 404 | n/a | none | no | n/a | optional | no | no |
| pre-tx | draft stale | no | 409 | ready_for_review | none | reload+retry | n/a | `bootstrap_failed` | no | no |
| pre-tx | review_hash mismatch | no | 409 | ready_for_review | none | re-review | n/a | `bootstrap_failed` | no | no |
| pre-tx | invalid participant | no | 422 | ready_for_review | none | fix+retry | n/a | optional | no | no |
| pre-tx | illegal fact status | no | 422 (full reject) | ready_for_review | none | fix+retry | n/a | `bootstrap_failed` | no | no |
| pre-tx | invalid deadline | no | 422 | ready_for_review | none | fix+retry | n/a | optional | no | no |
| in-tx | contact FK/conflict | rolled back | 409/422 | confirming→ready | none | re-resolve | n/a | `bootstrap_failed` | no | no (auto rollback) |
| in-tx | constraint violation | rolled back | 500 | confirming→ready | none | retry | n/a | `bootstrap_failed` | maybe | no |
| in-tx | DB timeout before commit | rolled back | 504 | confirming→ready | none | retry (same key) | replay-safe | optional | no | no |
| commit | DB timeout after commit | **yes** | 504 then replay | confirmed | exists | retry→replay | returns M | `matter_bootstrapped` | no | no |
| in-tx | duplicate idempotency key | one wins | success (reused) | confirmed | one M | replay | returns M | `bootstrap_replayed` | no | no |
| in-tx | audit write failure | rolled back | 500 | confirming→ready | none | retry | n/a | none (rolled back) | maybe | no |
| post | workflow init failure | yes | Room opens | confirmed | exists | async retry | n/a | optional | no | no |
| post | intelligence recompute failure | yes | degraded Room | confirmed | exists | reload | n/a | none | no | no |
| post | hydration failure | yes | degraded Room | confirmed | exists | reload | n/a | none | no | no |
| post | redirect failure | yes | manual nav | confirmed | exists | open matter | n/a | none | no | no |
| — | expired draft | no | 410 | expired | none | new intake | n/a | `draft_expired` | no | retention delete |
| pre-tx | AI policy changed | no | 409 | ready_for_review | none | re-confirm | n/a | optional | no | no |
| pre-tx | confidentiality changed | no | 409 | ready_for_review | none | re-confirm | n/a | optional | no | no |
| pre-tx | org membership revoked | no | 403 | unchanged | none | no | n/a | `bootstrap_failed` | maybe | no |

**Invariant:** every row with "Matter state = none" leaves **zero** child rows (atomic rollback); every "exists" row is safe to retry into an idempotent replay.

---

## Section 17 — Security Review

- **RLS boundaries:** `matter_intake_drafts` already creator/reviewer-scoped. The bootstrap RPC bypasses RLS (definer) but re-checks tenant on every row. Matter-table read RLS for the Room is **out of Part 2 scope** (noted limitation; today reads go through the service role).
- **Service-role usage:** confined to the server + the one RPC; never shipped to the browser.
- **RPC security:** SECURITY DEFINER, pinned `search_path=public`, tenant re-validation, typed errcodes.
- **SQL injection:** the RPC takes a single typed `jsonb` plan + text key; all values parameterized; no dynamic SQL.
- **JSON payload validation:** the app validates the plan against typed contracts before serialization; the RPC validates shape/enums again (fail closed on unknown keys).
- **Mass assignment:** the RPC writes only whitelisted columns from the plan; ids (`matter_id`, etc.) are server-generated, never client-supplied.
- **Cross-tenant IDs in payload:** `existingContactId`, `requestedMatterOwnerId`, team `profileId`s are all re-checked against the plan's org → `tenant_mismatch`.
- **Raw input exposure:** never logged; never copied to audit/activity; `confidential_input` stays RLS-isolated.
- **Audit leakage:** payloads carry ids/counts/kinds only.
- **Browser trust:** the client is untrusted; all authorization + validation happen server-side + in-RPC.
- **Draft tampering / privilege escalation:** requested owner/team validated; create-matter capability required; version/review hash prevent replacing reviewed content.
- **Contact enumeration:** lookups are org-scoped (RLS); no cross-tenant existence oracle.
- **Replay attacks:** idempotency key + version token; a replayed request returns the same matter, never a second.
- **Idempotency-key predictability:** client generates a UUIDv4-strength key; the server may additionally derive a server-side key from `(draftId, reviewHash)` to defend against a malicious client reusing a key across different content — **recommended**: server computes `idempotencyKey = hash(org, draftId, reviewHash)` and ignores a client key, so the same reviewed content is idempotent and different content cannot collide.
- **DoS via oversized draft:** enforce size limits (Section 19); reject oversized plans pre-tx.
- **Sensitive error messages:** Hebrew user messages are generic; correlationId links to server logs; no internal detail leaks.
- **Correlation ID safety:** opaque uuid; no PII.
- **Retention/deletion:** governed by the draft table's lifecycle (`expired` + constrained DELETE).
- **Prompt-injection residue:** pasted text persists as *data* in `confidential_input`/provenance; it can never alter policy, authorization, or tool behavior (there is no model in the loop; the injection guard already flags it).

---

## Section 18 — Observability

**Allowed telemetry:** bootstrapRequestId, org-safe opaque id (hash), actor-safe opaque id (hash), source type, stage, duration, entity counts, success/failure category, correlationId, retry count.
**Never logged:** raw story, client names, fact text, evidence details, `confidential_input`, client-bearing spans, document contents, provider reasoning.

**Metrics:** bootstrap success rate; pre-commit failure rate; post-commit enrichment failure rate; duplicate-confirmation (replay) rate; stale-draft rate; average bootstrap latency; workflow-bootstrap success (n/a in Part 2); intelligence-recompute success (derived; render metric); retry success; orphan-detection count (must stay 0); cross-tenant denial count.

Reuse the existing observability seam pattern (`legal-knowledge/observability/run-log.ts` writes `.poc-runs/*.jsonl` with safe fields) rather than inventing a new logger.

---

## Section 19 — Performance and Scale

- **Transaction size:** one RPC, bounded child writes; all writes are single-row inserts under one lock — small and fast.
- **JSON payload:** the plan is bounded by the limits below.
- **Contact lookup cost:** indexed by `(organization_id, id_number_he)` partial + `(organization_id, archived_at)`.
- **Child writes:** ≤ low hundreds; indexes exist (`matter_*_matter_idx`).
- **Row locking:** only the single draft row `FOR UPDATE`.
- **Concurrent confirmations:** serialized per draft; different drafts independent.
- **Recompute cost:** pure, client-side, in-memory — negligible.
- **Latency budget:** target < 800 ms p95 for the atomic RPC at these sizes.

**Recommended Part-2 limits (fail closed when exceeded, `invalid_item_selection`):** max participants **50**, max facts **200**, max deadlines **50**, max evidence requirements **50**, max input size **20,000 chars** (already enforced on analyze), max review payload **256 KB**, RPC timeout **10 s**, request timeout **15 s**. No background job needed at this scale.

---

## Section 20 — Implementation Slicing (proposed; do not implement now)

| Slice | Objective | Files/modules | Migration | Tests | Stop gate | Evidence | Commit boundary |
|---|---|---|---|---|---|---|---|
| **2.0** | DB reconciliation | (existing) applied intake-drafts migration + regenerated types + fixture | none (records applied) | typecheck | founder | diff + checksum | one commit |
| **2.1** | Draft repository + persistence | `intake/draft-repository.ts` (save/restore/version/reviewHash/clarifications) | none | RLS + unit | founder | tests + live RLS | one commit |
| **2.2** | Bootstrap contracts + planner/validator | `bootstrap/contracts.ts`, `planner.ts` (reuse `buildConfirmationPlan`), `validator.ts`, `contact-resolution.ts`, `fact-mapping.ts`, `deadline-mapping.ts`, `evidence-mapping.ts`, `errors.ts` | none | unit | founder | tests | one commit |
| **2.3** | Atomic executor | `bootstrap/executor.ts` + **RPC migration** `app.bootstrap_matter_v1` + `authorization.ts` + confirm route | **yes (function)** — prepare, review, apply on approval | SQL behavioral (commit/replay/rollback/tenant/stale) + integration | founder (pre-apply review) | SQL tests + advisors | migration + code commits |
| **2.4** | Hydration + intelligence surfacing | extend `getHydrated`/`hydrateMatter` to read facts/deadlines/participants/client | none | unit + integration | founder | Room renders bootstrapped matter | one commit |
| **2.5** | Workspace integration | draft save/resume/review/confirm/redirect/recovery UI in `matters/new/intelligent` | none | e2e (headless) | founder | screenshots | one commit |
| **2.6** | Live Preview proof | scenarios (pregnancy / stale / duplicate / post-commit failure) | none | e2e + DB verification | founder | video + DB counts + no-orphan query | (no commit; proof) |

Every slice: no push/deploy without approval; migration slices stop at pre-apply review.

---

## Section 21 — Module and File Architecture

```
src/modules/matter/bootstrap/
  contracts.ts          # MatterBootstrapRequest/Plan/Result/Failure, SourceArtifact
  planner.ts            # draft+approvals → BootstrapPlan (wraps intake/confirm-plan.ts)
  validator.ts          # pre-tx validation; illegal-status full reject; limits
  authorization.ts      # actor/org resolution + create-matter capability [depends on auth GAP]
  contact-resolution.ts # link/create/ignore validation; dedup suggestion (read-only)
  fact-mapping.ts       # FactWrite mapping (+ original vs edited provenance)
  deadline-mapping.ts   # kind→persist rules; dueAt honesty
  evidence-mapping.ts   # evidence-requirement mapping + de-dup
  executor.ts           # serialize plan → rpc app.bootstrap_matter_v1 → MatterBootstrapResult
  errors.ts             # BootstrapFailureKind mapping from PG errcodes
  observability.ts      # safe telemetry (reuse run-log pattern)
  __tests__/
```

**Reuse (do not duplicate):** `intake/confirm-plan.ts` (planner core), `intake/contracts.ts` (IntakeApprovals/statuses), `persistence/supabase-server.ts` (`serviceClient`/config guards), `profile.ts`/`intelligence.ts` (derived recompute — call, don't reimplement), `israeli-id-validator` skill (contact identity).
**Canonical services Part 2 calls:** `serviceClient()`, the new `app.bootstrap_matter_v1` RPC, extended `MatterRepository.getHydrated`.
**Smallest missing repository methods to add:** `DraftRepository.{save, load, transitionStatus, listByActor}`; `MatterRepository.getHydratedFull` (reads facts/deadlines/participants); an `executor` wrapper for the RPC. (No per-child TS writers are needed — the RPC does the writes.)

---

## Section 22 — Test Strategy

**Unit:** planner; validator (limits, illegal status full-reject); fact/deadline/evidence mapping; contact-resolution validation; idempotency key derivation; status restrictions; deadline honesty; failure classification.
**Database (local Postgres + on Dev after approval):** RLS (creator/reviewer/other-member/anon); RPC commit/replay/rollback; tenant isolation; uniqueness (idempotency); row locking (`FOR UPDATE`); stale version/hash; org consistency; illegal-status abort; zero-orphan-on-failure.
**Integration:** draft→plan; plan→matter (RPC); matter→hydration→intelligence; retry; duplicate confirmation; post-commit failure recovery.
**End-to-end (headless, as in Part 1):** refresh mid-draft; resume in new session; reject/edit/approve; contact linking; matter creation; new Room; refresh; second session; stale tab; duplicate submit; unauthorized reviewer; no demo leakage.
**Security:** cross-tenant id injection; role escalation via requested owner/team; malicious JSON; oversized payload; prompt-injection content persisted-but-inert; replay; raw-input leakage; service-role exposure.

**Hard acceptance targets:** exactly one Matter per confirmed draft; 0 orphan rows on any failure; 0 confirmed/document_derived facts from intake; 0 invented deadlines; 100% idempotent replay (no second matter); 100% cross-tenant denial; 0 raw-input in logs/audit/activity; stale/duplicate confirmations blocked 100%.

---

## Section 23 — Live Proof Plan (pregnancy-dismissal)

Steps 1–30 as specified: start intelligent intake → paste story → **persist draft** → refresh → resume → answer clarifications → edit one allegation → reject one item → resolve contacts → keep the ambiguous deadline unresolved → confirm → **exactly one Matter** → show participants/allegations/missing evidence/honest coverage/derived Posture/Score/Top Blocker/Top Action → refresh → new session → retry same confirmation → same Matter returned → attempt stale confirmation → blocked → verify no fact confirmed, no deadline invented, no demo leakage, no orphan/partial records.

**Evidence to deliver:** desktop/tablet/mobile screenshots; a walkthrough video; DB verification queries (matter row + exact child counts); an audit verification (`matter_bootstrapped`/`draft_confirmed` present); test-matrix output; **a no-orphan query** proving zero child rows without a parent matter and zero matters without their expected activity/audit; the exact `MatterBootstrapResult` counts.

---

## Section 24 — Intake Session Future Path

`matter_intake_drafts` is sufficient for Part 2 because a single reviewed draft maps to a single bootstrap. It becomes insufficient when one intake **session** spans multiple messages/files/analysis attempts (email threads, WhatsApp, call + attachments) collapsing into one reviewable draft.

**Future-compatible interface now (no schema added):** the Bootstrap Engine references a generic **`SourceArtifact { source, sourceId, versionToken, reviewHash }`**, *not* a `matter_intake_drafts` FK. Today `sourceId` = a draft id; tomorrow it can be an `intake_sessions` id. A future additive `intake_sessions` table (session → messages/files → analysis attempts → one canonical draft → one bootstrap outcome) attaches website/email/WhatsApp/call/API sources without touching the engine. **This decouples the engine from one draft table now.**

---

## Section 25 — Architecture Decisions (ADRs)

Format: Decision · Status · Context · Chosen · Rejected · Consequences · Security · Migration · Upgrade.

1. **Bootstrap Engine vs Confirmation Service** — *Accepted.* Context: many future sources. Chosen: source-independent engine. Rejected: intake-coupled service (would be rebuilt per source). Consequences: one create path. Security: single audited chokepoint. Migration: none for the decision. Upgrade: add sources via `SourceArtifact`.
2. **Hybrid RPC (C)** — *Accepted.* Context: client can't transact. Chosen: TS plan + `SECURITY DEFINER` RPC atomic write + derived recompute. Rejected: app-tx (impossible), pure-RPC (untestable/untyped). Consequences: atomicity + type safety. Security: contained definer with tenant re-checks. Migration: **one function migration**. Upgrade: `_v2` function additively.
3. **Atomic-core boundary** — *Accepted.* Chosen: contacts+matter+participants+facts+deadlines+evidence+members+activity+audit+draft-confirm inside; workflow+intelligence outside. Rejected: everything-in-tx (couples derived work to creation). Consequences: matter never blocked by derivation. Security: minimal tx surface. Migration: none beyond RPC. Upgrade: outbox for async.
4. **Post-commit intelligence = derived at load** — *Accepted.* Chosen: no persistence/cache. Rejected: cached projections (staleness, invalidation). Consequences: always-honest, retry-free. Migration: none.
5. **Workflow bootstrap = A (none in Part 2)** — *Accepted (confirm).* Rejected: default/selected workflow (no durable store). Consequences: evidence workflow still surfaces via detection. Migration: none. Upgrade: workflow table + Option B/C later.
6. **Contact resolution = explicit link/create/ignore, no auto-merge** — *Accepted.* Chosen: reviewer-driven; dedup suggestions read-only; creation in atomic core. Security: no cross-tenant, no silent merge. Migration: none.
7. **Intake Fact status = intake-only; illegal ⇒ full reject** — *Accepted.* Rejected: silent per-item drop (laundering risk). Consequences: fail closed. Security: strong. Migration: none (trigger already exists).
8. **Deadline persistence = approved deadline/estimated only; dueAt honesty** — *Accepted.* Rejected: persist all dates. Migration: none.
9. **Activity/Audit written in-tx; Timeline derived** — *Accepted.* Chosen: define matter audit vocabulary; redact confidential input. Security: no leakage. Migration: none.
10. **Idempotency = server-derived key + version_token + review_hash + unique index + FOR UPDATE** — *Accepted.* Rejected: client-only key (predictable/abusable). Security: replay-safe. Migration: none (column exists).
11. **Draft locking = `confirming` status + version bump + in-RPC FOR UPDATE checks** — *Accepted.* Rejected: advisory-lock-only. Consequences: no double-create, no stale confirm. Migration: none.
12. **Future Intake Session = `SourceArtifact` indirection now, table later** — *Accepted.* Consequences: engine decoupled from draft table. Migration: none now; additive `intake_sessions` later.

---

## Section 26 — Founder Decisions Required

1. **Authentication / actor & org resolution (BLOCKING).** *Question:* For Part 2, do we (a) build minimal real session auth (Supabase auth: resolve `actorId` + `organizationId` + capability from the signed-in user) as a prerequisite slice, or (b) proceed Development-only with a resolved **dev-actor** (a fixed real profile + org, not the demo seed) and defer real auth? *Recommended:* **(a) minimal real session resolution** — the whole authorization model, capability checks, and audit `confirmed_by` depend on a real actor; a dev-actor makes the Live Proof's authorization theater. If speed is critical, (b) is acceptable **for Development only** with a documented limitation. *If approved (a):* real authz end-to-end; adds a small auth slice (2.1.5). *If (b):* faster, but authorization/ownership/audit are simulated and must be redone before production. *Blocks implementation:* the executor/authorization slice (2.3) cannot be truly built without one of these.
2. **Bootstrap RPC migration approval.** *Question:* Approve introducing `app.bootstrap_matter_v1` (SECURITY DEFINER function; additive; no tables) as the atomic write path? *Recommended:* **yes** — it is the only way to satisfy "no partial Matter." *Reject ⇒* Part 2 cannot guarantee atomicity (violates principle #13). *Blocks:* slice 2.3.
3. **Create-matter capability set.** *Question:* Which org roles may confirm/create a Matter? *Recommended:* `{owner, partner, admin, lawyer}` (exclude paralegal/intern by default). *Deferrable:* yes, with the recommended default. *Non-blocking* (has a safe default).
4. **Workflow bootstrap policy.** *Question:* Confirm **Option A (no workflow init in Part 2)?* *Recommended:* yes. *Deferrable:* yes. *Non-blocking.*
5. **Idempotency key source.** *Question:* Server-derive the key from `(org, draftId, reviewHash)` (recommended) vs trust a client key? *Recommended:* server-derive. *Non-blocking* (default to server-derive).

Everything else is resolved above and does not require a founder decision.

---

## Final Verdict

**B — Architecture is viable but requires founder decisions before implementation.**

The design is sound, codebase-grounded, and has **no blocking architectural flaw**. It cannot begin implementation only because of genuine prerequisites the *founder* must settle — chiefly **#1 (authentication/actor model)** and **#2 (approval of the bootstrap RPC migration)**. Both are decisions, not flaws.

1. **Recommended implementation order:** 2.0 reconcile → 2.1 draft repository → **[auth decision]** → 2.2 contracts/planner → 2.3 executor + RPC (pre-apply review gate) → 2.4 hydration/intelligence surfacing → 2.5 workspace integration → 2.6 live proof.
2. **Recommended commit boundaries:** one isolated commit per slice; migration slices (2.3) split into "prepare + review" then "apply" (as with Slice 2 / 2A).
3. **Migration requirements:** exactly one new migration in Part 2 — the `app.bootstrap_matter_v1` function (additive, RLS-consistent, SECURITY DEFINER, pinned search_path). No new tables. (Plus the pending DB-state reconciliation commit for the already-applied `matter_intake_drafts`.)
4. **Security-critical decisions:** real actor/org resolution (#1); SECURITY DEFINER RPC with tenant re-checks; server-derived idempotency key; confidential-input redaction from audit/activity; create-matter capability gating.
5. **Highest-risk failure modes:** (a) double/duplicate confirmation → mitigated by idempotency + `FOR UPDATE` + unique index; (b) partial write → mitigated by the single-function transaction; (c) cross-tenant id injection → mitigated by in-RPC tenant re-checks; (d) confidential-input leakage into audit/logs → mitigated by strict redaction; (e) bootstrapped matter renders empty → mitigated by the required hydration extension (2.4).
6. **Scope explicitly deferred:** workflow persistence + procedure bootstrap; persisted fact promotion (evidence gate to DB); matter-table read RLS; `intake_sessions` abstraction; outbox/async side-effects; contact dedup/merge automation; Hearing/Court-Decision entities.
7. **Exact first implementation prompt to use only after founder approval:**
   > "Implement Capability 2 Slice 2A Part 2.1 — Draft Repository. Create `src/modules/matter/intake/draft-repository.ts` with typed `save`, `load`, `transitionStatus`, and `listByActor` methods over `matter_intake_drafts` using `serviceClient()`, honoring the creator/reviewer RLS model, `version_token` bumping, and `review_hash` computation. No bootstrap/executor yet. Add unit tests and local-Postgres RLS tests (creator reads own, reviewer reads assigned, other org member denied, anon denied). Do not build the executor, do not create migrations, do not commit or push — deliver for founder review."

---

## Appendix — Codebase inspection record

**Modules inspected:** `matter/persistence/{supabase-server,matter-repository,matter-context}.ts`; `matter/documents/{repository,evidence-decision,supabase-storage}.ts`; `matter/profile.ts`; `matter/intelligence.ts`; `matter/engines/{timeline,missing-information,legal,outcome}.ts`; `matter/workflow/{engine,registry,evidence-task,document-evidence,approval-guard}.ts`; `matter/activity/activity.ts`; `matter/view/{matter-loader,room-store}.tsx`; `matter/intake/{contracts,confirm-plan,pipeline,providers/*}.ts`; `legal-knowledge/repositories/{index,supabase}.ts`; `app/api/matters/route.ts`; `app/api/matters/intake/analyze/route.ts`; migrations `20260711173213`, `20260714194504`, `20260715120000`, `20260716120000`.

**Reusable functions found:** `serviceClient` / `documentStorageMode` / `persistenceConfigError` (persistence guards); `buildConfirmationPlan` (planner core); `buildMatterProfile` / `assessMatter` (pure derived recompute); `applyEvent` / `createInstance` (workflow, in-memory); `Audit.appendAuditEvent` (immutable audit writer, legal-knowledge-scoped); `ensureDemoSeed` (org FK seed).

**Missing methods/objects identified:** writers for `contacts`/`matter_participants`/`matter_facts`/`matter_deadlines`/`matter_members`/`matter_activity`; `app.bootstrap_matter_v1` RPC; `DraftRepository`; extended `getHydratedFull`; a matter-scoped audit/activity writer + vocabulary; real auth/actor/org resolution; a workflow persistence table (deferred).

**Transaction capability finding:** the current Supabase client **cannot** perform multi-table transactions and no `.rpc()` exists — atomicity requires the new function. Stated plainly per the review's honesty requirement; no code was modified to make the architecture easier.

**Known limitations of this review:** matter-table read RLS is unspecified (out of scope); the exact `review_hash` canonicalization and the create-matter capability set are proposed, not yet ratified; workflow/intelligence "enriching" states are represented via derivation/audit rather than a durable job model, which is sufficient for Part 2 but will need an outbox when async side-effects arrive.
```
