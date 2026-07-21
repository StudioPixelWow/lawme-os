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
import { createHash, randomUUID } from "node:crypto";
import { sanitizeFilename } from "./validation.ts";
import { signPreviewToken, verifyPreviewToken } from "./preview-signing.ts";

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
  verifyToken(token: string, nowMs: number): { ref: string; matterId: string } | null;
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
    return signPreviewToken(ref, ttlSeconds, nowMs);
  }

  verifyToken(token: string, nowMs: number): { ref: string; matterId: string } | null {
    return verifyPreviewToken(token, nowMs);
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
