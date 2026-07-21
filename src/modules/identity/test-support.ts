/**
 * Identity TEST SUPPORT (Capability 0.8, Slice 0.8.1).
 *
 * Explicit, isolated factories + an in-memory ActorIdentityRepository for tests
 * ONLY. This module is intentionally NOT re-exported from the public barrel
 * (`index.ts`), so it can never be selected silently by production code paths.
 * There is no demo-org authority here.
 */
import type { ActorContext } from "./actor-context.ts";
import type { ActorIdentityRepository, OrganizationMembershipIdentity, ProfileIdentity } from "./repository.ts";
import { capabilitiesForRole, CAPABILITY_MAP_VERSION, AUTHORIZATION_POLICY_VERSION, type OrganizationRole } from "./role-capabilities.ts";
import { newCorrelationId } from "./correlation.ts";
import type { Capability } from "./capabilities.ts";

export function createTestProfile(overrides: Partial<ProfileIdentity> = {}): ProfileIdentity {
  const profileId = overrides.profileId ?? "00000000-0000-4000-8000-0000000000a1";
  return { profileId, authUserId: overrides.authUserId ?? profileId, displayName: overrides.displayName };
}

export function createTestMembership(overrides: Partial<OrganizationMembershipIdentity> = {}): OrganizationMembershipIdentity {
  return {
    membershipId: overrides.membershipId ?? "00000000-0000-4000-8000-0000000000b1",
    organizationId: overrides.organizationId ?? "00000000-0000-4000-8000-0000000000c1",
    profileId: overrides.profileId ?? "00000000-0000-4000-8000-0000000000a1",
    role: overrides.role ?? "lawyer",
    status: overrides.status ?? "active",
  };
}

export interface TestActorContextOverrides {
  readonly profileId?: string;
  readonly authUserId?: string;
  readonly organizationId?: string;
  readonly membershipId?: string;
  readonly role?: OrganizationRole;
  readonly capabilities?: ReadonlySet<Capability>;
  readonly correlationId?: string;
  readonly sessionId?: string;
}

/** Build a valid, frozen ActorContext directly (for authorization/projection tests). */
export function createTestActorContext(overrides: TestActorContextOverrides = {}): ActorContext {
  const profileId = overrides.profileId ?? "00000000-0000-4000-8000-0000000000a1";
  const role: OrganizationRole = overrides.role ?? "lawyer";
  const capabilities = overrides.capabilities ?? capabilitiesForRole(role)!;
  return Object.freeze({
    actor: Object.freeze({ type: "user" as const, profileId, authUserId: overrides.authUserId ?? profileId }),
    organization: Object.freeze({ id: overrides.organizationId ?? "00000000-0000-4000-8000-0000000000c1" }),
    membership: Object.freeze({ id: overrides.membershipId ?? "00000000-0000-4000-8000-0000000000b1", role, status: "active" as const }),
    capabilities,
    policy: Object.freeze({ capabilityMapVersion: CAPABILITY_MAP_VERSION, authorizationPolicyVersion: AUTHORIZATION_POLICY_VERSION }),
    request: Object.freeze(overrides.sessionId !== undefined
      ? { correlationId: overrides.correlationId ?? newCorrelationId(), sessionId: overrides.sessionId }
      : { correlationId: overrides.correlationId ?? newCorrelationId() }),
  });
}

export interface TestIdentitySeed {
  readonly profiles?: readonly ProfileIdentity[];
  readonly memberships?: readonly OrganizationMembershipIdentity[];
}

/** In-memory ActorIdentityRepository over an explicit seed (tests only). */
export function createTestIdentityRepository(seed: TestIdentitySeed = {}): ActorIdentityRepository {
  const profiles = [...(seed.profiles ?? [])];
  const memberships = [...(seed.memberships ?? [])];
  return {
    async findProfileByAuthUserId(authUserId) {
      return profiles.find((p) => p.authUserId === authUserId) ?? null;
    },
    async listActiveMemberships(profileId) {
      return memberships.filter((m) => m.profileId === profileId && m.status === "active");
    },
    async findActiveMembership(profileId, organizationId) {
      return memberships.find((m) => m.profileId === profileId && m.organizationId === organizationId && m.status === "active") ?? null;
    },
    async findMembership(profileId, organizationId) {
      return memberships.find((m) => m.profileId === profileId && m.organizationId === organizationId) ?? null;
    },
  };
}
