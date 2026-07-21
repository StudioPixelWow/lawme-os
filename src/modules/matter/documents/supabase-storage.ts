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
import { createHash, randomUUID } from "node:crypto";
import { sanitizeFilename } from "./validation.ts";
import type { DocumentStorage, PutInput, StoredObject } from "./storage.ts";
import { serviceClient } from "../persistence/supabase-server.ts";
import { signPreviewToken, verifyPreviewToken } from "./preview-signing.ts";

const BUCKET = "matter-documents";

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
    return signPreviewToken(ref, ttlSeconds, nowMs);
  }

  verifyToken(token: string, nowMs: number): { ref: string; matterId: string } | null {
    return verifyPreviewToken(token, nowMs);
  }
}

function segment(ref: string, i: number): string {
  return ref.split("/")[i] ?? "";
}

export const supabaseStorage: DocumentStorage = new SupabaseStorage();
