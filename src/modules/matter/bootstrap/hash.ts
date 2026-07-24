/**
 * Capability 1 · Slice 1.0.1 — deterministic content hashing.
 *
 * `sourceInputHash` is the idempotency basis for bootstrap: the same SEMANTIC
 * draft must always produce the same hash, and different drafts must (with
 * cryptographic strength) produce different hashes. FNV-1a (the intake id hash)
 * is a 32-bit non-cryptographic hash — far too collision-prone to gate Matter
 * creation. So this module uses a self-contained, dependency-free SHA-256 over
 * a CANONICAL serialization (sorted object keys), keeping the domain layer pure
 * and portable (no `node:crypto`, no I/O, no globals-with-state).
 *
 * The hash covers NORMALIZED CONTENT ONLY. It excludes timestamps (validatedAt),
 * request/correlation ids, actor ids, and any telemetry — so re-validating the
 * same draft at a different time, by a different actor, yields an identical hash.
 */

/* ── Canonical serialization (stable regardless of key insertion order) ────── */

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  const t = typeof value;
  if (t === "number") return Number.isFinite(value as number) ? JSON.stringify(value) : "null";
  if (t === "boolean") return (value as boolean) ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
  }
  // functions/symbols/bigint are never part of domain content.
  return "null";
}

/* ── SHA-256 (FIPS 180-4), pure, operating on UTF-8 bytes ──────────────────── */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function toHex8(x: number): string {
  return (x >>> 0).toString(16).padStart(8, "0");
}

export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const l = bytes.length;
  const bitLen = l * 8;

  // Pad: 0x80, then zeros, then 64-bit big-endian length; total is a 64-byte multiple.
  const withOne = l + 1;
  const padZeros = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + padZeros + 8;
  const buf = new Uint8Array(total);
  buf.set(bytes, 0);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(total - 4, bitLen >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a15 = w[i - 15];
      const a2 = w[i - 2];
      const s0 = rotr(a15, 7) ^ rotr(a15, 18) ^ (a15 >>> 3);
      const s1 = rotr(a2, 17) ^ rotr(a2, 19) ^ (a2 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return toHex8(h0) + toHex8(h1) + toHex8(h2) + toHex8(h3) + toHex8(h4) + toHex8(h5) + toHex8(h6) + toHex8(h7);
}

/** Hash a value by canonicalizing then SHA-256. Order-independent for objects. */
export function contentHash(value: unknown): string {
  return sha256Hex(canonicalize(value));
}
