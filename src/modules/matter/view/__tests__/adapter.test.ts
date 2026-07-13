import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatterProfile } from "../../profile.ts";
import { getDemoMatter } from "../../fixtures/demo.ts";
import { toRoomViewModel } from "../adapter.ts";
import { MATTER_ROOM_VM_VERSION } from "../types.ts";

function vmOf(id = "demo") {
  const matter = getDemoMatter(id);
  return { matter, vm: toRoomViewModel(buildMatterProfile(matter), matter) };
}

test("identity maps presence: name, client, area, forum, owner, stage", () => {
  const { matter, vm } = vmOf();
  assert.equal(vm.version, MATTER_ROOM_VM_VERSION);
  assert.equal(vm.identity.matterId, "demo");
  assert.equal(vm.identity.titleHe, matter.titleHe);
  assert.equal(vm.identity.clientHe, "דנה כהן");
  assert.equal(vm.identity.practiceAreaHe, "דיני עבודה");
  assert.equal(vm.identity.forumHe, "בית הדין האזורי לעבודה תל אביב");
  assert.equal(vm.identity.stageTitleHe, "אימות עובדות מכריעות");
});

test("owner comes from the team, never invented (partner precedence)", () => {
  const { matter, vm } = vmOf("x");
  assert.ok(vm.identity.ownerHe);
  assert.ok(matter.team.some((m) => m.nameHe === vm.identity.ownerHe));
  assert.equal(vm.identity.ownerHe, "עו״ד מאיה");
});

test("posture is a human word carried by a status tone", () => {
  const { vm } = vmOf();
  assert.equal(vm.posture.labelHe, "דורש בדיקה");
  assert.equal(vm.posture.tone, "reviewed");
});

test("briefing is one-or-two clean, sourced sentences — no machine tokens", () => {
  const { matter, vm } = vmOf("c1");
  assert.ok(vm.briefingHe.length >= 1 && vm.briefingHe.length <= 2);
  for (const s of vm.briefingHe) {
    assert.ok(s.length > 0);
    assert.doesNotMatch(s, /\(מצב:/u, "state code stripped");
    assert.doesNotMatch(s, /[a-z_]{3,}/u, "no leaking english field keys");
    assert.match(s, /[.!?]$/u, "reads as a finished sentence");
  }
  assert.notEqual(vm.briefingHe[0], `${matter.titleHe}.`);
  // sentence 1 weaves in the decisive missing fact; sentence 2 carries the tempo
  assert.match(vm.briefingHe[0], /ידיעת המעסיק על ההיריון/u);
  assert.match(vm.briefingHe[1], /דיון מקדמי/u);
});

test("the critical deadline is the real, near one — never invented", () => {
  const { vm } = vmOf();
  assert.ok(vm.deadline, "an imminent deadline exists in the fixture");
  assert.equal(vm.deadline.labelHe, "דיון מקדמי");
  assert.equal(vm.deadline.daysRemaining, 4);
  assert.equal(vm.deadline.whenHe, "בעוד 4 ימים");
  assert.equal(vm.deadline.strict, true);
});

test("milestone spine positions prev/current/next on the meridian, blocked", () => {
  const { vm } = vmOf();
  assert.equal(vm.spine.currentHe, "אימות עובדות מכריעות");
  assert.equal(vm.spine.prevHe, "קבלת פרטים"); // english gloss stripped
  assert.equal(vm.spine.nextHe, "שימור ראיות ומסמכי הפיטורים");
  assert.equal(vm.spine.stageNumberHe, "שלב 2 מתוך 9");
  assert.equal(vm.spine.blocked, true);
  assert.ok(vm.spine.blockedReasonHe && vm.spine.blockedReasonHe.length > 0);
});

test("top blocker is a sourced operational object, humanized", () => {
  const { vm } = vmOf();
  assert.ok(vm.blocker);
  assert.match(vm.blocker.titleHe, /ידיעת המעסיק על ההיריון/u);
  assert.doesNotMatch(vm.blocker.titleHe, /employer_knowledge/u);
  assert.equal(vm.blocker.stageHe, "אימות עובדות מכריעות");
  assert.ok(vm.blocker.missingHe.length >= 1);
  assert.ok(vm.blocker.sourceHe && /חוק עבודת נשים/u.test(vm.blocker.sourceHe));
  assert.equal(vm.blocker.tone, "urgent");
});

test("top action reflects the real prioritizer (deadline leads here)", () => {
  const { vm } = vmOf();
  assert.ok(vm.action);
  // the real prioritizer selects the imminent strict deadline over the fact action
  assert.match(vm.action.labelHe, /דיון מקדמי/u);
  assert.equal(vm.action.dueHe, "בתוך 4 ימים");
  assert.equal(vm.action.requiresApproval, true);
  assert.equal(vm.action.reviewTargetHe, "בדיקת מומחה");
  assert.ok(vm.action.expectedEffectHe.length > 0);
});

test("no fabricated due date: an action without a due keeps dueHe null", () => {
  const { matter } = vmOf();
  const profile = buildMatterProfile(matter);
  // the fact-verification action legitimately has no due date
  const factAction = profile.prioritizedActions.find((a) => a.actionId.startsWith("na-fact:"));
  assert.ok(factAction);
  assert.equal(factAction.dueHe, "לא ידוע");
});

test("score rail is compact, categorical, weakest/strongest marked, no percentage", () => {
  const { vm } = vmOf();
  assert.ok(vm.scoreRail.rows.length > 0 && vm.scoreRail.rows.length <= 6);
  const legal = vm.scoreRail.rows.find((r) => r.labelHe === "משפטי");
  assert.ok(legal && legal.emphasis === "weak");
  assert.equal(legal.stateHe, "דורש בדיקת מומחה");
  const docs = vm.scoreRail.rows.find((r) => r.labelHe === "מסמכים");
  assert.ok(docs && docs.emphasis === "strong");
  // no overall percentage anywhere in the rail
  for (const r of vm.scoreRail.rows) assert.doesNotMatch(r.stateHe, /%|\d{2,}/u);
});

test("Dino seal is a single, sourced, policy-aware insight", () => {
  const { vm } = vmOf();
  assert.ok(vm.dino);
  assert.match(vm.dino.insightHe, /דינו/u);
  assert.ok(vm.dino.provenanceHe.length >= 2, "traceable to real sources");
  assert.ok(vm.dino.provenanceHe.some((p) => /כיסוי משפטי/u.test(p)));
  assert.ok(vm.dino.provenanceHe.some((p) => /בדיקת מומחה/u.test(p)));
  assert.ok(vm.dino.policyNoteHe && /בדיקה אנושית/u.test(vm.dino.policyNoteHe));
});

test("the adapter is a deterministic pure function", () => {
  const matter = getDemoMatter("d");
  const a = toRoomViewModel(buildMatterProfile(matter), matter);
  const b = toRoomViewModel(buildMatterProfile(matter), matter);
  assert.deepEqual(a, b);
});
