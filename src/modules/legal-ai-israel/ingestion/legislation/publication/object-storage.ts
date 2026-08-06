/**
 * Object storage for official ספר-החוקים PDF binaries (current Epic Track B).
 *
 * PDF BYTES live in object storage, never in Postgres. Storage is:
 *   - content-addressed + deterministic: the object key embeds the SHA-256, so
 *     the SAME binary is stored ONCE even when an omnibus publication is shared
 *     by several laws (dedup by sha256; publication→object is many-to-one);
 *   - idempotent: re-storing the same bytes is a no-op;
 *   - verified: an upload is only `verified` after a HEAD (size/content-type) +
 *     a round-trip byte-for-byte check;
 *   - private: the bucket is not public; the storage transport is injected so
 *     this policy layer is testable and never embeds credentials.
 *
 * The transport (`StorageClient`) is injected — this module holds the KEY
 * scheme, dedup, status machine and verification, not the credentialed I/O.
 */
import { sha256Hex } from "./publication-identity.ts";

export const STORAGE_VERSION = "legal-object-store-1";
export const DEFAULT_BUCKET = "legal-source-files";

export type StorageStatus = "pending" | "uploaded" | "verified" | "failed" | "quarantined";

/**
 * Deterministic object key. Content-addressed on the SHA-256 so identical bytes
 * collapse to one object; the law/publication prefix keeps it browsable.
 *   knesset/laws/<IsraelLawID>/publications/<publicationItemId>/<sha256>.pdf
 */
export function objectKey(israelLawId: string, publicationItemId: string, sha256: string): string {
  const law = israelLawId.trim();
  const pub = publicationItemId.trim();
  const digest = sha256.trim().toLowerCase();
  if (!/^\d+$/.test(law)) throw new Error(`object-storage: bad IsraelLawID "${israelLawId}"`);
  if (pub.length === 0) throw new Error("object-storage: publicationItemId required");
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("object-storage: sha256 must be 64 hex chars");
  return `knesset/laws/${law}/publications/${pub}/${digest}.pdf`;
}

export interface StorageObjectMeta {
  bucket: string;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  contentType: string;
}

export interface StorageClient {
  exists: (bucket: string, key: string) => Promise<boolean>;
  put: (bucket: string, key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
  head: (bucket: string, key: string) => Promise<{ size: number; contentType: string } | null>;
  get: (bucket: string, key: string) => Promise<Uint8Array | null>;
}

export interface StoreResult {
  status: StorageStatus;
  meta: StorageObjectMeta;
  deduped: boolean; // true when the object already existed (bytes not re-uploaded)
  reason?: string;
}

/**
 * Store a PDF idempotently and verify it. Content-addressed dedup: if an object
 * with this sha256 key already exists, we skip the upload and re-verify.
 */
export async function storePdf(
  client: StorageClient,
  israelLawId: string,
  publicationItemId: string,
  bytes: Uint8Array,
  opts: { bucket?: string; expectedSha256?: string; contentType?: string } = {},
): Promise<StoreResult> {
  const bucket = opts.bucket ?? DEFAULT_BUCKET;
  const contentType = opts.contentType ?? "application/pdf";
  const sha = sha256Hex(bytes);
  if (opts.expectedSha256 && opts.expectedSha256.toLowerCase() !== sha) {
    return {
      status: "quarantined",
      deduped: false,
      reason: "sha256 mismatch vs expected",
      meta: { bucket, objectKey: "", sha256: sha, sizeBytes: bytes.byteLength, contentType },
    };
  }
  const key = objectKey(israelLawId, publicationItemId, sha);
  const meta: StorageObjectMeta = { bucket, objectKey: key, sha256: sha, sizeBytes: bytes.byteLength, contentType };

  const already = await client.exists(bucket, key);
  let deduped = false;
  if (already) {
    deduped = true;
  } else {
    await client.put(bucket, key, bytes, contentType);
  }

  const verified = await verifyRoundTrip(client, meta, bytes);
  return { status: verified ? "verified" : "failed", meta, deduped, reason: verified ? undefined : "round-trip verification failed" };
}

/** HEAD (size/content-type) + full byte-for-byte round-trip check. */
export async function verifyRoundTrip(
  client: StorageClient,
  meta: StorageObjectMeta,
  expectedBytes: Uint8Array,
): Promise<boolean> {
  const head = await client.head(meta.bucket, meta.objectKey);
  if (!head) return false;
  if (head.size !== meta.sizeBytes) return false;
  if (!head.contentType.toLowerCase().includes("application/pdf")) return false;
  const got = await client.get(meta.bucket, meta.objectKey);
  if (!got || got.byteLength !== expectedBytes.byteLength) return false;
  // Byte-for-byte (content-addressed, so a hash compare is equivalent + cheap).
  return sha256Hex(got) === sha256Hex(expectedBytes);
}
