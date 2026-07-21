# Identity & Authorization (`src/modules/identity`)

Capability 0.8 · Slice 0.8.1 — the canonical, server-side **ActorContext**
foundation. Contracts + resolution primitives + tests only. No live session, no
middleware, no route integration, no Supabase Auth call, no DB migration.

Import everything from the barrel: `@/modules/identity` (`./index.ts`).
`test-support.ts` is **not** exported and must be imported directly by tests.

## What it answers

Who is acting (`actor.profileId` = `public.profiles.id`, the canonical LawME actor
id; `authUserId` = `auth.users.id`), in which organization, under which membership
(`membership.id`, active only), with which organization-level `capabilities`, under
which `policy` versions, with which request `correlationId` — as one **immutable,
request-scoped** value.

## Public API

- **Contracts** — `ActorContext`, `ActorType`, `SystemActor`, `ServiceActor`,
  `TrustedIdentityInput` (server-trusted; never a client DTO).
- **Capabilities** — `Capability` union + `CAPABILITIES` metadata (scope, module,
  `resourceAuthorizationRequired`); `requiresResourceAuthorization`.
- **Roles** — `OrganizationRole` (schema roles: owner/partner/admin/lawyer/paralegal),
  `ROLE_CAPABILITIES` (versioned via `CAPABILITY_MAP_VERSION`), `capabilitiesForRole`.
- **Resolution** — `resolveActorContext(repository, trustedInput)` (deny-by-default,
  fail-closed, no demo-org fallback) + the pure `selectFromActiveMemberships`.
- **Data source** — `ActorIdentityRepository` interface (Supabase adapter lands in
  Slice 0.8.2; only the interface + an in-memory test adapter exist now).
- **Authorization** — `hasCapability`, `requireCapability`, `requireActorType`,
  `requireOrganizationContext`, `authorizeCapability`. Per-object resource
  authorization is a declared seam only (`ResourceAuthorization`), not implemented.
- **Errors** — `IdentityAuthorizationError` (stable `code` + `safeMessageHe` +
  `httpStatus` + `correlationId`) and `AuthorizationDecision`.
- **Correlation** — `newCorrelationId` / `isValidCorrelationId` / `ensureCorrelationId`.
- **Projections** — `toBootstrapAuthorizationContext`, `toAuditActorRef`,
  `toActivityActorRef` (+ system/service audit refs).

## Rules

Capability ≠ resource access: a resource-scoped capability must be combined with a
future resource check. Role is a default bundle, not the final decision. Admin is
not legal authority and encodes no confidentiality bypass. Service-role possession
is never authorization. Nothing here reads a secret, token, cookie, or Supabase env.
