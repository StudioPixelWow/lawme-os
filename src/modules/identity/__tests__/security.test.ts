/** Capability 0.8 Slice 0.8.1 — security invariants (tests 33–40). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveActorContext } from "../resolution.ts";
import type { TrustedIdentityInput } from "../actor-context.ts";
import { IdentityAuthorizationError } from "../errors.ts";
import * as publicBarrel from "../index.ts";
import { createTestIdentityRepository, createTestProfile, createTestMembership } from "../test-support.ts";

const AUTH = "00000000-0000-4000-8000-0000000000a1";
const ORG_A = "00000000-0000-4000-8000-0000000000c1";
const ORG_B = "00000000-0000-4000-8000-0000000000c2";

function repo() {
  return createTestIdentityRepository({
    profiles: [createTestProfile({ profileId: AUTH, authUserId: AUTH })],
    memberships: [createTestMembership({ profileId: AUTH, organizationId: ORG_A, membershipId: "real-mem", role: "lawyer" })],
  });
}

// 33–36: a malicious client payload with extra fields must have NO accepted path.
test("S33–S36: client-supplied actorId/capabilities/role/membershipId are ignored", async () => {
  const hostile = {
    authUserId: AUTH,
    actorId: "attacker-profile",
    capabilities: ["administration.manage", "intake.confirm"],
    role: "owner",
    membershipId: "forged-membership",
    organizationId: "forged-org",
  } as unknown as TrustedIdentityInput;
  const ctx = await resolveActorContext(repo(), hostile);
  assert.equal(ctx.actor.profileId, AUTH); // from the trusted profile, not "attacker-profile"
  assert.equal(ctx.membership.id, "real-mem"); // from the DB membership, not "forged-membership"
  assert.equal(ctx.membership.role, "lawyer"); // from the DB, not "owner"
  assert.equal(ctx.organization.id, ORG_A); // ignored forged organizationId (no requestedOrganizationId path)
  assert.equal(ctx.capabilities.has("administration.manage"), false); // lawyer bundle, not client-supplied
  assert.equal(ctx.capabilities.has("intake.confirm"), false);
});

test("S37: the public barrel does not export test-support factories/adapters", () => {
  for (const forbidden of ["createTestActorContext", "createTestIdentityRepository", "createTestMembership", "createTestProfile"]) {
    assert.equal(forbidden in publicBarrel, false, `barrel leaked ${forbidden}`);
  }
});

test("S38/S39: identity domain imports no Supabase/React/Next and has no demo-org/service-role code", () => {
  const dir = join(import.meta.dirname, "..");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 8);
  // forbidden module specifiers in import/export-from statements (not prose)
  const forbiddenImport = /\b(?:import|export)\b[^\n;]*\bfrom\s+["'][^"']*(?:supabase|@supabase|react|next\/|next")["']/i;
  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");
    for (const line of src.split("\n")) {
      assert.ok(!forbiddenImport.test(line), `${f} imports a forbidden module: ${line.trim()}`);
    }
    // forbidden CODE tokens (underscore forms appear only in real infra code, not prose)
    assert.ok(!src.includes("service_role"), `${f} references service_role`);
    assert.ok(!src.includes("DEMO_SEED"), `${f} references DEMO_SEED`);
    assert.ok(!/process\.env\.SUPABASE/.test(src), `${f} reads a Supabase env var`);
  }
});

test("S40: a cross-tenant requested organization fails closed", async () => {
  await assert.rejects(
    resolveActorContext(repo(), { authUserId: AUTH, requestedOrganizationId: ORG_B }),
    (e: unknown) => e instanceof IdentityAuthorizationError && e.code === "TENANT_MISMATCH",
  );
});
