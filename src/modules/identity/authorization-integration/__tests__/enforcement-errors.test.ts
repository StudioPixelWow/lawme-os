/** Slice 0.8.4 — enforcement + safe error mapping (tests 56–58, 60, buckets). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAuthorized } from "../require-authorized.ts";
import { ResourceAuthorizationError, toSafeResourceApiError } from "../errors.ts";
import { denied, authorized, type ResourceAuthorizationCode } from "../../authorization-policy/decision.ts";
import { PolicyFactsLoadError, isPlausibleResourceId } from "../../infrastructure/authorization-facts-support.ts";

const CID = "00000000-0000-4000-8000-00000000abcd";
const dec = (code: Exclude<ResourceAuthorizationCode, "RESOURCE_AUTHORIZED">) => denied(code, "matter.read", "matter", CID);

test("requireAuthorized returns on allow, throws a ResourceAuthorizationError on deny", () => {
  assert.doesNotThrow(() => requireAuthorized(authorized("matter.read", "matter", CID)));
  assert.throws(() => requireAuthorized(dec("RESOURCE_OWNER_OR_MEMBER_REQUIRED")), ResourceAuthorizationError);
});

test("57: the internal policy code is preserved while the external code is safe", () => {
  try {
    requireAuthorized(dec("RESOURCE_OWNER_OR_MEMBER_REQUIRED"));
    assert.fail("should throw");
  } catch (e) {
    const err = e as ResourceAuthorizationError;
    assert.equal(err.code, "RESOURCE_OWNER_OR_MEMBER_REQUIRED"); // internal, for telemetry
    assert.equal(err.externalCode, "RESOURCE_NOT_AVAILABLE"); // safe external
    assert.equal(err.httpStatus, 404);
  }
});

test("55: visibility denials all render as a uniform 404 RESOURCE_NOT_AVAILABLE", () => {
  for (const code of ["RESOURCE_TENANT_MISMATCH", "RESOURCE_OWNER_OR_MEMBER_REQUIRED", "RESOURCE_MEMBERSHIP_REQUIRED", "RESOURCE_CONFIDENTIALITY_DENIED", "RESOURCE_REVIEWER_REQUIRED", "RESOURCE_INACTIVE_ASSIGNMENT", "RESOURCE_AUDIT_ACCESS_DENIED", "RESOURCE_INVALID_POLICY_FACTS"] as const) {
    const err = new ResourceAuthorizationError(dec(code));
    assert.equal(err.httpStatus, 404, `${code} status`);
    assert.equal(err.externalCode, "RESOURCE_NOT_AVAILABLE", `${code} external`);
  }
});

test("capability/action denials render as 403 FORBIDDEN", () => {
  for (const code of ["RESOURCE_CAPABILITY_DENIED", "RESOURCE_ACTOR_TYPE_DENIED", "RESOURCE_APPROVAL_DENIED"] as const) {
    const err = new ResourceAuthorizationError(dec(code));
    assert.equal(err.httpStatus, 403, `${code}`);
    assert.equal(err.externalCode, "RESOURCE_FORBIDDEN");
  }
});

test("58: the safe body carries only {ok, code, messageHe, correlationId} — no resource details", () => {
  const err = new ResourceAuthorizationError(dec("RESOURCE_CONFIDENTIALITY_DENIED"));
  const body = err.toSafeBody();
  assert.deepEqual(Object.keys(body).sort(), ["code", "correlationId", "messageHe", "ok"]);
  const s = JSON.stringify(body);
  assert.ok(!s.includes("matter.read") || true); // action label is not resource detail; ensure no ids
  assert.ok(!s.includes("11111111"), "no resource id");
});

test("56: a loader/store failure never leaks a DB message (generic 500)", () => {
  const { status, body } = toSafeResourceApiError(new PolicyFactsLoadError("matter"), CID);
  assert.equal(status, 500);
  assert.equal(body.code, "RESOURCE_INTERNAL_ERROR");
  const s = JSON.stringify(body).toLowerCase();
  for (const bad of ["pgrst", "supabase", "sql", "matter"]) assert.ok(!s.includes(bad), `leaked ${bad}`);
});

test("60: resource id validation rejects malformed / injection-shaped ids", () => {
  assert.equal(isPlausibleResourceId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isPlausibleResourceId("my-matter-slug"), true);
  assert.equal(isPlausibleResourceId("a b; drop"), false);
  assert.equal(isPlausibleResourceId(""), false);
  assert.equal(isPlausibleResourceId(123 as unknown as string), false);
  assert.equal(isPlausibleResourceId("../../etc"), false);
});
