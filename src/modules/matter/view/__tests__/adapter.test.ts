import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatterProfile } from "../../profile.ts";
import { getDemoMatter } from "../../fixtures/demo.ts";
import { toRoomViewModel } from "../adapter.ts";
import { MATTER_ROOM_VM_VERSION } from "../types.ts";

test("adapter maps the matter identity into the Decision Core", () => {
  const matter = getDemoMatter("demo");
  const { decisionCore, version } = toRoomViewModel(buildMatterProfile(matter), matter);

  assert.equal(version, MATTER_ROOM_VM_VERSION);
  assert.equal(decisionCore.matterId, "demo");
  assert.equal(decisionCore.titleHe, matter.titleHe);
  assert.equal(decisionCore.clientHe, matter.client.nameHe);
  assert.equal(decisionCore.practiceAreaHe, "דיני עבודה");
  assert.match(decisionCore.updatedHe, /^\d{1,2}\.\d{1,2}\.\d{4}$/);
});

test("the route id anchors the matter id", () => {
  const matter = getDemoMatter("MAT-123");
  const { decisionCore } = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.equal(decisionCore.matterId, "MAT-123");
});

test("the posture is a human word carried by a status tone", () => {
  const matter = getDemoMatter("m1");
  const { decisionCore } = toRoomViewModel(buildMatterProfile(matter), matter);
  // the demo matter has an unknown mandatory fact → requires_review
  assert.equal(decisionCore.posture.labelHe, "דורש בדיקה");
  assert.equal(decisionCore.posture.tone, "reviewed");
});

test("the concern is one clean Hebrew sentence — no machine tokens", () => {
  const matter = getDemoMatter("c1");
  const { decisionCore } = toRoomViewModel(buildMatterProfile(matter), matter);
  const concern = decisionCore.concernHe;
  assert.ok(concern.length > 0);
  assert.doesNotMatch(concern, /\(מצב:/u, "state code must be stripped");
  assert.doesNotMatch(concern, /[a-z_]{3,}/u, "no leaking english field keys");
  assert.match(concern, /[.!?]$/u, "reads as a finished sentence");
  // the concern must not merely repeat the matter title
  assert.notEqual(concern, `${matter.titleHe}.`);
});

test("the one action is humanized, honest about unknowns, and routes review", () => {
  const matter = getDemoMatter("a1");
  const { decisionCore } = toRoomViewModel(buildMatterProfile(matter), matter);
  const action = decisionCore.action;
  assert.ok(action, "the demo matter surfaces a next action");
  // the missing mandatory fact is named in Hebrew, never as a machine key
  assert.match(action.labelHe, /ידיעת המעסיק על ההיריון/u);
  assert.doesNotMatch(action.labelHe, /employer_knowledge/u);
  // machine scaffolding ("missing fact for stage:") is stripped
  assert.doesNotMatch(action.labelHe, /עובדה חסרה לשלב/u);
  // human review is routed, and approval is required — never silently assumed
  assert.equal(action.requiresApproval, true);
  assert.equal(action.reviewTargetHe, "בדיקת מומחה");
  // an unknown due date is null, never invented
  assert.equal(action.dueHe, null);
});

test("the owner is taken from the team, never invented", () => {
  const matter = getDemoMatter("x");
  const { decisionCore } = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.ok(decisionCore.ownerHe);
  assert.ok(matter.team.some((m) => m.nameHe === decisionCore.ownerHe));
  // the most-senior assigned lawyer runs the matter (partner precedence)
  assert.equal(decisionCore.ownerHe, "עו״ד מאיה");
});

test("the adapter is a deterministic pure function", () => {
  const matter = getDemoMatter("d");
  const a = toRoomViewModel(buildMatterProfile(matter), matter);
  const b = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.deepEqual(a, b);
});
