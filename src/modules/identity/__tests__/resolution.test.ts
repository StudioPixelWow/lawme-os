/** Capability 0.8 Slice 0.8.1 — ActorContext resolution (tests 1–14). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveActorContext, selectFromActiveMemberships } from "../resolution.ts";
import { capabilitiesForRole } from "../role-capabilities.ts";
import { isValidCorrelationId } from "../correlation.ts";
import { IdentityAuthorizationError } from "../errors.ts";
import { createTestIdentityRepository, createTestProfile, createTestMembership } from "../test-support.ts";

const AUTH = "00000000-0000-4000-8000-0000000000a1";
const ORG_A = "00000000-0000-4000-8000-0000000000c1";
const ORG_B = "00000000-0000-4000-8000-0000000000c2";

function repoWith(memberships: ReturnType<typeof createTestMembership>[], hasProfile = true) {
  return createTestIdentityRepository({
    profiles: hasProfile ? [createTestProfile({ profileId: AUTH, authUserId: AUTH })] : [],
    memberships,
  });
}
async function expectCode(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: unknown) => e instanceof IdentityAuthorizationError && e.code === code);
}

test("R1: valid auth user + one active membership resolves", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A, role: "lawyer", status: "active" })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH });
  assert.equal(ctx.actor.profileId, AUTH);
  assert.equal(ctx.organization.id, ORG_A);
  assert.equal(ctx.membership.role, "lawyer");
  assert.equal(ctx.membership.status, "active");
});

test("R2: missing profile fails", async () => {
  await expectCode(resolveActorContext(repoWith([], false), { authUserId: AUTH }), "ACTOR_PROFILE_NOT_FOUND");
});

test("R3: zero active memberships fails", async () => {
  await expectCode(resolveActorContext(repoWith([]), { authUserId: AUTH }), "NO_ACTIVE_ORGANIZATION");
});

test("R4: multiple memberships without requested org requires selection", async () => {
  const repo = repoWith([
    createTestMembership({ profileId: AUTH, organizationId: ORG_A, membershipId: "m1" }),
    createTestMembership({ profileId: AUTH, organizationId: ORG_B, membershipId: "m2" }),
  ]);
  await expectCode(resolveActorContext(repo, { authUserId: AUTH }), "ORGANIZATION_SELECTION_REQUIRED");
});

test("R5: requested active organization resolves", async () => {
  const repo = repoWith([
    createTestMembership({ profileId: AUTH, organizationId: ORG_A, membershipId: "m1" }),
    createTestMembership({ profileId: AUTH, organizationId: ORG_B, membershipId: "m2", role: "partner" }),
  ]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH, requestedOrganizationId: ORG_B });
  assert.equal(ctx.organization.id, ORG_B);
  assert.equal(ctx.membership.role, "partner");
});

test("R6: requested organization without membership fails (cross-tenant)", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  await expectCode(resolveActorContext(repo, { authUserId: AUTH, requestedOrganizationId: ORG_B }), "TENANT_MISMATCH");
});

test("R7: inactive (suspended) membership on the requested org fails", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A, status: "suspended" })]);
  await expectCode(resolveActorContext(repo, { authUserId: AUTH, requestedOrganizationId: ORG_A }), "INACTIVE_MEMBERSHIP");
});

test("R8: removed membership (absent) fails closed", async () => {
  // removal modelled as no membership row remaining
  await expectCode(resolveActorContext(repoWith([]), { authUserId: AUTH }), "NO_ACTIVE_ORGANIZATION");
});

test("R9: role resolves to the canonical capability set", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A, role: "partner" })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH });
  assert.deepEqual([...ctx.capabilities].sort(), [...capabilitiesForRole("partner")!].sort());
});

test("R10: correlation id is generated when missing", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH });
  assert.ok(isValidCorrelationId(ctx.request.correlationId));
});

test("R11: a valid internal correlation id is preserved", async () => {
  const cid = "11111111-1111-4111-8111-111111111111";
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH, correlationId: cid });
  assert.equal(ctx.request.correlationId, cid);
});

test("R12: an invalid correlation id is regenerated", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH, correlationId: "not-a-uuid" });
  assert.notEqual(ctx.request.correlationId, "not-a-uuid");
  assert.ok(isValidCorrelationId(ctx.request.correlationId));
});

test("R13: the returned context is immutable", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH });
  assert.ok(Object.isFrozen(ctx) && Object.isFrozen(ctx.actor) && Object.isFrozen(ctx.membership) && Object.isFrozen(ctx.request));
  assert.throws(() => { (ctx as { organization: unknown }).organization = { id: "x" }; });
});

test("R14: no token/secret/email leaks into ActorContext", async () => {
  const repo = repoWith([createTestMembership({ profileId: AUTH, organizationId: ORG_A })]);
  const ctx = await resolveActorContext(repo, { authUserId: AUTH });
  const flat = JSON.stringify({ ...ctx, capabilities: [...ctx.capabilities] }).toLowerCase();
  for (const bad of ["token", "secret", "@", "password", "jwt", "cookie"]) assert.ok(!flat.includes(bad), `leaked ${bad}`);
});

test("selectFromActiveMemberships is pure and deterministic", () => {
  assert.equal(selectFromActiveMemberships([]).ok, false);
  assert.deepEqual(selectFromActiveMemberships([]), { ok: false, code: "NO_ACTIVE_ORGANIZATION" });
  const one = createTestMembership({ organizationId: ORG_A });
  assert.deepEqual(selectFromActiveMemberships([one]), { ok: true, membership: one });
  assert.equal(selectFromActiveMemberships([one, createTestMembership({ organizationId: ORG_B, membershipId: "m2" })]).ok, false);
});
