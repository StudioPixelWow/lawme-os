import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfirmIntakeDraftCommand } from "../command.ts";
import { DRAFT_ID } from "./fixtures.ts";

const valid = {
  intakeDraftId: DRAFT_ID,
  expectedDraftVersionToken: "v1",
  confirmationIdempotencyKey: "key-123",
};

test("59 accepts a well-formed command", () => {
  const r = parseConfirmIntakeDraftCommand(valid);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.command.intakeDraftId, DRAFT_ID);
});

test("59 accepts optional approvals object", () => {
  const r = parseConfirmIntakeDraftCommand({ ...valid, approvals: { decisions: [] } });
  assert.equal(r.ok, true);
});

test("60 rejects unknown top-level keys", () => {
  const r = parseConfirmIntakeDraftCommand({ ...valid, somethingExtra: true });
  assert.equal(r.ok, false);
});

test("61 rejects client-supplied actor/org/authority fields", () => {
  for (const forbidden of [
    "actorId",
    "profileId",
    "organizationId",
    "role",
    "capabilities",
    "assignedOwnerId",
    "matterId",
    "confirmedMatterId",
    "planHash",
    "sourceInputHash",
    "plannerVersion",
    "validationVersion",
    "aggregateVersion",
    "stageId",
  ]) {
    const r = parseConfirmIntakeDraftCommand({ ...valid, [forbidden]: "x" });
    assert.equal(r.ok, false, `expected rejection of forbidden field ${forbidden}`);
  }
});

test("59 rejects missing required fields", () => {
  assert.equal(parseConfirmIntakeDraftCommand({ intakeDraftId: DRAFT_ID }).ok, false);
  assert.equal(parseConfirmIntakeDraftCommand({}).ok, false);
});

test("59 rejects a non-uuid draft id", () => {
  assert.equal(parseConfirmIntakeDraftCommand({ ...valid, intakeDraftId: "not-a-uuid" }).ok, false);
});

test("size limit rejects oversize approvals", () => {
  const big = { blob: "x".repeat(70 * 1024) };
  const r = parseConfirmIntakeDraftCommand({ ...valid, approvals: big });
  assert.equal(r.ok, false);
});

test("rejects an array approvals value", () => {
  const r = parseConfirmIntakeDraftCommand({ ...valid, approvals: [] });
  assert.equal(r.ok, false);
});
