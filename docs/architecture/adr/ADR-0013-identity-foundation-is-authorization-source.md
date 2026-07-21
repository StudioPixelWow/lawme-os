# ADR-0013 — Capability 0.8 Identity & Authorization Foundation is the authorization source

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

The application currently has no authentication wired: the API routes run under a
seed organization via the service role (RLS bypassed). Database triggers and RLS
can enforce structural rules (immutable columns, allowed transitions, tenant
consistency) but must not become the authorization service — they do not know
business roles or capabilities, and service-role possession must never be treated
as authorization.

## Decision

**Capability 0.8 (Identity & Authorization Foundation) is the canonical source**
for: authenticated **Actor**, active **Organization** context, **Membership**,
**Capabilities**, **authorization decisions**, and **Audit attribution**.
**Service-role possession is never authorization.** Database guards enforce only
structural invariants; they defer all role/capability decisions to Capability 0.8
and the controlled RPCs built on it.

## Consequences

- The intake-draft guard (20260717090000) deliberately contains **no** business-role
  logic (no partner/admin/lawyer/reviewer capability checks). It distinguishes only
  "authenticated end-user" vs "trusted infrastructure" via a verified JWT role claim.
- Real actor attribution fields (`confirmed_by`, `confirmed_at`, `draft_owner`,
  `latest_review_hash`) are deferred until Capability 0.8 exists to populate them.
- Confirmation and other privileged transitions wait for a real `ActorContext`
  (ADR-0011, ADR-0012).

## Rejected alternatives

1. **Encode roles in triggers/RLS now** — rejected: bakes an incomplete authz model
   into the database before the identity primitives exist; hard to evolve safely.
2. **Treat service-role as an authorized actor** — rejected: possession of a key is
   not an authenticated, authorized human actor with audit identity.

## Security impact

Central and positive: authorization has one future owner with real actor identity
and audit. Until then, the database fails closed on privileged transitions rather
than approximating authorization with weak or spoofable signals.

## Migration impact

None in this slice beyond deferring identity-dependent fields. Capability 0.8 will
introduce the Actor/Membership/Capability model and the attribution columns/RPCs
that depend on it.

## Future review conditions

Revisit when Capability 0.8 is designed. Any earlier need to make an authorization
decision must be satisfied by deferring to (a stub of) this foundation, not by
adding role logic to database guards.
