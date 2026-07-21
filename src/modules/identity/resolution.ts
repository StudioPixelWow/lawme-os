/**
 * ActorContext resolution (Capability 0.8, Slice 0.8.1).
 *
 * Derives the canonical ActorContext from TRUSTED server inputs only. Deny by
 * default and fail closed: no demo-org fallback, no "pick the first membership",
 * no client-asserted identity. The resolver returns NO token/secret/email.
 */
import type { ActorContext, TrustedIdentityInput } from "./actor-context.ts";
import type { ActorIdentityRepository, OrganizationMembershipIdentity } from "./repository.ts";
import { capabilitiesForRole, isOrganizationRole, CAPABILITY_MAP_VERSION, AUTHORIZATION_POLICY_VERSION } from "./role-capabilities.ts";
import { IdentityAuthorizationError } from "./errors.ts";
import { ensureCorrelationId } from "./correlation.ts";

/** Result of the pure "no organization requested" selection over active memberships. */
export type OrganizationSelection =
  | { readonly ok: true; readonly membership: OrganizationMembershipIdentity }
  | { readonly ok: false; readonly code: "NO_ACTIVE_ORGANIZATION" | "ORGANIZATION_SELECTION_REQUIRED" };

/**
 * Deterministic selection when NO organization was requested (pure, tested):
 *   0 active memberships          → NO_ACTIVE_ORGANIZATION
 *   exactly 1 active membership   → that one
 *   more than 1 active membership → ORGANIZATION_SELECTION_REQUIRED
 * Never silently chooses first/most-recent/demo/hardcoded.
 */
export function selectFromActiveMemberships(memberships: readonly OrganizationMembershipIdentity[]): OrganizationSelection {
  if (memberships.length === 0) return { ok: false, code: "NO_ACTIVE_ORGANIZATION" };
  if (memberships.length > 1) return { ok: false, code: "ORGANIZATION_SELECTION_REQUIRED" };
  return { ok: true, membership: memberships[0] };
}

/**
 * Resolve the canonical ActorContext. Throws IdentityAuthorizationError (stable
 * code + safe copy + correlation id) on any failure.
 */
export async function resolveActorContext(
  repository: ActorIdentityRepository,
  input: TrustedIdentityInput,
): Promise<ActorContext> {
  const correlationId = ensureCorrelationId(input?.correlationId);

  // 1. validate trusted input
  if (!input || typeof input.authUserId !== "string" || input.authUserId.trim() === "") {
    throw new IdentityAuthorizationError("UNAUTHENTICATED", correlationId);
  }
  if (input.requestedOrganizationId !== undefined &&
      (typeof input.requestedOrganizationId !== "string" || input.requestedOrganizationId.trim() === "")) {
    throw new IdentityAuthorizationError("ACTOR_RESOLUTION_FAILED", correlationId, { detail: "invalid requestedOrganizationId" });
  }

  // 2/3. resolve profile
  const profile = await repository.findProfileByAuthUserId(input.authUserId);
  if (!profile) throw new IdentityAuthorizationError("ACTOR_PROFILE_NOT_FOUND", correlationId);

  // 4/5/6. resolve the active organization + membership
  let membership: OrganizationMembershipIdentity;
  if (input.requestedOrganizationId !== undefined) {
    const m = await repository.findMembership(profile.profileId, input.requestedOrganizationId);
    if (!m) throw new IdentityAuthorizationError("TENANT_MISMATCH", correlationId); // requested an org they don't belong to
    if (m.status !== "active") throw new IdentityAuthorizationError("INACTIVE_MEMBERSHIP", correlationId);
    membership = m;
  } else {
    const active = await repository.listActiveMemberships(profile.profileId);
    const selection = selectFromActiveMemberships(active);
    if (!selection.ok) throw new IdentityAuthorizationError(selection.code, correlationId);
    membership = selection.membership;
  }

  // belt-and-suspenders: never accept a non-active membership
  if (membership.status !== "active") throw new IdentityAuthorizationError("INACTIVE_MEMBERSHIP", correlationId);

  // 7/8. role → capabilities (unknown role fails closed)
  if (!isOrganizationRole(membership.role)) {
    throw new IdentityAuthorizationError("ACTOR_RESOLUTION_FAILED", correlationId, { detail: "unknown organization role" });
  }
  const capabilities = capabilitiesForRole(membership.role);
  if (!capabilities) throw new IdentityAuthorizationError("ACTOR_RESOLUTION_FAILED", correlationId, { detail: "role has no capability bundle" });

  // 9. build the immutable ActorContext (no token/secret/email)
  const context: ActorContext = {
    actor: Object.freeze({ type: "user", profileId: profile.profileId, authUserId: profile.authUserId }),
    organization: Object.freeze({ id: membership.organizationId }),
    membership: Object.freeze({ id: membership.membershipId, role: membership.role, status: "active" }),
    capabilities,
    policy: Object.freeze({ capabilityMapVersion: CAPABILITY_MAP_VERSION, authorizationPolicyVersion: AUTHORIZATION_POLICY_VERSION }),
    request: Object.freeze(input.sessionId !== undefined ? { correlationId, sessionId: input.sessionId } : { correlationId }),
  };
  return Object.freeze(context);
}
