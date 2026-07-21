# ADR-0012 — Matter confirmation occurs only through app.bootstrap_matter_v1()

Status: Accepted · Date: 2026-07-21 · Owner: founder decision

## Context

Confirming an Intake Draft into a Matter is a security- and integrity-critical
transition: it atomically creates a Matter and links the draft. It must not be
reachable by a browser-authenticated table write, by service-role possession, or
by any generic SQL path, and it requires a real actor/authorization context that
does not yet exist (pending Capability 0.8, ADR-0013).

## Decision

Matter confirmation and atomic creation will occur **only through
`app.bootstrap_matter_v1()`**, a future founder-approved SECURITY DEFINER RPC,
**after Capability 0.8 provides a real `ActorContext`**. **Direct table
confirmation is forbidden.** Until that RPC exists, migration 20260717090000
blocks *every* caller — including service_role — from setting
`status ∈ {confirming, confirmed}` or writing `confirmed_matter_id` via the table
path, and freezes confirmed rows.

## Consequences

- No draft can be confirmed by a client, by service-role, or by generic SQL today.
- The Bootstrap migration will *replace or extend* the transition guard to permit
  confirmation strictly from its controlled execution context — never via a
  spoofable payload flag.
- The reason code `INTAKE_DRAFT_CONFIRMATION_FORBIDDEN` (SQLSTATE P0001) is the
  stable signal for a blocked confirmation attempt.

## Rejected alternatives

1. **Confirm via direct authenticated UPDATE** — rejected: no real actor context,
   no atomic Matter creation, trivially bypassable authorization.
2. **Gate confirmation on a request payload flag** — rejected: spoofable by the client.
3. **Allow service-role table UPDATE to confirm now** — rejected: service-role
   possession is not authorization (ADR-0013); confirmation must be a controlled RPC.

## Security impact

Strongly positive: confirmation is the highest-value write on this table, and it is
now unreachable through any client/generic path. The guard fails closed with a
stable, id-free reason code. The future RPC will add real actor attribution and audit.

## Migration impact

Delivered by 20260717090000 (guard + biconditional CHECK; direct confirmation and
`confirmed_matter_id` writes blocked for all callers). `app.bootstrap_matter_v1()`
is **not** created in this slice. Fields `confirmed_by` / `confirmed_at` are
intentionally deferred to the Capability 0.8 / Bootstrap migration that owns them.

## Future review conditions

Revisit when `app.bootstrap_matter_v1()` is designed. Its migration must replace/
extend the guard atomically and must not weaken any current lockdown in anticipation.
