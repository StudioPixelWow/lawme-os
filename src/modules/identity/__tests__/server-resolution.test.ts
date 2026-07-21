/** Slice 0.8.2 — server ActorContext resolution (tests 7–18). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveServerActorContext } from "../server-actor-context.ts";
import { capabilitiesForRole } from "../role-capabilities.ts";
import { IdentityAuthorizationError } from "../errors.ts";
import { createTestIdentityRepository, createTestProfile, createTestMembership } from "../test-support.ts";

const AUTH = "00000000-0000-4000-8000-0000000000a1";
const ORG_A = "00000000-0000-4000-8000-0000000000c1";
const ORG_B = "00000000-0000-4000-8000-0000000000c2";

function repo(memberships: ReturnType<typeof createTestMembership>[], hasProfile = true) {
  return createTestIdentityRepository({
    profiles: hasProfile ? [createTestProfile({ profileId: AUTH, authUserId: AUTH })] : [],
    memberships,
  });
}
async function code(p: Promise<unknown>, c: string) {
  await assert.rejects(p, (e: unknown) => e instanceof IdentityAuthorizationError && e.code === c);
}

test("SR7: valid session + one active membership resolves", async () => {
  const ctx = await resolveServerActorContext({ authUserId: AUTH, repository: repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]) });
  assert.equal(ctx.organization.id, ORG_A);
  assert.equal(ctx.actor.profileId, AUTH);
});

test("SR8: no session → UNAUTHENTICATED", async () => {
  await code(resolveServerActorContext({ authUserId: null, repository: repo([]) }), "UNAUTHENTICATED");
  await code(resolveServerActorContext({ authUserId: undefined, repository: repo([]) }), "UNAUTHENTICATED");
  await code(resolveServerActorContext({ authUserId: "", repository: repo([]) }), "UNAUTHENTICATED");
});

test("SR10: verified user but missing profile → ACTOR_PROFILE_NOT_FOUND", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, repository: repo([], false) }), "ACTOR_PROFILE_NOT_FOUND");
});

test("SR11: zero active memberships → NO_ACTIVE_ORGANIZATION", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, repository: repo([]) }), "NO_ACTIVE_ORGANIZATION");
});

test("SR12: multiple active memberships + no requested org → ORGANIZATION_SELECTION_REQUIRED", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, repository: repo([
    createTestMembership({ profileId: AUTH, organizationId: ORG_A, membershipId: "m1" }),
    createTestMembership({ profileId: AUTH, organizationId: ORG_B, membershipId: "m2" }),
  ]) }), "ORGANIZATION_SELECTION_REQUIRED");
});

test("SR13: valid active-org selection resolves", async () => {
  const ctx = await resolveServerActorContext({ authUserId: AUTH, requestedOrganizationId: ORG_B, repository: repo([
    createTestMembership({ profileId: AUTH, organizationId: ORG_A, membershipId: "m1" }),
    createTestMembership({ profileId: AUTH, organizationId: ORG_B, membershipId: "m2", role: "partner" }),
  ]) });
  assert.equal(ctx.organization.id, ORG_B);
  assert.equal(ctx.membership.role, "partner");
});

test("SR14/SR15: invalid or cross-tenant org selection fails closed (TENANT_MISMATCH)", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, requestedOrganizationId: ORG_B, repository: repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]) }), "TENANT_MISMATCH");
});

test("SR16: suspended membership on requested org → INACTIVE_MEMBERSHIP", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, requestedOrganizationId: ORG_A, repository: repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A, status: "suspended" })]) }), "INACTIVE_MEMBERSHIP");
});

test("SR-unknown-role: unknown role fails closed", async () => {
  await code(resolveServerActorContext({ authUserId: AUTH, requestedOrganizationId: ORG_A, repository: repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A, role: "superuser" })]) }), "ACTOR_RESOLUTION_FAILED");
});

test("SR17: a role change appears on the next resolution", async () => {
  const r1 = repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A, role: "lawyer" })]);
  const c1 = await resolveServerActorContext({ authUserId: AUTH, repository: r1 });
  assert.equal(c1.membership.role, "lawyer");
  const r2 = repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A, role: "partner" })]);
  const c2 = await resolveServerActorContext({ authUserId: AUTH, repository: r2 });
  assert.equal(c2.membership.role, "partner");
  assert.deepEqual([...c2.capabilities].sort(), [...capabilitiesForRole("partner")!].sort());
});

test("SR18: a valid correlation id propagates into the context", async () => {
  const cid = "33333333-3333-4333-8333-333333333333";
  const ctx = await resolveServerActorContext({ authUserId: AUTH, correlationId: cid, repository: repo([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]) });
  assert.equal(ctx.request.correlationId, cid);
});
