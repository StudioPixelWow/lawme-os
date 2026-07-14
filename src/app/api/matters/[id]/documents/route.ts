/**
 * POST /api/matters/[id]/documents — server-side upload finalization (Slice 1).
 * Validates type/size/content, sanitizes the filename, computes a content hash,
 * and stores via the dev storage adapter under a tenant-aware path. Elevated
 * work happens ONLY here; the browser never sees the signing secret. Returns the
 * stored reference + a short-lived signed preview URL. Dev demo scan posture.
 */
import { documentStorage, assertMatterAccess } from "@/modules/matter/documents/storage";
import { validateUpload } from "@/modules/matter/documents/validation";

export const runtime = "nodejs";

// dev org context — in production this is derived from the authenticated session
const DEV_ORG = "org-demo";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!assertMatterAccess(DEV_ORG, id)) {
    return Response.json({ error: "forbidden", messageHe: "אין הרשאה לתיק זה." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no_file", messageHe: "לא צורף קובץ." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const head = bytes.subarray(0, 16);
  const v = validateUpload({ filename: file.name, declaredMime: file.type, size: bytes.byteLength, head });
  if (!v.ok || !v.canonicalMime) {
    return Response.json({ error: "invalid", issues: v.issues }, { status: 400 });
  }

  const put = await documentStorage.put({
    organizationId: DEV_ORG,
    matterId: id,
    filename: file.name,
    mimeType: v.canonicalMime,
    bytes,
  });

  const token = documentStorage.signToken(put.ref, 300, Date.now());

  return Response.json({
    ref: put.ref,
    hash: put.hash,
    filename: put.filename,
    mimeType: v.canonicalMime,
    size: bytes.byteLength,
    scanStatus: "scan_clean_demo",
    storageMode: documentStorage.mode,
    previewUrl: `/api/matters/${id}/documents/preview?token=${encodeURIComponent(token)}`,
  });
}
