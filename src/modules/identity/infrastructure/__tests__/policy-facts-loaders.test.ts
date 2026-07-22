/** Slice 0.8.4 — authorization-fact loaders (tests 1–14). Pure, with a fake
 *  authenticated client that records table/column/filter usage. */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuthDb } from "../supabase-auth-client.ts";
import type { ActorContext } from "../../actor-context.ts";
import { createTestActorContext } from "../../test-support.ts";
import { createMatterPolicyFactsRepository, createReadableMatterIndex } from "../matter-policy-facts-repository.ts";
import { createIntakeDraftPolicyFactsRepository } from "../intake-policy-facts-repository.ts";
import { createDocumentPolicyFactsRepository } from "../document-policy-facts-repository.ts";
import { createContactPolicyFactsRepository } from "../contact-policy-facts-repository.ts";
import { createEvidencePolicyFactsRepository } from "../evidence-policy-facts-repository.ts";

const ORG = "00000000-0000-4000-8000-0000000000c1";
const ACTOR = "00000000-0000-4000-8000-0000000000a1";
const MATTER = "11111111-1111-4111-8111-111111111111";
const DOC = "22222222-2222-4222-8222-222222222222";

interface Call { table: string; select?: string; eqs: Array<[string, unknown]> }
type TableResponse = { data: unknown[] | null; error: unknown };

function fakeDb(byTable: Record<string, TableResponse>, log: Call[]): AuthDb {
  function builder(call: Call): Record<string, unknown> & PromiseLike<TableResponse> {
    const response = byTable[call.table] ?? { data: [], error: null };
    const b = {
      select(cols: string) { call.select = cols; return b; },
      eq(col: string, val: unknown) { call.eqs.push([col, val]); return b; },
      is() { return b; },
      limit() { return b; },
      order() { return b; },
      then(onF: (v: TableResponse) => unknown, onR?: (e: unknown) => unknown) {
        return Promise.resolve(response).then(onF, onR);
      },
    };
    return b as Record<string, unknown> & PromiseLike<TableResponse>;
  }
  return {
    from(table: string) {
      const call: Call = { table, eqs: [] };
      log.push(call);
      return builder(call);
    },
  } as unknown as AuthDb;
}

function actor(): ActorContext {
  return createTestActorContext({ profileId: ACTOR, organizationId: ORG });
}

test("1/2: matter facts map exact fields and the owner", async () => {
  const log: Call[] = [];
  const db = fakeDb(
    { matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "client_confidential", status: "open", created_at: "leak" }], error: null }, matter_members: { data: [], error: null } },
    log,
  );
  const facts = await createMatterPolicyFactsRepository(db).loadMatterPolicyFacts(actor(), MATTER);
  assert.ok(facts);
  assert.equal(facts.matterId, MATTER);
  assert.equal(facts.organizationId, ORG);
  assert.equal(facts.ownerProfileId, ACTOR);
  assert.equal(facts.confidentiality, "client_confidential");
  // org scoping enforced in the query even though RLS also exists
  assert.ok(log[0].eqs.some(([c, v]) => c === "organization_id" && v === ORG));
});

test("3: matter member maps can_review/can_approve, normalized active", async () => {
  const log: Call[] = [];
  const db = fakeDb(
    { matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: null, confidentiality: "internal", status: "open" }], error: null }, matter_members: { data: [{ id: "mm1", profile_id: ACTOR, can_review: true, can_approve: false }], error: null } },
    log,
  );
  const facts = await createMatterPolicyFactsRepository(db).loadMatterPolicyFacts(actor(), MATTER);
  assert.deepEqual(facts?.actorMatterMembership, { membershipId: "mm1", profileId: ACTOR, canReview: true, canApprove: false, active: true });
});

test("4/5: missing or cross-tenant matter returns null", async () => {
  const db = fakeDb({ matters: { data: [], error: null } }, []);
  assert.equal(await createMatterPolicyFactsRepository(db).loadMatterPolicyFacts(actor(), MATTER), null);
});

test("6: malformed confidentiality fails closed (null)", async () => {
  const db = fakeDb({ matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: null, confidentiality: "top_secret", status: "open" }], error: null } }, []);
  assert.equal(await createMatterPolicyFactsRepository(db).loadMatterPolicyFacts(actor(), MATTER), null);
});

test("7/8: intake facts load no confidential content; creator/reviewers/status map", async () => {
  const log: Call[] = [];
  const db = fakeDb({ matter_intake_drafts: { data: [{ id: "d1", organization_id: ORG, created_by: ACTOR, reviewer_ids: ["r1"], status: "ready_for_review", confidential_input: "SECRET", structured_draft: { x: 1 } }], error: null } }, log);
  const facts = await createIntakeDraftPolicyFactsRepository(db).loadIntakeDraftPolicyFacts(actor(), "d1");
  assert.ok(facts);
  assert.deepEqual(Object.keys(facts).sort(), ["createdByProfileId", "draftId", "organizationId", "reviewerProfileIds", "status"]);
  assert.equal(facts.createdByProfileId, ACTOR);
  assert.deepEqual(facts.reviewerProfileIds, ["r1"]);
  // the select never requested confidential columns
  assert.ok(!/confidential_input|structured_draft/.test(log[0].select ?? ""));
});

test("9: inaccessible draft returns null", async () => {
  const db = fakeDb({ matter_intake_drafts: { data: [], error: null } }, []);
  assert.equal(await createIntakeDraftPolicyFactsRepository(db).loadIntakeDraftPolicyFacts(actor(), "d1"), null);
});

test("10: document facts bind matter and document ids + parent matter facts", async () => {
  const log: Call[] = [];
  const db = fakeDb(
    {
      matter_documents: { data: [{ id: DOC, organization_id: ORG, matter_id: MATTER, confidentiality: "standard", approval_state: "draft", uploaded_by_id: ACTOR, assigned_reviewer_id: null }], error: null },
      matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open" }], error: null },
      matter_members: { data: [], error: null },
    },
    log,
  );
  const facts = await createDocumentPolicyFactsRepository(db).loadDocumentPolicyFacts(actor(), MATTER, DOC);
  assert.ok(facts);
  assert.equal(facts.documentId, DOC);
  assert.equal(facts.matterId, MATTER);
  assert.equal(facts.matterPolicy.matterId, MATTER);
  // no storage path / filename / content columns requested
  assert.ok(!/filename|storage|content|size|title/.test(log[0].select ?? ""));
});

test("11: wrong matter/document pair returns null", async () => {
  const db = fakeDb(
    {
      matter_documents: { data: [{ id: DOC, organization_id: ORG, matter_id: "99999999-9999-4999-8999-999999999999", confidentiality: "standard", approval_state: "draft", uploaded_by_id: null, assigned_reviewer_id: null }], error: null },
      matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open" }], error: null },
      matter_members: { data: [], error: null },
    },
    [],
  );
  assert.equal(await createDocumentPolicyFactsRepository(db).loadDocumentPolicyFacts(actor(), MATTER, DOC), null);
});

test("12: contact facts map organization only", async () => {
  const db = fakeDb({ contacts: { data: [{ id: "c1", organization_id: ORG, name_he: "LEAK" }], error: null } }, []);
  const facts = await createContactPolicyFactsRepository(db).loadContactPolicyFacts(actor(), "c1");
  assert.deepEqual(facts, { contactId: "c1", organizationId: ORG });
});

test("13: evidence facts include parent matter facts", async () => {
  const db = fakeDb(
    {
      matter_evidence: { data: [{ id: "e1", organization_id: ORG, matter_id: MATTER, status: "required" }], error: null },
      matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open" }], error: null },
      matter_members: { data: [], error: null },
    },
    [],
  );
  const facts = await createEvidencePolicyFactsRepository(db).loadEvidencePolicyFacts(actor(), MATTER, "e1");
  assert.ok(facts?.matterPolicy);
  assert.equal(facts.matterPolicy.matterId, MATTER);
});

test("14: raw DB rows never escape — facts are frozen and carry only normalized keys", async () => {
  const db = fakeDb(
    { matters: { data: [{ id: MATTER, organization_id: ORG, assigned_owner_id: ACTOR, confidentiality: "internal", status: "open", created_at: "x", topic: "y" }], error: null }, matter_members: { data: [], error: null } },
    [],
  );
  const facts = await createMatterPolicyFactsRepository(db).loadMatterPolicyFacts(actor(), MATTER);
  assert.ok(facts && Object.isFrozen(facts));
  for (const k of Object.keys(facts)) assert.ok(["matterId", "organizationId", "ownerProfileId", "confidentiality", "actorMatterMembership", "isArchived"].includes(k), `leaked ${k}`);
});

test("readable index: owner+member candidate ids, org-scoped, deduped", async () => {
  const log: Call[] = [];
  const db = fakeDb(
    { matters: { data: [{ id: MATTER }], error: null }, matter_members: { data: [{ matter_id: MATTER }, { matter_id: "33333333-3333-4333-8333-333333333333" }], error: null } },
    log,
  );
  const ids = await createReadableMatterIndex(db).listReadableMatterIds(actor());
  assert.deepEqual([...ids].sort(), [MATTER, "33333333-3333-4333-8333-333333333333"].sort());
  assert.ok(log.every((c) => c.eqs.some(([col, v]) => col === "organization_id" && v === ORG)));
});
