/** Capability 0.8 Slice 0.8.1 — authorization helpers (tests 22–28). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasCapability, requireCapability, requireActorType, requireOrganizationContext, authorizeCapability } from "../authorization.ts";
import { IdentityAuthorizationError } from "../errors.ts";
import { createTestActorContext } from "../test-support.ts";

test("A22: hasCapability true for a granted capability", () => {
  const actor = createTestActorContext({ role: "lawyer" });
  assert.equal(hasCapability(actor, "matters.read"), true);
});

test("A23: hasCapability false otherwise", () => {
  const actor = createTestActorContext({ role: "lawyer" });
  assert.equal(hasCapability(actor, "intake.confirm"), false);
});

test("A24: requireCapability throws stable CAPABILITY_DENIED", () => {
  const actor = createTestActorContext({ role: "lawyer" });
  assert.throws(() => requireCapability(actor, "intake.confirm"),
    (e: unknown) => e instanceof IdentityAuthorizationError && e.code === "CAPABILITY_DENIED" && e.httpStatus === 403);
  // decision form
  assert.equal(authorizeCapability(actor, "intake.confirm").allowed, false);
  assert.equal(authorizeCapability(actor, "matters.read").allowed, true);
});

test("A25: requireOrganizationContext rejects a tenant mismatch", () => {
  const actor = createTestActorContext({ organizationId: "org-A" });
  assert.doesNotThrow(() => requireOrganizationContext(actor, "org-A"));
  assert.throws(() => requireOrganizationContext(actor, "org-B"),
    (e: unknown) => e instanceof IdentityAuthorizationError && e.code === "TENANT_MISMATCH");
});

test("A26: requireActorType rejects a disallowed type", () => {
  const actor = createTestActorContext();
  assert.doesNotThrow(() => requireActorType(actor, ["user"]));
  assert.throws(() => requireActorType(actor, ["system", "service"]),
    (e: unknown) => e instanceof IdentityAuthorizationError && e.code === "ACTOR_TYPE_DENIED");
});

test("A27: error exposes safe Hebrew copy and the correlation id", () => {
  const actor = createTestActorContext({ correlationId: "22222222-2222-4222-8222-222222222222" });
  try { requireCapability(actor, "intake.confirm"); assert.fail("should throw"); }
  catch (e) {
    const err = e as IdentityAuthorizationError;
    assert.ok(err.safeMessageHe.length > 0);
    assert.equal(err.correlationId, "22222222-2222-4222-8222-222222222222");
  }
});

test("A28: error does not expose membership lists or internal maps", () => {
  const actor = createTestActorContext({ role: "owner" });
  try { requireOrganizationContext(actor, "other-org"); assert.fail("should throw"); }
  catch (e) {
    const err = e as IdentityAuthorizationError;
    assert.equal(err.message, "TENANT_MISMATCH"); // message is the stable code only
    const serialized = JSON.stringify({ code: err.code, msg: err.safeMessageHe, cid: err.correlationId });
    for (const bad of ["capabilities", "ROLE_CAPABILITIES", "membership", "owner"]) {
      assert.ok(!serialized.includes(bad), `leaked ${bad}`);
    }
  }
});
