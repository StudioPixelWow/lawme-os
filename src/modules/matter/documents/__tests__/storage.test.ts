/**
 * Dev storage adapter — hashing, tenant paths, signed-token expiry, tenant guard.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { documentStorage, assertMatterAccess } from "../storage.ts";

const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3, 4]);

test("put stores under a tenant-aware path and returns a deterministic hash", async () => {
  const a = await documentStorage.put({ organizationId: "org-demo", matterId: "demo", filename: "x.pdf", mimeType: "application/pdf", bytes });
  const b = await documentStorage.put({ organizationId: "org-demo", matterId: "demo", filename: "x.pdf", mimeType: "application/pdf", bytes });
  assert.match(a.ref, /^org\/org-demo\/matter\/demo\//);
  assert.equal(a.hash, b.hash); // same bytes → same hash
  assert.equal(a.hash.length, 64);
  const got = await documentStorage.get(a.ref);
  assert.ok(got);
  assert.equal(got.size, bytes.byteLength);
});

test("signed token round-trips and rejects tampering + expiry", async () => {
  const { ref } = await documentStorage.put({ organizationId: "org-demo", matterId: "demo", filename: "y.png", mimeType: "image/png", bytes });
  const now = 1_000_000_000_000;
  const token = documentStorage.signToken(ref, 300, now);

  assert.deepEqual(documentStorage.verifyToken(token, now + 10_000), { ref });
  // expired (past ttl)
  assert.equal(documentStorage.verifyToken(token, now + 301_000), null);
  // tampered
  assert.equal(documentStorage.verifyToken(token.slice(0, -2) + "xy", now + 1000), null);
  assert.equal(documentStorage.verifyToken("garbage", now), null);
});

test("tenant guard: only the demo org may reach the demo matter", () => {
  assert.equal(assertMatterAccess("org-demo", "demo"), true);
  assert.equal(assertMatterAccess("org-other", "demo"), false);
  assert.equal(assertMatterAccess("org-demo", "someone-elses-matter"), false);
});
