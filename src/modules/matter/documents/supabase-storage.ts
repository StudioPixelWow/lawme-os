/**
 * Matter documents — Supabase storage adapter (Capability 1, Slice A).
 * SERVER-ONLY. Implements the same DocumentStorage interface as the dev adapter
 * so no caller changes: binaries go to the PRIVATE `matter-documents` bucket
 * under organizations/<org>/matters/<matter>/<uuid>-<filename> (matching the
 * bucket's org-prefixed read policy), the content hash is computed server-side,
 * and short-lived HMAC preview tokens are issued exactly like the dev adapter so
 * the hardened preview route is unchanged. No public URLs are ever produced.
 *
 * The signing secret and the storage writes live ONLY on the server
 * (service_role). The browser never sees either. node:crypto also fails a
 * client bundle, so this cannot be imported into the browser by accident.
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { sanitizeFilename } from "./validation.ts";
import type { DocumentStorage, PutInput, StoredObject } from "./storage.ts";
import { serviceClient } from "../persistence/supabase-server.ts";

const BUCKET = "matter-documents";
// Server-only preview-token secret. Never sent to the browser.
const SIGNING_SECRET =
  process.env.MATTER_STORAGE_SIGNING_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "lawme-dev-storage-signing-key-not-for-production";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

class SupabaseStorage implements DocumentStorage {
  readonly mode = "supabase-development";

  async put(input: PutInput): Promise<{ ref: string; hash: string; filename: string }> {
    const filename = sanitizeFilename(input.filename);
    const hash = createHash("sha256").update(input.bytes).digest("hex");
    const ref = `organizations/${input.organizationId}/matters/${input.matterId}/${randomUUID()}-${filename}`;
    const { error } = await serviceClient()
      .storage.from(BUCKET)
      .upload(ref, Buffer.from(input.bytes), {
        contentType: input.mimeType,
        upsert: false,
      });
    if (error) throw new Error(`matter storage put failed: ${error.message}`);
    return { ref, hash, filename };
  }

  async get(ref: string): Promise<StoredObject | null> {
    const { data, error } = await serviceClient().storage.from(BUCKET).download(ref);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const filename = ref.split("/").pop() ?? "file";
    return {
      ref,
      organizationId: segment(ref, 1),
      matterId: segment(ref, 3),
      filename,
      mimeType: data.type || "application/octet-stream",
      size: bytes.byteLength,
      hash: createHash("sha256").update(bytes).digest("hex"),
      bytes,
      createdAt: new Date().toISOString(),
    };
  }

  signToken(ref: string, ttlSeconds: number, nowMs: number): string {
    const exp = Math.floor(nowMs / 1000) + ttlSeconds;
    const payload = b64url(JSON.stringify({ ref, exp }));
    const sig = b64url(createHmac("sha256", SIGNING_SECRET).update(payload).digest());
    return `${payload}.${sig}`;
  }

  verifyToken(token: string, nowMs: number): { ref: string } | null {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = b64url(createHmac("sha256", SIGNING_SECRET).update(payload).digest());
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (typeof parsed.ref !== "string" || typeof parsed.exp !== "number") return null;
      if (Math.floor(nowMs / 1000) > parsed.exp) return null;
      // only ever serve matter-document paths
      if (!parsed.ref.startsWith("organizations/")) return null;
      return { ref: parsed.ref };
    } catch {
      return null;
    }
  }
}

function segment(ref: string, i: number): string {
  return ref.split("/")[i] ?? "";
}

export const supabaseStorage: DocumentStorage = new SupabaseStorage();
