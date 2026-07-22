/** Slice 0.8.3 — Evidence policy (tests 56–62). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeEvidence } from "../evidence-policy.ts";
import type { EvidencePolicyFacts } from "../contracts.ts";
import { ACTOR, ORG_A, caps, matterFacts, membership, userActor } from "./_support.ts";

const EVID = "00000000-0000-4000-8000-000000000b01";
function evidence(o?: Partial<EvidencePolicyFacts>): EvidencePolicyFacts {
  return { evidenceId: EVID, organizationId: ORG_A, matterId: "00000000-0000-4000-8000-0000000000d1", matterPolicy: matterFacts({ ownerProfileId: ACTOR }), ...o };
}

test("56: read requires evidence.read + Matter access", () => {
  const ok = userActor({ capabilities: caps("matters.read", "evidence.read") });
  assert.equal(authorizeEvidence(ok, "evidence.read", evidence()).allowed, true);
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeEvidence(noCap, "evidence.read", evidence()).code, "RESOURCE_CAPABILITY_DENIED");
});

test("57: create_requirement requires evidence.create_requirement", () => {
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeEvidence(noCap, "evidence.create_requirement", evidence()).code, "RESOURCE_CAPABILITY_DENIED");
  const ok = userActor({ capabilities: caps("matters.read", "evidence.create_requirement") });
  assert.equal(authorizeEvidence(ok, "evidence.create_requirement", evidence()).allowed, true);
});

test("58: review requires evidence.review", () => {
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeEvidence(noCap, "evidence.review", evidence()).code, "RESOURCE_CAPABILITY_DENIED");
  const ok = userActor({ capabilities: caps("matters.read", "evidence.review") });
  assert.equal(authorizeEvidence(ok, "evidence.review", evidence()).allowed, true);
});

test("59: approve requires evidence.approve + explicit approval authority", () => {
  const actor = userActor({ capabilities: caps("matters.read", "evidence.approve") });
  const d = authorizeEvidence(actor, "evidence.approve", evidence({ matterPolicy: matterFacts({ actorMatterMembership: membership({ canApprove: true }) }) }));
  assert.equal(d.allowed, true);
});

test("60: owner without evidence.approve is denied; ownership never grants approval", () => {
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeEvidence(noCap, "evidence.approve", evidence()).code, "RESOURCE_CAPABILITY_DENIED");
  const owner = userActor({ capabilities: caps("matters.read", "evidence.approve") });
  const d = authorizeEvidence(owner, "evidence.approve", evidence({ matterPolicy: matterFacts({ ownerProfileId: ACTOR }) }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_APPROVAL_DENIED");
});

test("61: approval authorization does not assert evidence validity (no truth field leaks)", () => {
  const actor = userActor({ capabilities: caps("matters.read", "evidence.approve") });
  const d = authorizeEvidence(actor, "evidence.approve", evidence({ matterPolicy: matterFacts({ actorMatterMembership: membership({ canApprove: true }) }) }));
  const allowedKeys = ["allowed", "code", "policyVersion", "action", "resourceType", "correlationId", "requirements"];
  for (const k of Object.keys(d)) assert.ok(allowedKeys.includes(k), `unexpected key ${k}`);
  assert.ok(!/valid|truth|verified/i.test(JSON.stringify(d)));
});

test("62: missing parent Matter facts denies", () => {
  const actor = userActor({ capabilities: caps("matters.read", "evidence.read") });
  const d = authorizeEvidence(actor, "evidence.read", evidence({ matterPolicy: undefined as never }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_INVALID_POLICY_FACTS");
});
