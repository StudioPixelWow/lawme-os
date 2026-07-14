/**
 * GET /api/matters/[id]/documents/preview?token=... — signed preview (Slice 1).
 * Serves a stored object only for a valid, unexpired HMAC token. Hardened
 * response headers: nosniff, a locked-down CSP sandbox, and no-store — so the
 * bytes are never sniffed, never execute script, and never render HTML.
 */
import { documentStorage } from "@/modules/matter/documents/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("missing token", { status: 400 });

  const verified = documentStorage.verifyToken(token, Date.now());
  if (!verified) return new Response("invalid or expired token", { status: 403 });

  const obj = await documentStorage.get(verified.ref);
  if (!obj) return new Response("not found", { status: 404 });

  return new Response(Buffer.from(obj.bytes), {
    status: 200,
    headers: {
      "Content-Type": obj.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(obj.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; object-src 'none'; sandbox;",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
