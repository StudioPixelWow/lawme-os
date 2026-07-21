/**
 * GET /api/matters/[id]/documents/preview?token=... — signed preview (Slice 1).
 * Serves a stored object only for a valid, unexpired HMAC token whose signed
 * matter binding MATCHES the [id] route parameter — so a token minted for one
 * matter/document cannot be replayed through another matter's route. Hardened
 * response headers: nosniff, a locked-down CSP sandbox, and no-store — so the
 * bytes are never sniffed, never execute script, and never render HTML.
 *
 * NOTE: this is a capability (signed-token) gate + matter-binding, NOT full
 * actor/resource authorization. Real ActorContext authorization lands in
 * Capability 0.8; until then this route does not attempt to resolve the caller.
 */
import { selectDocumentStorage } from "@/modules/matter/documents/storage-select";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: matterId } = await ctx.params;
  const documentStorage = selectDocumentStorage();
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("missing token", { status: 400 });

  const verified = documentStorage.verifyToken(token, Date.now());
  if (!verified) return new Response("invalid or expired token", { status: 403 });

  // The token's signed matter binding must match the route's matter id.
  if (verified.matterId !== matterId) return new Response("token/route mismatch", { status: 403 });

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
