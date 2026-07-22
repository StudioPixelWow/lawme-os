/** Slice 0.8.4 — document/contact/evidence integration through the service
 *  (tests 43–54). Proves the loaders + policies compose at runtime. */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuthDb } from "../../infrastructure/supabase-auth-client.ts";
import type { ActorContext } from "../../actor-context.ts";
import type { Capability } from "../../capabilities.ts";
import { createTestActorContext } from "../../test-support.ts";
import { createResourceAuthorizationService } from "../authorize-resource-request.ts";

const ORG = "00000000-0000-4000-8000-0000000000c1";
const ACTOR = "00000000-0000-4000-8000-0000000000a1";
const MATTER = "11111111-1111-4111-8111-111111111111";
const DOC = "22222222-2222-4222-8222-222222222222";

type Resp = { data: unknown[] | null; error: unknown };
function fakeDb(byTable: Record<string, Resp>): AuthDb {
  return {
    from(table: string) {
      const response = byTable[table] ?? { data: [], error: null };
      const b = { select() { return b; }, eq() { return b; }, is() { return b; }, limit() { return b; }, order() { return b; }, in() { return b; }, then(f: (v: Resp) => unknown, r?: (e: unknown) => unknown) { return Promise.resolve(response).then(f, r); } };
      return b;
    },
  } as unknown as AuthDb;
}
function actor(caps: Capability[]): ActorContext {
  return createTestActorContext({ profileId: ACTOR, organizationId: ORG, capabilities: new Set(caps) });
}

const ownerMatter = { id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open" };
const foreignMatter = { id: MATTER, organization_id: ORG, assigned_owner_id: "someone-else", confidentiality: "internal", status: "open" };
const doc = (over: Record<string, unknown> = {}) => ({ id: DOC, organization_id: ORG, matter_id: MATTER, confidentiality: "standard", approval_state: "draft", uploaded_by_id: null, assigned_reviewer_id: null, ...over });

test("43/47: document read (and actor preview) require parent-matter authorization", async () => {
  const svc = createResourceAuthorizationService(fakeDb({ matter_documents: { data: [doc()], error: null }, matters: { data: [ownerMatter], error: null }, matter_members: { data: [], error: null } }));
  const a = actor(["matters.read", "documents.read"]);
  assert.equal((await svc.authorizeResourceRequest(a, { resourceType: "document", action: "document.read", matterId: MATTER, documentId: DOC })).allowed, true);
  assert.equal((await svc.authorizeResourceRequest(a, { resourceType: "document", action: "document.preview", matterId: MATTER, documentId: DOC })).allowed, true);
});

test("44: wrong matter/document pair is denied (null facts → not available)", async () => {
  const svc = createResourceAuthorizationService(fakeDb({ matter_documents: { data: [doc({ matter_id: "99999999-9999-4999-8999-999999999999" })], error: null }, matters: { data: [ownerMatter], error: null }, matter_members: { data: [], error: null } }));
  const d = await svc.authorizeResourceRequest(actor(["matters.read", "documents.read"]), { resourceType: "document", action: "document.read", matterId: MATTER, documentId: DOC });
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_TENANT_MISMATCH"); // uniform not-available
});

test("45: same-org non-member is denied document read", async () => {
  const svc = createResourceAuthorizationService(fakeDb({ matter_documents: { data: [doc()], error: null }, matters: { data: [foreignMatter], error: null }, matter_members: { data: [], error: null } }));
  const d = await svc.authorizeResourceRequest(actor(["matters.read", "documents.read"]), { resourceType: "document", action: "document.read", matterId: MATTER, documentId: DOC });
  assert.equal(d.allowed, false);
});

test("46: privileged document denied without matter base access", async () => {
  const svc = createResourceAuthorizationService(fakeDb({ matter_documents: { data: [doc({ confidentiality: "privileged" })], error: null }, matters: { data: [foreignMatter], error: null }, matter_members: { data: [], error: null } }));
  const d = await svc.authorizeResourceRequest(actor(["matters.read", "documents.read"]), { resourceType: "document", action: "document.read", matterId: MATTER, documentId: DOC });
  assert.equal(d.allowed, false);
});

test("50: contact link requires an authorized target-matter decision", async () => {
  const base = { contacts: { data: [{ id: "c1", organization_id: ORG }], error: null }, matter_members: { data: [], error: null } };
  // target matter accessible (owner) → allowed
  let svc = createResourceAuthorizationService(fakeDb({ ...base, matters: { data: [ownerMatter], error: null } }));
  assert.equal((await svc.authorizeResourceRequest(actor(["contacts.link", "matters.read"]), { resourceType: "contact", action: "contact.link_to_matter", contactId: "c1", targetMatter: { matterIdOrSlug: MATTER, action: "matter.read" } })).allowed, true);
  // target matter NOT accessible → denied
  svc = createResourceAuthorizationService(fakeDb({ ...base, matters: { data: [foreignMatter], error: null } }));
  assert.equal((await svc.authorizeResourceRequest(actor(["contacts.link", "matters.read"]), { resourceType: "contact", action: "contact.link_to_matter", contactId: "c1", targetMatter: { matterIdOrSlug: MATTER, action: "matter.read" } })).allowed, false);
});

test("51: contact cross-tenant / absent is denied", async () => {
  const svc = createResourceAuthorizationService(fakeDb({ contacts: { data: [], error: null } }));
  const d = await svc.authorizeResourceRequest(actor(["contacts.read"]), { resourceType: "contact", action: "contact.read", contactId: "c1" });
  assert.equal(d.allowed, false);
});

test("52/53/54: evidence read needs matter access; approval capability is separate; no validity field", async () => {
  const facts = { matter_evidence: { data: [{ id: "e1", organization_id: ORG, matter_id: MATTER, status: "required" }], error: null }, matters: { data: [ownerMatter], error: null }, matter_members: { data: [], error: null } };
  const svc = createResourceAuthorizationService(fakeDb(facts));
  assert.equal((await svc.authorizeResourceRequest(actor(["matters.read", "evidence.read"]), { resourceType: "evidence", action: "evidence.read", matterId: MATTER, evidenceId: "e1" })).allowed, true);
  // approve requires evidence.approve + can_approve authority — owner alone denied
  const approve = await svc.authorizeResourceRequest(actor(["matters.read", "evidence.approve"]), { resourceType: "evidence", action: "evidence.approve", matterId: MATTER, evidenceId: "e1" });
  assert.equal(approve.allowed, false);
  assert.ok(!/valid|verified|truth/i.test(JSON.stringify(approve)));
});
