import { test } from "node:test";
import assert from "node:assert/strict";
import { httpStatusForResult, messageForKind, type BootstrapMatterResultKind } from "../result.ts";

const kinds: readonly BootstrapMatterResultKind[] = [
  "MATTER_CREATED",
  "MATTER_ALREADY_CREATED",
  "VALIDATION_BLOCKED",
  "DRAFT_STALE",
  "IDEMPOTENCY_CONFLICT",
  "RESOURCE_NOT_AVAILABLE",
  "BOOTSTRAP_UNAVAILABLE",
  "BOOTSTRAP_INTERNAL_FAILURE",
];

test("every result kind maps to a safe HTTP status and a non-empty Hebrew message", () => {
  for (const kind of kinds) {
    const status = httpStatusForResult(kind);
    assert.ok(status >= 200 && status < 600, `bad status for ${kind}`);
    assert.ok(messageForKind(kind).length > 0, `empty message for ${kind}`);
  }
});

test("status codes match the intended semantics", () => {
  assert.equal(httpStatusForResult("MATTER_CREATED"), 201);
  assert.equal(httpStatusForResult("MATTER_ALREADY_CREATED"), 200);
  assert.equal(httpStatusForResult("VALIDATION_BLOCKED"), 422);
  assert.equal(httpStatusForResult("DRAFT_STALE"), 409);
  assert.equal(httpStatusForResult("IDEMPOTENCY_CONFLICT"), 409);
  assert.equal(httpStatusForResult("RESOURCE_NOT_AVAILABLE"), 404);
  assert.equal(httpStatusForResult("BOOTSTRAP_UNAVAILABLE"), 503);
  assert.equal(httpStatusForResult("BOOTSTRAP_INTERNAL_FAILURE"), 500);
});

test("Hebrew messages carry no internal codes or SQL", () => {
  for (const kind of kinds) {
    const msg = messageForKind(kind);
    assert.equal(/BOOTSTRAP_|SELECT|permission denied|SQLSTATE/.test(msg), false);
  }
});
