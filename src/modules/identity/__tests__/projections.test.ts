/** Capability 0.8 Slice 0.8.1 — projections (tests 29–32). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toBootstrapAuthorizationContext, toAuditActorRef, toActivityActorRef, systemAuditActorRef, serviceAuditActorRef } from "../projections.ts";
import { createTestActorContext } from "../test-support.ts";

test("P29: bootstrap projection contains only the approved fields", () => {
  const actor = createTestActorContext({ role: "partner", organizationId: "org-1", membershipId: "mem-1", profileId: "prof-1" });
  const b = toBootstrapAuthorizationContext(actor);
  assert.deepEqual(Object.keys(b).sort(), [
    "actorId", "authorizationPolicyVersion", "capabilities", "capabilityMapVersion",
    "correlationId", "membershipId", "organizationId",
  ]);
  assert.equal(b.actorId, "prof-1");
  assert.equal(b.organizationId, "org-1");
  assert.equal(b.membershipId, "mem-1");
  assert.ok(Object.isFrozen(b));
});

test("P30: audit actor projection contains immutable IDs only (no names/emails)", () => {
  const actor = createTestActorContext({ profileId: "prof-1", membershipId: "mem-1", organizationId: "org-1" });
  const a = toAuditActorRef(actor);
  assert.deepEqual(Object.keys(a).sort(), ["actorProfileId", "actorType", "correlationId", "membershipId", "organizationId"]);
  assert.equal(a.actorType, "user");
  assert.equal(a.actorProfileId, "prof-1");
  assert.equal(a.membershipId, "mem-1");
  assert.ok(!("displayName" in a) && !("email" in a) && !("name" in a));
});

test("P31: activity projection is not an audit authority (no membership/correlation)", () => {
  const actor = createTestActorContext({ profileId: "prof-1" });
  const act = toActivityActorRef(actor);
  assert.equal(act.actorType, "user");
  assert.equal(act.actorProfileId, "prof-1");
  assert.ok(!("membershipId" in act) && !("correlationId" in act) && !("organizationId" in act));
});

test("P32: system/service actor projections are distinct from a human actor", () => {
  const sys = systemAuditActorRef({ type: "system", systemId: "retention-cleanup" }, "org-1", "cid-1");
  const svc = serviceAuditActorRef({ type: "service", serviceId: "matter-storage" }, "org-1", "cid-1");
  assert.equal(sys.actorType, "system");
  assert.equal(svc.actorType, "service");
  assert.ok(!("actorProfileId" in sys) && !("membershipId" in sys));
  assert.ok(!("actorProfileId" in svc) && !("membershipId" in svc));
  // distinct from the human audit ref
  const human = toAuditActorRef(createTestActorContext());
  assert.equal(human.actorType, "user");
  assert.notEqual(human.actorType, sys.actorType);
  assert.notEqual(human.actorType, svc.actorType);
});
