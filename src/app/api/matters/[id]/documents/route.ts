/**
 * /api/matters/[id]/documents — Matter Documents lens API (Capability 1, Slice A).
 *
 *  GET    list the matter's documents (durable in supabase_dev mode)
 *  POST   finalize an upload: validate → store bytes → persist metadata + v1
 *  PATCH  update authorized metadata on a document
 *  DELETE soft-delete an UNSUBMITTED draft only
 *
 * Server-side only. All elevated work (validation, hashing, storage, DB writes)
 * happens here; the browser never sees the signing secret or the service key.
 * Every operation is pinned to the resolved {organization, matter}; RLS is the
 * second layer. Storage mode is explicit: in supabase_dev mode a missing server
 * credential FAILS CLEARLY (503) — no silent memory fallback, no pretend success.
 */
import { validateUpload } from "@/modules/matter/documents/validation";
import { resolveDocumentsContext, type DocumentsContext } from "@/modules/matter/documents/server-context";
import type {
  DocumentType, EvidenceType, SourceType, Confidentiality,
} from "@/modules/matter/documents/types";

export const runtime = "nodejs";

const PREVIEW_TTL = 300;

function forbidden() {
  return Response.json({ error: "forbidden", messageHe: "אין הרשאה לתיק זה." }, { status: 403 });
}
/** supabase_dev configured but a server credential/binding is missing → fail clearly. */
function misconfigured(detail: string) {
  console.error(`[documents] storage misconfigured: ${detail}`); // detail only, never a secret value
  return Response.json(
    { error: "storage_misconfigured", messageHe: "אחסון המסמכים אינו מוגדר כראוי. פנה למנהל המערכת." },
    { status: 503 },
  );
}
/** Map any error context to a response; returns null when the context is usable. */
function guard(c: DocumentsContext): Response | null {
  if ("error" in c) return c.error === "misconfigured" ? misconfigured(c.detail) : forbidden();
  return null;
}

/* --------------------------------------------------------------------- GET */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await resolveDocumentsContext(id);
  const bad = guard(c); if (bad) return bad;
  if (!("persisted" in c)) return forbidden();
  if (!c.persisted) {
    return Response.json({ documents: [], storageMode: c.storage.mode, durable: false });
  }
  const r = await c.repo.list(c.ctx.organizationId, c.ctx.matterId);
  if (!r.ok) return Response.json({ error: r.code, messageHe: r.messageHe }, { status: 500 });
  return Response.json({ documents: r.value, storageMode: c.storage.mode, durable: true });
}

/* -------------------------------------------------------------------- POST */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await resolveDocumentsContext(id);
  const bad = guard(c); if (bad) return bad;
  if (!("persisted" in c)) return forbidden();

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
  const v = validateUpload({
    filename: file.name, declaredMime: file.type, size: bytes.byteLength, head: bytes.subarray(0, 16),
  });
  if (!v.ok || !v.canonicalMime) {
    return Response.json({ error: "invalid", issues: v.issues }, { status: 400 });
  }

  const organizationId = c.persisted ? c.ctx.organizationId : c.organizationId;
  const matterId = c.persisted ? c.ctx.matterId : c.matterId;

  const put = await c.storage.put({ organizationId, matterId, filename: file.name, mimeType: v.canonicalMime, bytes });
  const token = c.storage.signToken(put.ref, PREVIEW_TTL, Date.now());
  const previewUrl = `/api/matters/${id}/documents/preview?token=${encodeURIComponent(token)}`;
  const scanStatus = "scan_clean_demo" as const;

  if (!c.persisted) {
    return Response.json({
      ref: put.ref, hash: put.hash, filename: put.filename, mimeType: v.canonicalMime,
      size: bytes.byteLength, scanStatus, storageMode: c.storage.mode, durable: false, previewUrl,
    });
  }

  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : undefined);
  const created = await c.repo.create({
    organizationId, matterId,
    title: str("title") || put.filename,
    filename: put.filename,
    mimeType: v.canonicalMime,
    size: bytes.byteLength,
    documentType: (str("documentType") as DocumentType) || "other",
    evidenceType: (str("evidenceType") as EvidenceType) || "document",
    sourceType: (str("sourceType") as SourceType) || "client",
    confidentiality: (str("confidentiality") as Confidentiality) || "standard",
    uploadedByHe: str("uploadedByHe") || null,
    workflowId: str("workflowId") || null,
    documentDate: str("documentDate") || null,
    storageRef: put.ref, hash: put.hash, scanStatus,
  });
  if (!created.ok) return Response.json({ error: created.code, messageHe: created.messageHe }, { status: 400 });
  return Response.json({ document: created.value, storageMode: c.storage.mode, durable: true, previewUrl });
}

/* ------------------------------------------------------------------- PATCH */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await resolveDocumentsContext(id);
  const bad = guard(c); if (bad) return bad;
  if (!("persisted" in c) || !c.persisted) {
    return Response.json({ error: "unavailable", messageHe: "עריכת מסמך דורשת אחסון קבוע." }, { status: 409 });
  }

  let body: { documentId?: string; patch?: Record<string, unknown> };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  if (!body.documentId) return Response.json({ error: "missing_id" }, { status: 400 });

  const r = await c.repo.updateMetadata(c.ctx.organizationId, c.ctx.matterId, body.documentId, (body.patch ?? {}) as never);
  if (!r.ok) return Response.json({ error: r.code, messageHe: r.messageHe }, { status: r.code === "not_found" ? 404 : 400 });
  return Response.json({ document: r.value });
}

/* ------------------------------------------------------------------ DELETE */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await resolveDocumentsContext(id);
  const bad = guard(c); if (bad) return bad;
  if (!("persisted" in c) || !c.persisted) return Response.json({ error: "unavailable" }, { status: 409 });

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId) return Response.json({ error: "missing_id" }, { status: 400 });

  const r = await c.repo.removeDraft(c.ctx.organizationId, c.ctx.matterId, documentId);
  if (!r.ok) return Response.json({ error: r.code, messageHe: r.messageHe }, { status: r.code === "forbidden" ? 403 : 400 });
  return Response.json({ ok: true });
}
