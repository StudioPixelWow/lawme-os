/**
 * Document-preview token signing (Platform 0.7.1, Workstream D). SERVER-ONLY.
 *
 * One dedicated, fail-closed HMAC signer for short-lived document-preview tokens,
 * shared by every storage adapter so there is exactly one secret path.
 *
 * SECRET POLICY (hard):
 *   - Secret comes ONLY from LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET (server-only,
 *     never NEXT_PUBLIC).
 *   - NO fallback to the Supabase service-role key, JWT secret, DB password,
 *     provider key, or any generic app secret. NO hardcoded default.
 *   - Fail closed: absent/weak secret => signing throws (upload cannot mint a
 *     token) and verification returns null (preview is denied). A production-
 *     capable runtime never serves preview signing with a missing/weak secret.
 *   - Tests inject a deterministic secret explicitly via the env var.
 *   - The secret value is NEVER placed in an error message or log.
 *
 * TOKEN CLAIMS: { ref, exp, pur, ver }. `ref` binds the exact stored object
 * (org/matter/document are encoded in the path); `pur`+`ver` bind purpose; the
 * verified result also exposes the matter id parsed from `ref` so the route can
 * reject a token replayed under a different [id] route parameter. Full actor /
 * resource authorization is deferred to Capability 0.8 (ActorContext).
 *
 * node:crypto is imported here, which also prevents this module from being
 * bundled into the browser by accident.
 */
import { createHmac } from "node:crypto";

/** Minimum acceptable secret length (chars). */
export const PREVIEW_SECRET_MIN_LENGTH = 32;
/** Purpose + version bound into every token; a mismatch fails verification. */
export const PREVIEW_TOKEN_PURPOSE = "matter-document-preview";
export const PREVIEW_TOKEN_VERSION = 1;

/**
 * Resolve the dedicated preview signing secret or THROW (fail closed).
 * The error names only the variable — never the value.
 */
export function previewSigningSecret(): string {
  const secret = process.env.LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "preview signing disabled: LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET is not set (server-only, >= 32 chars).",
    );
  }
  if (secret.length < PREVIEW_SECRET_MIN_LENGTH) {
    throw new Error(
      `preview signing disabled: LAWME_DOCUMENT_PREVIEW_SIGNING_SECRET is too weak (>= ${PREVIEW_SECRET_MIN_LENGTH} chars required).`,
    );
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Matter id is path segment 3 for both adapter ref formats:
 *  dev:      org/<org>/matter/<matter>/<uuid>-<file>
 *  supabase: organizations/<org>/matters/<matter>/<uuid>-<file>  */
function matterIdFromRef(ref: string): string | null {
  const seg = ref.split("/");
  const head = seg[0];
  const mid = seg[2];
  if ((head !== "org" && head !== "organizations") || (mid !== "matter" && mid !== "matters")) return null;
  return seg[3] && seg[3].length > 0 ? seg[3] : null;
}

/** Sign a preview token. THROWS if the secret is missing/weak (fail closed). */
export function signPreviewToken(ref: string, ttlSeconds: number, nowMs: number): string {
  const secret = previewSigningSecret();
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = b64url(JSON.stringify({ ref, exp, pur: PREVIEW_TOKEN_PURPOSE, ver: PREVIEW_TOKEN_VERSION }));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verify a preview token. Returns { ref, matterId } on success, else null.
 * Fails closed on: missing/weak secret, bad signature, expiry, wrong
 * purpose/version, or a malformed ref. Never throws; never logs the token.
 */
export function verifyPreviewToken(token: string, nowMs: number): { ref: string; matterId: string } | null {
  let secret: string;
  try {
    secret = previewSigningSecret();
  } catch {
    return null; // fail closed on missing/weak secret
  }
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(createHmac("sha256", secret).update(payload).digest());
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.ref !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.pur !== PREVIEW_TOKEN_PURPOSE || parsed.ver !== PREVIEW_TOKEN_VERSION) return null;
    if (Math.floor(nowMs / 1000) > parsed.exp) return null; // expired
    const matterId = matterIdFromRef(parsed.ref);
    if (!matterId) return null;
    return { ref: parsed.ref, matterId };
  } catch {
    return null;
  }
}
