/** Slice 0.8.3 — Document policy (tests 46–55). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeDocument } from "../document-policy.ts";
import type { DocumentConfidentiality, DocumentPolicyFacts } from "../contracts.ts";
import { ACTOR, ORG_A, ORG_B, caps, matterFacts, membership, userActor } from "./_support.ts";

const DOC = "00000000-0000-4000-8000-000000000a01";
const DOC_MATTER = "00000000-0000-4000-8000-0000000000d1"; // == MATTER

function doc(o?: Partial<DocumentPolicyFacts>, conf: DocumentConfidentiality = "standard"): DocumentPolicyFacts {
  return {
    documentId: DOC,
    organizationId: ORG_A,
    matterId: DOC_MATTER,
    matterPolicy: matterFacts({ ownerProfileId: ACTOR }),
    confidentiality: conf,
    ...o,
  };
}

test("46: document read requires documents.read", () => {
  const actor = userActor({ capabilities: caps("matters.read") }); // matter access, but no documents.read
  assert.equal(authorizeDocument(actor, "document.read", doc()).code, "RESOURCE_CAPABILITY_DENIED");
});

test("47: document read requires parent Matter authorization", () => {
  const actor = userActor({ capabilities: caps("matters.read", "documents.read") });
  const d = authorizeDocument(actor, "document.read", doc({ matterPolicy: matterFacts() })); // no matter access
  assert.equal(d.allowed, false);
  assert.equal(d.resourceType, "document");
  assert.equal(d.code, "RESOURCE_OWNER_OR_MEMBER_REQUIRED");
});

test("48: cross-tenant and cross-matter facts are denied", () => {
  const actor = userActor({ organizationId: ORG_A, capabilities: caps("matters.read", "documents.read") });
  // consistent cross-tenant facts (doc + parent matter both in ORG_B) → tenant mismatch
  assert.equal(
    authorizeDocument(actor, "document.read", doc({ organizationId: ORG_B, matterPolicy: matterFacts({ organizationId: ORG_B, ownerProfileId: ACTOR }) })).code,
    "RESOURCE_TENANT_MISMATCH",
  );
  // matterPolicy describing a different matter than the document → invalid facts
  assert.equal(
    authorizeDocument(actor, "document.read", doc({ matterPolicy: matterFacts({ matterId: "00000000-0000-4000-8000-0000000000d2", ownerProfileId: ACTOR }) })).code,
    "RESOURCE_INVALID_POLICY_FACTS",
  );
});

test("49: privileged document is denied when Matter access is only via broad-read (no base access)", () => {
  const actor = userActor({ capabilities: caps("matters.read", "documents.read") });
  const d = authorizeDocument(
    actor,
    "document.read",
    doc({ matterPolicy: matterFacts({ organizationBroadReadGranted: true }) }, "privileged"),
  );
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CONFIDENTIALITY_DENIED");
});

test("50: upload requires documents.upload + Matter access", () => {
  const okActor = userActor({ capabilities: caps("matters.read", "documents.upload") });
  assert.equal(authorizeDocument(okActor, "document.upload", doc()).allowed, true);
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeDocument(noCap, "document.upload", doc()).code, "RESOURCE_CAPABILITY_DENIED");
});

test("51: review requires documents.review", () => {
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeDocument(noCap, "document.review", doc()).code, "RESOURCE_CAPABILITY_DENIED");
  const okActor = userActor({ capabilities: caps("matters.read", "documents.review") });
  assert.equal(authorizeDocument(okActor, "document.review", doc()).allowed, true);
});

test("52: approval requires documents.approve + explicit approval authority", () => {
  const actor = userActor({ capabilities: caps("matters.read", "documents.approve") });
  const d = authorizeDocument(actor, "document.approve", doc({ matterPolicy: matterFacts({ actorMatterMembership: membership({ canApprove: true }) }) }));
  assert.equal(d.allowed, true);
});

test("53: owner without documents.approve is denied; approve authority never comes from ownership alone", () => {
  const noCap = userActor({ capabilities: caps("matters.read") });
  assert.equal(authorizeDocument(noCap, "document.approve", doc()).code, "RESOURCE_CAPABILITY_DENIED");
  // Has the capability + is owner, but has NO can_approve membership → denied.
  const owner = userActor({ capabilities: caps("matters.read", "documents.approve") });
  const d = authorizeDocument(owner, "document.approve", doc({ matterPolicy: matterFacts({ ownerProfileId: ACTOR }) }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_APPROVAL_DENIED");
});

test("54: preview via ActorContext requires normal read authorization", () => {
  const okActor = userActor({ capabilities: caps("matters.read", "documents.read") });
  assert.equal(authorizeDocument(okActor, "document.preview", doc()).allowed, true);
  const noAccess = userActor({ capabilities: caps("matters.read", "documents.read") });
  assert.equal(authorizeDocument(noAccess, "document.preview", doc({ matterPolicy: matterFacts() })).allowed, false);
});

test("55: there is no token bypass — preview still fails closed without read capability", () => {
  const noReadCap = userActor({ capabilities: caps("matters.read") }); // no documents.read
  const d = authorizeDocument(noReadCap, "document.preview", doc());
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_CAPABILITY_DENIED");
});
