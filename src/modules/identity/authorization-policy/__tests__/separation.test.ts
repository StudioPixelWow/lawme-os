/** Slice 0.8.3 — capability vs resource separation (tests 68–74). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestActorContext } from "../../test-support.ts";
import { authorizeMatter } from "../matter-policy.ts";
import { authorizeIntakeDraft } from "../intake-policy.ts";
import { authorizeDocument } from "../document-policy.ts";
import { authorizeEvidence } from "../evidence-policy.ts";
import type { DocumentPolicyFacts, EvidencePolicyFacts } from "../contracts.ts";
import { ACTOR, ORG_A, caps, matterFacts, membership, serviceActor, userActor } from "./_support.ts";

test("68: capability alone never grants restricted Matter access", () => {
  const actor = userActor({ capabilities: caps("matters.read") }); // capability, no membership/ownership
  assert.equal(authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged" })).allowed, false);
});

test("69: resource membership alone never grants a missing capability", () => {
  const actor = userActor({ capabilities: caps("matters.read") }); // member, but no matters.update
  const d = authorizeMatter(actor, "matter.update", matterFacts({ actorMatterMembership: membership() }));
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("70: the role label is never evaluated directly — only capabilities + facts matter", () => {
  const common = { profileId: ACTOR, organizationId: ORG_A, correlationId: "00000000-0000-4000-8000-00000000c070", capabilities: caps("matters.read") };
  const asParalegal = createTestActorContext({ ...common, role: "paralegal" });
  const asOwner = createTestActorContext({ ...common, role: "owner" });
  const facts = matterFacts({ ownerProfileId: ACTOR });
  assert.deepEqual(authorizeMatter(asParalegal, "matter.read", facts), authorizeMatter(asOwner, "matter.read", facts));
});

test("71: an admin/management capability creates no implicit confidentiality override", () => {
  const actor = userActor({ capabilities: caps("matters.read", "administration.manage", "organization.manage_members") });
  const d = authorizeMatter(actor, "matter.read", matterFacts({ confidentiality: "privileged" }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CONFIDENTIALITY_DENIED");
});

test("72: reviewer assignment does not imply intake.confirm", () => {
  const actor = userActor({ capabilities: caps("intake.review") }); // reviewer, but no intake.confirm
  const d = authorizeIntakeDraft(actor, "intake.confirm", {
    draftId: "00000000-0000-4000-8000-0000000000e1",
    organizationId: ORG_A,
    createdByProfileId: "someone-else",
    reviewerProfileIds: [ACTOR],
    status: "ready_for_review",
  });
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});

test("73: Matter owner does not imply document/evidence approval", () => {
  const docFacts: DocumentPolicyFacts = {
    documentId: "00000000-0000-4000-8000-000000000a01",
    organizationId: ORG_A,
    matterId: "00000000-0000-4000-8000-0000000000d1",
    matterPolicy: matterFacts({ ownerProfileId: ACTOR }),
    confidentiality: "standard",
  };
  const evFacts: EvidencePolicyFacts = {
    evidenceId: "00000000-0000-4000-8000-000000000b01",
    organizationId: ORG_A,
    matterId: "00000000-0000-4000-8000-0000000000d1",
    matterPolicy: matterFacts({ ownerProfileId: ACTOR }),
  };
  const owner = userActor({ capabilities: caps("matters.read", "documents.approve", "evidence.approve") });
  assert.equal(authorizeDocument(owner, "document.approve", docFacts).code, "RESOURCE_APPROVAL_DENIED");
  assert.equal(authorizeEvidence(owner, "evidence.approve", evFacts).code, "RESOURCE_APPROVAL_DENIED");
});

test("74: service-actor possession does not authorize a resource action", () => {
  assert.equal(authorizeMatter(serviceActor, "matter.read", matterFacts({ ownerProfileId: ACTOR })).code, "RESOURCE_ACTOR_TYPE_DENIED");
});
