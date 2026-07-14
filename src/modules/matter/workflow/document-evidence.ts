/**
 * document_evidence_review — the Document→Evidence workflow (Sprint 3, Slice 1).
 *
 * A WorkflowDefinition on the EXISTING engine — no new lifecycle. It carries an
 * uploaded document through create → assign → execute → submit → approve/reject
 * → complete → reopen, and on approval it applies the evidentiary gate: a Matter
 * fact is confirmed ONLY when the reviewer's decision supports it and the
 * document is verified enough (reusing the evidence resolution/reversal). Any
 * other outcome files the document without improving the Matter.
 */
import type { Matter, MatterTeamMember } from "../types.ts";
import type { OwnerOption, WorkflowDefinition, WorkflowTask } from "./engine.ts";
import {
  applyEvidenceResolution,
  revertEvidenceResolution,
  hasEvidenceGap,
  TARGET_EVIDENCE,
} from "./evidence-task.ts";
import { mayConfirmFact, deriveVerification } from "../documents/evidence-decision.ts";
import {
  DOCUMENT_TYPE_HE,
  type DocumentType,
  type EvidenceDecision,
  type EvidenceDocument,
  type EvidenceType,
  type Confidentiality,
  type ScanStatus,
  type SourceType,
} from "../documents/types.ts";

export const DOC_EVIDENCE_WORKFLOW_ID = "document-evidence-review";
const LEGAL_ISSUE_HE = "ידיעת המעסיק על ההיריון";
const PROCEDURE_STAGE_ID = "preg-2";

/* -------------------------------------------------------------- field access */

/** The document metadata the task carries (string map is the engine's contract). */
function f(task: WorkflowTask, key: string): string {
  return (task.fields[key] ?? "").trim();
}

function decisionOf(task: WorkflowTask): EvidenceDecision | null {
  const d = f(task, "decision");
  return d ? (d as EvidenceDecision) : null;
}

function scanOf(task: WorkflowTask): ScanStatus {
  const s = f(task, "scanStatus");
  return (s || "scan_pending") as ScanStatus;
}

function hasDocument(task: WorkflowTask): boolean {
  return f(task, "storageRef").length > 0;
}

/* ----------------------------------------------------------------- reviewers */

const ROLE_ORDER: MatterTeamMember["role"][] = ["partner", "senior_lawyer", "lawyer", "paralegal", "intern"];
const ROLE_HE: Record<MatterTeamMember["role"], string> = {
  partner: "שותף",
  senior_lawyer: "עו״ד בכיר",
  lawyer: "עו״ד",
  paralegal: "פראלגל",
  intern: "מתמחה",
};

function reviewerOptions(matter: Matter): OwnerOption[] {
  // reviewers must be able to approve evidence — partners and senior lawyers only
  return matter.team
    .filter((m) => m.role === "partner" || m.role === "senior_lawyer")
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    .map((m) => ({ id: m.id, nameHe: m.nameHe, roleHe: ROLE_HE[m.role] }));
}

function partnerName(matter: Matter): string | null {
  return matter.team.find((m) => m.role === "partner")?.nameHe ?? null;
}

function earliestStrictDue(matter: Matter): string | null {
  const future = matter.deadlines
    .filter((d) => d.strict && d.dueDate && d.dueDate > matter.asOf)
    .map((d) => d.dueDate as string)
    .sort();
  return future[0] ?? null;
}

/* --------------------------------------------------- typed document builder */

/**
 * Build the typed EvidenceDocument record from the task + upload result. This is
 * the record used for activity, audit and display — typed fields, not a blob.
 */
export function buildEvidenceDocument(matter: Matter, task: WorkflowTask, workflowId: string): EvidenceDocument {
  const decision = decisionOf(task);
  const scanStatus = scanOf(task);
  const now = matter.asOf;
  return {
    id: `doc-${TARGET_EVIDENCE}`,
    organizationId: "org-demo",
    matterId: matter.id,
    title: f(task, "title") || f(task, "filename") || "מסמך",
    filename: f(task, "filename"),
    mimeType: f(task, "mime"),
    size: Number(f(task, "size") || "0"),
    storageRef: f(task, "storageRef"),
    hash: f(task, "hash"),
    version: 1,
    documentType: (f(task, "docType") || "correspondence") as DocumentType,
    evidenceType: (f(task, "evidenceType") || "communication") as EvidenceType,
    sourceType: (f(task, "sourceType") || "client") as SourceType,
    documentDate: f(task, "docDate") || null,
    uploadedByHe: task.ownerNameHe ?? "עו״ד ברוך",
    assignedReviewerHe: task.ownerNameHe ?? partnerName(matter),
    confidentiality: (f(task, "confidentiality") || "confidential") as Confidentiality,
    evidenceDecision: decision,
    verificationState: deriveVerification({ decision, scanStatus, hasConflictingEvidence: false, hasProvenance: f(task, "sourceType").length > 0 }),
    approvalState: "draft",
    scanStatus,
    workflowId,
    evidenceRequirementId: TARGET_EVIDENCE,
    legalIssueIdHe: LEGAL_ISSUE_HE,
    procedureStageId: PROCEDURE_STAGE_ID,
    createdAt: now,
    updatedAt: now,
    provenance: {
      originHe: f(task, "sourceType") ? `מקור: ${f(task, "sourceType")}` : "מקור לא צוין",
      capturedByHe: task.ownerNameHe ?? "עו״ד ברוך",
      methodHe: "העלאה ידנית לחדר התיק",
    },
    auditRefs: [],
  };
}

/** Would approving now confirm the fact? (drives honest UI + the resolve gate.) */
export function wouldConfirmFact(task: WorkflowTask): boolean {
  return mayConfirmFact({
    decision: decisionOf(task),
    scanStatus: scanOf(task),
    hasConflictingEvidence: false,
    hasProvenance: f(task, "sourceType").length > 0,
  });
}

/* --------------------------------------------------------- the definition */

export const documentEvidenceReview: WorkflowDefinition = {
  id: DOC_EVIDENCE_WORKFLOW_ID,
  titleHe: "מסמך כראיה — בדיקה ואישור",
  subtitleHe: "אימות ידיעת המעסיק על ההיריון",
  kindHe: "ראיות",
  uiKind: "document",

  detect: hasEvidenceGap,

  seedTask(): WorkflowTask {
    return {
      id: `task-${DOC_EVIDENCE_WORKFLOW_ID}`,
      titleHe: "בדיקת מסמך כראיה — ידיעת המעסיק",
      detailHe: "העלאת מסמך, קישורו כראיה לדרישה החסרה, ובדיקתו על ידי מאשר לפני עדכון התיק.",
      ownerId: null,
      ownerNameHe: null,
      dueDateISO: null,
      fields: {
        title: "",
        docType: "correspondence",
        evidenceType: "communication",
        sourceType: "opposing_party",
        docDate: "",
        confidentiality: "confidential",
        decision: "",
        scanStatus: "",
        storageRef: "",
        hash: "",
        filename: "",
        mime: "",
        size: "",
        previewUrl: "",
      },
    };
  },

  ownerOptions: reviewerOptions,

  fields: [],

  dueMaxISO: earliestStrictDue,

  requiresApproval: true,
  approverFor: partnerName,

  canSubmit(task: WorkflowTask): boolean {
    // a document must be uploaded and described before it can go to review
    return hasDocument(task) && f(task, "title").length > 0 && f(task, "sourceType").length > 0;
  },

  resolve(matter: Matter, task: WorkflowTask): Matter {
    // the evidentiary gate: confirm the fact ONLY when the decision supports it
    // and it is verified enough. Otherwise the document is filed but the Matter
    // does not improve.
    if (!wouldConfirmFact(task)) return matter;
    const title = f(task, "title") || f(task, "filename");
    const docTypeHe = DOCUMENT_TYPE_HE[(f(task, "docType") || "correspondence") as DocumentType];
    return applyEvidenceResolution(matter, {
      statementHe: "המעסיק ידע על ההיריון במועד הפיטורים",
      sourceHe: `${docTypeHe} · ${title}`,
    });
  },

  revert: revertEvidenceResolution,
};
