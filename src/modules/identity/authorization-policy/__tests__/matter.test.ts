/** Slice 0.8.3 — Matter policy (tests 13–25). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeMatter } from "../matter-policy.ts";
import { ACTOR, OTHER, caps, matterFacts, membership, userActor } from "./_support.ts";

test("13: generic same-org member without Matter membership is denied read", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts()); // no owner, no membership, internal
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_OWNER_OR_MEMBER_REQUIRED");
});

test("14: owner with matters.read is allowed", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, true);
});

test("15: active Matter member with matters.read is allowed", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ actorMatterMembership: membership() }));
  assert.equal(d.allowed, true);
});

test("16: inactive Matter member is denied", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ actorMatterMembership: membership({ active: false }) }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_INACTIVE_ASSIGNMENT");
});

test("17: admin capability without explicit Matter access is denied a privileged read", () => {
  // Actor carries matters.read (as admins do) but is neither owner nor member.
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged" }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CONFIDENTIALITY_DENIED");
});

test("18: standard (internal) Matter honors owner/member/broad-read policy", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  // broad-read grant permits internal-tier read without per-matter membership...
  assert.equal(authorizeMatter(actor, "matter.read", matterFacts({ organizationBroadReadGranted: true })).allowed, true);
  // ...but nothing at all is denied.
  assert.equal(authorizeMatter(actor, "matter.read", matterFacts()).allowed, false);
});

test("19: privileged Matter needs explicit owner/member OR override; broad-read is insufficient", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged", confidentialityOverrideGranted: true })).allowed, true);
  assert.equal(authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged", organizationBroadReadGranted: true })).allowed, false);
  assert.equal(authorizeMatter(actor, "matter.view_privileged", matterFacts({ confidentiality: "privileged", organizationBroadReadGranted: true })).allowed, false);
});

test("20: unknown confidentiality is denied", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "sekret" as never, ownerProfileId: ACTOR }));
  assert.equal(d.code, "RESOURCE_INVALID_POLICY_FACTS");
});

test("21: owner without matters.update cannot update", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.update", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("22: active member with matters.update can update", () => {
  const actor = userActor({ capabilities: caps("matters.update") });
  const d = authorizeMatter(actor, "matter.update", matterFacts({ actorMatterMembership: membership() }));
  assert.equal(d.allowed, true);
});

test("23: assign_owner requires matters.assign_owner", () => {
  const without = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeMatter(without, "matter.assign_owner", matterFacts({ ownerProfileId: ACTOR })).code, "RESOURCE_CAPABILITY_DENIED");
  const withCap = userActor({ capabilities: caps("matters.assign_owner") });
  assert.equal(authorizeMatter(withCap, "matter.assign_owner", matterFacts({ ownerProfileId: ACTOR })).allowed, true);
});

test("24: assign_members requires matters.assign_members", () => {
  const without = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeMatter(without, "matter.assign_members", matterFacts({ actorMatterMembership: membership() })).code, "RESOURCE_CAPABILITY_DENIED");
  const withCap = userActor({ capabilities: caps("matters.assign_members") });
  assert.equal(authorizeMatter(withCap, "matter.assign_members", matterFacts({ actorMatterMembership: membership() })).allowed, true);
});

test("25: Matter membership does not imply a management capability", () => {
  // An active member who can even approve, but lacks matters.assign_owner.
  const actor = userActor({ capabilities: caps("matters.read") });
  const d = authorizeMatter(actor, "matter.assign_owner", matterFacts({ actorMatterMembership: membership({ canApprove: true }), ownerProfileId: OTHER }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});
