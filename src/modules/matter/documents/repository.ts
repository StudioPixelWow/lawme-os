/**
 * Matter documents — persistence repository (Capability 1, Slice A). SERVER-ONLY.
 *
 * Bridges the durable schema (public.matter_documents + immutable
 * public.matter_document_versions) to the domain EvidenceDocument. Pure mappers
 * are exported for deterministic tests; the class methods take a Supabase Db.
 *
 * Design invariants:
 *  - A document's current binary reference (storageRef), content hash and
 *    version number live on the LATEST matter_document_versions row, never
 *    duplicated as truth on matter_documents.
 *  - provenance and the linked evidence requirement are DERIVED (from
 *    source_type + version, and the reverse matter_evidence.linked_document_id
 *    link), never stored on the document — consistent with the frozen
 *    "persist inputs, derive outputs" rule.
 *  - create() is idempotent on (matter_id, content_hash): re-finalizing the same
 *    bytes returns the existing document instead of duplicating it.
 *  - Version lineage is append-only; a replacement is a NEW version row that
 *    preserves the original (prev_version_id chains).
 *  - Raw driver errors never escape; they map to a typed RepoError whose detail
 *    stays server-side (no schema leakage to the browser).
 */
import type { Database } from "../../../types/database.types.ts";
import type { Db } from "../persistence/supabase-server.ts";
import {
  SOURCE_TYPE_HE,
  type EvidenceDocument,
  type DocumentType,
  type EvidenceType,
  type SourceType,
  type Confidentiality,
  type EvidenceDecision,
  type VerificationState,
  type ApprovalState,
  type ScanStatus,
} from "./types.ts";

type DocRow = Database["public"]["Tables"]["matter_documents"]["Row"];
type VerRow = Database["public"]["Tables"]["matter_document_versions"]["Row"];

export interface RepoError {
  ok: false;
  code: "not_found" | "conflict" | "forbidden" | "validation" | "internal";
  messageHe: string;
  detail: string; // server-side only
}
export type RepoResult<T> = { ok: true; value: T } | RepoError;

const ok = <T>(value: T): RepoResult<T> => ({ ok: true, value });
function err(code: RepoError["code"], messageHe: string, detail: string): RepoError {
  return { ok: false, code, messageHe, detail };
}
function mapPgError(op: string, e: { code?: string; message?: string }): RepoError {
  const code = e.code ?? "";
  if (code === "PGRST116") return err("not_found", "המסמך לא נמצא", `${op}: ${e.message}`);
  if (code === "23505") return err("conflict", "מסמך כפול", `${op}: ${e.message}`);
  if (code === "42501" || code === "PGRST301") return err("forbidden", "אין הרשאה לפעולה זו", `${op}: ${e.message}`);
  if (code.startsWith("23")) return err("validation", "הנתונים אינם תקינים", `${op}: ${e.message}`);
  return err("internal", "שגיאה פנימית — נסה שוב", `${op}: ${code} ${e.message}`);
}

/* ---------------------------------------------------------------- pure mappers */

/** Compose the domain EvidenceDocument from a document row + its latest version. */
export function rowToEvidenceDocument(doc: DocRow, ver: VerRow | null): EvidenceDocument {
  return {
    id: doc.id,
    organizationId: doc.organization_id,
    matterId: doc.matter_id,
    title: doc.title,
    filename: doc.filename,
    mimeType: doc.mime_type,
    size: Number(doc.size),
    storageRef: ver?.storage_path ?? "",
    hash: ver?.content_hash ?? "",
    version: ver?.version ?? doc.latest_version,
    documentType: doc.document_type as DocumentType,
    evidenceType: doc.evidence_type as EvidenceType,
    sourceType: doc.source_type as SourceType,
    documentDate: doc.document_date,
    uploadedByHe: doc.uploaded_by_he ?? "—",
    assignedReviewerHe: doc.assigned_reviewer_he,
    confidentiality: doc.confidentiality as Confidentiality,
    evidenceDecision: (doc.evidence_decision as EvidenceDecision | null) ?? null,
    verificationState: doc.verification_state as VerificationState,
    approvalState: doc.approval_state as ApprovalState,
    scanStatus: doc.scan_status as ScanStatus,
    workflowId: doc.workflow_id,
    // derived (not stored on the document): reverse link resolved separately
    evidenceRequirementId: null,
    legalIssueIdHe: doc.legal_issue_id_he,
    procedureStageId: doc.procedure_stage_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    provenance: deriveProvenance(doc.source_type as SourceType, doc.uploaded_by_he),
    auditRefs: [],
  };
}

/** provenance is derived from persisted inputs, never stored as its own truth. */
export function deriveProvenance(sourceType: SourceType, uploadedByHe: string | null) {
  return {
    originHe: SOURCE_TYPE_HE[sourceType] ?? "לא צוין",
    capturedByHe: uploadedByHe ?? "—",
    methodHe: "העלאה מאובטחת בצד השרת",
  };
}

export interface CreateDocumentInput {
  organizationId: string;
  matterId: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  documentType: DocumentType;
  evidenceType: EvidenceType;
  sourceType: SourceType;
  confidentiality?: Confidentiality;
  documentDate?: string | null;
  uploadedByHe?: string | null;
  assignedReviewerHe?: string | null;
  workflowId?: string | null;
  legalIssueIdHe?: string | null;
  procedureStageId?: string | null;
  // first version binary facts (already stored by the storage adapter)
  storageRef: string;
  hash: string;
  scanStatus: ScanStatus;
}

/* ----------------------------------------------------------------- repository */

export class MatterDocumentsRepository {
  private db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  /** List a matter's live documents (newest first), each with its latest version. */
  async list(organizationId: string, matterId: string): Promise<RepoResult<EvidenceDocument[]>> {
    const { data: docs, error } = await this.db
      .from("matter_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return mapPgError("list", error);
    const rows = docs ?? [];
    if (rows.length === 0) return ok([]);
    const ids = rows.map((d) => d.id);
    const { data: vers, error: vErr } = await this.db
      .from("matter_document_versions")
      .select("*")
      .in("document_id", ids);
    if (vErr) return mapPgError("list.versions", vErr);
    const latest = latestByDocument(vers ?? []);
    return ok(rows.map((d) => rowToEvidenceDocument(d, latest.get(d.id) ?? null)));
  }

  async get(organizationId: string, matterId: string, documentId: string): Promise<RepoResult<EvidenceDocument>> {
    const { data: doc, error } = await this.db
      .from("matter_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return mapPgError("get", error);
    if (!doc) return err("not_found", "המסמך לא נמצא", "get: no row");
    const ver = await this.latestVersion(doc.id);
    return ok(rowToEvidenceDocument(doc, ver));
  }

  /**
   * Create a document + its v1 (idempotent on matter_id + content hash).
   * The binary must already be stored (storageRef/hash from the storage adapter).
   */
  async create(input: CreateDocumentInput): Promise<RepoResult<EvidenceDocument>> {
    // idempotency: same bytes in the same matter → return existing document
    const existing = await this.findByHash(input.organizationId, input.matterId, input.hash);
    if (existing) return ok(existing);

    const { data: doc, error } = await this.db
      .from("matter_documents")
      .insert({
        organization_id: input.organizationId,
        matter_id: input.matterId,
        title: input.title,
        filename: input.filename,
        mime_type: input.mimeType,
        size: input.size,
        document_type: input.documentType,
        evidence_type: input.evidenceType,
        source_type: input.sourceType,
        document_date: input.documentDate ?? null,
        uploaded_by_he: input.uploadedByHe ?? null,
        assigned_reviewer_he: input.assignedReviewerHe ?? null,
        confidentiality: input.confidentiality ?? "standard",
        scan_status: input.scanStatus,
        workflow_id: input.workflowId ?? null,
        legal_issue_id_he: input.legalIssueIdHe ?? null,
        procedure_stage_id: input.procedureStageId ?? null,
        latest_version: 1,
      })
      .select("*")
      .single();
    if (error) return mapPgError("create.doc", error);

    const { data: ver, error: vErr } = await this.db
      .from("matter_document_versions")
      .insert({
        organization_id: input.organizationId,
        matter_id: input.matterId,
        document_id: doc.id,
        version: 1,
        content_hash: input.hash,
        storage_path: input.storageRef,
        byte_size: input.size,
        mime_type: input.mimeType,
      })
      .select("*")
      .single();
    if (vErr) return mapPgError("create.version", vErr);

    return ok(rowToEvidenceDocument(doc, ver));
  }

  /**
   * Append a new version (replacement upload). Preserves the original; chains
   * prev_version_id; bumps latest_version. Immutable lineage is enforced by the
   * DB trigger — this only ever INSERTs a version.
   */
  async addVersion(
    organizationId: string,
    matterId: string,
    documentId: string,
    v: { storageRef: string; hash: string; size: number; mimeType: string; changeReason?: string | null },
  ): Promise<RepoResult<EvidenceDocument>> {
    const { data: doc, error: dErr } = await this.db
      .from("matter_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (dErr) return mapPgError("addVersion.doc", dErr);
    if (!doc) return err("not_found", "המסמך לא נמצא", "addVersion: no doc");

    const prev = await this.latestVersion(documentId);
    const nextVersion = (prev?.version ?? doc.latest_version) + 1;

    const { data: ver, error: vErr } = await this.db
      .from("matter_document_versions")
      .insert({
        organization_id: organizationId,
        matter_id: matterId,
        document_id: documentId,
        version: nextVersion,
        content_hash: v.hash,
        storage_path: v.storageRef,
        byte_size: v.size,
        mime_type: v.mimeType,
        prev_version_id: prev?.id ?? null,
        change_reason: v.changeReason ?? null,
      })
      .select("*")
      .single();
    if (vErr) return mapPgError("addVersion.version", vErr);

    const { data: updated, error: uErr } = await this.db
      .from("matter_documents")
      .update({ latest_version: nextVersion })
      .eq("id", documentId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();
    if (uErr) return mapPgError("addVersion.bump", uErr);
    return ok(rowToEvidenceDocument(updated, ver));
  }

  /** Update the safe, authorized metadata fields only. */
  async updateMetadata(
    organizationId: string,
    matterId: string,
    documentId: string,
    patch: Partial<Pick<EvidenceDocument,
      "title" | "documentType" | "sourceType" | "confidentiality" | "documentDate" |
      "assignedReviewerHe" | "legalIssueIdHe" | "procedureStageId">>,
  ): Promise<RepoResult<EvidenceDocument>> {
    const db: Database["public"]["Tables"]["matter_documents"]["Update"] = {};
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.documentType !== undefined) db.document_type = patch.documentType;
    if (patch.sourceType !== undefined) db.source_type = patch.sourceType;
    if (patch.confidentiality !== undefined) db.confidentiality = patch.confidentiality;
    if (patch.documentDate !== undefined) db.document_date = patch.documentDate;
    if (patch.assignedReviewerHe !== undefined) db.assigned_reviewer_he = patch.assignedReviewerHe;
    if (patch.legalIssueIdHe !== undefined) db.legal_issue_id_he = patch.legalIssueIdHe;
    if (patch.procedureStageId !== undefined) db.procedure_stage_id = patch.procedureStageId;
    if (Object.keys(db).length === 0) return this.get(organizationId, matterId, documentId);

    const { data, error } = await this.db
      .from("matter_documents")
      .update(db)
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("id", documentId)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (error) return mapPgError("updateMetadata", error);
    if (!data) return err("not_found", "המסמך לא נמצא", "updateMetadata: no row");
    const ver = await this.latestVersion(documentId);
    return ok(rowToEvidenceDocument(data, ver));
  }

  /** Soft-delete an UNSUBMITTED draft only (never a submitted/approved doc). */
  async removeDraft(organizationId: string, matterId: string, documentId: string): Promise<RepoResult<true>> {
    const { data, error } = await this.db
      .from("matter_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("id", documentId)
      .eq("approval_state", "draft")
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) return mapPgError("removeDraft", error);
    if (!data) return err("forbidden", "ניתן למחוק רק טיוטה שטרם הוגשה", "removeDraft: not a draft / not found");
    return ok(true);
  }

  /* --------------------------------------------------------------- internals */

  private async latestVersion(documentId: string): Promise<VerRow | null> {
    const { data } = await this.db
      .from("matter_document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  private async findByHash(organizationId: string, matterId: string, hash: string): Promise<EvidenceDocument | null> {
    const { data: ver } = await this.db
      .from("matter_document_versions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("matter_id", matterId)
      .eq("content_hash", hash)
      .order("version", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!ver) return null;
    const { data: doc } = await this.db
      .from("matter_documents")
      .select("*")
      .eq("id", ver.document_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!doc) return null;
    const latest = await this.latestVersion(doc.id);
    return rowToEvidenceDocument(doc, latest);
  }
}

/** Reduce a flat version list to the latest row per document_id. */
export function latestByDocument(versions: VerRow[]): Map<string, VerRow> {
  const m = new Map<string, VerRow>();
  for (const v of versions) {
    const cur = m.get(v.document_id);
    if (!cur || v.version > cur.version) m.set(v.document_id, v);
  }
  return m;
}
