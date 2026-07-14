/**
 * LawME Workflow Engine (Sprint 2.1).
 *
 * A single, pure, definition-agnostic lifecycle engine that every operational
 * workflow plugs into. It owns the state machine, the audit trail, the
 * notifications and the matter-recompute effect; a `WorkflowDefinition` supplies
 * only the workflow-specific parts (detection, the task it produces, the fields
 * it collects, and the pure matter mutation on completion).
 *
 * Lifecycle:
 *   draft ─assign/due──▶ draft ─execute──▶ in_progress
 *   in_progress ─pause⇄resume─ paused
 *   in_progress ─wait⇄resume─ waiting
 *   in_progress ─submit──▶ in_review ─approve──▶ completed  (Matter recalculated)
 *   in_review ─reject──▶ rejected ─resume──▶ in_progress
 *   completed ─reopen──▶ in_progress  (recalculation reverted)
 *
 * Every transition appends an audit entry, may emit a notification, and reports
 * whether the Matter must be recomputed. No wall-clock: timestamps derive from
 * `matter.asOf`, so the engine is fully deterministic and testable.
 */
import type { Matter } from "../types.ts";

export type WorkflowStatus =
  | "draft"
  | "in_progress"
  | "paused"
  | "waiting"
  | "in_review"
  | "rejected"
  | "completed";

export interface OwnerOption {
  id: string;
  nameHe: string;
  roleHe: string;
}

/** A field the definition wants collected in the task form. */
export interface WorkflowFieldSpec {
  key: string;
  labelHe: string;
  kind: "text" | "textarea";
  placeholderHe?: string;
  required?: boolean;
}

export interface WorkflowTask {
  id: string;
  titleHe: string;
  detailHe: string;
  ownerId: string | null;
  ownerNameHe: string | null;
  dueDateISO: string | null;
  /** definition-specific field values. */
  fields: Record<string, string>;
}

export type AuditKind =
  | "detected"
  | "created"
  | "assigned"
  | "due_set"
  | "executed"
  | "paused"
  | "resumed"
  | "waiting"
  | "submitted"
  | "approved"
  | "rejected"
  | "completed"
  | "reopened"
  | "recomputed";

export interface AuditEntry {
  id: string;
  kind: AuditKind;
  atISO: string;
  actorHe: string;
  summaryHe: string;
  detailHe: string | null;
}

export type NotifyTone = "info" | "success" | "warn";

export interface Notification {
  id: string;
  atISO: string;
  toHe: string;
  titleHe: string;
  bodyHe: string | null;
  tone: NotifyTone;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  status: WorkflowStatus;
  task: WorkflowTask;
  audit: AuditEntry[];
  notifications: Notification[];
  approverHe: string | null;
  rejectionReasonHe: string | null;
  waitingForHe: string | null;
  /** monotonic step counter — deterministic ids + timestamps. */
  seq: number;
}

/**
 * The contract a workflow implements to plug into the engine. Everything
 * lifecycle-related lives in the engine; a definition is only the domain part.
 */
export interface WorkflowDefinition {
  id: string;
  titleHe: string;
  subtitleHe: string;
  kindHe: string;
  /** how the drawer renders the draft/review body ("form" default, "document" for uploads). */
  uiKind?: "form" | "document";
  /** does this workflow currently apply to the matter? */
  detect(matter: Matter): boolean;
  /** a fresh, prefilled task (nothing invented is asserted as fact). */
  seedTask(matter: Matter): WorkflowTask;
  /** the people the task can be assigned to. */
  ownerOptions(matter: Matter): OwnerOption[];
  /** the extra fields the form collects, beyond title/detail/owner/due. */
  fields: WorkflowFieldSpec[];
  /** a hard upper bound for the due date (e.g. before a strict deadline). */
  dueMaxISO(matter: Matter): string | null;
  /** does completion require an approval gate? */
  requiresApproval: boolean;
  /** who approves (role/name), or null. */
  approverFor(matter: Matter): string | null;
  /** is the task complete enough to submit / complete? */
  canSubmit(task: WorkflowTask): boolean;
  /** the pure mutation applied to the matter on completion. */
  resolve(matter: Matter, task: WorkflowTask): Matter;
  /** undo the mutation on reopen (restores the gap). */
  revert(matter: Matter): Matter;
}

/* ----------------------------------------------------------------- helpers */

const ACTOR_SYSTEM = "מערכת LawME";
const ACTOR_DINO = "דינו";

function auditAt(matter: Matter, seq: number): string {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(matter.asOf)?.[1] ?? "2026-07-12";
  const mm = String(9 + Math.floor(seq / 60)).padStart(2, "0");
  const ss = String(seq % 60).padStart(2, "0");
  return `${day}T${mm}:${ss}:00`;
}

export const STATUS_HE: Record<WorkflowStatus, string> = {
  draft: "טיוטה",
  in_progress: "בביצוע",
  paused: "מושהה",
  waiting: "ממתין",
  in_review: "ממתין לאישור",
  rejected: "נדחה",
  completed: "הושלם",
};

export const STATUS_TONE: Record<WorkflowStatus, "new" | "progress" | "waiting" | "reviewed" | "risk" | "completed"> = {
  draft: "new",
  in_progress: "progress",
  paused: "waiting",
  waiting: "waiting",
  in_review: "reviewed",
  rejected: "risk",
  completed: "completed",
};

/* ------------------------------------------------------------------ events */

export type WorkflowEvent =
  | { type: "update-fields"; patch: Partial<Pick<WorkflowTask, "titleHe" | "detailHe" | "ownerId" | "ownerNameHe" | "dueDateISO">> & { fields?: Record<string, string> } }
  | { type: "execute" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "wait"; reasonHe: string }
  | { type: "submit" }
  | { type: "approve" }
  | { type: "reject"; reasonHe: string }
  | { type: "complete" }
  | { type: "reopen" };

/** which events are legal from each state (guards refine further). */
const ALLOWED: Record<WorkflowStatus, WorkflowEvent["type"][]> = {
  draft: ["update-fields", "execute"],
  in_progress: ["update-fields", "pause", "wait", "submit", "complete"],
  paused: ["resume"],
  waiting: ["resume"],
  // update-fields in review lets the reviewer record their evidentiary decision
  // before approving/rejecting; it changes no transition or state.
  in_review: ["update-fields", "approve", "reject"],
  rejected: ["resume", "reopen"],
  completed: ["reopen"],
};

export function can(instance: WorkflowInstance, type: WorkflowEvent["type"]): boolean {
  return ALLOWED[instance.status].includes(type);
}

export type WorkflowEffect = "none" | "recompute" | "revert";

export interface ApplyResult {
  instance: WorkflowInstance;
  matter: Matter;
  effect: WorkflowEffect;
}

/* --------------------------------------------------------------- lifecycle */

export function createInstance(def: WorkflowDefinition, matter: Matter, opts: { detectedBy?: string } = {}): WorkflowInstance {
  const base: WorkflowInstance = {
    id: `wf-${def.id}`,
    definitionId: def.id,
    status: "draft",
    task: def.seedTask(matter),
    audit: [],
    notifications: [],
    approverHe: def.approverFor(matter),
    rejectionReasonHe: null,
    waitingForHe: null,
    seq: 0,
  };
  // the detection that opened the workflow is the first audited fact
  return pushAudit(base, matter, "detected", opts.detectedBy ?? ACTOR_DINO, `זוהתה משימה: ${def.titleHe}`, def.subtitleHe);
}

function pushAudit(
  instance: WorkflowInstance,
  matter: Matter,
  kind: AuditKind,
  actorHe: string,
  summaryHe: string,
  detailHe: string | null = null,
): WorkflowInstance {
  const entry: AuditEntry = {
    id: `audit-${instance.seq}`,
    kind,
    atISO: auditAt(matter, instance.seq),
    actorHe,
    summaryHe,
    detailHe,
  };
  return { ...instance, audit: [...instance.audit, entry], seq: instance.seq + 1 };
}

function pushNote(
  instance: WorkflowInstance,
  matter: Matter,
  toHe: string,
  titleHe: string,
  bodyHe: string | null,
  tone: NotifyTone,
): WorkflowInstance {
  const note: Notification = {
    id: `note-${instance.seq}`,
    atISO: auditAt(matter, instance.seq),
    toHe,
    titleHe,
    bodyHe,
    tone,
  };
  return { ...instance, notifications: [...instance.notifications, note], seq: instance.seq + 1 };
}

const owner = (i: WorkflowInstance) => i.task.ownerNameHe ?? "האחראי";

/**
 * The single transition function. Pure: returns the next instance, the (possibly
 * recomputed) matter, and whether the matter changed.
 */
export function applyEvent(
  def: WorkflowDefinition,
  instance: WorkflowInstance,
  matter: Matter,
  event: WorkflowEvent,
): ApplyResult {
  if (!can(instance, event.type)) {
    return { instance, matter, effect: "none" };
  }

  switch (event.type) {
    case "update-fields": {
      const { fields, ...rest } = event.patch;
      const task: WorkflowTask = {
        ...instance.task,
        ...rest,
        fields: fields ? { ...instance.task.fields, ...fields } : instance.task.fields,
      };
      return { instance: { ...instance, task }, matter, effect: "none" };
    }

    case "execute": {
      if (!instance.task.ownerId || !instance.task.dueDateISO) {
        return { instance, matter, effect: "none" };
      }
      let next: WorkflowInstance = { ...instance, status: "in_progress" as WorkflowStatus };
      const dueHe = formatShortHe(instance.task.dueDateISO);
      next = pushAudit(next, matter, "created", ACTOR_SYSTEM, `נפתחה משימה: ${instance.task.titleHe}`, instance.task.detailHe);
      next = pushAudit(next, matter, "assigned", ACTOR_SYSTEM, `שויך אחראי: ${owner(next)}`);
      next = pushAudit(next, matter, "due_set", ACTOR_SYSTEM, `נקבע יעד: ${dueHe}`);
      next = pushAudit(next, matter, "executed", owner(next), "המשימה בביצוע");
      next = pushNote(next, matter, owner(next), "הוקצתה לך משימה", instance.task.titleHe, "info");
      return { instance: next, matter, effect: "none" };
    }

    case "pause": {
      let next: WorkflowInstance = { ...instance, status: "paused" as WorkflowStatus };
      next = pushAudit(next, matter, "paused", owner(next), "המשימה הושהתה");
      return { instance: next, matter, effect: "none" };
    }

    case "wait": {
      let next: WorkflowInstance = { ...instance, status: "waiting" as WorkflowStatus, waitingForHe: event.reasonHe };
      next = pushAudit(next, matter, "waiting", owner(next), "ממתין לגורם חיצוני", event.reasonHe);
      return { instance: next, matter, effect: "none" };
    }

    case "resume": {
      let next: WorkflowInstance = { ...instance, status: "in_progress" as WorkflowStatus, waitingForHe: null, rejectionReasonHe: null };
      next = pushAudit(next, matter, "resumed", owner(next), "הביצוע חודש");
      return { instance: next, matter, effect: "none" };
    }

    case "submit": {
      if (!def.canSubmit(instance.task)) return { instance, matter, effect: "none" };
      let next: WorkflowInstance = { ...instance, status: "in_review" as WorkflowStatus };
      const approver = instance.approverHe ?? "מאשר";
      next = pushAudit(next, matter, "submitted", owner(next), `הוגש לאישור: ${approver}`);
      next = pushNote(next, matter, approver, "ממתין לאישורך", instance.task.titleHe, "info");
      return { instance: next, matter, effect: "none" };
    }

    case "reject": {
      let next: WorkflowInstance = { ...instance, status: "rejected" as WorkflowStatus, rejectionReasonHe: event.reasonHe };
      const approver = instance.approverHe ?? "מאשר";
      next = pushAudit(next, matter, "rejected", approver, "הבקשה נדחתה", event.reasonHe);
      next = pushNote(next, matter, owner(next), "המשימה נדחתה", event.reasonHe, "warn");
      return { instance: next, matter, effect: "none" };
    }

    case "approve":
    case "complete": {
      // approval-gated workflows complete via approve; others via complete
      if (event.type === "approve" && instance.status !== "in_review") return { instance, matter, effect: "none" };
      if (event.type === "complete" && (def.requiresApproval || !def.canSubmit(instance.task))) {
        return { instance, matter, effect: "none" };
      }
      const nextMatter = def.resolve(matter, instance.task);
      let next: WorkflowInstance = { ...instance, status: "completed" as WorkflowStatus };
      const approver = instance.approverHe ?? owner(next);
      if (event.type === "approve") {
        next = pushAudit(next, nextMatter, "approved", approver, "הבקשה אושרה");
      }
      next = pushAudit(next, nextMatter, "completed", owner(next), "המשימה הושלמה", summarizeFields(def, instance.task));
      next = pushAudit(next, nextMatter, "recomputed", ACTOR_DINO, "האינטליגנציה חושבה מחדש", "מצב, ניקוד, נרטיב ואבן דרך עודכנו");
      next = pushNote(next, nextMatter, "צוות התיק", "המשימה הושלמה — התיק עודכן", instance.task.titleHe, "success");
      return { instance: next, matter: nextMatter, effect: "recompute" };
    }

    case "reopen": {
      const nextMatter = def.revert(matter);
      let next: WorkflowInstance = { ...instance, status: "in_progress" as WorkflowStatus, rejectionReasonHe: null };
      next = pushAudit(next, nextMatter, "reopened", owner(next), "המשימה נפתחה מחדש", "החישוב שנגזר מההשלמה בוטל");
      next = pushAudit(next, nextMatter, "recomputed", ACTOR_DINO, "האינטליגנציה חושבה מחדש", "החסם חזר עד להשלמה מאושרת");
      next = pushNote(next, nextMatter, owner(next), "המשימה נפתחה מחדש", instance.task.titleHe, "warn");
      return { instance: next, matter: nextMatter, effect: "revert" };
    }

    default:
      return { instance, matter, effect: "none" };
  }
}

function summarizeFields(def: WorkflowDefinition, task: WorkflowTask): string | null {
  const parts = def.fields
    .map((f) => (task.fields[f.key]?.trim() ? `${f.labelHe}: ${task.fields[f.key].trim()}` : null))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function formatShortHe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  return `${Number(dd)}.${Number(mm)}.${y}`;
}
