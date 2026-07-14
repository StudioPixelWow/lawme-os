/**
 * Matter Activity (Sprint 3, Slice 1).
 * The USER-FACING activity feed — human-readable, no internal detail. Distinct
 * from the immutable structured audit (which lives on the workflow instance).
 * Pure: derived from the workflow's audit trail + the health delta, mapped to
 * plain Hebrew a partner would read. Never exposes raw errors or internals.
 */
import type { AuditEntry, WorkflowInstance } from "../workflow/engine";
import type { HealthChange } from "../view/health-delta";

export type ActivityTone = "info" | "progress" | "success" | "warn";

export interface ActivityEntry {
  id: string;
  atISO: string;
  textHe: string;
  tone: ActivityTone;
}

const KIND_TEXT: Partial<Record<AuditEntry["kind"], { textHe: string; tone: ActivityTone }>> = {
  detected: { textHe: "זוהתה דרישת ראיה חסרה", tone: "info" },
  executed: { textHe: "מסמך הועלה וקושר כראיה לתיק", tone: "progress" },
  submitted: { textHe: "נשלח לבדיקת מאשר", tone: "progress" },
  rejected: { textHe: "הבדיקה נדחתה", tone: "warn" },
  approved: { textHe: "אושר על ידי המאשר", tone: "success" },
  reopened: { textHe: "הבדיקה נפתחה מחדש", tone: "warn" },
};

/** Build the user-facing activity feed from the workflow + the health delta. */
export function deriveActivity(instance: WorkflowInstance, changes: HealthChange[]): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const a of instance.audit) {
    const map = KIND_TEXT[a.kind];
    if (!map) continue;
    let textHe = map.textHe;
    if (a.kind === "rejected" && instance.rejectionReasonHe) textHe = `הבדיקה נדחתה: ${instance.rejectionReasonHe}`;
    if (a.kind === "submitted" && instance.approverHe) textHe = `נשלח לבדיקת ${instance.approverHe}`;
    if (a.kind === "approved" && instance.approverHe) textHe = `אושר על ידי ${instance.approverHe}`;
    out.push({ id: `act-${a.id}`, atISO: a.atISO, textHe, tone: map.tone });
  }

  if (instance.status === "completed") {
    for (const c of changes) {
      out.push({ id: `act-delta-${out.length}`, atISO: instance.audit.at(-1)?.atISO ?? "", textHe: c.labelHe + (c.detailHe ? ` — ${c.detailHe}` : ""), tone: "success" });
    }
    if (changes.length === 0) {
      out.push({ id: "act-nochange", atISO: instance.audit.at(-1)?.atISO ?? "", textHe: "המסמך תויק — התיק לא שונה (הראיה אינה מאשרת את העובדה)", tone: "info" });
    }
  }

  return out;
}
