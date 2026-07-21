/**
 * Slice 0.8.2 — safe API error mapping (tests 30–36).
 *
 * Every identity/authorization failure must map to the canonical safe envelope
 * `{ ok:false, code, messageHe, correlationId }` with the correct HTTP status,
 * and must NEVER leak SQL/cookie/token/Supabase internals.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { IdentityAuthorizationError, type IdentityAuthorizationCode } from "../errors.ts";
import { toSafeApiError } from "../http.ts";

const CID = "00000000-0000-4000-8000-00000000abcd";

const CASES: ReadonlyArray<{ code: IdentityAuthorizationCode; status: number }> = [
  { code: "UNAUTHENTICATED", status: 401 },
  { code: "SESSION_EXPIRED", status: 401 },
  { code: "INVALID_CREDENTIALS", status: 401 },
  { code: "NO_ACTIVE_ORGANIZATION", status: 403 },
  { code: "ORGANIZATION_SELECTION_REQUIRED", status: 409 },
  { code: "INACTIVE_MEMBERSHIP", status: 403 },
  { code: "CAPABILITY_DENIED", status: 403 },
  { code: "TENANT_MISMATCH", status: 403 },
];

test("30: each identity error maps to its status, safe code, and Hebrew message", () => {
  for (const { code, status } of CASES) {
    const err = new IdentityAuthorizationError(code, CID);
    const { status: gotStatus, body } = toSafeApiError(err);
    assert.equal(gotStatus, status, `${code} status`);
    assert.equal(body.ok, false);
    assert.equal(body.code, code);
    assert.equal(body.correlationId, CID);
    assert.ok(body.messageHe.length > 0, `${code} needs a message`);
  }
});

test("31: an unknown error becomes a generic 500 without leaking its text", () => {
  const secret = "PGRST: relation auth.users membership token=eyJ; cookie=sb-...";
  const { status, body } = toSafeApiError(new Error(secret), CID);
  assert.equal(status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.code, "ACTOR_RESOLUTION_FAILED");
  assert.equal(body.correlationId, CID);
  const serialized = JSON.stringify(body).toLowerCase();
  for (const bad of ["pgrst", "auth.users", "token", "cookie", "eyj", "sb-"]) {
    assert.ok(!serialized.includes(bad), `leaked ${bad}`);
  }
});

test("32: a thrown non-Error (e.g. a Supabase object) never leaks and gets a correlation id", () => {
  const { status, body } = toSafeApiError({ message: "sb secret", stack: "…" });
  assert.equal(status, 500);
  assert.equal(body.code, "ACTOR_RESOLUTION_FAILED");
  assert.ok(body.correlationId.length > 0);
  assert.ok(!JSON.stringify(body).toLowerCase().includes("sb secret"));
});

test("33: the safe message carries no tenant/actor/membership identifiers", () => {
  for (const { code } of CASES) {
    const err = new IdentityAuthorizationError(code, CID);
    const msg = toSafeApiError(err).body.messageHe;
    for (const bad of ["profile", "membership", "auth", "uuid", "org_", "select "]) {
      assert.ok(!msg.toLowerCase().includes(bad), `${code} message leaked ${bad}`);
    }
  }
});
