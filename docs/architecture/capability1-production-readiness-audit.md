# Capability 1 — Matter Bootstrap Engine — Production Readiness Audit & Closure

> **STATUS: FROZEN (2026-07-25). Verdict A — Production Ready.** Capability 1 is
> frozen. Future changes require a new major version. Tag: `capability1-frozen`.

Status record for the Principal Production-Readiness Audit and the Slice 1.0.F
hardening that closed it. Development project `udispadsbxqicmawqcuk`. Production
never touched.

## Original verdict

**B — Production Ready After Minor Corrections.** No Critical/High findings, no
redesign, no transaction/authorization/RPC/validation replacement. Findings:
F1 authority drift, F2 unbounded aggregate, F3 procedure drift, F4 gateway
security not permanently CI-enforced, F5 slug unique-violation handling,
F6 denied-attempt audit (deferred), F7 post-commit outbox (deferred),
F8 gateway not applied/live-proven on Development.

## AggregateLimitPolicy v1 (`bootstrap-aggregate-limits-v1`)

Hard blocking ceilings — no truncation, no sampling, no silent drop:

| collection | ceiling |
|---|---|
| contacts | 100 |
| participants | 100 |
| facts | 500 |
| deadlines | 200 |
| evidence | 200 |
| members | exactly 1 (owner bound to the confirming actor) |

Single source of truth: `src/modules/matter/bootstrap/aggregate-limits.ts`.
Enforced as blocking issues by the Validation Engine (`TOO_MANY_CONTACTS`,
`TOO_MANY_PARTICIPANTS`, `TOO_MANY_FACTS`, `TOO_MANY_DEADLINES`,
`TOO_MANY_EVIDENCE_ITEMS`, `INVALID_MEMBER_COUNT`) → application
`VALIDATION_BLOCKED`. Mirrored (equal-or-stricter) by the RPC persistence
backstop, which returns `BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED` before any write →
application `BOOTSTRAP_LIMIT_EXCEEDED` (safe Hebrew copy, no DB internals). The
TS numbers and the SQL backstop numbers are CI-verified identical.

## Permanent cross-layer CI invariants

- **bootstrap-confirm-authority-alignment** — the roles granted the `intake.confirm`
  capability (`ROLE_CAPABILITIES`) equal the roles accepted by the persisted RPC
  authority `app.can_confirm_intake_draft` (`owner`, `partner`), checked over the
  full membership vocabulary (owner/partner/admin/lawyer/paralegal). The two models
  stay separate; CI fails on drift in either direction.
- **bootstrap-procedure-alignment** — `SUPPORTED_MATTER_PROCEDURE_TYPES` equals the
  set accepted by `app.initial_stage_for` (all 12 types; no duplicates).
- **bootstrap-limit-alignment** — TS `BOOTSTRAP_AGGREGATE_LIMITS` equals the RPC
  backstop numbers.
- **bootstrap-gateway-forwards-only** — `public.bootstrap_matter_v1`'s body must be
  exactly `select app.bootstrap_matter_v1(p_payload)` (no table access, no dynamic
  SQL, no other `app.*` reference). Enforced statically (migration inspection) and
  at runtime (SQL harness G32).

Freeze gate command: `npm run capability1:freeze-check` (lint, typecheck, build,
Bootstrap/integration/identity/matter suites, then the disposable-PostgreSQL SQL
security gate: RLS, primitives, RPC, actor-resolution, public gateway, production
hardening, alignment). No `|| true`; fails hard if PostgreSQL tooling is absent.
Enforced in CI via `.github/workflows/capability1-freeze.yml`.

## Public gateway — Development apply & live E2E

`20260724150000_capability1_bootstrap_public_gateway.sql`
(SHA-256 `22a5a2410408a23c4664f19baf6c87744bdd1730a4ea8c8e0d08fdf481f2afea`) applied
and registered on Development. Live E2E through the real gateway
(`public.bootstrap_matter_v1` → `app.bootstrap_matter_v1` → Matter), as an
authenticated actor: happy path `MATTER_CREATED` (stage `intake`, evidence
`document`, member partner, org from Draft, audit present, Draft confirmed); retry
`ALREADY_COMMITTED` (one Matter); wrong token `STALE_DRAFT`; ordinary-member and
cross-tenant `NOT_AVAILABLE`; anon/service gateway denied; authenticated direct
internal RPC denied (`permission denied for schema app`); raw Matter write denied
(RLS). Fixtures cleaned to baseline. `authenticated` holds no app-schema USAGE.

## Slug-collision decision (F5)

Implemented narrowly: the deterministic primary slug is preserved when free; on the
EXACT `matters_organization_id_slug_key` violation only, the RPC retries once with
the full-uuid slug (collision-free for distinct Drafts); any other unique violation
re-raises (never swallowed) and rolls back to `ready_for_review`. No change to the
canonical Matter identity model, idempotency, or transaction semantics. Delivered
in the production-hardening migration (RPC backstop).

## Finding closure

| Finding | Status | Evidence |
|---|---|---|
| F1 authority drift | CLOSED | authority-alignment TS test + SQL runtime harness |
| F2 unbounded aggregate | CLOSED | Validation ceilings + RPC backstop + limit-alignment test |
| F3 procedure drift | CLOSED | procedure-alignment TS test + SQL runtime harness |
| F4 gateway CI enforcement | CLOSED | forwards-only static+runtime gates in `capability1:freeze-check` + CI workflow |
| F5 slug handling | CLOSED | narrow retry in RPC backstop + hardening harness |
| F8 gateway apply + live E2E | CLOSED | applied + live-proven on Development (above) |
| F6 denied-attempt durable audit | DEFERRED (owner: future Bootstrap/observability slice) | out of scope for 1.0.F |
| F7 post-commit outbox/effects | DEFERRED (owner: Post-Commit Effects capability) | out of scope for 1.0.F |

## Migration status

- Applied to Development: `20260724120000`, `20260724130000`, `20260724140000`,
  `20260724150000` (gateway), `20260724160000` (production hardening).
- `20260724160000_capability1_bootstrap_production_hardening.sql`
  (SHA-256 `74c8070f3ffe6842189c886d9808d0b9b27046e156e1d92c94e6e7952b819f31`)
  **APPLIED and registered exactly once** on Development (2026-07-25). The live
  `app.bootstrap_matter_v1` now carries the aggregate-limit backstop
  (`BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED`) and the narrow
  `matters_organization_id_slug_key` retry; owner remains `lawme_bootstrap`,
  actor resolved via `app.actor_uid()`. All preflight + postconditions passed.

## Final freeze — live proof (Development, 2026-07-25)

Seven live proofs executed through the real public gateway
(`public.bootstrap_matter_v1` → `app.bootstrap_matter_v1`) as authenticated actors,
against isolated fixtures torn down to baseline afterward (demo org/matter untouched):

| Proof | Result |
|---|---|
| Aggregate-limit backstop (501 facts) | `BOOTSTRAP_AGGREGATE_LIMIT_EXCEEDED`, zero writes, draft unchanged |
| Slug collision (two drafts, shared 18-char prefix) | both `BOOTSTRAP_CREATED`; second slug falls back to full-uuid `m-…8000000000000002` |
| Happy path (partner, full aggregate) | `BOOTSTRAP_CREATED` (1 contact/participant/fact/deadline/evidence) |
| Idempotent retry (same key + planHash) | `BOOTSTRAP_ALREADY_COMMITTED`, same matterId, one matter |
| Rollback (unmapped participant reference) | `BOOTSTRAP_INVALID_REFERENCE` raised, whole RPC rolled back, draft still `ready_for_review` |
| Authorization (paralegal) | `BOOTSTRAP_NOT_AVAILABLE`, no write |
| Cross-tenant denial (other-org partner) | `BOOTSTRAP_NOT_AVAILABLE`, no write |

`npm run capability1:freeze-check` — all application gates + all SQL security
harnesses (rls_alignment, bootstrap_primitives, bootstrap_rpc, actor_resolution,
production_hardening, alignment_sql, public_gateway) PASS. No regression.

## Final closure verdict

**Verdict A — Production Ready. Capability 1 STATUS: FROZEN (2026-07-25).**
F1–F5 and F8 CLOSED; F6/F7 intentionally deferred to their named future owners.
The production-hardening migration is applied and live-proven on Development, the
freeze gate is green, and CI enforces it permanently. Capability 1 is frozen —
future changes require a new major version. Production untouched.
