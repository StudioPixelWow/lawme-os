/**
 * Resource authorization DECISION contract (Capability 0.8, Slice 0.8.3).
 *
 * One canonical, immutable decision shape for every resource policy. A decision
 * carries a STABLE machine code (never user-facing copy), the policy version,
 * the action + resource type, a correlation id, and only SAFE requirement
 * abstractions. It NEVER contains confidential content, other member identities,
 * resource-existence details, organization names, or raw DB values.
 */
import type { Capability } from "../capabilities.ts";
import type { ResourceAction, ResourceType } from "./actions.ts";

/** THE version of the resource-authorization policy semantics. Every decision
 *  carries it. Changing policy meaning REQUIRES bumping this (and, per the docs,
 *  a regression / RLS-alignment / Audit / Bootstrap review). */
export const RESOURCE_AUTHORIZATION_POLICY_VERSION = "resource-authorization-v1";

/** Stable reason codes. These are keys, not messages — never surface them as UI
 *  copy, and never let one reveal whether a cross-tenant resource exists. */
export type ResourceAuthorizationCode =
  | "RESOURCE_AUTHORIZED"
  | "RESOURCE_ACTOR_TYPE_DENIED"
  | "RESOURCE_TENANT_MISMATCH"
  | "RESOURCE_CAPABILITY_DENIED"
  | "RESOURCE_MEMBERSHIP_REQUIRED"
  | "RESOURCE_OWNER_OR_MEMBER_REQUIRED"
  | "RESOURCE_CONFIDENTIALITY_DENIED"
  | "RESOURCE_REVIEWER_REQUIRED"
  | "RESOURCE_APPROVAL_DENIED"
  | "RESOURCE_STATUS_DENIED"
  | "RESOURCE_INACTIVE_ASSIGNMENT"
  | "RESOURCE_INVALID_POLICY_FACTS"
  | "RESOURCE_ACTION_UNSUPPORTED"
  | "RESOURCE_AUDIT_ACCESS_DENIED";

/** Safe, abstract statement of what was (or would be) required — no identities,
 *  no confidential metadata, no hidden branch details. */
export type AuthorizationRequirementKind =
  | "capability_required"
  | "matter_membership_required"
  | "owner_or_member_required"
  | "reviewer_assignment_required"
  | "confidentiality_override_required"
  | "active_membership_required"
  | "matter_access_required";

export interface AuthorizationRequirement {
  readonly requirement: AuthorizationRequirementKind;
  /** Present only for `capability_required`; a capability CATEGORY is safe to name. */
  readonly capability?: Capability;
}

export interface ResourceAuthorizationDecision {
  readonly allowed: boolean;
  readonly code: ResourceAuthorizationCode;
  readonly policyVersion: string;
  readonly action: ResourceAction;
  readonly resourceType: ResourceType;
  readonly correlationId: string;
  readonly requirements?: readonly AuthorizationRequirement[];
}

/** Build an ALLOW decision. */
export function authorized(
  action: ResourceAction,
  resourceType: ResourceType,
  correlationId: string,
): ResourceAuthorizationDecision {
  return Object.freeze({
    allowed: true,
    code: "RESOURCE_AUTHORIZED",
    policyVersion: RESOURCE_AUTHORIZATION_POLICY_VERSION,
    action,
    resourceType,
    correlationId,
  });
}

/** Build a DENY decision with a stable code and optional safe requirements. */
export function denied(
  code: Exclude<ResourceAuthorizationCode, "RESOURCE_AUTHORIZED">,
  action: ResourceAction,
  resourceType: ResourceType,
  correlationId: string,
  requirements?: readonly AuthorizationRequirement[],
): ResourceAuthorizationDecision {
  return Object.freeze({
    allowed: false,
    code,
    policyVersion: RESOURCE_AUTHORIZATION_POLICY_VERSION,
    action,
    resourceType,
    correlationId,
    ...(requirements && requirements.length > 0 ? { requirements: Object.freeze([...requirements]) } : {}),
  });
}

/** A single `capability_required` requirement (convenience). */
export function capabilityRequirement(capability: Capability): AuthorizationRequirement {
  return { requirement: "capability_required", capability };
}
