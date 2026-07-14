/**
 * Matter documents — storage adapter (Sprint 3, Slice 1). SERVER-ONLY.
 *
 * Provider-neutral storage interface + a deterministic DEVELOPMENT-ONLY adapter.
 * This does NOT touch production Supabase and does NOT pretend to be durable: it
 * keeps objects in server process memory under a tenant-aware path, computes a
 * content hash, and issues short-lived HMAC-signed preview tokens. A Supabase
 * (bucket `legal-source-files`) adapter can implement the same interface later
 * without any caller change.
 *
 * Security posture: the signing secret lives ONLY on the server; the browser
 * never receives it. All elevated finalization (validation, hashing, storage)
 * runs here, server-side. The `node:crypto` import also fails a client bundle,
 * so this module cannot be pulled into the browser by accident.
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { sanitizeFilename } from "./validation.ts";

export interface StoredObject {
  ref: string;
  organizationId: string;
  matterId: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  bytes: Uint8Array;
  createdAt: string;
}

export interface PutInput {
  organizationId: string;
  matterId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface DocumentStorage {
  readonly mode: string;
  put(input: PutInput): Promise<{ ref: string; hash: string; filename: string }>;
  get(ref: string): Promise<StoredObject | null>;
  signToken(ref: string, ttlSeconds: number, nowMs: number): string;
  verifyToken(token: string, nowMs: number): { ref: string } | null;
}

// DEV-ONLY signing secret. Not a production secret; never sent to the browser.
const DEV_SIGNING_SECRET = "lawme-dev-storage-signing-key-not-for-production";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Deterministic development storage — process memory, tenant-aware paths. */
class DevMemoryStorage implements DocumentStorage {
  readonly mode = "development-memory";
  private objects = new Map<string, StoredObject>();

  async put(input: PutInput): Promise<{ ref: string; hash: string; filename: string }> {
    const filename = sanitizeFilename(input.filename);
    const hash = createHash("sha256").update(input.bytes).digest("hex");
    // tenant-aware path structure: org / matter / object
    const ref = `org/${input.organizationId}/matter/${input.matterId}/${randomUUID()}-${filename}`;
    this.objects.set(ref, {
      ref,
      organizationId: input.organizationId,
      matterId: input.matterId,
      filename,
      mimeType: input.mimeType,
      size: input.bytes.byteLength,
      hash,
      bytes: input.bytes,
      createdAt: new Date().toISOString(),
    });
    return { ref, hash, filename };
  }

  async get(ref: string): Promise<StoredObject | null> {
    return this.objects.get(ref) ?? null;
  }

  signToken(ref: string, ttlSeconds: number, nowMs: number): string {
    const exp = Math.floor(nowMs / 1000) + ttlSeconds;
    const payload = b64url(JSON.stringify({ ref, exp }));
    const sig = b64url(createHmac("sha256", DEV_SIGNING_SECRET).update(payload).digest());
    return `${payload}.${sig}`;
  }

  verifyToken(token: string, nowMs: number): { ref: string } | null {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = b64url(createHmac("sha256", DEV_SIGNING_SECRET).update(payload).digest());
    // constant-time-ish compare
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    try {
      const { ref, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (typeof ref !== "string" || typeof exp !== "number") return null;
      if (Math.floor(nowMs / 1000) > exp) return null; // expired
      return { ref };
    } catch {
      return null;
    }
  }
}

// module-level singleton — persists for the life of the server process (dev demo)
const globalForStorage = globalThis as unknown as { __lawmeDocStorage?: DocumentStorage };
export const documentStorage: DocumentStorage = globalForStorage.__lawmeDocStorage ?? new DevMemoryStorage();
globalForStorage.__lawmeDocStorage = documentStorage;

/** Tenant access guard (dev). Only the demo tenant may reach the demo matter. */
export function assertMatterAccess(organizationId: string, matterId: string): boolean {
  const DEMO_ORG = "org-demo";
  const allowedMatters = new Set(["demo"]);
  return organizationId === DEMO_ORG && allowedMatters.has(matterId);
}
