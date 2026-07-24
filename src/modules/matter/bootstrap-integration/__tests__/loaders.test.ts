import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuthDb } from "../../../identity/infrastructure/supabase-auth-client.ts";
import {
  createBootstrapDraftSnapshotLoader,
  deriveDraftSchemaVersion,
} from "../draft-snapshot-loader.ts";
import {
  createBootstrapReferenceFactsLoader,
  extractReferencedContactIds,
  SUPPORTED_MATTER_PROCEDURE_TYPES,
} from "../reference-facts-loader.ts";
import { ACTOR_ID, DRAFT_ID, ENGINE_VERSION, ORG_ID, VERSION_TOKEN, makeActor, makeRawDraft } from "./fixtures.ts";

interface Resp {
  readonly data: unknown;
  readonly error: unknown;
}

function makeBuilder(resp: Resp): unknown {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "limit", "order"]) b[m] = () => b;
  b.maybeSingle = async () => resp;
  b.then = (onF: (v: Resp) => unknown, onR?: (e: unknown) => unknown) => Promise.resolve(resp).then(onF, onR);
  return b;
}

function fakeDb(map: Record<string, Resp>): AuthDb {
  return { from: (table: string) => makeBuilder(map[table] ?? { data: null, error: null }) } as unknown as AuthDb;
}

const goodDraftRow = {
  id: DRAFT_ID,
  organization_id: ORG_ID,
  status: "ready_for_review",
  version_token: VERSION_TOKEN,
  engine_version: ENGINE_VERSION,
  structured_draft: { contacts: [] },
  expires_at: null,
  confirmed_matter_id: null,
};

/* ---------------------- draft snapshot loader ---------------------- */

test("deriveDraftSchemaVersion extracts the contract suffix, else null", () => {
  assert.equal(deriveDraftSchemaVersion(ENGINE_VERSION), "matter-intake-contract-1.0.0");
  assert.equal(deriveDraftSchemaVersion("matter-intake-engine-1.0.0"), null);
  assert.equal(deriveDraftSchemaVersion("x|not-a-contract"), null);
});

test("23 draft loader returns a mapped RawBootstrapDraft; no raw columns escape", async () => {
  const loader = createBootstrapDraftSnapshotLoader(fakeDb({ matter_intake_drafts: { data: goodDraftRow, error: null } }));
  const draft = await loader.load(makeActor(), DRAFT_ID);
  assert.ok(draft);
  assert.equal(draft?.draftId, DRAFT_ID);
  assert.equal(draft?.schemaVersion, "matter-intake-contract-1.0.0");
  assert.equal(draft?.engineVersion, ENGINE_VERSION);
  // only the mapped RawBootstrapDraft keys are present — no snake_case columns.
  assert.equal(Object.prototype.hasOwnProperty.call(draft, "organization_id"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(draft, "confidential_input"), false);
});

test("22 malformed row fails closed (null)", async () => {
  const loader = createBootstrapDraftSnapshotLoader(fakeDb({ matter_intake_drafts: { data: { id: DRAFT_ID }, error: null } }));
  assert.equal(await loader.load(makeActor(), DRAFT_ID), null);
});

test("22 unrecognised engine/schema version fails closed (null)", async () => {
  const row = { ...goodDraftRow, engine_version: "matter-intake-engine-1.0.0" };
  const loader = createBootstrapDraftSnapshotLoader(fakeDb({ matter_intake_drafts: { data: row, error: null } }));
  assert.equal(await loader.load(makeActor(), DRAFT_ID), null);
});

test("missing draft returns null; db error throws (fail closed)", async () => {
  const none = createBootstrapDraftSnapshotLoader(fakeDb({ matter_intake_drafts: { data: null, error: null } }));
  assert.equal(await none.load(makeActor(), DRAFT_ID), null);
  const errored = createBootstrapDraftSnapshotLoader(fakeDb({ matter_intake_drafts: { data: null, error: { message: "boom" } } }));
  await assert.rejects(() => errored.load(makeActor(), DRAFT_ID));
});

/* ---------------------- reference facts loader ---------------------- */

test("18/19/20 extractReferencedContactIds: only valid uuids under contacts[].contactId", () => {
  assert.deepEqual(extractReferencedContactIds({ contacts: [] }), []);
  assert.deepEqual(
    extractReferencedContactIds({ contacts: [{ contactId: "cc000000-0000-4000-8000-0000000000cc" }, { contactId: "not-a-uuid" }, { other: 1 }] }),
    ["cc000000-0000-4000-8000-0000000000cc"],
  );
  assert.deepEqual(extractReferencedContactIds({ nope: true }), []);
  assert.deepEqual(extractReferencedContactIds(null), []);
});

test("16/17/21 reference facts: active org, active owner, supported procedure types", async () => {
  const db = fakeDb({
    organizations: { data: { id: ORG_ID, deleted_at: null }, error: null },
    organization_memberships: { data: { profile_id: ACTOR_ID, status: "active" }, error: null },
    contacts: { data: [], error: null },
  });
  const facts = await createBootstrapReferenceFactsLoader(db).load(makeActor(), makeRawDraft());
  assert.equal(facts.organization.active, true);
  assert.equal(facts.owner?.activeMember, true);
  assert.equal(facts.owner?.profileId, ACTOR_ID);
  assert.deepEqual([...facts.supportedMatterTypes].sort(), [...SUPPORTED_MATTER_PROCEDURE_TYPES].sort());
  assert.equal(facts.supportedValidationVersion, "bootstrap-validation-v1");
  assert.deepEqual(facts.supportedDraftEngineVersions, [ENGINE_VERSION]);
});

test("16 soft-deleted org → inactive; suspended membership → inactive owner", async () => {
  const db = fakeDb({
    organizations: { data: { id: ORG_ID, deleted_at: "2026-01-01T00:00:00Z" }, error: null },
    organization_memberships: { data: { profile_id: ACTOR_ID, status: "suspended" }, error: null },
    contacts: { data: [], error: null },
  });
  const facts = await createBootstrapReferenceFactsLoader(db).load(makeActor(), makeRawDraft());
  assert.equal(facts.organization.active, false);
  assert.equal(facts.owner?.activeMember, false);
});

test("18 same-tenant contact resolves; cross-tenant/unknown absent (org-scoped read)", async () => {
  const cid = "cc000000-0000-4000-8000-0000000000cc";
  // the fake `in()` query is org-scoped by construction; only same-tenant rows are returned.
  const db = fakeDb({
    organizations: { data: { id: ORG_ID, deleted_at: null }, error: null },
    organization_memberships: { data: { profile_id: ACTOR_ID, status: "active" }, error: null },
    contacts: { data: [{ id: cid, organization_id: ORG_ID, kind: "person" }], error: null },
  });
  const draft = makeRawDraft({ structuredDraft: { contacts: [{ contactId: cid }] } });
  const facts = await createBootstrapReferenceFactsLoader(db).load(makeActor(), draft);
  assert.equal(facts.resolvedContacts.length, 1);
  assert.equal(facts.resolvedContacts[0]?.contactId, cid);
  assert.equal(facts.resolvedContacts[0]?.organizationId, ORG_ID);
});

test("existingConfirmation reflects the persisted confirmed matter", async () => {
  const db = fakeDb({
    organizations: { data: { id: ORG_ID, deleted_at: null }, error: null },
    organization_memberships: { data: { profile_id: ACTOR_ID, status: "active" }, error: null },
    contacts: { data: [], error: null },
  });
  const facts = await createBootstrapReferenceFactsLoader(db).load(
    makeActor(),
    makeRawDraft({ confirmedMatterId: "ed000000-0000-4000-8000-0000000000ed" }),
  );
  assert.deepEqual(facts.existingConfirmation, { matterId: "ed000000-0000-4000-8000-0000000000ed" });
});
