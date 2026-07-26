# LawME — Principal Platform Architecture Review (Capability 0.7)

Status: Architecture-only review · Date: 2026-07-21 · Grounded at `dev-preview` HEAD `5e85cc2`
Scope: full-platform, evidence-based. No code, DB, migration, commit, push, or deploy performed.
Question answered: *"If I joined LawME today as its first Principal Engineer, what would I change before the platform continues to grow?"*

> Method note: findings are grounded in a read of `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/**`, `src/modules/**`, `src/design-system/**`, `src/lib/**`, `src/types/database.types.ts`, all 7 `supabase/migrations/*`, `supabase/tests/**`, plus repo-wide searches (service_role, DEMO_SEED, `.rpc(`, actor/auth, TODO/FIXME, `any`) and six parallel deep-reads (routes/repos, matter aggregate, dino/triad/legal-knowledge, intake/bootstrap, UI/state, db/RLS). Every non-trivial claim cites `file:symbol`. Where evidence is incomplete it is stated.

---

## SECTION 1 — EXECUTIVE VERDICT

**1. Is the architecture fundamentally sound?** Yes. LawME is a **modular monolith** with a genuinely good instinct set: pure/versioned derived engines, a persisted-inputs / derived-intelligence split, DB row types quarantined behind repository mappers, an RLS-first schema with SECURITY DEFINER cross-tenant invariants, and an intake pipeline whose safety rules are enforced in domain code and re-validated at a provider boundary. The bones are right.

**2. Can it reach Capability 0.8 and Matter Bootstrap without a major rewrite?** Yes. Nothing found requires a rewrite. The largest gaps (no auth, single hardcoded tenant, no actor, no atomic multi-table write) are **expected incomplete-feature work** that Capability 0.8 and the Bootstrap RPC are explicitly scoped to fill — not architectural defects.

**3. Top five structural strengths.**
1. **Pure, versioned, traceable derived intelligence** — 17 engines → score → narrative, all `MatterEngine.assess(matter)` deterministic, each `*_VERSION`-stamped, with sentence-level provenance (`intelligence.ts`, `profile.ts:16`, `narrative-engine.ts:49 sentenceEvidenceMap`).
2. **Type isolation** — `database.types.ts` imported by exactly 7 persistence/repo files, **zero** UI/domain imports; DB snake_case never becomes the platform language.
3. **Migration & reconciliation discipline** — single-transaction migrations, immutable history, executed-body SHA-256 recorded, out-of-band ALTER reconciled additively, a 67/67 dual-path hardening harness (`supabase/tests/intake_drafts_hardening/`).
4. **Intake safety spine** — safety invariants live in `intake/contracts.ts`/`confirm-plan.ts` and are re-checked at the provider router (`providers/router.ts validateSuggestions`); the analyze route persists nothing; a benchmark hard-fails on any fabricated citation/invented deadline/untraced span.
5. **Clean shared kernel + RSC discipline** — `intelligence/core` is a dependency-leaf of primitives consumed by both `matter` and `dino`; server/client boundary is drawn correctly (server-only persistence never imported by client components).

**4. Top five architectural risks.**
1. **Two definitions of "established fact."** Stage advancement (`state-machine.ts:37`) counts any `status !== "unknown"` fact — including `client_alleged`/`disputed` allegations — as satisfied, feeding `health`/`readiness`/`next-action` engines and thus Matter Score/Posture. The strict gate (`evidence-decision.ts:32 mayConfirmFact`) is correct; the advancement gate contradicts the epistemic model. **Correctness defect.**
2. **Intra-tenant authorization is decorative.** Every `matter_*` table (except intake drafts) is read+write to any `app.is_org_member`; `matters/matter_documents/matter_notes.confidentiality='privileged'` and `approval_state` are unenforced at the DB, and the `matter_members.can_review/can_approve` + `app.matter_can_approve()` authority model is **dead code** (referenced by no policy/app code).
3. **Three parallel epistemic vocabularies + a second fact store.** `matter/types.ts FactStatus`, `intelligence/core EpistemicStatus`, `dino ContextItemStatus`, reconciled only by lossy converters; and Dino builds its own `MatterContextPackage` from synthetic fixtures (`matter-context-assembler.ts`, `synthetic:true`) — a second source of truth for the same real-world facts.
4. **No public API boundary on `legal-knowledge`.** Every `dino → legal-knowledge` and `matter → legal-knowledge` edge deep-imports internal files (`research/engine-db.ts`, `relevance-gate.ts`, `repositories/types.ts`); a refactor there breaks consumers silently.
5. **Dino `orchestrator.ts` is a 461-line god-function** with the 26-stage sequence and Hebrew product copy inlined into control flow — the one cohesion risk in an otherwise well-factored module.

**5. Must be corrected BEFORE Capability 0.8.** (a) the fact-gate correctness bug (`state-machine.ts:37`); (b) migration apply-status header reconciliation (`capability1`/`slice2` headers say "NOT YET APPLIED" while live); (c) decide the matter-authorization model that 0.8 will implement (so 0.8 doesn't ossify the org-member shortcut); (d) even out `app.*` EXECUTE grants. All small.

**6. Must be corrected DURING Capability 0.8.** Real Supabase Auth session + `ActorContext` (actor + active org + membership + capabilities), replace `DEMO_SEED.organizationId` in routes/loader, wire `anonClient` (RLS-enforcing) for tenant reads, add `middleware.ts` route protection, and actor-bound persisted Matter audit.

**7. Must be corrected BEFORE Matter Bootstrap.** The `app.bootstrap_matter_v1()` SECURITY DEFINER RPC (atomicity), a `DraftRepository`, extended matter hydration (facts/deadlines/participants), the 6-table child writers, matter-scoped activity/audit vocabulary, generalize `CanonicalWritePlan → BootstrapPlan`, escalate illegal-fact-status from per-item drop to full-request reject, resolve `contacts`/`matterParticipants` duplication and `organization`/`company` kind mismatch.

**8. Can safely wait.** Cached intelligence projections, persisted Workflow, Outbox, search, contact dedup automation, Hearing/Court-Decision entities, form primitives in the design system, splitting `workflow-drawer.tsx`.

**9. Any module acting as a second source of truth?** Yes — **Dino's matter-context assembler** (`matter-context-assembler.ts`) is a parallel fact store vs the Matter aggregate; and **legal source registries** exist three times (docs/CSV, hardcoded TS catalogs, DB seed) with ~2 of 134 wired.

**10. Any accepted ADR contradicted by implementation?** Partially: **ADR-0008 (single source-of-truth ownership)** is softened by the three-vocabulary fact model + Dino's second fact store; and a **stale comment** in `triad/coverage.ts:7` asserts Dino consumes triad coverage, which the import graph disproves (Dino has its own `coverage-evaluator.ts`). ADR-0009/0010 (derived timeline/intelligence) are correctly implemented.

### Platform verdict: **B — Architecture is viable but warrants a short, tightly-scoped stabilization phase before Capability 0.8.**
Not A (a real correctness bug + reconciliation debt should not be carried into identity work); emphatically not C or D (no blocking structural flaw, no rewrite justified).

---

## SECTION 2 — PLATFORM MAP

### Current state

```
┌───────────────────────────────────────────────────────────────────────┐
│ UI (RSC-first)  src/app/(os)/**  +  src/modules/{shell,today,matter/view}│
│  server pages → client leaves; room-store runs the 17-engine profile    │
│  in-browser via useMemo (room-store.tsx:200). No middleware.            │
└───────────────┬───────────────────────────────────────────────────────┘
                │ props (server→client) / fetch() (2 sites)
┌───────────────▼───────────────────────────────────────────────────────┐
│ ROUTE / API  src/app/api/matters/**  (4 routes, 0 server actions)      │
│  tenant = DEMO_SEED.organizationId (hardcoded) | slug-adopted org      │
│  orchestration + domain policy live HERE (allowlists, scan_clean_demo) │
└───────────────┬───────────────────────────────────────────────────────┘
                │ (no application/service layer — routes call repos directly)
┌───────────────▼───────────────┐   ┌────────────────────────────────────┐
│ DOMAIN (pure)                 │   │ REPOSITORIES                        │
│ matter/intelligence engines   │   │ MatterRepository, MatterDocuments-  │
│ intake/pipeline + providers   │   │ Repository (matter Result/messageHe)│
│ dino/orchestrator (26 stages) │   │ legal-knowledge repos (RepoResult/  │
│ legal-knowledge/triad         │   │ OrgContext/audit)  → 2 conventions  │
│ intelligence/core (leaf)      │   │ ensureDemoSeed writes 3 tables raw  │
└───────────────┬───────────────┘   └───────────────┬────────────────────┘
                │                                    │ serviceClient() (RLS-BYPASS)
                │                    ┌───────────────▼────────────────────┐
                │                    │ SUPABASE (Postgres)                 │
                │                    │ 37 public tables, RLS on all        │
                │                    │ app.* SECURITY DEFINER helpers      │
                │                    │ intake guard trigger (allowlist)    │
                │                    │ anonClient() defined, NEVER wired   │
                │                    └─────────────────────────────────────┘
 External providers: ModelIntakeProvider (disabled/network-refused), Dino
 ProviderRouter (no model wired), MockEmbeddingProvider (trigram-hash).
```

**Layer responsibilities / violations.** UI: correct RSC split; violation = domain-event synthesis inside the room reducer (`room-store.tsx:127-153`) and ships the full engine client-side. Route: doubles as the application layer; holds domain policy (`matters/route.ts PROCEDURES`, `documents/route.ts scanStatus="scan_clean_demo"`). Application/service layer: **missing** — the only real services are the pure intake pipeline and an *unwired* `research/engine-db.ts`. Repository: two divergent conventions; `ensureDemoSeed` writes tables outside any repo; multi-row writes are non-transactional (no `.rpc(` anywhere). DB: RLS present but **the only wired client is service-role (RLS-bypassing)**, so RLS currently protects nothing on the live path.

### Recommended target state
Insert a thin **application-service layer** (use-case functions) between routes and repositories; resolve tenant/actor once via an **`ActorContext`** produced by Capability 0.8; wire the **RLS-enforcing anon client** for reads; keep engines pure and derived; make the **Bootstrap RPC** the single atomic writer for Matter creation; give `legal-knowledge` and each domain a **public barrel** so cross-module edges import contracts, not files.

```
UI(RSC) → app-services(use-cases) → domain(pure engines/intake) → repositories → DB(RLS-enforced)
                     │  resolves ActorContext (0.8)      │ Bootstrap RPC = only atomic matter writer
   external providers plug in behind provider routers (deterministic default)
```

---

## SECTION 3 — MODULE BOUNDARIES

| Module | Owns | Should NOT own | Cohesion | Split? |
|---|---|---|---|---|
| `matter/intelligence` + engines | derived Matter assessment/score/narrative/timeline (pure) | persistence, UI | High | Keep |
| `matter/view` | room read-model (`RoomViewModel`), room store | **domain-event/audit generation** (leak, `room-store.tsx:127-153`) | Med | Extract audit/activity to `matter/activity` |
| `matter/persistence` | Matter/doc repos, demo seed | `ensureDemoSeed` raw multi-table writes; hydration placeholders | Med | Add `DraftRepository`; move seed behind a repo |
| `matter/intake` | deterministic extraction → draft → confirm-plan | — (clean) | High | Keep; reuse into Bootstrap |
| `matter/workflow` | generic transition engine | demo-pinned detectors (`preg-e2`,`employer_knowledge`) | Med | Keep engine; externalize definitions/data |
| `dino` | 26-stage research orchestration | inlined product copy + hardcoded stage list in `orchestrator.ts` | Med | Extract declarative stage registry + copy layer |
| `legal-knowledge` | legislation/case-law/procedure/triad/research | — but exposes no public API | Med | Add barrel/facade; consolidate registries |
| `intelligence/core` | shared primitives (leaf) | anything domain-specific | High | Keep (model seam) |
| `shell`/`today` | OS chrome, mock daily surfaces | — (mock clearly labeled) | High | Keep |

**Accidental cross-module imports / dependency rules.** No cycles found. The problematic edges are all `dino → legal-knowledge/<internal file>` and `matter/intake → {dino, legal-knowledge}` internal imports (see Section 5). **Recommended rule:** modules may import (a) `intelligence/core`, and (b) another module's **barrel** only; internal-file imports across modules are disallowed. This is enforceable later with an ESLint `no-restricted-imports`/boundaries rule; not now.

---

## SECTION 4 — DOMAIN MODEL INTEGRITY

The canonical vocabulary is **mostly** consistent, with three defects:

- **Fact / Claim / Allegation:** three enums (`FactStatus`, `EpistemicStatus`, Dino `ContextItemStatus`) reconciled by **lossy** converters (`epistemic-status.ts:75,83`, `inference`/`assumption` → null). The canonical `EpistemicStatus` is the right owner; the others should become projections. **This is the ADR-0008 tension made concrete.**
- **Participant / Contact:** `MatterIntakeDraft.matterParticipants` is an exact alias of `contacts` (`pipeline.ts:253`); `ContactDraft.kind="organization"` vs `ContactRow.kind="company"` (`contracts.ts:97` vs `confirm-plan.ts:51`). Also the Matter aggregate has **no first-class opposing-party/participant type** — `team` + single `client` only; opposing parties exist only in Dino's context. A litigation aggregate needs a real Participant model (the `matter_participants` table exists but isn't hydrated).
- **Persistence-as-domain:** avoided well — `hydrateMatter` maps rows to a domain `Matter`; but it is **lossy** (`facts:[]`, `deadlines:[]`, `team:[]`, synthetic client), because no tables back those sub-aggregates yet.

**Docs-only names to coin/finalize before Bootstrap:** `SourceArtifact`, `BootstrapPlan`, `MatterBootstrapRequest/Result`, `BootstrapSource` exist only in the architecture doc/ADRs; `MatterSource`/`MatterSourcePackage` exist nowhere; the real names are `CanonicalWritePlan`, `MatterIntakeDraft`, `matter_intake_drafts`, `IntakeDraftStatus`.

**Recommendation:** a formal Domain Glossary **package is not needed**; instead promote `intelligence/core` to be the single home of shared status/enums and delete the duplicate matter/dino vocabularies in favor of converters-at-the-edge. A short `docs/architecture/DOMAIN_GLOSSARY.md` mapping term → owning type is sufficient.

---

## SECTION 5 — DEPENDENCY DIRECTION

Direction is broadly correct (`domain → intelligence/core`; `legal-knowledge` and `core` never import upward; no cycles). Violations are cross-module internal-file imports and one UI leak.

| # | Source file | Depends on | Why problematic | Sev | Smallest correction |
|---|---|---|---|---|---|
| D1 | `dino/retrieval/retrieval-orchestrator.ts:7` | `legal-knowledge/research/engine-db.ts` (internal) | no public API; silent break on refactor | High | Add `legal-knowledge` barrel; import from it |
| D2 | `dino/classification/question-classifier.ts:8` | `legal-knowledge/research/relevance-gate.ts` | same | High | barrel |
| D3 | `dino/{authority,contradictions}/*` | `legal-knowledge/research/engine-db.ts` (`DbEvidenceItem` type) | domain type sourced from an infra-ish module | Med | move shared type to `intelligence/core` or barrel |
| D4 | `matter/intake/pipeline.ts` | `dino/classification/question-classifier`, `dino/core/request` | matter depends on dino internals | Med | barrel `@/modules/dino` (exists) — import from it |
| D5 | `matter/view/room-store.tsx:127-153` | (none) synthesizes audit/activity | domain rule in the view layer | Med | move to `matter/activity` domain fn |
| D6 | `matter/persistence/matter-repository.ts` | exports `hydrateMatter(row: MatterRow,…)` | DB row type in a module-public signature | Low | keep row types internal to the file |

No `domain → Supabase/React/Next` violations were found in engine code (engines are pure). `database.types` never reaches UI. This is a healthy dependency graph with fixable seams, not a tangle.

---

## SECTION 6 — APPLICATION AND SERVICE LAYER

**There is no application layer.** Routes (`matters/route.ts POST`) and server components (`matter-loader.ts`) orchestrate `serviceClient()` + `ensureDemoSeed` + repositories + slug/policy directly. The one clean domain service is `runIntakePipeline` (pure, 20 stages); `legal-knowledge/research/engine-db.ts runResearch` is a real service but **unwired** by any route.

**Where future operations should live:** create-Matter (→ Bootstrap RPC wrapper), confirm-Intake, link-Contact, approve-Evidence, promote-Fact, create-Deadline, update-Matter-ownership, init-Workflow, run-Matter-Intelligence — each as a **use-case function** taking `(ActorContext, input)` and returning a typed `Result`.

**Recommendation: (A) use-case functions**, not service classes or CQRS. Evidence: the codebase is functional/pure throughout (engines are functions; repos are the only classes), Node strip-types disallows constructor-parameter-properties (already caused churn), and there are ~10 operations — far below the complexity that justifies command/query handlers. A folder `src/modules/matter/app/` (or `application/`) of `createMatter.ts`, `confirmIntake.ts`, … each `(ctx, input) => Promise<Result>` is the minimal consistent pattern. Do **not** introduce CQRS or an event bus now.

---

## SECTION 7 — REPOSITORY LAYER

**Existing:** `MatterRepository` (`list/getHydrated/create`), `MatterDocumentsRepository` (`list/get/create/addVersion/updateMetadata/removeDraft`), and the 7 legal-knowledge repos (`types.ts` interfaces + `supabase.ts`/`in-memory.ts`). **Missing for the roadmap:** `DraftRepository` (matter_intake_drafts is un-wired), matter-child writers (participants/facts/deadlines/members/activity/audit), a Contact resolver, and `getHydratedFull` (facts/deadlines/participants).

**Defects:**
- **Two conventions, no shared base:** matter (`Result{ok,value|code,messageHe}`, org positional, no audit) vs legal-knowledge (`RepoResult`, `OrgContext{orgId,actorProfileId,correlationId}`, `sanitizeAuditPayload`). The legal-knowledge convention is the better one — adopt it platform-wide.
- **Business logic in repos:** `MatterDocumentsRepository` enforces content-hash idempotency, version lineage, and `removeDraft` requires `approval_state="draft"`; `hydrateMatter` injects placeholder client/facts. Repos should map + persist only; move invariants to the DB or use-cases.
- **Isolation divergence:** the in-memory legal-knowledge repo enforces org on reads in app code; the Supabase variant delegates to RLS but is wired with the **service (bypass) client** and several reads have **no org predicate** (`supabase.ts:295 void ctx; // tenancy enforced by RLS`). Same interface, different guarantees; tests pass on the stricter one.
- **No transactions:** `MatterDocumentsRepository.create` (doc + version) and `ensureDemoSeed` (3 tables) can leave orphans; there is no `.rpc(` anywhere (confirms the Bootstrap RPC necessity).

**Target role for repositories:** persistence only, no business policy, typed domain mapping, tenant-aware via `ActorContext`, testable, reusable by use-cases. Do not implement now.

---

## SECTION 8 — ROUTE AND API ARCHITECTURE

Four routes, no server actions, no middleware. Findings:

- **Demo org / service role:** `matters/route.ts:57` writes to `DEMO_SEED.organizationId` via `serviceClient()`; `intake/analyze/route.ts:35` passes the demo org as a documented placeholder (persists nothing); documents routes adopt the org from an **unauthenticated slug lookup** (`server-context.ts`).
- **Payload trust / mass-assignment:** `documents/route.ts` casts form fields (`documentType/evidenceType/confidentiality/…`) with unchecked `as` (lines 103-109); only DB constraints catch bad values. `matters/route.ts` validates title/procedure against a hardcoded allowlist (good) but does no schema validation.
- **Contracts:** ad-hoc `{error, messageHe}` per route; **no correlation ID, no idempotency**; `preview/route.ts` returns plain-text errors (inconsistent) and **ignores the `[id]` param** (token-only capability). `scanStatus` hardcoded `"scan_clean_demo"`.
- **Domain logic in routes:** procedure allowlist, slug generation, metadata defaults, scan decision.

**Canonical route pattern to adopt (post-0.8):** resolve actor → resolve active org → validate input (runtime schema) → authorize (capability) → invoke use-case → map safe result/error → emit safe telemetry (correlation id, opaque tenant, stage, outcome — never confidential content).

**Standard error envelope:** `{ ok:false, code: <stable enum>, messageHe, correlationId }` (2xx/4xx/5xx by code class), mirroring the intake guard's stable-reason-code discipline (`INTAKE_DRAFT_*`). Success `{ ok:true, data }`.

---

## SECTION 9 — DATABASE AND MIGRATION ARCHITECTURE

**Strong.** 7 timestamp-prefixed single-transaction migrations, each with ROLLBACK GUIDANCE; `search_path` pinned on all SECURITY DEFINER functions; an explicit **advisor-hardening migration** (`20260711174702`) that fixed unpinned search_paths, moved extensions to `extensions` schema, rewrote 5 policies to `(select auth.uid())`, and added 8 covering FK indexes; the intake reconciliation (executed-body SHA-256 recorded, out-of-band ALTER captured additively, 67/67 dual-path harness).

**Gaps:**
- **P1 — apply-status header contradiction.** `20260714194504_capability1` and `20260715120000_slice2` headers read "PREPARED FOR REVIEW — NOT YET APPLIED," yet `matters` is live remotely (confirmed: it is in remote migration history and `matter_intake_drafts.confirmed_matter_id` FK-references it). Stale headers on applied migrations are exactly the drift class the intake reconciliation fixed — back-apply the same discipline.
- **P2 — uneven EXECUTE grants.** Only the 3 intake-era functions had PUBLIC/anon revoked; ~15 other `app.*` SECURITY DEFINER helpers keep the default PUBLIC EXECUTE. Low exploit risk (they gate on `auth.uid()`), but least-privilege is applied unevenly; a small additive migration should revoke PUBLIC on all `app.*`.
- **Naming drift:** `20260714194504` header says version `20260714120000` (cosmetic).

**Triggers: invariants vs business logic.** Almost all triggers are thin invariants (`touch_updated_at`, `forbid_mutation`, `enforce_*_org` cross-tenant checks, `forbid_established_fact_on_insert`). The **one heavy trigger** is `enforce_intake_draft_transitions` (state-transition allowlist). It is deliberately role-logic-free and hardened (INVOKER, `search_path=''`, EXECUTE revoked, stable P0001 codes); it is on the invariant side of the line but is the place to watch that Capability 0.8 does not grow into a capability engine.

**Formal migration policy (adopt as `docs/architecture/MIGRATION_POLICY.md`):** immutable historical files; corrective/additive-only changes; executed-body checksums; remote `schema_migrations` verification before/after apply; `get_advisors` after DDL; type regeneration + empty-diff confirmation; one migration = one commit boundary; **no out-of-band ALTER without a reconciling additive migration**. The intake arc already demonstrates this end-to-end — codify it.

---

## SECTION 10 — RLS AND TENANT ISOLATION

Cross-tenant isolation is sound (`is_org_member` predicates + SECURITY DEFINER FK-org triggers; validated by `rls_validation.sql` + `remote_rls_validation.sql`, 11 tests each). **Intra-tenant** authorization is the gap.

| Table | Access model (current) | Issue | Future model | Priority |
|---|---|---|---|---|
| organizations/profiles/memberships | member/self/admin | none | keep | — |
| legal_* (global corpus) | `using(true)` read; service write | intentional public corpus | keep | — |
| audit_events | admin read; service insert; `forbid_mutation` | none (immutable) | keep | — |
| **matters** | `is_org_member` R/W | any member (paralegal/intern) edits any matter; `confidentiality` unenforced | matter-membership + capability | **P1** |
| **matter_documents** | `is_org_member` R/W | `approval_state`/`confidentiality` freely settable by any member | reviewer/approver capability gating | **P1** |
| **matter_notes** | `is_org_member` R/W | `privileged`/`restricted` notes visible to every member | confidentiality-aware policy | **P1** |
| matter_evidence/tasks/research_links | `is_org_member` R/W | broad member write | matter-membership scoping | P2 |
| matter_participants | member read; **admin** write | good (who-is-in-case gated) | keep | — |
| matter_facts | `is_org_member`; insert trigger blocks established | good invariant | keep | — |
| matter_intake_drafts | **creator + explicit reviewer**; no DELETE | correctly strict | keep (the model to copy) | — |

**Headline (P1):** `matter_members.can_review/can_approve` and `app.matter_can_approve()` **exist but no policy or code consults them**; confidentiality flags are decorative. The intake-drafts author already learned this lesson (v2 note: the first draft "would have let EVERY organization member read a confidential pre-Matter draft" → corrected to creator+reviewer). That correction was **not** back-applied to the matter tables. For an RLS-first legal product handling privileged content, this is the most material access-model finding — but its fix depends on the capability model, so it belongs **to Capability 0.8's authorization design**, with the decision made now (Section 34).

---

## SECTION 11 — AUTH & AUTHORIZATION READINESS

**Current state = greenfield for identity.** No `@supabase/ssr`, no `middleware.ts`, no `auth.getUser`/`getSession`, no `actorId` anywhere. `anonClient(accessToken)` exists (`supabase-server.ts`) but is **never called**; all wired paths use `serviceClient()`. Tenant = hardcoded demo org or slug-adopted org; matter writes record no actor (`matters` insert sets no `created_by`/`assigned_owner_id`).

**Exact prerequisites for Capability 0.8:**
1. Supabase Auth session resolution (server) + `middleware.ts` protecting `(os)/**` and `api/**`.
2. `ActorContext = { actorProfileId, activeOrganizationId, memberships, capabilities, correlationId }` resolved once per request.
3. Wire `anonClient` (RLS-enforcing) for tenant reads; reserve `serviceClient` for trusted server ops only.
4. Replace `DEMO_SEED.organizationId` in `matters/route.ts`, `matter-loader.ts`, `analyze/route.ts` with `ActorContext.activeOrganizationId`.
5. Capability model + the matter-level RLS decision (Section 10/34).
6. Actor-bound, persisted Matter audit (replace the in-memory fabricated `actorHe`/`correlationId`).

**Correction that must precede identity work:** the fact-gate bug (Section 13) and the apply-status reconciliation — do not build identity/attribution on top of a loose epistemic gate or drifted migration headers.

---

## SECTION 12 — ACTIVITY, AUDIT & EVENT ARCHITECTURE

**Implementation diverges from the ADRs for Matter.** Timeline is correctly a pure projection (`engines/timeline.ts`, no table — matches ADR-0009). But Matter **Activity and "Audit" are in-memory and derived**: `deriveActivity` is pure (`activity/activity.ts:30`); `state.matterActivity`/`matterAudit` live only in the room reducer and reset on reload (`room-store.tsx:60-61,156`); workflow `AuditEntry[]` is an in-memory array with deterministic-from-`asOf` timestamps and a Hebrew role **string** (`ACTOR_DINO="דינו"`), not a user id (`engine.ts:75,81`); `correlationId` is a fabricated counter `cor-${seq}` (`room-store.tsx:137,150`). A **real immutable audit exists only in legal-knowledge** (`supabase.ts appendAuditEvent` + `sanitizeAuditPayload`) and in the `audit_events` table (immutable via `forbid_mutation`) — the Matter aggregate has **no persisted, tamper-evident, actor-bound audit**, and matter audit payloads embed raw case content (member names, task titles, evidence statements) with no confidentiality tagging.

**Recommendation — event taxonomy:** three distinct concepts — **Domain Event** (something happened: `matter_created`, `evidence_approved`, `draft_confirmed`), **Activity** (human-readable projection of events for the room), **Audit** (immutable, actor-bound, sanitized security record in `audit_events`). Timeline stays a derived projection. **Outbox: not now.** Adopt it **before Workflow persistence / cross-aggregate side effects**, not for Bootstrap (whose writes are single-transaction in the RPC). For Bootstrap, write the `matter_activity` + `audit_events` rows **inside** the RPC transaction (as the doc already plans) — that gives atomic audit without an outbox.

---

## SECTION 13 — MATTER AGGREGATE

One canonical loader (`loadMatterForRoom` → `MatterRepository.getHydrated`), one presentation seam (`toRoomViewModel`, versioned). Concerns:
- **Hydration is lossy / under-backed:** `hydrateMatter` empties facts/deadlines/team/financials and synthesizes a client; the demo's richness lives only in `fixtures/demo.ts`. The domain `Matter` promises 7 sub-aggregates; persistence backs 2 (documents, evidence). This is incomplete-feature work, not debt — but it means "real matter" today cannot express facts/deadlines/participants.
- **Duplicate param resolvers:** `matter-repository.ts:145` regex vs `matter-context.ts UUID_RE`/`resolveMatterContext` (the latter unused by the room path) — a drifting second resolver.
- **Derived-vs-persisted mixing:** correctly avoided in the read model (engines run over the hydrated `Matter`; nothing derived is persisted), but **all 17 engines + score + narrative run client-side per render** (`room-store.tsx:200`) with zero caching.
- **Two "established fact" definitions** (Section 4/15) feed score/posture.

**Target Matter read model:** `getHydratedFull(ActorContext, id)` returning the full aggregate (facts/deadlines/participants/members/documents/evidence) from real tables; a single `MatterProfile` computed server-side for list/summary contexts and client-side only for the interactive room; one Participant model replacing the `team`+`client` split.

---

## SECTION 14 — INTAKE & BOOTSTRAP READINESS

Intake is **production-shaped and reusable**: `MatterIntakeDraft` + `Extracted<T>` envelope (span + provenance + `needsConfirmation` always true), deterministic provider with a disabled/network-refused model shell, a router that re-validates spans/statuses/deadline-honesty after every provider, `buildConfirmationPlan`/`CanonicalWritePlan` enforcing intake-only statuses and deadline honesty, and an analyze route that persists nothing. Tests (28) + benchmark (12 scenarios, 7 hard targets) cover the safety spine.

**Boundary is correct:** intake is legitimately **source-specific** (`story|pasted`, `SourceSpan.source`); the draft/plan is already **source-independent**. Bootstrap must stay **source-independent** and consume the draft, not re-extract.

**Reuse as-is:** `buildConfirmationPlan`, provider router validation, extractors/pipeline, drafts schema + hardening. **Change/add before Bootstrap:** generalize `CanonicalWritePlan → BootstrapPlan` (+members/activity/audit/contactResolutions/draftTransition); escalate illegal-fact-status from per-item drop to **full-request reject**; add `provenance.originalStatementHe`; build the RPC + `DraftRepository` + child writers + hydration + **ActorContext**.

**Naming to finalize:** coin `SourceArtifact`/`BootstrapPlan` (docs-only today); drop or justify the `contacts`/`matterParticipants` duplication; unify `organization`(draft) vs `company`(row) contact kind.

---

## SECTION 15 — MATTER INTELLIGENCE

Pipeline `buildMatterProfile → assessMatter (17 engines) → computeMatterScore → prioritizeActions → buildNarrative`, all pure, each `*_VERSION`-stamped, with sentence-level provenance and per-dimension `sourceAssessmentIds`. **No hidden persistence; nothing cached.** Invoked in `room-store.tsx:200` via `useMemo`.

Concerns: (a) **client-side recomputation** of all engines per render — fine for one open matter, unscalable for a matters **list** or server render; (b) `procedure` and `readiness` score dimensions both derive from the same `matter-readiness` engine (`dimensions.ts`) — a coupling that can double-count into posture; (c) the intelligence consumes the **loose** fact gate, so allegations can inflate readiness/health.

**Is derived-at-load appropriate near-term?** Yes for the single-room view. **Cached projections become necessary when** the matters list needs per-matter score/posture at scale (100+ matters) or when score/posture appear in server-rendered summaries — at that point compute `MatterProfile` server-side and cache a **non-authoritative** projection keyed by `matter.updated_at` (invalidate on write), never a truth field (per ADR-0010). Not now.

---

## SECTION 16 — DINO ORCHESTRATION

Submodules are cohesive (one per stage, versioned); Dino is **provider-independent** and has **no UI imports**. Two risks: (1) **`orchestrator.ts` is a 461-line god-function** hardcoding the 26-stage sequence and inlining Hebrew product copy (`purposeHe`/`messageHe`/`decisionHe`) into control flow — extract a **declarative stage registry** and a **copy layer**; (2) Dino owns a **parallel "coverage" model** (`coverage/coverage-evaluator.ts`) distinct from triad coverage, and a **second fact store** (`matter-context-assembler.ts`, `synthetic:true`) with its own field detectors — reconcile against the Matter aggregate once real matters flow in.

**What Dino owns:** research orchestration (classification → planning → retrieval → authority/contradiction/coverage → drafting → citation/QA/red-team → confidence → review routing). **What it should not own:** product copy, legal-source truth (that is legal-knowledge/triad), and matter facts (that is the Matter aggregate). Recommend module seams: `orchestration` (declarative stages), `tools` (retrieval/authority/citation), `providers` (already isolated), `policy` (`DINO_POLICIES`), `composition` (response + copy), `provenance`, `review-routing`.

---

## SECTION 17 — TRIAD & LEGAL KNOWLEDGE

`evaluateTriad` (legislation/case-law/procedure pillars → `canProduceMatterRecommendation`) is the gate that governs whether a substantive recommendation is allowed; case-law-driven topics with no *verified* case law correctly route to specialist review. Public sources are `unverified`/`pointer_only` and cannot back a claim until verified — the authority boundary is explicit and enforced.

**Risks:** (1) **legal-source registry exists 3×** (docs/CSV `LAWME_LEGAL_SOURCE_REGISTRY.md`, hardcoded TS catalogs, DB seed) with ~2 of 134 wired — drift-prone; (2) **hard-coded topic ontology** spread across `triad/coverage.ts` (`TOPIC_LEGISLATION`/`TOPIC_PROCEDURE`), `intake/extractors.ts` (`SUBDOMAIN_TO_TOPIC`), `intake/pipeline.ts` (`FORUM_BY_PROCEDURE`), `relevance-gate.ts` (`DOMAIN_PROFILES`) — no single owner; (3) **stale comment** `triad/coverage.ts:7` claims Dino consumes triad coverage (it does not); (4) the **recommendation-governing (triad) path is not runtime-updatable** — adding a statute/case/topic requires shipping code, while only the *retrieval corpus* is (partly) data-driven via code-based seeding.

**Verdict on the deterministic registries: POC foundation that doubles as benchmark fixture — explicitly not production** (`assertDevelopmentProject`, `APPROVED_DEV_PROJECT_REF`, fixture adapters "NO network calls", mock trigram embeddings). Keep as the **POC/benchmark foundation and deterministic fallback layer**, but before legal content must change without a deploy, move the triad ontology + source registry to **data (DB) with a code-owned schema**, single-sourced. This is a product-maintenance decision (Section 34), not urgent for 0.8/Bootstrap.

---

## SECTION 18 — WORKFLOW ENGINE

**In-memory, pure, deterministic, generic mechanism** (`workflow/engine.ts applyEvent`; lifecycle guard table `ALLOWED`), driven from the room store; signals `effect:"recompute"` and the store re-runs the profile — clean decoupling from UI/Intelligence. **But the content is one demo flow:** only 2 definitions, both detecting via `hasEvidenceGap` pinned to `TARGET_FACT="employer_knowledge"`, `TARGET_EVIDENCE="preg-e2"`, `PROCEDURE_STAGE_ID="preg-2"`. Registry order is load-bearing.

**Before persisted Workflow:** a real definition catalog (not demo-pinned detectors), actor-bound transitions, and the event/outbox taxonomy (Section 12). **Confirmed:** no Workflow bootstrap in Slice 2A Part 2 (ADR-0014) — correct. **Future integration seam:** Workflow init should be an explicit, separately-approved step invoked *after* Bootstrap creates the matter (not inside the atomic core), consuming a persisted definition + the matter's derived state.

---

## SECTION 19 — DOCUMENTS & EVIDENCE

The Evidence-approval boundary **is enforced**: `mayConfirmFact` (`evidence-decision.ts:32`) confirms a fact only when `decision==="supports" && verified && hasProvenance && !conflicting`; **upload alone never confirms** (`document-evidence.ts:200 resolve` files the doc without promoting; `applyEvidenceResolution` sets `"confirmed"` only through the gate). A mentioned document is not evidence; an upload does not auto-satisfy a requirement. This is the strongest correctness area in the platform.

**The one contradiction:** the *stage-advancement* gate (`state-machine.ts:37`) treats non-`unknown` allegations as satisfying stage facts — so a matter can **advance stages** on unproven allegations even though it cannot **confirm the fact**. Two definitions of "established," one strict (confirmation), one loose (advancement). Fix the advancement gate to require `isConfirmedFact` (or an explicit, named "sufficient-for-stage" policy) — **P1, cheap, before 0.8**. Also: `matter_documents` approval/verification/confidentiality are freely settable by any org member at the DB (Section 10) — the app-code gate is correct but the DB does not back it.

---

## SECTION 20 — UI ARCHITECTURE

RSC-first and correct: server pages → client leaves; server-only persistence never imported by client components (the one grep hit is a comment). Design system is coherent and **token-enforced** (`color.css:9` disables Tailwind's default palette; no page-specific CSS). Concerns:
- **Business logic leaks:** domain-event/audit synthesis in the room reducer (`room-store.tsx:127-153`) and lifecycle-step mapping in `workflow-drawer.tsx:49-57` — move to domain modules.
- **Largest components:** `workflow-drawer.tsx` (627, split `Lifecycle`), `intelligent/page.tsx` (440, extract phases) — size, not correctness.
- **Dead controls:** `side-rail` "פעולה חדשה" (no handler), `top-bar` bell (hardcoded "2 חדשות"), `command-bar` "תיק חדש" disabled **though `/matters/new` exists** (sharpest inconsistency) — wire or hide.
- **Design-system hole:** no form primitives → duplicated field styling across the two intake pages and two drawers.
- **Client bundle:** the full 17-engine profile ships to the browser (`room-store.tsx:200`) — intentional, but a perf line item at scale.

**Recommended UI boundaries:** `shell` (chrome), `matter/view` (room read-model + store, no domain rules), `design-system` (add `Field/Input/Select`), feature pages thin over use-cases.

---

## SECTION 21 — STATE MANAGEMENT

Library-free and appropriate: RSC for server state, `useReducer`+Context+**URL-as-source-of-truth** for room state, local `useState` for forms, a manual `LoadState` union for the one client fetch (documents). **No state library is justified by current evidence** — there are two client-fetch sites; React Query/SWR would pay off only if client fetching proliferates (e.g. the documents surface grows). The real smell is domain logic in the reducer (Section 20), which argues for a **domain extraction, not a store library**. Recommendation: keep the current model; revisit SWR only when ≥3 interactive client-fetch surfaces exist.

---

## SECTION 22 — CONTRACTS & VALIDATION

**Compile-time contracts are strong; runtime validation is absent.** `database.types` is quarantined behind mappers (no UI/domain leak). Domain types are hand-written TS interfaces (`intake/contracts.ts` is "the safety spine" — but interfaces only). **`zod` is not used anywhere**; JSONB columns (`structured_draft`, `policy_snapshot`, `provenance`, `settings`, `contact_info`, activity `before/after_state`, …) are stored as `Json` and **trusted at runtime**. DB CHECK constraints validate scalars/enums richly but cannot validate JSONB shape.

**Recommendation — one contract strategy:** generated DB types **only** inside repositories; hand-written **domain contracts** as the platform language; **DTOs** at route boundaries; **runtime schemas (adopt `zod` or `valibot`)** at every trust boundary — route input, JSONB read/write (especially `matter_intake_drafts.structured_draft`/`policy_snapshot`, whose writer doesn't exist yet, so it inherits nothing), and provider output. Persistence mappers convert row↔domain. **Do not let DB row types become the platform domain language** (already avoided — preserve it). Runtime validation of the intake JSONB is a **Bootstrap prerequisite**.

---

## SECTION 23 — ERROR ARCHITECTURE

Mixed. The **DB layer is exemplary**: stable, id-free `P0001` reason codes (`INTAKE_DRAFT_*`) and centralized `mapPgError`/`mapError` in repos. Routes are ad-hoc (`{error, messageHe}` per handler; `preview` returns plain text). There is **string-matching on error text** risk avoided in DB (codes) but not standardized in routes. No correlation IDs on routes; the loader diagnostics are careful (log counts/outcomes, never secrets/content) but matter audit embeds raw content.

**Recommendation — canonical error taxonomy:** a platform `AppError { code: <stable enum>, httpStatus, messageHe, correlationId, cause? }`, a single route error-mapper, DB reason codes mapped to app codes, and a rule that **error text returned to the browser is always a stable code + safe Hebrew message**, never raw SQL/tenant ids (the intake guard already models this — generalize it).

---

## SECTION 24 — OBSERVABILITY

Today LawME can partially answer "which operation failed" (route try/catch) and "did a security denial happen" (DB reason codes), but **not** reliably "for which opaque tenant / at which stage / did it commit / was there a retry / was intelligence stale" — because correlation IDs are per-site and fabricated in the room, there is no request-scoped telemetry, and intelligence has no staleness signal (it is always recomputed).

**Safe observability principles:** structured logs keyed by `correlationId` + **opaque tenant id** (never names/content), operation + stage + outcome code, commit/rollback markers around the Bootstrap RPC, and a security-denial channel (reason code + tenant, no payload). **Never log confidential legal content** (the loader already asserts this). **Before Matter Bootstrap:** request-scoped correlation IDs threaded route→use-case→RPC, and commit-confirmation logging (the Bootstrap doc's "verify whether the transaction committed" requirement needs an observable signal).

---

## SECTION 25 — TEST ARCHITECTURE

Coverage is **strong on pure domain + DB invariants, thin on integration/route/E2E**. Present: intake (28) + benchmark (7 hard targets), matter/intelligence/workflow/view/documents/persistence unit suites, legal-knowledge (triad/corpus/poc), and **two RLS SQL suites** + the **67/67 intake-hardening harness**. Missing: **route/API tests** (0), **server-component/loader tests**, **E2E** (none; no Playwright suite wired despite Playwright being available), and negative tests for the matter-authorization gap (there are none because the gap is unenforced). Benchmarks are deterministic (fixed clocks via `asOf`, fixture-based) — good; the in-memory-vs-Supabase repo divergence means some tests validate the stricter path only.

**Test pyramid for the next three capabilities:**
- **Capability 0.8:** unit (capability resolution, ActorContext) + **RLS negative tests per matter table** (member cannot read privileged; non-member denied) + route tests (auth required, tenant from session) + one E2E login→matter.
- **Matter Bootstrap:** unit (planner/validator, illegal-status full-reject) + **RPC transaction tests** (atomic rollback on any step failure; idempotency key) + integration (draft→confirmed, orphan-free) + negative (cross-tenant confirmed_matter_id already covered by the hardening harness).
- **Workflow persistence:** definition-catalog unit tests + transition/audit persistence tests + replay/determinism.

---

## SECTION 26 — SCALABILITY & PERFORMANCE (near-term lock-in only)

- **Client-side intelligence recomputation** (`room-store.tsx:200`): fine per room; a **matters list** rendering per-matter score/posture would force either N server computations or shipping engines to compute client-side — decide the **server-side profile path before the list needs scores** (lock-in risk, not urgent).
- **Service-role-only reads**: with real multi-tenant data, org-less legal-knowledge reads (`getDocument`/`listDocuments`) under the bypass client are a **correctness + cost** risk (full-table scans across tenants) — wiring the RLS client is both a security and a performance fix.
- **JSONB-heavy tables** without shape validation: large `structured_draft` payloads are bounded by the analyze route's 20k input clamp — acceptable.
- **No pagination on some list reads** (`MatterRepository.list`): add keyset pagination before large firms. Advisor already flags unindexed `confirmed_matter_id` FK (accepted, deferred).
Nothing here forces a rewrite; the one real lock-in is the list-scoring path.

---

## SECTION 27 — SECURITY REVIEW (ranked, not inflated)

- **Critical:** none outstanding on the live path *given there is no real auth and only demo/dev data yet*. The items below become Critical the moment real tenants + auth land.
- **High:**
  - **Intra-tenant authorization unenforced** — privileged matter/notes/documents readable+writable by any org member; approval/confidentiality decorative; `matter_can_approve` dead (Section 10). Becomes **Critical** with real users.
  - **Fact-gate correctness** — allegations advance stages (`state-machine.ts:37`), corrupting derived posture/score (Section 13/19).
  - **Signing-secret fallback** — preview HMAC falls back to the **service-role key**, then to a **hardcoded default** (`supabase-storage.ts:21-24`); preview authz **ignores the matter param** (token-only).
- **Medium:** mass-assignment via unchecked `as` casts in `documents/route.ts`; no runtime JSONB validation (Section 22); matter audit embeds raw case content without sanitization/tagging; uneven `app.*` EXECUTE grants; `scanStatus="scan_clean_demo"` (no real AV).
- **Low:** plain-text preview errors; naming/header drift; dead UI controls.
- **Accepted (by ADR/founder):** service-role possession ≠ authorization (0.8 will fix); no auth yet; unindexed confirmed-FK; ModelIntakeProvider disabled/network-refused; deletion/retention deferred.
Prompt-injection: intake treats pasted text as data and sanitizes it (`sanitizeIntakeText`); no LLM is wired — **well-handled**. Secrets: service key non-`NEXT_PUBLIC_`, run-log secret-pattern scrubbing — **good**.

---

## SECTION 28 — ARCHITECTURAL DEBT REGISTER

| ID | Title | Evidence | Sev | Blocks 0.8 | Blocks Bootstrap | Scope | Timing |
|---|---|---|---|---|---|---|---|
| **DR-01** | Stage-advancement fact gate accepts allegations | `state-machine.ts:37` | High | Should precede | — | S | **Now** |
| **DR-02** | Migration apply-status headers contradict live schema | `capability1`/`slice2` headers vs remote history | Med | Should precede | — | S | **Now** |
| **DR-03** | Uneven `app.*` EXECUTE grants (PUBLIC on ~15 fns) | `10_grants.sql` note; foundation fns | Med | — | — | S | **Now** |
| **DR-04** | Intra-tenant authorization decorative; `matter_can_approve` dead | Section 10; `capability1:91` | High | **Yes (design)** | Yes | M | **During 0.8** |
| **DR-05** | No ActorContext / auth / middleware; demo-org tenant | no `getUser`/`middleware`; `DEMO_SEED` in routes | High | **Yes** | Yes | L | **During 0.8** |
| **DR-06** | No persisted actor-bound Matter audit | `room-store.tsx:137,150`; `engine.ts:81` | High | Partly | **Yes** | M | 0.8 / Bootstrap |
| **DR-07** | Three epistemic vocabularies + Dino second fact store | `epistemic-status.ts:75`; `matter-context-assembler.ts` | Med | — | Before real matters | M | Before Bootstrap |
| **DR-08** | `legal-knowledge` has no public API; deep-file imports | Section 5 D1-D4 | Med | — | — | M | Before it grows |
| **DR-09** | No application/service layer; domain policy in routes | `matters/route.ts`; `matter-loader.ts` | Med | Enables 0.8 | Yes | M | 0.8 |
| **DR-10** | No runtime (JSONB/route) validation; no zod | Section 22 | Med | — | **Yes** | M | Before Bootstrap |
| **DR-11** | Multi-row writes non-transactional; no `.rpc(` | `MatterDocumentsRepository.create`; `ensureDemoSeed` | High | — | **Yes (RPC)** | M | Bootstrap |
| **DR-12** | Two repository conventions, no shared base | Section 7 | Low | — | — | M | Backlog |
| **DR-13** | Dino `orchestrator.ts` god-function + inlined copy | `orchestrator.ts` 461 lines | Med | — | — | M | Backlog |
| **DR-14** | Legal ontology hardcoded across ≥4 files; registry 3× | Section 17 | Med | — | — | L | Backlog (product) |
| **DR-15** | Preview signing-secret fallback to service key / default | `supabase-storage.ts:21-24` | Med | — | — | S | 0.8 |
| **DR-16** | Workflow = one demo-pinned flow | `evidence-task.ts:15-16` | Low | — | — | M | Before Workflow persistence |
| **DR-17** | UI dead controls; no form primitives | Section 20 | Low | — | — | S | Backlog |

**Grouped:**
- **Must fix now:** DR-01, DR-02, DR-03.
- **Fix during Capability 0.8:** DR-04, DR-05, DR-06, DR-09, DR-15.
- **Fix before Matter Bootstrap:** DR-06 (audit), DR-07, DR-10, DR-11.
- **Fix before Workflow persistence:** DR-16, event/outbox taxonomy.
- **Safe backlog:** DR-08, DR-12, DR-13, DR-14, DR-17.

---

## SECTION 29 — PRESERVE / CHANGE / REMOVE

### Preserve (do not destabilize)
- Pure/versioned/traceable engines (`intelligence.ts`, `profile.ts`, `narrative-engine.ts sentenceEvidenceMap`) — the crown jewel.
- Intake safety spine + provider re-validation (`contracts.ts`, `confirm-plan.ts`, `providers/router.ts`) and the benchmark hard targets.
- Migration/reconciliation discipline (checksums, additive corrections, 67/67 harness) — codify it, don't touch it.
- Type quarantine (`database.types` behind mappers) and the RSC server/client boundary.
- `intelligence/core` as the shared-primitives leaf; the Evidence→Fact confirmation gate (`mayConfirmFact`).
- The intake-drafts **creator+reviewer** RLS model (the pattern to copy to matter tables).

### Change (controlled refactor)
- **DR-01** fact-advancement gate → require confirmed/document-derived (or an explicit named policy).
- **DR-04** matter-level authorization: consult `matter_members`/capabilities in RLS (design in 0.8).
- **DR-05/09** introduce ActorContext + a use-case layer; move domain policy out of routes.
- **DR-06** persist actor-bound Matter audit; stop fabricating `correlationId`/`actorHe` in the reducer.
- **DR-07** collapse three fact vocabularies to `EpistemicStatus` + edge converters; reconcile Dino context with the aggregate.
- **DR-08** add module barrels; forbid cross-module internal imports.
- Generalize `CanonicalWritePlan → BootstrapPlan`; adopt runtime schemas (DR-10).

### Remove (must not survive)
- `DEMO_SEED.organizationId` as the route tenant (`matters/route.ts:57`, `matter-loader.ts:69,100`, `analyze/route.ts:35`) — replace with ActorContext.
- `scanStatus="scan_clean_demo"` shortcut (`documents/route.ts:87`).
- Hardcoded signing-secret default + service-key fallback (`supabase-storage.ts:21-24`).
- Dead controls that imply features (`command-bar` "תיק חדש" disabled though route exists; `side-rail` "פעולה חדשה"; `top-bar` bell) — wire or hide.
- Stale comment `triad/coverage.ts:7`; stale migration headers (DR-02).
- Dead approval model **only after** DR-04 replaces it (don't remove `matter_members.can_review/can_approve` — *wire* them).

---

## SECTION 30 — TARGET PLATFORM ARCHITECTURE (12 months)

**LawME should remain a modular monolith.** No evidence justifies microservices: one team, one database, aggregates that share a transaction boundary (Bootstrap is inherently one atomic write), and cohesive modules. Microservices would add distributed-transaction complexity precisely where the design needs atomicity.

Target: **UI(RSC) → application use-cases → domain modules(pure) → repositories → RLS-enforced DB**, with:
- **Identity/ActorContext** (0.8) as the single source of actor/org/membership/capabilities/audit-identity; `serviceClient` reserved for trusted ops.
- **RLS** enforcing matter-level access via `matter_members` + capabilities; confidentiality actually enforced.
- **Bootstrap RPC** (`app.bootstrap_matter_v1`) as the only atomic Matter creator.
- **Matter read model** with full hydration + a server-computable `MatterProfile`; derived intelligence stays pure, cached only as non-authoritative projections when the list needs it.
- **Workflow** persisted behind a definition catalog, initialized post-Bootstrap.
- **Audit/Activity/Events** as three distinct concepts; audit immutable + actor-bound; outbox only when cross-aggregate effects appear.
- **Legal knowledge** single-sourced (DB-backed registry + code-owned schema) with a public facade.
- **Providers** behind routers, deterministic default, model providers gated by security review.
- **Contracts** with runtime schemas at every trust boundary.

---

## SECTION 31 — REFACTOR PLAN (minimal stabilization before 0.8)

### Platform 0.7.1 — Critical cleanup (days, not weeks)
- **Objective:** remove correctness + reconciliation debt that must not enter identity work.
- **Files:** `matter/state-machine.ts` (DR-01), migration headers for `capability1`/`slice2` + a small additive migration to revoke PUBLIC on remaining `app.*` (DR-02/03), `docs/architecture/MIGRATION_POLICY.md`.
- **Tests:** fact-gate unit tests (allegation does not advance stage); rerun matter/intelligence suites; advisor check.
- **Migration need:** one additive grant-hardening migration (no schema change). **Commit boundary:** one commit for the code fix, one for the migration+headers. **Stop gate:** founder review before apply. **Risk:** low. **Benefit:** derived intelligence becomes epistemically honest; migration history stops lying.

### Platform 0.7.2 — Boundary enforcement (optional, small)
- **Objective:** add module barrels + a use-case skeleton so 0.8 lands cleanly.
- **Files:** `legal-knowledge/index.ts` (facade), `matter/app/` (empty use-case seam), extract `room-store` audit/activity to `matter/activity`.
- **Tests:** import-boundary lint (advisory), existing suites green. **Migration:** none. **Commit:** one. **Stop gate:** review. **Risk:** low. **Benefit:** removes the two UI domain leaks and the internal-import fragility before more code depends on them.

### Capability 0.8 prerequisites
Real Supabase Auth + `middleware.ts` + `ActorContext`; wire `anonClient`; replace `DEMO_SEED` tenant; capability model + **matter-level RLS decision (Section 34 Q1)**; actor-bound audit. (This is 0.8 itself; listed so it isn't done piecemeal earlier.)

### Matter Bootstrap prerequisites
`app.bootstrap_matter_v1` RPC (atomic 12-step); `DraftRepository` + child writers; `getHydratedFull`; generalize plan → `BootstrapPlan`; illegal-status full-reject; runtime JSONB validation; matter audit vocabulary. Depends on 0.8's ActorContext.

*No slice is implemented in this run.*

---

## SECTION 32 — CAPABILITY SEQUENCING

Recommended order (dependency-driven):
1. **Platform 0.7.1** (correctness + reconciliation) — unblocks honest identity work.
2. **Capability 0.8 Identity** — the keystone; every write path, RLS decision, audit, and Bootstrap depends on ActorContext. *Service-role possession is not authorization.*
3. **Matter Bootstrap** — needs ActorContext + atomicity; reuses the intake spine.
4. **Contact resolution** — inside/adjacent to Bootstrap (explicit, no auto-merge).
5. **Documents/Evidence expansion** — builds on real matters + auth.
6. **Workflow persistence** — needs event/audit taxonomy + real definitions.
7. **Search** — needs real corpus + tenant-scoped reads.
8. **Calendar / Notifications** — product surfaces over real matters/deadlines.
9. **LLM provider integration** — last; only after the deterministic spine, auth, audit, and provider-security review exist (the seam is already built and disabled).

Principle: **don't build infrastructure a vertical slice doesn't need** — no outbox/search/caching until a shipped capability requires it.

---

## SECTION 33 — ADR STATUS REVIEW

| ADR | Status vs implementation |
|---|---|
| 0001 dino-vs-matter-ownership | Partially — Dino keeps a separate context/fact store (`matter-context-assembler.ts`); boundary intent held, data not yet unified |
| 0002 shared-intelligence-primitives | **Implemented** — `intelligence/core` is the clean shared leaf |
| 0003 event-driven-computation | **Implemented** — workflow `effect:"recompute"` → profile re-derive |
| 0004 matter-score-model | Implemented — `score/**` pure, versioned; note procedure/readiness dimension coupling |
| 0005 narrative-engine | **Implemented** — template-only, sentence provenance |
| 0006 persistence-strategy | Partially — persisted inputs exist but hydration under-backs the aggregate |
| 0007 shared-context-engine | Partially — context exists in Dino but not unified with Matter |
| 0008 source-of-truth-ownership | **Partially contradicted** — three fact vocabularies + Dino second fact store; stale triad comment |
| 0009 timeline-derived-projection | **Implemented** — `timeline.ts` pure, no table |
| 0010 matter-intelligence-derived | **Implemented** — nothing cached/persisted |
| 0011 bootstrap-canonical-path | Future decision (no bootstrap code yet) — consistent |
| 0012 confirmation-through-RPC | Future decision — enforced defensively by the intake guard |
| 0013 identity-authorization-source | Future decision — nothing contradicts it |
| 0014 no-workflow-bootstrap | **Implemented/honored** |

**Missing ADRs to add later (not now):** ADR — Matter-level authorization & confidentiality model; ADR — Application use-case layer pattern; ADR — Runtime validation / contract strategy; ADR — Legal-knowledge source-of-truth (code vs data); ADR — Error taxonomy & correlation IDs.

---

## SECTION 34 — FOUNDER DECISIONS REQUIRED

**Q1 (BLOCKING for 0.8 design). Matter-level authorization & confidentiality model.** Should privileged matter content (matters/notes/documents flagged `privileged`/`restricted`) be restricted to matter members + capability holders, or remain visible to all org members?
- *Recommended:* enforce matter-membership + `can_review/can_approve` in RLS (wire the existing dead model); confidentiality flags become real.
- *Why engineering can't decide alone:* it is a legal-ethics/product policy about who inside a firm may see privileged material.
- *Security consequence:* today all org members (incl. intern/paralegal) can read+mutate privileged content. *Product consequence:* stricter default may add sharing friction. **Blocking:** yes (0.8 authorization). Deferrable: no.

**Q2 (BLOCKING for Bootstrap). Approve the `app.bootstrap_matter_v1()` SECURITY DEFINER RPC + a minimal real-auth session for ActorContext** (already the two open Bootstrap decisions).
- *Recommended:* yes to both (there is no other way to get atomic multi-table Matter creation; supabase-js cannot transact). *Why not engineering-only:* it authorizes a privileged DB function and an auth surface. **Blocking:** yes. Deferrable: no.

**Q3 (non-blocking, product). Legal-knowledge source of truth: keep the recommendation-governing triad ontology as code, or move it to DB-backed data with a code-owned schema?**
- *Recommended:* keep as code through Bootstrap; plan a data-backed registry before non-engineers must update legal content. *Why not engineering-only:* it's about how the firm maintains legal knowledge operationally. **Blocking:** no. Deferrable: yes.

**Q4 (non-blocking). Confidentiality of audit/activity payloads.** Should Matter audit ever store raw case content, or only sanitized references + codes?
- *Recommended:* sanitized references + codes only (mirror `sanitizeAuditPayload`). **Blocking:** no; needed before persisted Matter audit (0.8/Bootstrap).

(Routine engineering choices — use-case functions vs classes, zod vs valibot, barrel layout — are **not** escalated; recommended above.)

---

## SECTION 35 — FIRST 90-DAY TECHNICAL PLAN

**Days 1–14 — Platform 0.7.1 (stabilize).** Fix DR-01 (fact gate) + tests; reconcile migration headers + additive `app.*` grant hardening (DR-02/03); write `MIGRATION_POLICY.md`; add `legal-knowledge` barrel + `matter/app/` seam; extract room-reducer audit/activity (DR-08 partial, DR-06 groundwork). **Exit:** all suites green; migration history truthful; no PUBLIC on `app.*`; advisor clean.

**Days 15–30 — Capability 0.8 Identity, part 1.** Supabase Auth session + `middleware.ts`; `ActorContext` resolver; wire `anonClient` for reads; replace `DEMO_SEED` tenant in the three sites; route tests (auth required, tenant-from-session). **Exit:** a logged-in user sees only their org's matters via **RLS** (not service role); routes carry correlation IDs.

**Days 31–60 — Capability 0.8, part 2 + authorization.** Capability model; **matter-level RLS** per Q1; wire `matter_members`/`matter_can_approve`; actor-bound persisted Matter audit (sanitized, Q4); RLS negative tests per matter table. **Exit:** privileged content enforced at the DB; audit is immutable + actor-bound; confidentiality is real.

**Days 61–90 — Matter Bootstrap.** `app.bootstrap_matter_v1` RPC (atomic, idempotent) + `DraftRepository` + child writers + `getHydratedFull`; generalize `BootstrapPlan`; illegal-status full-reject; runtime JSONB validation; one E2E intake→confirm→matter. **Exit:** a confirmed intake draft creates a real, hydrated Matter atomically with actor-bound audit, orphan-free, behind auth — the first true end-to-end vertical.

---

## FINAL VERDICT

### **B — Run a short Platform Stabilization slice (Platform 0.7.1) before Capability 0.8.**
The stabilization is **days, not a phase of paralysis**: three now-fixes (fact gate, migration headers, grant hardening) plus optional boundary seams. It is not A because a real correctness bug and reconciliation drift should not underpin identity work; it is not C because those fixes are cleaner done outside 0.8; it is emphatically not D.

1. **Top five strengths:** pure/versioned/traceable engines; type quarantine; migration/reconciliation discipline; intake safety spine + provider re-validation; clean shared kernel + RSC boundary.
2. **Top five risks:** allegation-advances-stage fact gate; decorative intra-tenant authorization (dead `matter_can_approve`); three epistemic vocabularies + Dino second fact store; no `legal-knowledge` public API; Dino `orchestrator.ts` god-function.
3. **Exact blockers (for the *next* work):** DR-01 (before 0.8), DR-05 auth/ActorContext (is 0.8), DR-11 Bootstrap RPC + DR-10 runtime validation (before Bootstrap), Q1 + Q2 founder decisions.
4. **Exact non-blockers:** caching, Outbox, search, persisted Workflow, form primitives, Dino god-function split, legal-ontology single-sourcing, repo-convention unification.
5. **Recommended next capability:** Platform 0.7.1 → **Capability 0.8 Identity**.
6. **Recommended first implementation prompt:** *"Platform 0.7.1 — Critical cleanup: fix the stage-advancement fact gate to require confirmed/document-derived facts (`state-machine.ts`) with tests; reconcile the `capability1`/`slice2` migration headers to APPLIED and add one additive migration revoking PUBLIC EXECUTE on all remaining `app.*` SECURITY DEFINER helpers; write MIGRATION_POLICY.md. No feature work, no schema change beyond grants, founder-gated apply."*
7. **What not to touch:** the engines, the intake spine, the migration reconciliation discipline, the type quarantine, `intelligence/core`, and the intake-drafts RLS model.
8. **Is Matter Bootstrap architecture still approved?** Yes — the review found no contradiction; the doc's Verdict B (viable, pending the two founder decisions) stands, and the hardened drafts schema is a correct foundation for it.
9. **Is the modular-monolith direction still appropriate?** Yes — decisively. Atomicity needs, one team, one DB, cohesive modules; microservices are unjustified.
10. **Is any rewrite justified?** No. Targeted corrections only.

---

## VALIDATION APPENDIX

**Exact files/areas inspected:** `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`; `src/config/navigation.ts`; all `src/app/**` routes/pages/layouts; `src/modules/matter/**` (view, engines, score, narrative, intake, providers, persistence, documents, workflow, activity, state-machine, profile, intelligence, fixtures); `src/modules/intelligence/**`; `src/modules/dino/**` (orchestrator, context, retrieval, classification, coverage, providers, policies, index); `src/modules/legal-knowledge/**` (triad, research, case-law, procedure, repositories, ingestion, seed, corpus, benchmark, observability); `src/modules/shell/**`, `src/modules/today/**`; `src/design-system/**`; `src/lib/legal/**`; `src/types/database.types.ts`; all 7 `supabase/migrations/*`; `supabase/tests/**` (`rls_validation.sql`, `remote_rls_validation.sql`, `intake_drafts_hardening/**`); `docs/architecture/**` (matter-bootstrap-engine-review, intake-draft-schema-reconciliation, ADR-0001..0014).

**Exact searches run (repo-wide):** `service_role`/`serviceRole`; `DEMO_SEED`/`demo`/`seed`; `\.rpc(`; `actorId`/`getUser`/`getSession`/`auth.getUser`; `organizationId` in routes; `TODO|FIXME|HACK|XXX` (0 hits); `:\s*any|as any` (4 non-test hits); `matter_can_approve`/`can_review`/`can_approve`; `blockingConditions`/`!== "unknown"`; `database.types` importers (7, all persistence); cross-module import edges (dino→legal-knowledge, matter/intake→dino/legal-knowledge); `middleware.ts` (absent); `zod` (absent). Plus catalog/RLS verification on Development performed in the prior arc (migration history, policies, function grants).

**Known limitations of this review.**
- Dependency direction was assessed by targeted import inspection + the six deep-reads, not an exhaustive AST graph; no automated cycle-detector was run (none is configured). No cycles were observed but this is not a proof.
- Route behavior was read, not executed; no live request tracing.
- Remote DB claims (RLS/grants/history) rest on the prior arc's verified probes plus migration files; this run did not re-query Development (architecture-only, no DB access).
- The `matter_*` intra-tenant finding assumes real multi-tenant data; today only demo/dev data exists, so it is a latent (not yet exploited) exposure — severity is ranked for the post-auth world.
- Line numbers cite the state at HEAD `5e85cc2`; a linter reformatted an unrelated `/tmp` test file during the session (not part of the repo).

*No implementation files were modified. No migration, DB change, commit, push, or deploy performed. Awaiting founder review.*
