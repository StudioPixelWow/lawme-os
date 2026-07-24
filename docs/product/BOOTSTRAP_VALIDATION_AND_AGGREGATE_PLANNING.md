# Bootstrap Validation & Aggregate Planning — Canonical Domain Design

Capability 1 · Slice 1.0.0A · **ARCHITECTURE-ONLY** (no TypeScript, no SQL, no migration, no RPC,
no route/RLS/DB change). Follows the frozen `MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md`.

This slice freezes the two domain layers that sit **between** the Intake Draft and the atomic RPC.
Every future Bootstrap implementation MUST route through them; none may bypass them.

```
Matter Intake Draft            (persisted; source-shaped; UNTRUSTED as an aggregate input)
   ↓  validateBootstrapDraft()         [Bootstrap Validation Engine — this slice, Part 1]
BootstrapValidationResult      (verdict + issues + normalizedDraft)
   ↓  (only if valid)
ValidatedBootstrapDraft        (immutable, normalized; the ONLY legal planner input — Part 2)
   ↓  planMatterAggregate()            [Matter Aggregate Planner — this slice, Part 3]
MatterAggregatePlan            (ONE pure domain aggregate; not commands)
   ↓  serialize → app.bootstrap_matter_v1(jsonb)   [later slice]
Matter                         (atomic)
```

**Supersession note.** The parent architecture's Section 7 sketched an *operation-list* planner
(`createMatter`, `createFact`, …). This slice **replaces** that with a single **aggregate** plan
(`MatterAggregatePlan`). The aggregate is strictly superior for determinism, testing, idempotency,
serialization, and replay (Part 3). The RPC executes the aggregate's sections atomically; there is no
imperative command stream.

**First-principle separation (never overlaps):**
- **Validation** answers only: *"Can this Draft legally and technically become a Matter?"*
- **Planner** answers only: *"What authoritative Matter Aggregate should be created?"*
- **Persistence (RPC)** answers only: *"Persist this approved aggregate atomically."*

Grounded in the live vocabularies (verified in the prior run): `matter_facts.status` ∈
`client_alleged|opposing_alleged|disputed|unknown` (intake) + `confirmed|document_derived`
(evidence-gate only); `matter_deadlines.source` ∈ `statute|court_order|contract|estimated|
user_supplied`, `confidence` ∈ `known|estimated|unknown` (CHECKs: `known⇒date`, `unknown⇒no date`);
`matter_participants.role` ∈ `client|opposing_party|related_party|witness|expert|counsel|mediator|
insurer`; `matter_members.matter_role` ∈ `partner|senior_lawyer|lawyer|intern|office_manager|finance|
compliance|paralegal`; `matters.confidentiality` ∈ `internal|client_confidential|privileged`;
`contacts.kind` ∈ `person|company`.

---

# PART 1 — BOOTSTRAP VALIDATION ENGINE

## 1.1 The canonical validator

```
validateBootstrapDraft(input): BootstrapValidationResult
```

A **pure** function. `input` is the persisted draft snapshot (`structured_draft` +
status/version/org from `matter_intake_drafts`), the reviewer's `approvals` (`IntakeApprovals`), and
the immutable server context (active org id, actor profile id, expected version). It determines
**whether bootstrap may continue** and, if so, emits a **normalized** draft. It decides nothing about
persistence.

The validator MUST NEVER: write DB state, allocate identifiers (no matter id, slug, row ids),
persist, generate SQL, build RPC payloads, or invoke Workflow / Matter Intelligence / Timeline /
Search / AI / Notifications. It is a pure decision + normalization step.

## 1.2 Validation responsibilities (and nothing else)

Draft-state validation · version validation · schema validation · required-field validation ·
organization consistency · ownership consistency · participant consistency · contact references ·
matter-type consistency · deadline validation · fact validation · epistemic validation · duplicate
detection · cross-reference validation · planner preconditions.

Explicitly NOT validation's job: mapping to Matter columns, choosing defaults that belong to the
planner, deduplicating into aggregate rows, deciding contact persistence, authorization (the Policy
Engine already did that upstream — validation *asserts* the authorization inputs are internally
consistent, it does not re-authorize).

## 1.3 `BootstrapValidationResult`

Immutable value:

| Field | Meaning |
| --- | --- |
| `valid: boolean` | `true` ⇔ `blockingIssues` is empty. The single go/no-go signal. |
| `blockingIssues: BootstrapIssue[]` | Reasons bootstrap MUST NOT continue (fail closed). |
| `warnings: BootstrapWarning[]` | Notable-but-non-blocking; each declares its planner effect. |
| `infos: BootstrapInfo[]` | Advisory only; no effect. |
| `normalizedDraft?: ValidatedBootstrapDraft` | Present **only** when `valid` (Part 2). Never present when invalid. |
| `validationVersion: string` | e.g. `bootstrap-validation-v1`. |
| `validationDurationMs?: number` | Telemetry (not persisted authoritative). |
| `statistics: ValidationStatistics` | Counts: participants/facts/deadlines/evidence in/considered/accepted/dropped; issue/warning counts. |

The validator **never mutates the input draft**; it returns a new normalized value. `valid=false`
yields no `normalizedDraft` — the planner can never run on an invalid draft.

## 1.4 Blocking issue taxonomy

Each `BootstrapIssue`: `stableCode`, `severity` (`blocking`), `userMessageHe`, `developerMessage`
(no confidential text), `field?`, `path?` (e.g. `facts[3].status`), `source` (which layer/rule),
`retryable` (whether re-review/edit can fix it).

Canonical `stableCode` set (frozen names):

| Code | Cause | Retryable |
| --- | --- | --- |
| `DRAFT_NOT_READY` | status ≠ `ready_for_review` | after review |
| `DRAFT_ALREADY_CONFIRMED` | `confirmed`/`confirmed_matter_id` set | no (idempotent path instead) |
| `DRAFT_EXPIRED` | status `expired` / past `expires_at` | no |
| `DRAFT_REJECTED` | status `rejected` | no |
| `DRAFT_VERSION_CONFLICT` | `expectedDraftVersion ≠ version_token` | after re-review |
| `MISSING_MATTER_TYPE` | no approved `procedure_type` | after edit |
| `MISSING_CLIENT` | no participant with role `client` | after edit |
| `INVALID_PARTICIPANT` | participant references a missing draft item / bad role | after edit |
| `DUPLICATE_PARTICIPANT` | same (contact, role) appears twice unresolvably | after edit |
| `INVALID_DEADLINE` | violates `known⇒date`/`unknown⇒null`, bad `source`/`confidence` | after edit |
| `INVALID_FACT` | empty/oversized statement, bad `fact_key` | after edit |
| `INVALID_EPISTEMIC_STATE` | fact status not an intake status (e.g. `confirmed`) | no (forbidden) |
| `INVALID_ORGANIZATION` | draft org ≠ active org | no |
| `CROSS_TENANT_REFERENCE` | contact/owner/member id not in active org | no |
| `UNKNOWN_CONTACT` | `linkToContactId` references a nonexistent/inaccessible contact | after edit |
| `INVALID_OWNER` | assigned owner not an active org member | after edit |
| `UNSUPPORTED_EVIDENCE` | evidence item not representable in `matter_evidence` | after edit |
| `UNKNOWN_ENUM` | any enum value outside the live CHECK vocabulary | no |
| `SCHEMA_MISMATCH` | `structured_draft` shape fails the schema | no |
| `CORRUPTED_DRAFT` | unparseable / internally inconsistent draft | no |
| `UNSUPPORTED_VERSION` | `engine_version` incompatible with the validator | no |

Fail-closed rule: any single blocking issue ⇒ `valid=false` ⇒ no plan.

## 1.5 Warnings

Warnings **never** stop bootstrap; each declares its `plannerEffect` so downstream behavior is
explicit. `BootstrapWarning`: `code`, `messageHe`, `plannerEffect` (what the planner will do).

| Code | plannerEffect |
| --- | --- |
| `APPROXIMATE_DATE` | deadline planned with `confidence='estimated'` (best date) |
| `UNKNOWN_DATE` | deadline planned with `confidence='unknown'`, `dueAt=null` |
| `UNKNOWN_CONTACT_WILL_BE_CREATED` | contact classified `create_new` |
| `UNLINKED_PARTICIPANT` | participant planned against a to-be-created contact |
| `WEAK_EVIDENCE` | evidence planned `mandatory=false` |
| `MISSING_PHONE` / `MISSING_EMAIL` | contact `contact_info` omits the field (planned as-is) |
| `LOW_CONFIDENCE_FIELD` | value kept; provenance notes low extraction confidence |
| `PLANNER_DEFAULT_APPLIED` | an organization/procedure default filled an unspecified field |
| `UNKNOWN_TIMEZONE` | deadline planned with default `Asia/Jerusalem` |

## 1.6 Normalization (produces `ValidatedBootstrapDraft`, not a plan)

Normalization is presentation/domain hygiene only — **nothing database-specific, no mapping to Matter
columns**: trim strings; normalize whitespace; normalize dates to ISO (preserving approximate/unknown
markers, never inventing a date); normalize enum casing to the exact live vocabulary; drop
duplicates within a section by a canonical key; assign **canonical draft-item identifiers** (stable
references, not DB ids); resolve pure defaults that belong to the draft (e.g. default `timezone`);
sort collections deterministically (stable order); convert empty strings to `null`. The result is a
`ValidatedBootstrapDraft` — **not** a `MatterAggregatePlan`.

---

# PART 2 — `ValidatedBootstrapDraft`

The canonical **immutable** object the validator emits on success. It is the **only legal input to
the planner**. It contains: the normalized matter header decision, normalized participants/contacts
(with canonical item keys + link decisions), normalized facts (with intake epistemic state +
provenance/span), normalized deadlines (schema-consistent), normalized evidence items, the accepted
warnings, the draft identity (`draftId`, `organizationId`, `version_token`, `engine_version`), and
the validation/engine versions — but **no DB identifiers, no SQL, no persistence hints**.

**Why the planner must never read the Intake Draft directly:**
1. **Single trust boundary.** The Intake Draft is source-shaped and only partially trustworthy; the
   `ValidatedBootstrapDraft` is the one artifact proven consistent, authorized-input-checked, and
   normalized. Letting the planner read the raw draft would re-introduce every validation concern
   into the planner and let a future channel skip validation.
2. **Determinism & testability.** The planner becomes a pure function of one immutable, fully-shaped
   input — trivial to test and to reason about; no hidden coupling to draft quirks.
3. **Source independence.** Any future source (email, WhatsApp, API, legacy import) normalizes to the
   *same* `ValidatedBootstrapDraft`; the planner is written once and never learns about draft tables.
4. **Non-overlap.** It structurally enforces "validation ≠ planning": the planner cannot re-validate
   because it never sees the un-validated shape.

---

# PART 3 — MATTER AGGREGATE PLANNER

```
planMatterAggregate(validated: ValidatedBootstrapDraft, context): MatterAggregatePlan
```

Pure, deterministic, no DB, no LLM, no serviceClient. It does **not** produce an operation list. It
produces **one aggregate**.

## 3.1 `MatterAggregatePlan` — one pure domain object

Contains the intended authoritative aggregate as data — **nothing executable, no SQL, no commands,
no persistence/RPC instructions**:

| Section | Contents (domain shape) |
| --- | --- |
| `matter` | header: title, procedure_type, topic, legal_domain (`labor`), confidentiality, ai_policy, opened intent |
| `members` | canonical membership entries (owner + optional reviewer), each with matter_role + can_review/can_approve |
| `participants` | legal parties: role, display, relation to a contact (by plan-local contact key) |
| `contacts` | classified contact plans (Part 3.6) — `link_existing` / `create_new` / `deferred` |
| `facts` | intake-grade facts: fact_key, statement, epistemic status, provenance/span |
| `deadlines` | schema-consistent deadlines: label, dueAt|null, source, confidence, strict, timezone, basis |
| `evidence` | evidence requirement rows (`matter_evidence` shape): label, evidence_type, mandatory |
| `audit` | immutable audit payload (non-confidential): draft id, versions, idempotency hash, counts, correlation id |
| `metadata` | `aggregateVersion`, `plannerVersion`, `validationVersion`, `sourceDraftId`, `inputHash`, `warnings` |

Cross-section references use **plan-local keys** (e.g. a participant points at a contact by
`contactKey`), never DB ids — the RPC resolves keys → real ids at insert time.

## 3.2 Why aggregate planning beats command planning

- **Determinism** — one value fully describes the outcome; equality/diff is trivial (`plan_A == plan_B`).
  A command stream is order-sensitive and harder to compare.
- **Testing** — assert on one immutable structure; no simulation of an executor.
- **Idempotency** — the aggregate hashes to a stable `inputHash`; the RPC compares it against the
  stored idempotency key. Re-planning the same validated draft yields a byte-identical aggregate.
- **Versioning** — the aggregate carries `aggregateVersion`; the RPC accepts only compatible versions.
  A command list would need per-command versioning.
- **Serialization** — the aggregate is the RPC's JSONB payload directly; a command list needs an
  interpreter contract.
- **RPC simplicity** — the RPC iterates fixed sections in a fixed order; no command dispatcher, no
  imperative branching over unknown op types.
- **Future replay** — an audited aggregate can be re-executed/inspected deterministically for
  reconciliation.
- **Future migrations** — migrating aggregate shape v1→v2 is a data transform; migrating a command
  grammar is far harder.
- **Future imports** — bulk/legacy import produces aggregates directly (skipping intake), reusing the
  same RPC.
- **Future AI review** — a single declarative aggregate is reviewable ("does this Matter look right?")
  before commit; a command stream is not.

## 3.3 Planner responsibility (and nothing else)

Planner owns ONLY: mapping (validated fields → aggregate sections), pure defaults, aggregate
assembly, deduplication (by canonical keys), deterministic ordering, provenance propagation,
epistemic mapping. It does NOT: validate (already done), authorize, allocate DB ids, decide
persistence, compute statutory dates, call AI, or touch the database.

## 3.4 Per-section output contract

For every section the planner defines: **required fields**, **optional fields**, **defaults**,
**source** (which validated field), **provenance**, **deduplication key**, **ordering**, and the
**validation assumptions** it relies on (so the planner never re-checks what validation guaranteed).

- **Matter** — required: title, procedure_type, topic, legal_domain(`labor`), confidentiality,
  ai_policy; defaults: current_stage_id from procedure, status intent `open`; source: `approvals.matter`;
  dedup: n/a (one matter); assumes: enums validated.
- **Members** — required: owner entry (matter_role, can_review, can_approve); optional: reviewer
  entry; defaults per §26 of the parent doc; dedup: by profile key; assumes: owner is an active member
  (validated). **No permissions invented; the planner does not authorize.**
- **Participants** — required: role, contactKey; optional: display, relation, notes; dedup: by
  (contactKey, role); ordering: client first; assumes: roles ∈ live enum, ≥1 `client`.
- **Contacts** — classification (Part 3.6); dedup: by canonical identity key; assumes: link ids are
  same-tenant (validated).
- **Facts** — required: fact_key, statement, status(intake), provenance; dedup: by fact_key;
  ordering: source order; assumes: no established status present (validated + trigger backstop).
- **Deadlines** — required: label, source, confidence, timezone, strict; dueAt per confidence CHECK;
  dedup: by (label, dueAt); assumes: date/confidence consistency validated.
- **Evidence** — required: label, evidence_type, mandatory; dedup: by label; assumes: representable in
  `matter_evidence`.
- **Audit** — required: draftId, versions, idempotency hash, counts, correlationId; **no confidential
  content**.

## 3.5 Fact planning (epistemic safety)

The planner **never invents facts**. It maps validated statements → facts preserving epistemic state
(`client_alleged`/`opposing_alleged`/`disputed`/`unknown` only), source, provenance (origin, draftId,
span, rule), and chronology (as data in provenance/statement — `matter_facts` has no confidence
column, so uncertainty lives in provenance). **No intake statement becomes `confirmed`/`document_derived`.**

## 3.6 Contact strategy — classify, do not persist

The planner **classifies** each validated contact; it does not decide or perform persistence. Frozen
classification:

| Classification | Meaning | In an executable plan? |
| --- | --- | --- |
| `link_existing` | an explicit, same-tenant `contactId` the reviewer chose | **yes** — RPC links it |
| `create_new` | a reviewer-approved new contact (person/company + name) | **yes** — RPC inserts then links |
| `deferred` | mentioned in the draft but not approved for this matter | **yes** — excluded from persistence, retained in metadata |

`ambiguous` and `needs_review` are **validation-time** states, not planner outputs: an unresolved
ambiguous contact is a **blocking issue** (`UNKNOWN_CONTACT`/`INVALID_PARTICIPANT`) — the reviewer
resolves it before confirmation. An executable `MatterAggregatePlan` therefore contains only fully
resolved contacts (`link_existing`/`create_new`/`deferred`). Rationale: the RPC must execute
deterministically and atomically; it can never pause for a human decision, so ambiguity must be
resolved in review, never carried into the aggregate. **No fuzzy auto-merge — exact-match linking or
explicit create only.**

## 3.7 Participants, Members, Deadlines, Evidence, Audit

- **Participants** — the planner builds participant entries only; **persistence assigns identifiers**.
  Preserves role, display, contact relation (by contactKey), provenance.
- **Members** — canonical membership only; no permissions invented; the planner does not authorize
  (owner/reviewer authority came from the Policy decision + assignment decision upstream).
- **Deadlines** — maps only reviewer-approved deadlines; **no statutory calculation, no AI
  calculation**; honors the DB confidence/date CHECKs.
- **Evidence** — reflects the **current** schema only (`matter_evidence` rows as requirements with
  `status='required'`, `mandatory`); does **not** invent a future Evidence-Requirement table.
- **Audit** — prepares the immutable audit payload as data; **no persistence** (the RPC writes it).

---

# VERSIONING

Five independent versions travel with the flow; each is compared for compatibility and fails closed
on mismatch:

| Version | Owner | Compatibility rule |
| --- | --- | --- |
| `ValidationVersion` | validator | a draft whose `engine_version` is unsupported ⇒ `UNSUPPORTED_VERSION` |
| `PlannerVersion` | planner | stamped on the aggregate metadata; the planner refuses inputs from an incompatible validation version |
| `AggregateVersion` | `MatterAggregatePlan` | the RPC accepts only known aggregate versions; unknown ⇒ reject (never reinterpret) |
| `BootstrapVersion` | engine | stamped in audit; ties a run to a validator+planner+RPC triple |
| `RPCVersion` | `app.bootstrap_matter_v1` (name-encoded) | callers pin `_v1`; `_v2` is a new function |

Compatibility principle: a historical draft must **never** silently bootstrap under incompatible
semantics — every boundary re-checks the version it consumes and fails closed rather than guessing.

---

# TEST STRATEGY

All pure (no DB) — these two layers are the most testable in the platform.

**Validation tests:** ready/active/needs_clarification/rejected/expired/confirmed start states;
version conflict; schema mismatch / corrupted draft; missing matter type / missing client; invalid /
duplicate participant; invalid deadline (each CHECK edge); invalid fact / illegal epistemic state;
invalid organization / cross-tenant reference / unknown contact / invalid owner; unknown enum;
unsupported version; statistics correctness; **never mutates input**; `valid=false ⇒ no normalizedDraft`.

**Planner tests:** minimal valid → aggregate; complex draft; approximate/unknown dates; allegation
mapping (no confirmed fact); contact classification (link/create/deferred); duplicate handling
(participants/facts/deadlines/contacts dedup); ordering stability; provenance/span preservation;
defaults applied with `PLANNER_DEFAULT_APPLIED` warning surfaced.

**Aggregate determinism:** same input ⇒ byte-identical aggregate + stable `inputHash`; independent of
input order (post-normalization); serialization round-trips.

**Version compatibility:** incompatible validation/planner/aggregate versions fail closed.

**Robustness:** malformed drafts; very large drafts (bounded, over-limit rejected); cross-tenant
references; invalid contacts/participants; unknown enums; evidence/facts edge cases.

---

# IMPLEMENTATION PLAN (recommended, post-approval)

| Slice | Layer | Depends on | Notes |
| --- | --- | --- | --- |
| **1.0.1 Bootstrap Validation Engine** | `validateBootstrapDraft` + `BootstrapValidationResult` + `ValidatedBootstrapDraft` + issue/warning taxonomy + normalization + tests | this design | pure; no DB |
| **1.0.2 Matter Aggregate Planner** | `planMatterAggregate` + `MatterAggregatePlan` + per-section mapping + contact classification + tests | 1.0.1 (consumes `ValidatedBootstrapDraft`) | pure; supersedes the operation-list |
| **1.0.3 Bootstrap Schema Migration** | trigger sanctioned-channel + (optional) idempotency table; audit via object_type/object_id | 1.0.2 (aggregate shape drives the RPC contract) | additive; applied only on approval |
| **1.0.4 Atomic Bootstrap RPC** | `app.bootstrap_matter_v1(jsonb)` executes a `MatterAggregatePlan` | 1.0.2 + 1.0.3 | SQL harness; approval before apply |
| **1.0.5 Application Integration** | ActorContext → policy → validate → plan → RPC adapter → confirm route + extended hydration | 1.0.4 | no Workflow, no LLM |
| **1.0.6 Post-Commit Engine** | outbox (if needed) + Intelligence/Timeline refresh + reconciliation | 1.0.5 | derived/retryable only |
| **1.0.7 Workflow Bootstrap** | separate, after Workflow persistence is designed | 1.0.5 + Workflow-persistence design | deferred |

Dependency spine: **validation → planner → (aggregate shape) → migration + RPC → integration →
post-commit → workflow.** 1.0.1 and 1.0.2 are pure and unblock everything; the aggregate shape from
1.0.2 is the contract the migration/RPC (1.0.3/1.0.4) implement.

---

# FOUNDER DECISIONS REQUIRED

Minimal; each has a safe default and none block 1.0.1.

| Decision | Recommended default | Blocks 1.0.1? |
| --- | --- | --- |
| Contact classification values | `link_existing` / `create_new` / `deferred` only in the plan; `ambiguous`/`needs_review` are blocking validation issues resolved in review | No |
| Does an unlinked participant (contact `create_new`) block, or warn? | **Warn** (`UNLINKED_PARTICIPANT`) — plan proceeds, contact created + linked | No |
| Is a missing `client` participant blocking? | **Yes** (`MISSING_CLIENT`) — a labor matter needs a client | No |
| Aggregate version scheme | integer `aggregateVersion` starting at `1`, name-independent | No |
| Where do reviewer approvals live at confirm time? | Carried in the confirm **command** and validated against the persisted `structured_draft`/`version_token` (not re-read from `review_state`) | No |

---

# FINAL REPORT

1. **Validation Engine** — pure `validateBootstrapDraft`; owns draft-state/version/schema/required/
   org/ownership/participant/contact/matter-type/deadline/fact/epistemic/duplicate/cross-reference/
   planner-precondition checks; never writes, allocates ids, persists, or invokes Workflow/Intelligence/
   Timeline/Search/AI/Notifications.
2. **Validation Result** — `BootstrapValidationResult` (`valid`, `blockingIssues[]`, `warnings[]`,
   `infos[]`, `normalizedDraft?`, `validationVersion`, `validationDurationMs`, `statistics`);
   `normalizedDraft` present only when valid; input never mutated. Frozen blocking-code + warning
   taxonomies with full issue shape.
3. **ValidatedBootstrapDraft** — immutable, normalized, no DB identifiers; the ONLY legal planner
   input; four reasons the planner must never read the raw draft (single trust boundary, determinism,
   source independence, structural non-overlap).
4. **Aggregate Planner** — pure `planMatterAggregate`; owns mapping/defaults/assembly/dedup/ordering/
   provenance/epistemic mapping only; produces one aggregate, not commands.
5. **MatterAggregatePlan** — one pure domain object (matter, members, participants, contacts, facts,
   deadlines, evidence, audit, metadata) with plan-local cross-references; nothing executable.
6. **Aggregate sections** — per-section required/optional/defaults/source/provenance/dedup/ordering/
   assumptions defined; contact classification `link_existing`/`create_new`/`deferred`; facts never
   invented/never confirmed; deadlines never statutorily computed; evidence only current-schema.
7. **Versioning** — five independent versions (Validation/Planner/Aggregate/Bootstrap/RPC) with
   fail-closed compatibility; historical drafts never silently reinterpreted.
8. **Determinism** — aggregate equality/diff/hash; byte-identical re-planning; order-independent
   post-normalization; the basis of idempotency, replay, imports, and AI review.
9. **Test strategy** — exhaustive pure validation + planner + determinism + version + robustness
   tests.
10. **Implementation sequence** — 1.0.1 validation → 1.0.2 planner → 1.0.3 migration → 1.0.4 RPC →
    1.0.5 integration → 1.0.6 post-commit → 1.0.7 workflow, with the dependency spine.
11. **Founder decisions** — five, all with safe defaults; none block 1.0.1.
12. **Document created** — `docs/product/BOOTSTRAP_VALIDATION_AND_AGGREGATE_PLANNING.md` (only).
13. **Confirmations** — no implementation code written · no migration created · no RPC created · no
    routes changed · no database changed · no Development changes · no Production changes · no commits ·
    no push.

---

# SLICE 1.0.3 — PERSISTENCE BOUNDARY (idempotency, stale, channel)

Prepared migration `20260724120000_capability1_bootstrap_persistence_primitives.sql`
(prepared-not-applied) finalizes how the pure `ValidatedBootstrapDraft` / `MatterAggregatePlan`
identity maps to durable columns.

**Persisted plan identity (minimum set):** `confirmation_plan_hash` ← `metadata.planHash`;
`confirmation_bootstrap_version` ← the engine version triple; `confirmation_idempotency_key`
(client confirm key, unique per org); `confirmed_matter_id` (1:1, unique); `confirmed_at`.
NOT persisted separately: `sourceInputHash`, `validationVersion`, `plannerVersion`,
`aggregateVersion` — the single `planHash` is the authoritative "same plan" signal;
`sourceInputHash` and the version triple may ride in the audit `payload` jsonb, not as columns.

**Stale-write model:** the existing `matter_intake_drafts.version_token` (text) is the stale
primitive. The RPC transitions with `WHERE id = :draftId AND version_token = :sourceDraftVersionToken
AND status = 'ready_for_review'`; 0 rows ⇒ stale/wrong-state ⇒ abort. `updated_at` is NOT used.

**Idempotency (Model A + plan hash) — proven at the persistence layer:** same key + same plan ⇒
reconcile to the existing `confirmed_matter_id` (unique (org,key) prevents a 2nd Matter); same
key + different plan ⇒ stored `confirmation_plan_hash` differs ⇒ **detectable conflict** (this is
exactly why the plan-hash column was added); different key on a confirmed draft ⇒ row is frozen,
`confirmed_matter_id` returned; connection loss after commit ⇒ retry reconciles. No run table.

**Sanctioned channel:** `current_user = 'lawme_bootstrap'` (dedicated NOLOGIN BYPASSRLS RPC
owner). Contact cross-tenant injection stays blocked by `enforce_matter_participant_org`; the
fact epistemic guard is never bypassed. Contact classification (`link_existing`/`create_new`/
`deferred`) and epistemic-exact facts from Part 3 are unchanged.

---

## Applied-State Reconciliation — Slice 1.0.4B (Development)

*The persistence primitives, RPC, and actor-resolution fix are applied on Development
(`udispadsbxqicmawqcuk`); full record in `MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md`.
Production untouched.*

The Validation Engine and Aggregate Planner remain **pure domain code** (72 unit tests
green) and were unchanged by 1.0.4B (a SQL-only forward fix). Division of responsibility,
confirmed by the Development live proof: **plan-shape invariants** — unique plan-local
keys and payload size limits — are guaranteed **upstream** by these engines, which emit
the validated aggregate the RPC trusts; the RPC performs **persisted-state revalidation**
and rejects, atomically, foreign/invalid contacts (`BOOTSTRAP_CROSS_TENANT`), broken
plan-local references (`BOOTSTRAP_INVALID_REFERENCE`), non-intake fact states
(`BOOTSTRAP_INVALID_FACT_STATE`), unsupported procedures/enums/versions, and malformed
payloads. Facts persist only in allowed intake states; evidence is created with
`evidence_type = 'document'`; the initial stage is `intake`. The sanctioned channel
(`current_user = 'lawme_bootstrap'`) and the fact epistemic guard are unchanged.
