/** Slice 0.8.3 — shared behavior across all resource policies (tests 1–12). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeMatter } from "../matter-policy.ts";
import type { MatterAction } from "../actions.ts";
import { ACTOR, ORG_A, ORG_B, caps, matterFacts, serviceActor, systemActor, userActor } from "./_support.ts";

const ALLOWED_KEYS = ["allowed", "code", "policyVersion", "action", "resourceType", "correlationId", "requirements"];

test("1/6: same-tenant user with capability + ownership is authorized (user actor supported)", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, true);
  assert.equal(d.code, "RESOURCE_AUTHORIZED");
  assert.equal(d.resourceType, "matter");
});

test("2: cross-tenant is always denied (before resource details)", () => {
  const actor = userActor({ organizationId: ORG_A, capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ organizationId: ORG_B, ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_TENANT_MISMATCH");
});

test("3: missing capability is denied", () => {
  const actor = userActor({ capabilities: caps() }); // no matters.read
  const d = authorizeMatter(actor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("4: unknown action is denied", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.frobnicate" as MatterAction, matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_ACTION_UNSUPPORTED");
});

test("5: malformed facts (unknown confidentiality) are denied", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "top_secret" as never, ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_INVALID_POLICY_FACTS");
});

test("7: system actor is denied by default", () => {
  const d = authorizeMatter(systemActor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_ACTOR_TYPE_DENIED");
});

test("8: service actor is denied by default", () => {
  const d = authorizeMatter(serviceActor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_ACTOR_TYPE_DENIED");
});

test("9/10: every decision carries the policy version and a correlation id", () => {
  const actor = userActor({ capabilities: caps("matters.read"), correlationId: "00000000-0000-4000-8000-00000000cccc" });
  for (const facts of [matterFacts({ ownerProfileId: ACTOR }), matterFacts({ organizationId: ORG_B })]) {
    const d = authorizeMatter(actor, "matter.read", facts);
    assert.equal(d.policyVersion, "resource-authorization-v1");
    assert.equal(d.correlationId, "00000000-0000-4000-8000-00000000cccc");
  }
  // non-user actors still get a fresh correlation id
  const sys = authorizeMatter(systemActor, "matter.read", matterFacts());
  assert.ok(typeof sys.correlationId === "string" && sys.correlationId.length > 0);
});

test("11: denials contain only safe, abstract fields (no resource-existence detail)", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged", ownerProfileId: "someone-else" }));
  assert.equal(d.allowed, false);
  for (const k of Object.keys(d)) assert.ok(ALLOWED_KEYS.includes(k), `unexpected key ${k}`);
  for (const r of d.requirements ?? []) {
    for (const rk of Object.keys(r)) assert.ok(["requirement", "capability"].includes(rk), `unexpected requirement key ${rk}`);
  }
});

test("12: no confidential content — decision never echoes matter id or actor profile id", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged", ownerProfileId: "secret-owner" }));
  const serialized = JSON.stringify(d);
  assert.ok(!serialized.includes(matterFacts().matterId), "leaked matter id");
  assert.ok(!serialized.includes("secret-owner"), "leaked owner id");
  assert.ok(!serialized.includes(ORG_A), "leaked organization id");
});
