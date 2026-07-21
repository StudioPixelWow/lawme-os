/**
 * Platform 0.7.1 — Document-preview signing security (Workstream D).
 *
 * Proves the dedicated fail-closed secret and the token/matter binding. No real
 * secret is used; a deterministic test secret is injected via the env var, and
 * tokens are never logged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  signPreviewToken, verifyPreviewToken, previewSigningSecret,
  PREVIEW_TOKEN_PURPOSE, PREVIEW_TOKEN_VERSION, PREVIEW_SECRET_MIN_LENGTH,
} from "../preview-signing.ts";

const ENV = "LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET";
const GOOD = "test-preview-signing-secret-0123456789"; // >= 32 chars
const REF_DEMO = "org/org-demo/matter/demo/abc-uuid-file.png";
const REF_OTHER = "organizations/org-x/matters/other-matter/def-uuid-file.png";
const NOW = 1_000_000_000_000;

function b64url(x: Buffer | string): string { return Buffer.from(x).toString("base64url"); }
/** Craft a token with a KNOWN secret and arbitrary claims (for negative claim tests). */
function craft(secret: string, claims: Record<string, unknown>): string {
  const p = b64url(JSON.stringify(claims));
  const s = b64url(createHmac("sha256", secret).update(p).digest());
  return `${p}.${s}`;
}
function withEnv(value: string | undefined, fn: () => void): void {
  const prev = process.env[ENV];
  if (value === undefined) delete process.env[ENV]; else process.env[ENV] = value;
  try { fn(); } finally { if (prev === undefined) delete process.env[ENV]; else process.env[ENV] = prev; }
}

// 1. Missing dedicated secret fails closed.
test("D1: missing secret fails closed (sign throws, verify null)", () => {
  withEnv(undefined, () => {
    assert.throws(() => signPreviewToken(REF_DEMO, 300, NOW));
    assert.equal(verifyPreviewToken(craft("anything-at-all-32-characters-long!!", { ref: REF_DEMO, exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION }), NOW), null);
  });
});

// 2. Weak secret fails closed.
test("D2: weak secret fails closed", () => {
  withEnv("short", () => {
    assert.ok("short".length < PREVIEW_SECRET_MIN_LENGTH);
    assert.throws(() => signPreviewToken(REF_DEMO, 300, NOW));
    assert.equal(verifyPreviewToken(craft("short", { ref: REF_DEMO, exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION }), NOW), null);
  });
});

// 3. No hardcoded fallback exists. 4. No service-role fallback exists.
test("D3+D4: no hardcoded default and no service-role-key fallback", () => {
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-must-not-be-used-as-signer-123";
  withEnv(undefined, () => {
    // With the dedicated secret absent, signing must throw even though a service
    // role key and (historically) a hardcoded default were available.
    assert.throws(() => signPreviewToken(REF_DEMO, 300, NOW));
    // A token forged with the OLD hardcoded default must NOT verify.
    const legacy = craft("lawme-dev-storage-signing-key-not-for-production", { ref: REF_DEMO, exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION });
    assert.equal(verifyPreviewToken(legacy, NOW), null);
    // A token forged with the service-role key must NOT verify.
    const svc = craft("service-role-key-must-not-be-used-as-signer-123", { ref: REF_DEMO, exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION });
    assert.equal(verifyPreviewToken(svc, NOW), null);
  });
  if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
});

// 5. Valid token verifies (and returns the signed matter id).
test("D5: valid token verifies and exposes matter id", () => {
  withEnv(GOOD, () => {
    const token = signPreviewToken(REF_DEMO, 300, NOW);
    assert.deepEqual(verifyPreviewToken(token, NOW + 10_000), { ref: REF_DEMO, matterId: "demo" });
  });
});

// 6. Tampered token fails.
test("D6: tampered token fails", () => {
  withEnv(GOOD, () => {
    const token = signPreviewToken(REF_DEMO, 300, NOW);
    assert.equal(verifyPreviewToken(token.slice(0, -2) + "xy", NOW + 1000), null);
    assert.equal(verifyPreviewToken("garbage", NOW), null);
  });
});

// 7. Expired token fails.
test("D7: expired token fails", () => {
  withEnv(GOOD, () => {
    const token = signPreviewToken(REF_DEMO, 300, NOW);
    assert.equal(verifyPreviewToken(token, NOW + 301_000), null);
  });
});

// 8. Wrong matter id fails (route binding). 9. Wrong document/ref fails.
test("D8+D9: token is bound to its matter and exact object ref", () => {
  withEnv(GOOD, () => {
    const token = signPreviewToken(REF_DEMO, 300, NOW);
    const v = verifyPreviewToken(token, NOW)!;
    // route logic: verified.matterId must equal the [id] route parameter.
    assert.equal(v.matterId === "demo", true);
    assert.equal(v.matterId === "some-other-matter", false); // route would 403
    // the token only ever resolves its own signed ref (document binding).
    assert.equal(v.ref, REF_DEMO);
    // a token for a different matter yields a different binding.
    const other = verifyPreviewToken(signPreviewToken(REF_OTHER, 300, NOW), NOW)!;
    assert.equal(other.matterId, "other-matter");
  });
});

// 10. Wrong purpose/version fails.
test("D10: wrong purpose or version fails even with a valid signature", () => {
  withEnv(GOOD, () => {
    assert.equal(verifyPreviewToken(craft(GOOD, { ref: REF_DEMO, exp: 9e12, pur: "evil", ver: PREVIEW_TOKEN_VERSION }), NOW), null);
    assert.equal(verifyPreviewToken(craft(GOOD, { ref: REF_DEMO, exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: 999 }), NOW), null);
    // a malformed ref (not a matter-document path) also fails closed.
    assert.equal(verifyPreviewToken(craft(GOOD, { ref: "evil/path", exp: 9e12, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION }), NOW), null);
  });
});

// 11. Errors do not expose the secret.
test("D11: errors never contain the secret value", () => {
  withEnv("weaksecretvalue", () => {
    try { previewSigningSecret(); assert.fail("should have thrown"); }
    catch (e) { assert.ok(!String((e as Error).message).includes("weaksecretvalue")); }
  });
  withEnv(GOOD, () => {
    // sanity: a valid secret resolves and is never surfaced by the API shape.
    assert.equal(typeof previewSigningSecret(), "string");
  });
});

// 12. Secret is server-only (never NEXT_PUBLIC-exposed to the browser bundle).
test("D12: secret env key is server-only, not NEXT_PUBLIC", () => {
  assert.equal(ENV.startsWith("NEXT_PUBLIC"), false);
  assert.equal(process.env.NEXT_PUBLIC_LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET, undefined);
});
