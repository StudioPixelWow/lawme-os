# Bootstrap Authorization Envelope — Trust-Boundary Architecture

Capability 1 · Slice 1.0.3C (architecture-only). Companion to
`MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md` (§Atomic Bootstrap RPC) and
`BOOTSTRAP_RPC_SECURITY_APPENDIX.md`. This run designs a signed
`BootstrapAuthorizationEnvelope` and decides whether it is a **safer, cleaner** trust
boundary than a dedicated `lawme_bootstrap NOLOGIN BYPASSRLS` role. No code, migration,
role, or database object was created; Development was read-only.

**Bottom line (see §Verdict):** the envelope is a coherent, buildable design, but under the
*actual* constraints it **does not remove the privileged-owner or the transition-channel
requirement**, and its main theoretical benefit — proving capability the DB "cannot" check —
is **redundant here because `intake.confirm` (owner/partner) is already SQL-expressible**.
In-DB verification is limited to **symmetric HMAC**, which forces a **shared secret into the
database**, a *worse* secret posture than a role. **Verdict C: retain the dedicated-role
model** (and address the BYPASSRLS concern with the owner-exemption + minimal-helper variant
in §19).

## Grounded crypto facts (live Development, read-only)

| Fact | Value |
| --- | --- |
| `extensions.hmac(text,text,text)` / `digest` | **present** (HMAC-SHA-256 verifiable in-DB) |
| Asymmetric verify (Ed25519 / ECDSA / RSA) | **absent** — no in-DB signature verification |
| `pgsodium` / `pgjwt` | **not installed** |
| `supabase_vault` (`vault` schema) | **installed** (can hold a symmetric secret) |

Consequence: any *in-database-verified* envelope must be **symmetric HMAC** with the secret
stored in Vault and decryptable by the RPC owner — i.e. a signing secret lives in the DB.
Asymmetric (DB holds only a public key) is **not possible** without a C extension Supabase
does not permit.

---

## PHASE 1 — Trust boundaries

| # | Boundary | Trusted in | Untrusted in | Secret/authority | Verifies | On failure |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Browser | nothing | all user input | user access token (in memory) | nothing | — |
| 2 | Next.js route/action | verified session | request body | Supabase server client; **would hold HMAC secret if signer lives here** | session, command shape | 401/400 |
| 3 | Supabase Auth | JWT signature | — | JWT keys (Supabase) | token | reject |
| 4 | ActorContext | resolved identity | — | — | membership/role | deny |
| 5 | Capability Policy Engine | ActorContext | — | — | category capability | deny |
| 6 | Resource Auth Policy Engine (pure) | facts | — | — | `intake.confirm` resource gate | deny |
| 7 | Validation Engine (pure) | draft+approvals | raw draft shape | — | validity | fail-closed |
| 8 | Aggregate Planner (pure) | ValidatedDraft | — | — | — | — |
| 9 | **Envelope signer** | prior decisions | — | **signing secret** | that all upstream passed | refuse to sign |
| 10 | PostgREST/RPC boundary | JWT (if user-invoked) | **entire payload** | — | grants | 404/permission |
| 11 | PostgreSQL RPC | `auth.uid()` (if user JWT) | payload, envelope | **HMAC secret (Vault) if DB verifies** | envelope + all invariants | stable error |
| 12 | Draft transition trigger | OLD/NEW | — | — | sanctioned channel | reason code |
| 13 | Matter/child tables | — | — | — | org-consistency triggers, CHECKs | reject |
| 14 | Audit | — | — | — | append-only | rollback |
| 15 | Post-commit worker | committed Matter | — | — | derived only | retry |

The envelope is **created at (9)** and **verified at (11)** — verification MUST be at the DB
boundary, because verifying only at the server (2) leaves a direct PostgREST caller (10→11)
unchecked, which is the whole reason the envelope would exist.

---

## PHASE 2 — Threat model

Legend: **DB-reval** = database must still revalidate live state regardless of the envelope.

| Threat | Mitigation | Residual | DB-reval? | Envelope helps? |
| --- | --- | --- | --- | --- |
| Browser calls RPC without server auth | no valid envelope (if DB verifies) OR SQL `can_confirm` (role model) | — | yes | marginal (SQL already covers) |
| Replay a valid old envelope | short expiry + idempotency reconcile | replay within TTL → returns original Matter (harmless) | yes | neutral |
| Alter draftId / actorId / orgId / idempotencyKey | signed binding breaks signature | — | **yes** (org from draft, actor from `auth.uid()` already) | redundant with server-derivation |
| Alter planHash / aggregate content | byte-hash binding (Phase 13B) breaks signature | — | content is self-scoped anyway | only if content-integrity is a goal |
| Envelope for another Draft / another actor | binding mismatch | — | yes | yes, but SQL binding also catches |
| Envelope after membership revocation | short expiry limits race | membership lost within TTL | **yes (RPC re-checks active membership)** | no — DB must recheck |
| Envelope after Draft edit | `versionToken` binding + DB token check | — | **yes** | redundant |
| Envelope after reject/expire | DB state check (`ready_for_review`) | — | **yes** | no — DB must recheck |
| Steal envelope from logs | never log envelope (Phase 17); short TTL | — | yes | — |
| Two concurrent requests | `FOR UPDATE` draft lock + idempotency | one wins, other reconciles | yes | neutral |
| Old signing key obtained | rotation + keyId allow-list; revoke key | forged envelopes until revoke | yes | **new risk the role model lacks** |
| Key rotation during retry | overlap window (accept prev keyIds) | — | — | operational cost |
| RPC response lost after commit | idempotent retry returns original | — | yes | neutral |
| Server route compromised | can mint arbitrary envelopes | **full compromise** (same as role model: attacker has server) | yes | no improvement |
| service-role key exposed | RPC needs user JWT OR envelope; service alone insufficient | envelope model: attacker still needs the HMAC secret | yes | slight — but adds the secret to protect |
| RPC called outside PostgREST (psql) | `EXECUTE` grants; channel `current_user` | — | yes | no |
| Clock skew | ±60 s tolerance | — | — | — |
| Oversized envelope/payload | size caps | — | — | — |
| Algorithm confusion | fixed `alg`, reject others; DB only does HMAC | — | — | — |
| Malformed signature encoding | strict base64url parse | — | — | — |

**Key finding:** the majority of threats require **DB revalidation of live state anyway**
(membership, draft state, version, org). The envelope only adds value for "prove the app's
*capability* decision," and it introduces a **new secret + new key-compromise surface**.

---

## PHASE 3 — Envelope responsibility

Attests exactly: *"The LawME server authorized actor X (authUserId/profileId), in org Y, to
bootstrap Draft D at version V (schema S) using aggregate plan hash H (sourceInputHash I),
idempotency key K, under policy versions P/C and bootstrap/planner/aggregate/validation
versions, issued at t0, valid until T."* It attests **nothing about live state** (membership,
draft status, version currency, matter existence, cross-tenant safety) — all of which the RPC
must still verify. It carries **no confidential content** (no title, fact text, names,
narrative, tokens, secrets).

---

## PHASE 4 — Canonical claims contract

`BootstrapAuthorizationEnvelopeClaims` (immutable; strict allow-list; unknown fields rejected):

| Field | Format | Req | Notes |
| --- | --- | --- | --- |
| `version` | `"bootstrap-auth-envelope-v1"` | ✓ | exact |
| `issuer` | `"lawme-server"` | ✓ | exact |
| `audience` | `"app.bootstrap_matter_v1"` | ✓ | exact |
| `keyId` | `^[a-z0-9-]{8,40}$` | ✓ | Vault key ref |
| `jti` | uuid v4 | ✓ | correlation only (no replay table) |
| `issuedAt`/`notBefore`/`expiresAt` | RFC3339 UTC, second precision | ✓ | `expiresAt-issuedAt ≤ 120s` |
| `actor.authUserId` / `actor.profileId` | uuid | ✓ | equal for users |
| `organizationId` | uuid | ✓ | must equal the Draft's org (DB-derived) |
| `draft.id`/`draft.versionToken`/`draft.schemaVersion` | uuid / text≤64 / text≤64 | ✓ | binding |
| `plan.planHash`/`plan.sourceInputHash` | `^[0-9a-f]{64}$` | ✓ | binding |
| `plan.aggregateVersion` | int | ✓ | |
| `plan.plannerVersion`/`validationVersion`/`bootstrapVersion` | text≤64 | ✓ | |
| `idempotencyKey` | text≤200 | ✓ | |
| `policy.resourceAuthorizationVersion`/`capabilityPolicyVersion` | text≤64 | ✓ | freshness of the rule |
| `correlationId` | uuid | ✓ | telemetry |

Serialization: **UTF-8 JSON, sorted keys, no insignificant whitespace, no duplicate keys, no
NaN/Infinity**; envelope wire form = `base64url(claimsJSON) + "." + base64url(HMAC)`; total
≤ **4 KB**. Excluded (never present): role labels, capability arrays, participant/contact/fact
text, Matter title, document metadata, raw session/access token, service-role secret.

---

## PHASE 5 — Signature model

| Option | In-DB verify? | Secret in DB? | Verdict |
| --- | --- | --- | --- |
| **A. HMAC-SHA-256 (shared secret)** | ✅ `extensions.hmac` | **yes (symmetric)** | only viable in-DB option |
| B. Ed25519 | ❌ not available | n/a | impossible in-DB |
| C. ECDSA P-256 | ❌ | n/a | impossible in-DB |
| D. RSA-PSS | ❌ | n/a | impossible in-DB |
| E. Custom/Supabase JWT | ❌ (no pgjwt) | — | not in-DB verifiable |
| F. DB-minted token | — | — | just relocates the same secret |

Only **A (HMAC-SHA-256)** can be verified inside PostgreSQL with the installed extensions.
That means the **verifier (the database) must hold the same secret as the signer**. The
secret would live in **Supabase Vault** (`vault.decrypted_secrets`), readable by the RPC
owner / `postgres` / `service_role`. **This is the crux:** the envelope's in-DB verification
*requires putting a signing secret into the database* — which is a **larger** secret-management
surface than a NOLOGIN role that holds no secret at all. (If instead the envelope were verified
only server-side, it would not defend against direct PostgREST invocation and would add nothing
over the already-analysed direct-exposure model.)

---

## PHASE 6 — Secret storage

Recommended (if the envelope were adopted): **Supabase Vault**, one secret per `keyId`,
decrypted inside the SECURITY DEFINER verify helper only, never returned. It must never appear
in migrations, source, logs, RPC output, or be readable by `authenticated`/`anon`. Honest
comparison: a NOLOGIN role stores **no secret**; the envelope stores a **symmetric secret the
DB can decrypt**, which `postgres`/`service_role`/Vault-admin can read. On the specific axis
the founder is worried about (privileged surface), the envelope **adds** a high-value secret
rather than removing a privileged identity.

---

## PHASE 7 — Signing service (design only)

`src/modules/matter/bootstrap/authorization-envelope/` →
`createBootstrapAuthorizationEnvelope({actorContext, authorizationDecision, validatedDraft,
aggregatePlan, idempotencyKey, correlationId, now, keyId})`. Requires: an **allowed**
`ResourceAuthorizationDecision` for `intake.confirm`, matching ActorContext/Draft/org/
versionToken/planHash, supported policy+engine versions. Rejects: denied/mismatched/stale
inputs. Pure except the injected `now`, `keyId`, and a `sign(bytes)` port (so the secret stays
outside the pure core). Not implemented in this run.

---

## PHASE 8 — Lifetime

**expiresAt − issuedAt ≤ 120 s** (recommend **90 s**); `notBefore = issuedAt − 60 s` clock
skew; single Bootstrap attempt; never cached or stored. **Retry after commit does NOT need a
valid envelope** — the RPC recognises the committed Draft and returns the original Matter
(idempotent path) before/independent of envelope expiry. **Reconciliation (`getBootstrapStatus`)
needs no envelope** (read-only, RLS-gated). This keeps the TTL short without breaking retries.

---

## PHASE 9 — Replay protection — **Option E**

No replay table. Rationale: **idempotency (unique `(org,key)` + `FOR UPDATE` + confirmed-row
immutability) protects the business effect** (never a second Matter); **short expiry + binding
protect authorization freshness**. A *duplicate valid* envelope for the same Draft/key/plan is
**not an attack** — it is reconciled to `BOOTSTRAP_ALREADY_COMMITTED` returning the original
Matter. A `jti` replay table would add write-amplification and a new failure mode for zero
security gain. (`jti` is kept for telemetry only.)

---

## PHASE 10 — Verification sequence (if adopted)

Parse wrapper → size cap → `version` → `issuer` → `audience` → resolve secret by `keyId`
(reject unknown) → reconstruct canonical bytes → `extensions.hmac` compare (length-checked) →
`notBefore/expiresAt` (±skew) → (if user-invoked) `auth.uid() = actor.profileId` → **lock
Draft `FOR UPDATE`** → derive org from Draft → compare envelope bindings (draft id/version/
org/actor/planHash/idempotencyKey) → **re-check active membership** → **re-check creator/
reviewer** → **re-check `ready_for_review` + version token** → idempotency → materialize.
Failure mapping: cryptographic/binding failures →
`BOOTSTRAP_AUTHORIZATION_ENVELOPE_INVALID`; draft-absent/unauthorized → opaque
`BOOTSTRAP_NOT_AVAILABLE` (never reveal existence). Note steps 12–16 are the **same live-state
checks the role model already performs** — the envelope adds steps 1–11 on top.

---

## PHASE 11 — Browser exposure — **envelope never browser-visible**

Recommended: the browser calls a **server confirmation endpoint**; the server authorizes,
mints the envelope (if adopted), and **calls the RPC within the same server request**; the
browser never receives the envelope (avoids XSS/devtools/log leakage and client complexity).
Invocation preserves `auth.uid()` **only if the server calls with the user's Supabase server
client (user JWT)** — but if it does, `auth.uid()` is grounded and the SQL `can_confirm`
check already suffices, so the envelope is redundant. If instead the server calls via
`service_role` (no `auth.uid()`), the envelope would be the actor proof — but then the
transition channel + "service-role is not authorization" problems return (Phase 19). Either
way the envelope does not simplify invocation.

---

## PHASE 12 — Capability authority — **redundant here**

The envelope's raison d'être is to avoid reproducing the TS capability map in SQL. But
`intake.confirm` is granted **only to `owner`/`partner`**, and `organization_memberships.role`
is a persisted CHECK column, so a 6-line `app.can_confirm_intake_draft` expresses it exactly
(see the RPC appendix §2). The envelope would carry only policy **versions** (not capability
arrays) and the RPC would **still re-check active membership + creator/reviewer** anyway (role
can change after issuance; short TTL only shrinks the race). Net: the envelope's capability
benefit is **already available without it**.

---

## PHASE 13 — Plan binding — **B (byte-hash) is required if content-integrity is a goal**

Chosen: **B** — sign the SHA-256 of the **exact canonical aggregate JSON text** transmitted to
the RPC. The RPC receives `p_envelope text` + `p_aggregate_json text`, computes
`extensions.digest(p_aggregate_json,'sha256')`, compares to the signed hash **before** parsing
to `jsonb` (jsonb normalization would destroy byte-equivalence — so we hash the raw text, not
`jsonb::text`). Options A (recompute the TS canonical hash in SQL — high divergence risk), C
(equivalent to B), D (reconstruct plan in SQL — reimplements the planner), E (insufficient) are
rejected. **Important:** B *works*, but it only matters if we treat aggregate content as
security-sensitive. The RPC design already establishes content tampering is **self-scoped**
(own Draft, own org, bounded by CHECKs), so B defends against a non-escalation. `planHash`
remains the idempotency signal; B would add integrity we do not strictly need.

---

## PHASE 14 — Canonical serialization

For binding **B**, canonicalization is only needed for *determinism/idempotency*, not for the
byte-hash (the transmitted bytes are authoritative). The existing
`src/modules/matter/bootstrap/hash.ts` `canonicalize()` (sorted keys, `JSON.stringify` values,
finite numbers only) is **sufficient for producing the transmitted canonical text** and for
`planHash`. Full RFC 8785 JCS is **not required** because SQL never re-serializes — it hashes
the received bytes. Smallest contract adjustment if adopted: expose the exact canonical text
the signer hashed (a `serializeAggregateCanonical()` returning the byte-identical string).
Test vectors would pin TS-produced bytes. No change to the frozen 1.0.1/1.0.2 contracts.

---

## PHASE 15 — Key rotation

`keyId` per key; active signing key + set of accepted verification keyIds (overlap window ≥ one
max-TTL, ~5 min); rotation cadence ~90 days; emergency revoke = drop the keyId from the accepted
set (Vault) → all its envelopes rejected next call; unknown `keyId` always rejected; deploy
order = add new verify key everywhere → switch signer → retire old after overlap; strict
Development/Production key separation; rotations audited. This machinery is **entirely new
surface** the role model does not have.

---

## PHASE 16 — Failure model

All cryptographic/binding failures → internal `BOOTSTRAP_AUTHORIZATION_ENVELOPE_INVALID`,
external opaque, HTTP 400, non-retryable, telemetry-logged (no crypto detail to client).
Live-state failures reuse the RPC model: `BOOTSTRAP_STALE_DRAFT` (409, retry after refresh),
`BOOTSTRAP_IDEMPOTENCY_CONFLICT` (409), `BOOTSTRAP_ALREADY_COMMITTED` (200 idempotent),
draft-absent/unauthorized → `BOOTSTRAP_NOT_AVAILABLE` (404, anti-enumeration). `signer
unavailable`/`key unavailable`/`db verification unavailable` → 503 retryable, **no** partial
state. Expired/not-yet-valid → `…ENVELOPE_INVALID`.

---

## PHASE 17 — Observability

Log: envelope version, keyId, `hash(jti)`, actor id, org id, draft id, planHash, issuedAt,
expiry, verification result code, policy version, correlationId, latency. **Never** log: the
signature, the secret, any key material, the full envelope, aggregate content, confidential
Draft data, or access tokens.

---

## PHASE 18 — Dedicated role vs Envelope (rigorous)

| Criterion | Dedicated NOLOGIN role (Model A / owner-exemption variant) | Authorization Envelope (HMAC) |
| --- | --- | --- |
| Security boundary | function-owner identity (`current_user`) | cryptographic proof of prior app auth |
| RLS bypass | via BYPASSRLS **or** postgres owner-exemption | **does not grant any write ability** |
| Authorization duplication | one 6-line SQL helper (`can_confirm`) | avoids helper, but adds signer+verifier |
| Secret management | **none** | **symmetric secret in Vault (DB-readable)** |
| Direct browser safety | safe (SQL revalidation) | safe (if DB verifies) — but same SQL revalidation still runs |
| Plan tamper resistance | self-scoped; not needed | byte-hash binding (extra) |
| Replay | idempotency handles it | idempotency handles it + TTL |
| Rotation | n/a | new rotation lifecycle |
| Auditability | role + audit row | keyId/jti + audit row |
| Operational complexity | **low** | **high** (Vault, keys, canonical bytes, rotation) |
| Supabase portability | high | medium (Vault + HMAC coupling) |
| Failure modes | few | many (crypto, key, clock, encoding) |
| Blast radius | role reachable only via one RPC | **secret compromise forges any authorization** |
| Testability | SQL harness (already built for 1.0.3) | crypto vectors + canonical-bytes + SQL |
| Long-term maintainability | high | lower (dual signer/verifier + key ops) |

**Persistence-privilege answer (decisive):** an Authorization Envelope **does not** give the
RPC permission to write through RLS. Writes still require **one of**: SECURITY DEFINER owned by
`postgres` (owner-exemption, since `force_rls=off`), a dedicated table owner, a BYPASSRLS role,
explicit grants + per-role write policies, or a narrow internal helper. **The envelope is
orthogonal to write privilege.** It therefore **cannot** be a replacement for the privileged
owner; at best it replaces the SQL capability helper — which is trivial and already exists.

---

## PHASE 19 — Transition channel under the envelope model — **decisive**

Does the envelope remove the need for a distinct `current_user`? **No.** Even with a verified
envelope, the guard must ensure the `→confirming/confirmed` transition happens **only inside
the full RPC transaction** (with all its invariants), not via a raw authorized `UPDATE`. If the
*trigger itself* verified the envelope (option 6), any holder of a valid envelope could drive
the transition through a bare `UPDATE`, skipping the RPC's other checks — a regression. A
GUC/session marker (option 4) is caller-settable → rejected. `pg_backend_pid`/trigger-depth →
not authorization. So the channel still needs **`current_user` = a dedicated function-owner
role** (option 1/3).

**The founder's real concern (avoid BYPASSRLS) is solvable *without* an envelope:** own the RPC
with **`postgres`** (writes via owner-exemption — no BYPASSRLS) and own **only a minimal
`app.bootstrap_confirm_transition()` helper** with a dedicated **NOLOGIN (no BYPASSRLS)** role,
granting that role a single permissive RLS policy + `UPDATE` on `matter_intake_drafts`. Then
`current_user` inside the helper = the dedicated role (clean channel), the big inserts run as
`postgres` (owner-exemption), and **no BYPASSRLS attribute exists anywhere**. This is the
recommended way to retire the BYPASSRLS question — orthogonal to, and simpler than, an envelope.

---

## PHASE 20 — Migration impact

| Prepared primitive | Under envelope model | Reason |
| --- | --- | --- |
| `confirmation_plan_hash` | **keep** | idempotency (unchanged) |
| `confirmation_bootstrap_version` | **keep** | audit/compat |
| `confirmed_at` | **keep** | audit/reconcile |
| unique `confirmed_matter_id` | **keep** | 1:1 |
| transition CHECKs | **keep** | invariants |
| transition guard | **keep** (channel via `current_user`) | envelope doesn't replace it |
| `lawme_bootstrap` role | **keep or replace with no-BYPASSRLS variant** | still needed for channel |
| **BYPASSRLS** | **removable** via owner-exemption + helper (Phase 19) — **not** via envelope | privilege ≠ crypto |
| grants | **keep** (+ Vault EXECUTE only if envelope adopted) | — |

The envelope would **add** (not remove): a Vault secret, `app.verify_bootstrap_envelope`, key
rotation, and `p_aggregate_json` handling. It removes nothing from the prepared migration.

---

## PHASE 21 — Implementation sequence

**If the envelope is rejected (recommended):** next slice is **1.0.4 — Atomic Bootstrap RPC**
under the dedicated-role model, with the Phase-19 owner-exemption variant if the founder wants
to avoid BYPASSRLS. The prepared 1.0.3 migration is applied (unchanged for Model A, or narrowly
revised for the no-BYPASSRLS variant), then the RPC + `can_confirm_intake_draft` +
`initial_stage_for` + child grants land.

**If the envelope were adopted:** 1.0.3D envelope contracts+signer (TS, no DB) → 1.0.4 migration
revision (Vault secret ref, verify helper, channel) → 1.0.5 SQL verification primitive + crypto
tests → 1.0.6 RPC + harness → 1.0.7 integration. (Two extra slices, one new secret, one key
lifecycle — for no net privilege reduction.)

---

## PHASE 22 — Founder decisions

| # | Decision | Recommendation | Blocker |
| --- | --- | --- | --- |
| 1 | Envelope vs role | **Dedicated-role model (no envelope)** | governs everything below |
| 2 | Signature algorithm | n/a (only HMAC possible in-DB; declined) | — |
| 3 | Key storage | n/a (no signing key) | — |
| 4 | Envelope browser visibility | n/a (would be server-only) | — |
| 5 | Lifetime | n/a | — |
| 6 | Replay model | n/a (idempotency suffices) | — |
| 7 | Aggregate hash/canonicalization | keep `planHash` for idempotency; no byte-binding | not needed |
| 8 | Keep persisted SQL role/capability checks | **yes — `can_confirm_intake_draft` is the authority check** | blocks RPC (1.0.4) |
| 9 | Transition channel | **`current_user` = dedicated NOLOGIN role**; BYPASSRLS optional (avoidable via owner-exemption + helper) | blocks migration apply |
| 10 | RPC exposure grant | `EXECUTE` to `authenticated` (user-JWT invocation) | blocks RPC |

The single privileged approval remains **#9** (a dedicated role). #1 resolves the envelope
question; #8/#9/#10 are the same decisions surfaced in 1.0.3B.

---

## Verdict

**C — the Authorization Envelope adds complexity without sufficient security benefit; retain
the dedicated-role model.** Reasons, grounded not rhetorical: (1) in-DB verification is
**HMAC-only**, forcing a **symmetric secret into the database** — a worse secret posture than a
secretless NOLOGIN role; (2) the envelope's core benefit (capability the DB cannot check) is
**redundant** because `intake.confirm` (owner/partner) is SQL-expressible; (3) the envelope
**does not grant write privilege** and **does not remove the `current_user` transition channel**,
so a privileged owner is still required; (4) it introduces a signer, a key-rotation lifecycle, a
canonical-bytes binding, and a new key-compromise blast radius; (5) the founder's actual concern
— avoiding **BYPASSRLS** — is better solved by the **owner-exemption + minimal transition-helper**
variant (Phase 19), which needs no BYPASSRLS and no envelope. Adopt the dedicated-role model;
proceed to the Atomic Bootstrap RPC (1.0.4).

---

## Applied-State Reconciliation — Slice 1.0.4B (Development)

*Status confirmed by the applied Development state (`udispadsbxqicmawqcuk`); full record
in `MATTER_BOOTSTRAP_ENGINE_ARCHITECTURE.md`. Production untouched.*

The **Authorization Envelope remains rejected for v1**. The applied Bootstrap path uses
the dedicated-role model (`lawme_bootstrap`, NOLOGIN + BYPASSRLS) with the sanctioned
`current_user` transition channel — no signer, no key-rotation lifecycle, no
canonical-bytes binding, no client-supplied capability token. Actor identity is resolved
solely from `auth.uid()` via the postgres-owned `app.actor_uid()` projection; no
Authorization Envelope, no duplicated Supabase JWT interpretation, and no second
projection (`app.actor_role()`) were introduced. The two auth-schema compatibility fixes
(the `app.actor_uid()` wrapper and the lazy `auth.role()` guard) are **platform
compatibility constraints**, not an authorization-architecture change.
