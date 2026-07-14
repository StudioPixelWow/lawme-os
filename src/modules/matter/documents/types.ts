/**
 * Matter documents — typed domain model (Sprint 3, Slice 1).
 *
 * A typed evidence-document record (NOT one giant JSON blob) used by the
 * Document→Evidence slice. It extends the approved contracts conceptually — the
 * intelligence engine's lightweight `MatterDocument` is unchanged; this is the
 * richer operational record the document workflow produces and audits.
 *
 * Every enum is a small closed union with a Hebrew label map for the UI, so the
 * gate logic stays language-free and the presentation stays localized.
 */

export type DocumentType =
  | "correspondence"
  | "contract"
  | "payslip"
  | "dismissal_letter"
  | "medical"
  | "court_filing"
  | "id_document"
  | "other";

/** mirrors the engine's evidence typing so linkage stays consistent. */
export type EvidenceType = "document" | "testimony" | "record" | "communication" | "expert" | "physical";

export type SourceType = "client" | "opposing_party" | "third_party" | "public_record" | "internal";

export type Confidentiality = "standard" | "confidential" | "privileged" | "restricted";

/** the reviewer's evidentiary classification — never implied by upload alone. */
export type EvidenceDecision =
  | "supports"
  | "contradicts"
  | "inconclusive"
  | "authenticity_uncertain"
  | "incomplete";

export type VerificationState = "unverified" | "provisional" | "verified";

export type ApprovalState = "draft" | "in_review" | "approved" | "rejected";

/** demo-only malware posture — never claims a real scan occurred. */
export type ScanStatus = "scan_pending" | "scan_clean_demo" | "scan_failed";

/** typed provenance — origin chain, not a free blob. */
export interface DocumentProvenance {
  originHe: string;
  capturedByHe: string;
  methodHe: string;
}

export interface EvidenceDocument {
  id: string;
  organizationId: string;
  matterId: string;

  title: string;
  filename: string;
  mimeType: string;
  size: number;
  storageRef: string;
  hash: string;
  version: number;

  documentType: DocumentType;
  evidenceType: EvidenceType;
  sourceType: SourceType;
  documentDate: string | null;

  uploadedByHe: string;
  assignedReviewerHe: string | null;
  confidentiality: Confidentiality;

  evidenceDecision: EvidenceDecision | null;
  verificationState: VerificationState;
  approvalState: ApprovalState;
  scanStatus: ScanStatus;

  // linkage
  workflowId: string | null;
  evidenceRequirementId: string | null;
  legalIssueIdHe: string | null;
  procedureStageId: string | null;

  createdAt: string;
  updatedAt: string;
  provenance: DocumentProvenance;
  auditRefs: string[];
}

/* --------------------------------------------------------------- label maps */

export const DOCUMENT_TYPE_HE: Record<DocumentType, string> = {
  correspondence: "תכתובת",
  contract: "חוזה",
  payslip: "תלוש שכר",
  dismissal_letter: "מכתב פיטורים",
  medical: "מסמך רפואי",
  court_filing: "כתב בי־דין",
  id_document: "מסמך מזהה",
  other: "אחר",
};

export const EVIDENCE_TYPE_HE: Record<EvidenceType, string> = {
  document: "מסמך",
  testimony: "עדות",
  record: "רישום",
  communication: "תכתובת",
  expert: "חוות דעת",
  physical: "ראיה חפצית",
};

export const SOURCE_TYPE_HE: Record<SourceType, string> = {
  client: "הלקוח",
  opposing_party: "הצד שכנגד",
  third_party: "צד שלישי",
  public_record: "רשומה ציבורית",
  internal: "פנימי",
};

export const CONFIDENTIALITY_HE: Record<Confidentiality, string> = {
  standard: "רגיל",
  confidential: "חסוי",
  privileged: "חסיון עו״ד–לקוח",
  restricted: "מוגבל",
};

export const EVIDENCE_DECISION_HE: Record<EvidenceDecision, string> = {
  supports: "תומכת בעובדה",
  contradicts: "סותרת את העובדה",
  inconclusive: "לא חד־משמעית",
  authenticity_uncertain: "אותנטיות מוטלת בספק",
  incomplete: "חלקית / חסרה",
};

export const SCAN_STATUS_HE: Record<ScanStatus, string> = {
  scan_pending: "סריקה בהמתנה",
  scan_clean_demo: "נקי (הדגמה)",
  scan_failed: "סריקה נכשלה",
};

export const VERIFICATION_HE: Record<VerificationState, string> = {
  unverified: "לא אומת",
  provisional: "אימות זמני",
  verified: "אומת",
};
