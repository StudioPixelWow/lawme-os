/** Slice 0.8.3 — Intake Draft policy (tests 26–38). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeIntakeDraft } from "../intake-policy.ts";
import type { IntakeDraftPolicyFacts, IntakeDraftPolicyStatus } from "../contracts.ts";
import { ACTOR, ORG_A, ORG_B, OTHER, caps, userActor } from "./_support.ts";

const DRAFT = "00000000-0000-4000-8000-0000000000e1";

function draft(o?: Partial<IntakeDraftPolicyFacts>): IntakeDraftPolicyFacts {
  return { draftId: DRAFT, organizationId: ORG_A, createdByProfileId: ACTOR, reviewerProfileIds: [], status: "active", ...o };
}

test("26: creator may read with intake.read", () => {
  const actor = userActor({ capabilities: caps("intake.read") });
  assert.equal(authorizeIntakeDraft(actor, "intake.read", draft()).allowed, true);
});

test("27: assigned reviewer may read with intake.read", () => {
  const actor = userActor({ profileId: OTHER, capabilities: caps("intake.read") });
  assert.equal(authorizeIntakeDraft(actor, "intake.read", draft({ reviewerProfileIds: [OTHER] })).allowed, true);
});

test("28: same-org non-reviewer is denied", () => {
  const actor = userActor({ profileId: OTHER, capabilities: caps("intake.read") });
  const d = authorizeIntakeDraft(actor, "intake.read", draft({ reviewerProfileIds: [] }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_MEMBERSHIP_REQUIRED");
});

test("29: cross-tenant is denied", () => {
  const actor = userActor({ organizationId: ORG_A, capabilities: caps("intake.read") });
  const d = authorizeIntakeDraft(actor, "intake.read", draft({ organizationId: ORG_B }));
  assert.equal(d.code, "RESOURCE_TENANT_MISMATCH");
});

test("30: reviewer without intake.review cannot review", () => {
  const actor = userActor({ profileId: OTHER, capabilities: caps("intake.read") });
  const d = authorizeIntakeDraft(actor, "intake.review", draft({ reviewerProfileIds: [OTHER], status: "ready_for_review" }));
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("31: reviewer with intake.review can review a reviewable draft", () => {
  const actor = userActor({ profileId: OTHER, capabilities: caps("intake.review") });
  assert.equal(authorizeIntakeDraft(actor, "intake.review", draft({ reviewerProfileIds: [OTHER], status: "ready_for_review" })).allowed, true);
});

test("32: reviewer cannot assign reviewers without intake.assign_reviewers", () => {
  const actor = userActor({ profileId: OTHER, capabilities: caps("intake.review") });
  const d = authorizeIntakeDraft(actor, "intake.assign_reviewers", draft({ reviewerProfileIds: [OTHER] }));
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("33: creator with the capability may assign reviewers", () => {
  const actor = userActor({ capabilities: caps("intake.assign_reviewers") });
  assert.equal(authorizeIntakeDraft(actor, "intake.assign_reviewers", draft()).allowed, true);
});

test("34: confirm requires intake.confirm", () => {
  const actor = userActor({ capabilities: caps("intake.read") });
  const d = authorizeIntakeDraft(actor, "intake.confirm", draft({ status: "ready_for_review" }));
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("35: confirm requires ready_for_review status", () => {
  const actor = userActor({ capabilities: caps("intake.confirm") });
  const d = authorizeIntakeDraft(actor, "intake.confirm", draft({ status: "active" }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_STATUS_DENIED");
});

test("36: confirm authorizes readiness only and mutates nothing", () => {
  const actor = userActor({ capabilities: caps("intake.confirm") });
  const facts = draft({ status: "ready_for_review" });
  const snapshot = JSON.stringify(facts);
  const d = authorizeIntakeDraft(actor, "intake.confirm", facts);
  assert.equal(d.allowed, true);
  assert.equal(JSON.stringify(facts), snapshot); // no mutation — authorization only
});

test("37: rejected/expired/confirmed drafts are not editable", () => {
  const actor = userActor({ capabilities: caps("intake.read") });
  for (const status of ["rejected", "expired", "confirmed"] as IntakeDraftPolicyStatus[]) {
    const d = authorizeIntakeDraft(actor, "intake.edit", draft({ status }));
    assert.equal(d.allowed, false, `${status} must not be editable`);
    assert.equal(d.code, "RESOURCE_STATUS_DENIED");
  }
});

test("38: unknown status is denied", () => {
  const actor = userActor({ capabilities: caps("intake.read") });
  const d = authorizeIntakeDraft(actor, "intake.read", draft({ status: "vibing" as never }));
  assert.equal(d.code, "RESOURCE_INVALID_POLICY_FACTS");
});
