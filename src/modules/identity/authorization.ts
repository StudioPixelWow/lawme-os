/**
 * Authorization helper primitives (Capability 0.8, Slice 0.8.1).
 *
 * Small, pure, deny-by-default checks over a resolved ActorContext. These decide
 * ORGANIZATION-LEVEL capability + tenant + actor-type only. Per-object resource
 * authorization (may this actor act on THIS Matter/Draft/Document?) is a separate
 * layer — only its seam is declared here; it is not implemented in this slice.
 */
import type { ActorContext, ActorType } from "./actor-context.ts";
import type { Capability } from "./capabilities.ts";
import { AUTHORIZATION_POLICY_VERSION } from "./role-capabilities.ts";
import { IdentityAuthorizationError, authorizedDecision, type AuthorizationDecision } from "./errors.ts";

/** True when the actor's role bundle includes the capability. */
export function hasCapability(actor: ActorContext, capability: Capability): boolean {
  return actor.capabilities.has(capability);
}

/** Throw CAPABILITY_DENIED unless the actor has the capability. */
export function requireCapability(actor: ActorContext, capability: Capability): void {
  if (!hasCapability(actor, capability)) {
    throw new IdentityAuthorizationError("CAPABILITY_DENIED", actor.request.correlationId);
  }
}

/** Throw ACTOR_TYPE_DENIED unless the actor's type is allowed. */
export function requireActorType(actor: ActorContext, allowed: readonly ActorType[]): void {
  if (!allowed.includes(actor.actor.type)) {
    throw new IdentityAuthorizationError("ACTOR_TYPE_DENIED", actor.request.correlationId);
  }
}

/** Throw TENANT_MISMATCH unless the actor's active organization equals the target. */
export function requireOrganizationContext(actor: ActorContext, organizationId: string): void {
  if (actor.organization.id !== organizationId) {
    throw new IdentityAuthorizationError("TENANT_MISMATCH", actor.request.correlationId);
  }
}

/** Non-throwing capability decision (for callers that map decisions to responses). */
export function authorizeCapability(actor: ActorContext, capability: Capability): AuthorizationDecision {
  if (hasCapability(actor, capability)) {
    return authorizedDecision(AUTHORIZATION_POLICY_VERSION, actor.request.correlationId);
  }
  return new IdentityAuthorizationError("CAPABILITY_DENIED", actor.request.correlationId).toDecision(AUTHORIZATION_POLICY_VERSION);
}

// ── FUTURE resource-authorization seam (declared only; NOT implemented here) ──
/** A reference to a specific resource a resource check will operate on. */
export interface ResourceRef {
  readonly type: "matter" | "intake_draft" | "document" | "evidence" | "contact";
  readonly id: string;
  readonly organizationId: string;
}
/**
 * FUTURE (a later 0.8 slice): decides whether an actor may exercise a capability
 * on a SPECIFIC resource (matter membership, confidentiality policy, resource
 * ACL). Declared now so callers can depend on the seam; unimplemented in 0.8.1.
 */
export interface ResourceAuthorization {
  authorize(actor: ActorContext, capability: Capability, resource: ResourceRef): Promise<AuthorizationDecision>;
}
