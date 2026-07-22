/**
 * Test fixtures for the Resource Authorization Policy Engine (Slice 0.8.3).
 * NOT a test file (no `.test.ts`) — imported by the suites. Never exported from
 * any production barrel.
 */
import { createTestActorContext } from "../../test-support.ts";
import type { Capability } from "../../capabilities.ts";
import type { ActorContext, ServiceActor, SystemActor } from "../../actor-context.ts";
import type { MatterMembershipFacts, MatterPolicyFacts } from "../contracts.ts";

export const ORG_A = "00000000-0000-4000-8000-0000000000c1";
export const ORG_B = "00000000-0000-4000-8000-0000000000c2";
export const ACTOR = "00000000-0000-4000-8000-0000000000a1";
export const OTHER = "00000000-0000-4000-8000-0000000000a2";
export const MATTER = "00000000-0000-4000-8000-0000000000d1";
export const OTHER_MATTER = "00000000-0000-4000-8000-0000000000d2";

export function caps(...list: Capability[]): ReadonlySet<Capability> {
  return new Set(list);
}

export function userActor(opts?: {
  profileId?: string;
  organizationId?: string;
  capabilities?: ReadonlySet<Capability>;
  correlationId?: string;
}): ActorContext {
  return createTestActorContext({
    profileId: opts?.profileId ?? ACTOR,
    organizationId: opts?.organizationId ?? ORG_A,
    capabilities: opts?.capabilities ?? caps(),
    correlationId: opts?.correlationId,
  });
}

export const systemActor: SystemActor = { type: "system", systemId: "retention-cleanup" };
export const serviceActor: ServiceActor = { type: "service", serviceId: "matter-storage" };

export function membership(o?: Partial<MatterMembershipFacts>): MatterMembershipFacts {
  return { membershipId: "mm-1", profileId: ACTOR, active: true, ...o };
}

export function matterFacts(o?: Partial<MatterPolicyFacts>): MatterPolicyFacts {
  return { matterId: MATTER, organizationId: ORG_A, confidentiality: "internal", ...o };
}

/** Assert a decision carries the invariant envelope fields for every call. */
export function assertEnvelope(d: {
  policyVersion: string;
  correlationId: string;
  action: string;
  resourceType: string;
}): void {
  if (d.policyVersion !== "resource-authorization-v1") throw new Error(`bad policyVersion: ${d.policyVersion}`);
  if (typeof d.correlationId !== "string" || d.correlationId.length === 0) throw new Error("missing correlationId");
}
