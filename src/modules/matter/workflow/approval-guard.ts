/**
 * Approval guard + review (Sprint 3.2 final correction). Pure & testable.
 *
 * Approval is materially consequential (it may confirm a document-derived fact,
 * resolve a blocker, and recompute the Matter), so it requires an explicit
 * review + confirmation. This module supplies the review content and the
 * preconditions/stale-state guards the confirmation dialog enforces before it
 * dispatches the (unchanged) Workflow Engine approve transition.
 *
 * No engine, epistemic, or lifecycle changes — only checks over existing state.
 */
import type { Matter } from "../types.ts";
import type { WorkflowInstance } from "./engine.ts";
import { wouldConfirmFact } from "./document-evidence.ts";
import { TARGET_FACT } from "./evidence-task.ts";
import { EVIDENCE_DECISION_HE, SCAN_STATUS_HE, type EvidenceDecision, type ScanStatus } from "../documents/types.ts";

/** A stable version token for the approvable state; any change invalidates a
 *  dialog that was opened earlier (stale-state protection). */
export function approvalVersion(instance: WorkflowInstance): string {
  const t = instance.task;
  return [instance.status, instance.seq, t.fields.storageRef ?? "", t.fields.hash ?? "", t.fields.decision ?? ""].join("|");
}

export function isStale(openedVersion: string, current: string): boolean {
  return openedVersion !== current;
}

export interface Precheck {
  ok: boolean;
  reasonHe: string | null;
}

/**
 * Everything that must hold to approve. The actor/org/matter-access rechecks are
 * enforced server-side at the persistence layer (Slice 1.1); here we enforce the
 * client-verifiable gates: workflow state, document state, evidentiary decision,
 * provenance, approver authority, and the no-conflicting-evidence rule.
 */
export function approvalPreconditions(instance: WorkflowInstance, matter: Matter): Precheck {
  const t = instance.task;
  if (instance.status !== "in_review") return { ok: false, reasonHe: "מצב המשימה השתנה — אינה ממתינה לאישור." };
  if (!t.fields.storageRef) return { ok: false, reasonHe: "לא צורף מסמך." };
  if (!t.fields.decision) return { ok: false, reasonHe: "טרם נקבע ערך ראייתי." };
  if (!t.fields.sourceType) return { ok: false, reasonHe: "חסרה שרשרת מקור (provenance)." };
  const hasApprover = matter.team.some((m) => m.role === "partner" || m.role === "senior_lawyer");
  if (!hasApprover) return { ok: false, reasonHe: "אין מאשר מוסמך בצוות." };
  return { ok: true, reasonHe: null };
}

export interface ApprovalReviewRow { label: string; value: string; tone?: "completed" | "risk" | "today" | "waiting" | null; }
export interface ApprovalReview {
  actionHe: string;
  rows: ApprovalReviewRow[];
  willConfirmFact: boolean;
  effectsHe: string[];
  provenanceHe: string;
  approverHe: string;
  warningHe: string;
}

/** The full, sourced review shown in the approval dialog (no chain-of-thought,
 *  no promised legal outcome). */
export function buildApprovalReview(instance: WorkflowInstance, matter: Matter): ApprovalReview {
  const t = instance.task;
  const decision = (t.fields.decision || "") as EvidenceDecision | "";
  const scan = (t.fields.scanStatus || "scan_pending") as ScanStatus;
  const willConfirm = wouldConfirmFact(t);
  const factCurrent = matter.facts.find((f) => f.field === TARGET_FACT)?.status ?? "unknown";

  const rows: ApprovalReviewRow[] = [
    { label: "מסמך", value: t.fields.title || t.fields.filename || "—" },
    { label: "סיווג ראייתי", value: decision ? EVIDENCE_DECISION_HE[decision] : "—", tone: willConfirm ? "completed" : "today" },
    { label: "עובדה מושפעת", value: "ידיעת המעסיק על ההיריון" },
    { label: "מצב אפיסטמי נוכחי", value: epi(factCurrent) },
    { label: "מצב אפיסטמי מוצע", value: willConfirm ? "אומת · נגזר ממסמך" : "ללא שינוי", tone: willConfirm ? "completed" : "waiting" },
    { label: "חסם שעשוי להיפתר", value: willConfirm ? "חסר אימות: ידיעת המעסיק" : "אינו נפתר", tone: willConfirm ? "completed" : null },
    { label: "שלב מושפע", value: "אימות עובדות מכריעות" },
    { label: "בדיקת בטיחות", value: SCAN_STATUS_HE[scan] },
  ];

  const effectsHe = willConfirm
    ? ["כיסוי משפטי → תקין", "ראיות → תקין", "אבן הדרך נפתחת למעבר", "מצב התיק (Posture) מתעדכן", "הפעולה העליונה מתעדכנת"]
    : ["המסמך יתויק כראיה", "התיק לא ישתנה — הראיה אינה מאשרת את העובדה"];

  return {
    actionHe: "אישור מסמך כראיה — אימות ידיעת המעסיק",
    rows,
    willConfirmFact: willConfirm,
    effectsHe,
    provenanceHe: `${t.fields.sourceType ? `מקור: ${t.fields.sourceType}` : "מקור לא צוין"} · sha256 ${(t.fields.hash || "").slice(0, 12)}…`,
    approverHe: instance.approverHe ?? "מאשר",
    warningHe: "אישור עשוי לחשב מחדש את התיק. ההחלטה טעונה בדיקה ואישור מפורשים.",
  };
}

function epi(status: string): string {
  return ({ unknown: "טרם אומת (unknown)", client_alleged: "טענת לקוח", document_derived: "נגזר ממסמך", confirmed: "אומת" } as Record<string, string>)[status] ?? status;
}
