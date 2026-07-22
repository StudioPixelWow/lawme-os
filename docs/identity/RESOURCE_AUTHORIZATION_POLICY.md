# Resource Authorization Policy Engine

Capability 0.8 · Slice 0.8.3 · `src/modules/identity/authorization-policy/`

A single, versioned, **pure** engine that answers *"may THIS actor perform THIS
action on THIS specific resource?"* for Matters, Intake Drafts, Contacts,
Documents, Evidence, and Audit records. It is route-independent and
repository-independent: it consumes an `ActorContext`, normalized resource facts,
and an action, and returns an explicit `ResourceAuthorizationDecision`. It never
touches a database, a framework, or confidential content.

## Action vs capability vs resource policy

Three distinct layers, deliberately kept separate:

- **Capability** — "may this actor do this *category* of thing at all?" A default
  bundle derived from the org role (`matters.read`, `documents.approve`, …). Lives
  in `capabilities.ts` / `role-capabilities.ts`. Necessary, never sufficient.
- **Action** — the specific operation attempted on a specific object
  (`matter.read`, `document.approve`). Action strings use the SINGULAR noun so
  they never collide with the plural capability strings.
- **Resource policy** — given (actor, action, object facts), the rules that
  combine capability + ownership/membership + confidentiality into a decision.
  This engine.

Generic organization membership is never enough to reach a confidential Matter
resource; an administrative capability never silently overrides confidentiality;
service-role possession is not authorization.

## Evaluation order (every policy)

1. **Actor type** — only a human `user` ActorContext is ever authorized;
   `system`/`service` actors fail closed (`RESOURCE_ACTOR_TYPE_DENIED`) *before*
   any resource fact is read.
2. **Validate policy facts** — ids present, enums known, membership well-formed;
   otherwise `RESOURCE_INVALID_POLICY_FACTS`.
3. **Same tenant** — the actor's active organization must equal the resource
   organization; a cross-tenant request is denied (`RESOURCE_TENANT_MISMATCH`)
   before resource details are examined or exposed.
4. **Required capability** — the action's category capability
   (`RESOURCE_CAPABILITY_DENIED`).
5. **Ownership / membership** — Matter owner or active Matter membership.
6. **Confidentiality** — the tier gate (below).
7. **Action-specific conditions** — status, approval authority, composition.
8. **Explicit allow.**

## Resource fact contracts

Facts are immutable, minimal, source-independent, and free of DB rows and
confidential text. Enums mirror the **actual schema**:

- Matter confidentiality: `internal | client_confidential | privileged`
  (`matters.confidentiality`).
- Document confidentiality: `standard | confidential | privileged | restricted`
  (`matter_documents.confidentiality`).
- Intake status: `active | needs_clarification | ready_for_review | confirming |
  confirmed | rejected | expired` (`matter_intake_drafts.status`).
- Matter membership carries `can_review` / `can_approve` (`matter_members`).

Facts the schema does **not** yet express are optional and fail closed when
absent: `organizationBroadReadGranted`, `confidentialityOverrideGranted`,
`isExplicitlyRestricted`, and the per-member `active` flag (`matter_members` has
no active column, so a normalizing loader supplies it; an absent flag is invalid).
Audit `classification` is likewise a derived fact (there is no
`audit_events.classification` column); an unknown/absent classification denies.

## Confidentiality model

- **internal**: base access (owner / active membership / override) OR an explicit
  organization broad-read grant.
- **client_confidential / privileged / explicitly-restricted**: base access only —
  a broad-read grant is insufficient; `matter.view_privileged` additionally
  refuses anything but explicit owner/membership/override (never a role label).
- **unknown value**: denied as invalid facts.

## Matter membership model

Owner (`matters.assigned_owner_id`) always has read unless a future explicit
security/legal-hold fact blocks it. An **active** Matter membership grants
visibility per the confidentiality gate. Membership does **not** imply
management capabilities (assign owner/members), document/evidence **approval**
(that needs `can_approve`), or audit access — those remain capability + explicit
authority. An inactive membership grants nothing (`RESOURCE_INACTIVE_ASSIGNMENT`).

## Intake Draft model (matches the hardened DB)

Access is the **creator** or an **explicitly assigned reviewer** (`reviewer_ids`)
— never generic same-org (mirrors `app.can_access_intake_draft`). Editing/review
require an editable/reviewable status; `assign_reviewers` is creator-only this
slice (no reviewer escalation). `confirm` authorizes **readiness only** on a
`ready_for_review` draft — it performs no transition and does not bypass the DB
confirmation lockdown; Matter creation still waits for `app.bootstrap_matter_v1()`.

## Contact / Document / Evidence composition

- **Contact** is organization-scoped; linking to a Matter additionally requires
  `contacts.link` **and** an already-authorized Matter decision passed in — the
  Contact policy never recomputes Matter access from partial facts, and there is
  no cross-tenant link.
- **Document** access composes with parent-Matter READ access; privileged/
  restricted documents demand explicit Matter base access; approval requires
  `documents.approve` **and** `matter_members.can_approve` (ownership never
  approves). A signed-token preview is a **separate** authorization mode and is
  intentionally absent from this engine — there is no token input, so a token can
  never be mistaken for actor authorization.
- **Evidence** composes with parent-Matter access; approval mirrors documents.
  The policy authorizes actions only — it never asserts evidence validity, which
  is a separate Evidence decision boundary.

## Audit restrictions

`audit.read` alone never grants every Matter audit. Organization/security audit
needs the capability + same tenant (the capability map already restricts
`audit.read` to oversight roles). A matter-classified audit additionally requires
authorized Matter access + confidentiality; any Matter-access failure collapses to
`RESOURCE_AUDIT_ACCESS_DENIED` so the audit caller learns nothing about the Matter.
Decisions never carry audit payload or confidential content.

## Decision, reason codes, requirements

`ResourceAuthorizationDecision = { allowed, code, policyVersion, action,
resourceType, correlationId, requirements? }`. Codes are stable machine keys
(never UI copy): `RESOURCE_AUTHORIZED`, `RESOURCE_ACTOR_TYPE_DENIED`,
`RESOURCE_TENANT_MISMATCH`, `RESOURCE_CAPABILITY_DENIED`,
`RESOURCE_MEMBERSHIP_REQUIRED`, `RESOURCE_OWNER_OR_MEMBER_REQUIRED`,
`RESOURCE_CONFIDENTIALITY_DENIED`, `RESOURCE_REVIEWER_REQUIRED`,
`RESOURCE_APPROVAL_DENIED`, `RESOURCE_STATUS_DENIED`,
`RESOURCE_INACTIVE_ASSIGNMENT`, `RESOURCE_INVALID_POLICY_FACTS`,
`RESOURCE_ACTION_UNSUPPORTED`, `RESOURCE_AUDIT_ACCESS_DENIED`. `requirements`
carries only safe abstractions (`capability_required`,
`owner_or_member_required`, `confidentiality_override_required`,
`reviewer_assignment_required`, `active_membership_required`,
`matter_access_required`) — never identities, resource-existence, or DB values.

## Policy versioning

`RESOURCE_AUTHORIZATION_POLICY_VERSION = "resource-authorization-v1"` on every
decision. A change in policy *meaning* requires bumping this version and, before
release: a regression-test pass, an **RLS-alignment** review (RLS is the DB safety
boundary; application policy expresses the fuller business model), an **Audit
interpretation** review, and a **Bootstrap** review.

## Fail-closed behavior

Unknown resource state, missing membership facts, unknown confidentiality/status
values, malformed membership objects, missing parent-Matter facts for a child
resource, and unsupported actions all DENY. `undefined` is never treated as
standard access; defaults are never guessed.

## Limitations

- Facts are not yet loaded from repositories — the loaders are interfaces only
  (`integration.ts`), implemented in Slice 0.8.4.
- The broad-read / confidentiality-override / explicit-restriction facts and the
  per-member `active` flag are not yet schema-backed; until a source exists they
  are absent and therefore deny.
- No route, RLS, migration, adapter, Bootstrap, Workflow, or LLM wiring is part of
  this slice.

## Slice 0.8.4 integration plan

Implement the `*AuthorizationFactsRepository` interfaces (RLS-enforced reads that
return normalized facts, `null` ⇒ deny), and the `ResourceAuthorizationService.
authorizeResourceRequest(actor, action, resourceRef)` that loads facts and calls
the matching pure policy. Wire it into the focused routes/use-cases, and align RLS
where the DB boundary should mirror the application policy. Bootstrap remains
blocked until then.
