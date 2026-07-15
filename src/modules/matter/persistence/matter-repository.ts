/**
 * Matter repository (Capability 2, Slice 1). SERVER-ONLY.
 *
 * Turns persisted rows (the Slice A `matters` + `matter_evidence` +
 * `matter_documents` tables) into a live domain `Matter` the intelligence
 * engines can run on — replacing the single hardcoded demo fixture. No new
 * migration: the matters table already holds the header + procedure + stage.
 *
 * Honest hydration: a newly-created matter has NO facts, deadlines,
 * communications, financials, or team captured yet, so those hydrate to
 * empty/neutral defaults. The intelligence engine will therefore report
 * `insufficient_facts` — which is the CORRECT state for a matter whose inputs
 * haven't been entered, not a bug. Evidence requirements and documents that
 * DO exist are mapped through.
 */
import type { Database } from "../../../types/database.types.ts";
import type { Db } from "./supabase-server.ts";
import type {
  Matter, MatterDocument, MatterEvidenceItem, MatterStageKind,
} from "../types.ts";
import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";

type MatterRow = Database["public"]["Tables"]["matters"]["Row"];
type EvidenceRow = Database["public"]["Tables"]["matter_evidence"]["Row"];
type DocRow = Database["public"]["Tables"]["matter_documents"]["Row"];

export interface MatterSummary {
  id: string;
  slug: string;
  titleHe: string;
  procedureType: string;
  currentStageId: string;
  status: string;
  fileNoHe: string | null;
  forumHe: string | null;
  openedAt: string;
}

export interface CreateMatterInput {
  organizationId: string;
  slug: string;
  titleHe: string;
  procedureType: EmploymentProcedureType;
  topic?: string;
  currentStageId?: string;
  fileNoHe?: string | null;
  forumHe?: string | null;
  asOf?: string | null;
}

export interface RepoErr { ok: false; code: "conflict" | "validation" | "not_found" | "internal"; messageHe: string; detail: string; }
export type Result<T> = { ok: true; value: T } | RepoErr;
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
function err(code: RepoErr["code"], messageHe: string, detail: string): RepoErr { return { ok: false, code, messageHe, detail }; }
function mapErr(op: string, e: { code?: string; message?: string }): RepoErr {
  if (e.code === "23505") return err("conflict", "כבר קיים תיק עם המזהה הזה", `${op}: ${e.message}`);
  if ((e.code ?? "").startsWith("23")) return err("validation", "נתוני התיק אינם תקינים", `${op}: ${e.message}`);
  return err("internal", "שגיאה פנימית — נסה שוב", `${op}: ${e.code} ${e.message}`);
}

/* --------------------------------------------------------------- pure hydrate */

export function summaryFromRow(r: MatterRow): MatterSummary {
  return {
    id: r.id, slug: r.slug, titleHe: r.title_he, procedureType: r.procedure_type,
    currentStageId: r.current_stage_id, status: r.status, fileNoHe: r.file_no_he,
    forumHe: r.forum_he, openedAt: r.opened_at,
  };
}

/** Compose a live Matter from persisted rows. Missing intake → honest empties. */
export function hydrateMatter(row: MatterRow, evidence: EvidenceRow[], documents: DocRow[], nowISO: string): Matter {
  return {
    id: row.slug, // the room addresses matters by slug
    titleHe: row.title_he,
    fileNoHe: row.file_no_he,
    forumHe: row.forum_he,
    assignedOwnerId: row.assigned_owner_id ?? undefined,
    legalDomain: "labor",
    procedureType: row.procedure_type as EmploymentProcedureType,
    topic: row.topic,
    currentStageId: row.current_stage_id,
    openedAt: row.opened_at,
    client: {
      id: "client",
      nameHe: "לקוח (טרם הוזן)",
      responsiveness: "unknown",
      aiPolicy: "allowed_with_review",
      confidentiality: "client_confidential",
      lastContactAt: null,
    },
    facts: [], // none captured yet → engine reports insufficient_facts (correct)
    documents: documents.map(documentToMatterDoc),
    evidence: evidence.map(evidenceToItem),
    deadlines: [],
    communications: [],
    financials: {
      feeArrangementHe: null, billedAmount: null, collectedAmount: null,
      outstandingAmount: null, currency: "ILS", writeOffRiskHe: null,
    },
    team: [],
    availableLegislationRefIds: [],
    asOf: (row.as_of ?? nowISO).slice(0, 10),
  };
}

function documentToMatterDoc(d: DocRow): MatterDocument {
  return {
    id: d.id,
    kindHe: d.title,
    present: true,
    requiredForStage: (d.procedure_stage_id as MatterStageKind | null) ?? null,
  };
}
function evidenceToItem(e: EvidenceRow): MatterEvidenceItem {
  return {
    id: e.id,
    labelHe: e.label_he,
    evidenceType: e.evidence_type as MatterEvidenceItem["evidenceType"],
    collected: e.status === "collected",
    mandatory: e.mandatory,
  };
}

/* ----------------------------------------------------------------- repository */

export class MatterRepository {
  private db: Db;
  constructor(db: Db) { this.db = db; }

  async list(organizationId: string): Promise<Result<MatterSummary[]>> {
    const { data, error } = await this.db
      .from("matters")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("opened_at", { ascending: false });
    if (error) return mapErr("list", error);
    return ok((data ?? []).map(summaryFromRow));
  }

  /** Hydrate a full Matter by id or slug (within the org). */
  async getHydrated(organizationId: string, param: string, nowISO: string): Promise<Result<Matter>> {
    const q = this.db.from("matters").select("*").eq("organization_id", organizationId).is("deleted_at", null).limit(1);
    const { data, error } = /^[0-9a-f-]{36}$/i.test(param) ? await q.eq("id", param) : await q.eq("slug", param);
    if (error) return mapErr("getHydrated", error);
    const row = data?.[0];
    if (!row) return err("not_found", "התיק לא נמצא", "getHydrated: no row");

    const [{ data: ev }, { data: docs }] = await Promise.all([
      this.db.from("matter_evidence").select("*").eq("matter_id", row.id),
      this.db.from("matter_documents").select("*").eq("matter_id", row.id).is("deleted_at", null),
    ]);
    return ok(hydrateMatter(row, ev ?? [], docs ?? [], nowISO));
  }

  async create(input: CreateMatterInput): Promise<Result<MatterSummary>> {
    const { data, error } = await this.db
      .from("matters")
      .insert({
        organization_id: input.organizationId,
        slug: input.slug,
        title_he: input.titleHe,
        procedure_type: input.procedureType,
        topic: input.topic ?? input.procedureType,
        current_stage_id: input.currentStageId ?? "intake",
        file_no_he: input.fileNoHe ?? null,
        forum_he: input.forumHe ?? null,
        as_of: input.asOf ?? null,
      })
      .select("*")
      .single();
    if (error) return mapErr("create", error);
    return ok(summaryFromRow(data));
  }
}
