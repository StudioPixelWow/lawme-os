/**
 * Tests for object-storage: deterministic key, dedup, round-trip verification.
 * Uses an in-memory StorageClient — no credentials, fully offline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { objectKey, storePdf, DEFAULT_BUCKET } from "../object-storage.ts";
import type { StorageClient } from "../object-storage.ts";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 1, 2, 3]);

function memoryClient(): StorageClient & { puts: number; store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>();
  let puts = 0;
  return {
    puts: 0,
    store,
    async exists(bucket, key) { return store.has(`${bucket}/${key}`); },
    async put(bucket, key, bytes) { puts += 1; (this as { puts: number }).puts = puts; store.set(`${bucket}/${key}`, bytes); },
    async head(bucket, key) { const b = store.get(`${bucket}/${key}`); return b ? { size: b.byteLength, contentType: "application/pdf" } : null; },
    async get(bucket, key) { return store.get(`${bucket}/${key}`) ?? null; },
  };
}

test("objectKey is content-addressed + deterministic; validates inputs", () => {
  const sha = "a".repeat(64);
  assert.equal(objectKey("2000048", "147462", sha), `knesset/laws/2000048/publications/147462/${sha}.pdf`);
  assert.throws(() => objectKey("bad", "1", sha));
  assert.throws(() => objectKey("2000048", "", sha));
  assert.throws(() => objectKey("2000048", "1", "short"));
});

test("storePdf uploads + verifies via round-trip", async () => {
  const c = memoryClient();
  const res = await storePdf(c, "2000048", "147462", PDF);
  assert.equal(res.status, "verified");
  assert.equal(res.deduped, false);
  assert.equal(res.meta.bucket, DEFAULT_BUCKET);
  assert.match(res.meta.sha256, /^[0-9a-f]{64}$/);
  assert.equal(c.puts, 1);
});

test("storePdf dedups identical bytes (many-to-one, no re-upload)", async () => {
  const c = memoryClient();
  const first = await storePdf(c, "2000031", "2199304", PDF); // omnibus shared across laws
  const second = await storePdf(c, "2000015", "2199304", PDF); // same itemId+bytes, different law prefix
  const sameLawAgain = await storePdf(c, "2000031", "2199304", PDF);
  assert.equal(first.deduped, false);
  assert.equal(sameLawAgain.deduped, true); // same key → dedup
  assert.equal(sameLawAgain.status, "verified");
  // 'second' has a different law prefix so a distinct key — that is by design
  // (browsable per law); the content-addressed sha is identical.
  assert.equal(first.meta.sha256, second.meta.sha256);
});

test("storePdf quarantines on sha256 mismatch vs expected", async () => {
  const c = memoryClient();
  const res = await storePdf(c, "2000048", "147462", PDF, { expectedSha256: "b".repeat(64) });
  assert.equal(res.status, "quarantined");
  assert.equal(c.puts, 0); // never uploaded
});

test("verification fails when the stored size differs (corruption caught)", async () => {
  const c = memoryClient();
  // Pre-seed a wrong-size object at the key so put() is skipped and head() lies.
  const sha = (await storePdf(c, "2000048", "147462", PDF)).meta.sha256;
  const key = objectKey("2000048", "147462", sha);
  c.store.set(`${DEFAULT_BUCKET}/${key}`, new Uint8Array([1, 2])); // corrupt
  const res = await storePdf(c, "2000048", "147462", PDF);
  assert.equal(res.status, "failed");
});
