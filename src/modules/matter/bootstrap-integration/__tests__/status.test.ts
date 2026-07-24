import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getMatterBootstrapStatus,
  type DraftConfirmationReader,
  type DraftConfirmationSnapshot,
  type MatterBootstrapStatusDependencies,
} from "../status.ts";
import { DRAFT_ID, MATTER_ID, makeActor, makeAuthzService, type AuthzCall } from "./fixtures.ts";

function reader(snap: DraftConfirmationSnapshot | null): DraftConfirmationReader {
  return { async read() { return snap; } };
}

function deps(allow: (c: AuthzCall) => boolean, snap: DraftConfirmationSnapshot | null): MatterBootstrapStatusDependencies {
  return { authorization: makeAuthzService(allow).service, reader: reader(snap) };
}

const confirmed: DraftConfirmationSnapshot = {
  status: "confirmed",
  versionToken: "v1",
  confirmationIdempotencyKey: "key-1",
  confirmationPlanHash: "a".repeat(64),
  confirmedMatterId: MATTER_ID,
};

test("57 unauthorized draft access → UNAVAILABLE", async () => {
  const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => false, confirmed));
  assert.equal(r.status, "UNAVAILABLE");
  assert.equal(r.matterId, null);
});

test("missing draft → UNAVAILABLE", async () => {
  const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => true, null));
  assert.equal(r.status, "UNAVAILABLE");
});

test("53/54 committed draft → COMMITTED with read-authorized matter id", async () => {
  const r = await getMatterBootstrapStatus(
    { actor: makeActor(), intakeDraftId: DRAFT_ID, idempotencyKey: "key-1", planHash: "a".repeat(64) },
    deps(() => true, confirmed),
  );
  assert.equal(r.status, "COMMITTED");
  assert.equal(r.matterId, MATTER_ID);
});

test("58 committed but matter not read-authorized → matter id withheld", async () => {
  const r = await getMatterBootstrapStatus(
    { actor: makeActor(), intakeDraftId: DRAFT_ID },
    deps((c) => c.resourceType !== "matter", confirmed),
  );
  assert.equal(r.status, "COMMITTED");
  assert.equal(r.matterId, null);
});

test("56 confirmed with a conflicting key → CONFLICT (no matter id)", async () => {
  const r = await getMatterBootstrapStatus(
    { actor: makeActor(), intakeDraftId: DRAFT_ID, idempotencyKey: "other-key" },
    deps(() => true, confirmed),
  );
  assert.equal(r.status, "CONFLICT");
  assert.equal(r.matterId, null);
});

test("56 confirmed with a conflicting plan hash → CONFLICT", async () => {
  const r = await getMatterBootstrapStatus(
    { actor: makeActor(), intakeDraftId: DRAFT_ID, planHash: "b".repeat(64) },
    deps(() => true, confirmed),
  );
  assert.equal(r.status, "CONFLICT");
});

test("55 ready_for_review → READY", async () => {
  const snap: DraftConfirmationSnapshot = { status: "ready_for_review", versionToken: "v1", confirmationIdempotencyKey: null, confirmationPlanHash: null, confirmedMatterId: null };
  const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => true, snap));
  assert.equal(r.status, "READY");
});

test("55 active → NOT_STARTED", async () => {
  const snap: DraftConfirmationSnapshot = { status: "active", versionToken: "v1", confirmationIdempotencyKey: null, confirmationPlanHash: null, confirmedMatterId: null };
  const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => true, snap));
  assert.equal(r.status, "NOT_STARTED");
});

test("confirming → STALE (in-flight; caller may reconcile)", async () => {
  const snap: DraftConfirmationSnapshot = { status: "confirming", versionToken: "v1", confirmationIdempotencyKey: "key-1", confirmationPlanHash: "a".repeat(64), confirmedMatterId: null };
  const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => true, snap));
  assert.equal(r.status, "STALE");
});

test("rejected/expired → UNAVAILABLE", async () => {
  for (const status of ["rejected", "expired"]) {
    const snap: DraftConfirmationSnapshot = { status, versionToken: "v1", confirmationIdempotencyKey: null, confirmationPlanHash: null, confirmedMatterId: null };
    const r = await getMatterBootstrapStatus({ actor: makeActor(), intakeDraftId: DRAFT_ID }, deps(() => true, snap));
    assert.equal(r.status, "UNAVAILABLE");
  }
});
