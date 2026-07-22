/** Slice 0.8.3 — Contact policy (tests 39–45). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeContact } from "../contact-policy.ts";
import { authorizeMatter } from "../matter-policy.ts";
import type { ContactPolicyFacts } from "../contracts.ts";
import { ACTOR, ORG_A, ORG_B, caps, matterFacts, userActor } from "./_support.ts";

const CONTACT = "00000000-0000-4000-8000-0000000000f1";
function contact(o?: Partial<ContactPolicyFacts>): ContactPolicyFacts {
  return { contactId: CONTACT, organizationId: ORG_A, ...o };
}

test("39: same-org + contacts.read allows read", () => {
  const actor = userActor({ capabilities: caps("contacts.read") });
  assert.equal(authorizeContact(actor, "contact.read", contact()).allowed, true);
});

test("40: cross-tenant is denied", () => {
  const actor = userActor({ organizationId: ORG_A, capabilities: caps("contacts.read") });
  assert.equal(authorizeContact(actor, "contact.read", contact({ organizationId: ORG_B })).code, "RESOURCE_TENANT_MISMATCH");
});

test("41: contacts.update is required for update", () => {
  const actor = userActor({ capabilities: caps("contacts.read") });
  assert.equal(authorizeContact(actor, "contact.update", contact()).code, "RESOURCE_CAPABILITY_DENIED");
});

test("42: contacts.link is required for Matter linking", () => {
  const actor = userActor({ capabilities: caps("contacts.read") });
  const okMatter = authorizeMatter(userActor({ capabilities: caps("matters.read") }), "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(authorizeContact(actor, "contact.link_to_matter", contact(), okMatter).code, "RESOURCE_CAPABILITY_DENIED");
});

test("43: link is denied when the Matter decision is denied", () => {
  const actor = userActor({ capabilities: caps("contacts.link") });
  const deniedMatter = authorizeMatter(userActor({ capabilities: caps("matters.read") }), "matter.read", matterFacts()); // no access
  assert.equal(deniedMatter.allowed, false);
  const d = authorizeContact(actor, "contact.link_to_matter", contact(), deniedMatter);
  assert.equal(d.allowed, false);
  assert.equal(d.resourceType, "contact");
  assert.equal(d.code, deniedMatter.code); // preserves the matter reason
});

test("44: link is allowed only when BOTH Contact and Matter authorization pass", () => {
  const actor = userActor({ capabilities: caps("contacts.link") });
  const okMatter = authorizeMatter(userActor({ capabilities: caps("matters.read") }), "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  assert.equal(okMatter.allowed, true);
  assert.equal(authorizeContact(actor, "contact.link_to_matter", contact(), okMatter).allowed, true);
  // ...and with no matter decision supplied at all, it fails closed.
  assert.equal(authorizeContact(actor, "contact.link_to_matter", contact()).code, "RESOURCE_INVALID_POLICY_FACTS");
});

test("45: create is organization-scoped and needs no Contact id; read without an id is invalid", () => {
  const actor = userActor({ capabilities: caps("contacts.create") });
  assert.equal(authorizeContact(actor, "contact.create", { organizationId: ORG_A }).allowed, true);
  const reader = userActor({ capabilities: caps("contacts.read") });
  assert.equal(authorizeContact(reader, "contact.read", { organizationId: ORG_A }).code, "RESOURCE_INVALID_POLICY_FACTS");
});
