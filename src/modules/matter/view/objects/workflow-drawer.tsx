"use client";

/**
 * Matter App — the generic Workflow Drawer (Sprint 2.1).
 * One drawer renders ANY workflow by reading its live engine instance + its
 * definition. It exposes the whole lifecycle — create, assign, due, execute,
 * pause/resume, waiting, submit, approve/reject, complete, reopen — plus the
 * audit trail and notifications. No workflow-specific logic lives here; the
 * evidence workflow is just the first definition it drives.
 */
import { useEffect, useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import {
  AlertGlyph,
  TaskGlyph,
  UserGlyph,
  CalendarGlyph,
  CheckGlyph,
  HistoryGlyph,
  CloseGlyph,
  SparkleGlyph,
  ClockGlyph,
  BellGlyph,
  PenGlyph,
  EvidenceGlyph,
} from "@/design-system/icons/glyphs";
import { useRoom } from "../room-store";
import { findWorkflow } from "../../workflow/registry";
import {
  STATUS_HE,
  STATUS_TONE,
  formatShortHe,
  type AuditKind,
  type WorkflowInstance,
  type WorkflowDefinition,
} from "../../workflow/engine";
import { DOT, TEXT, WASH } from "./tone";
import { describeHealthDelta, remainingFocus } from "../health-delta";
import { DocumentDraft, DocumentReview, DocumentSummary } from "./document-panels";

const MACRO = [
  { key: "task", labelHe: "משימה" },
  { key: "exec", labelHe: "ביצוע" },
  { key: "review", labelHe: "אישור" },
  { key: "done", labelHe: "השלמה" },
] as const;

const STATUS_MACRO: Record<string, number> = {
  draft: 0,
  in_progress: 1,
  paused: 1,
  waiting: 1,
  in_review: 2,
  rejected: 2,
  completed: 3,
};

const AUDIT_ICON: Record<AuditKind, typeof AlertGlyph> = {
  detected: AlertGlyph,
  created: TaskGlyph,
  assigned: UserGlyph,
  due_set: CalendarGlyph,
  executed: PenGlyph,
  paused: ClockGlyph,
  resumed: PenGlyph,
  waiting: ClockGlyph,
  submitted: EvidenceGlyph,
  approved: CheckGlyph,
  rejected: AlertGlyph,
  completed: CheckGlyph,
  reopened: HistoryGlyph,
  recomputed: SparkleGlyph,
};

function timeHe(iso: string): string {
  return /T(\d{2}:\d{2})/.exec(iso)?.[1] ?? "";
}

const inputCx =
  "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-small text-foreground outline-none transition-colors focus:border-ink-500";

export function WorkflowDrawer() {
  const { state, dispatch, vm, baselineVm, openConfirm, close } = useRoom();
  const [waitReason, setWaitReason] = useState("");

  useEffect(() => {
    if (!state.drawerOpen || state.confirm) return; // confirm dialog owns Esc while open
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.drawerOpen, state.confirm, close]);

  if (!state.drawerOpen) return null;
  const def = findWorkflow(state.activeDefId ?? state.instance?.definitionId);
  if (!def) return null;

  const inst = state.instance;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={def.titleHe}>
      <button
        type="button"
        aria-label="סגירה"
        onClick={close}
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[1px]"
      />

      <aside className="relative ms-auto flex h-full w-full max-w-[30rem] flex-col overflow-y-auto border-s border-line-strong bg-surface shadow-raised">
        <Header def={def} inst={inst} onClose={close} />

        {inst && <Stepper status={inst.status} />}

        <div className="flex-1 px-6 py-5">
          {!inst ? (
            <Explain
              blockerTitleHe={vm.blocker?.titleHe ?? def.subtitleHe}
              whyHe={vm.blocker?.whyHe ?? ""}
              missingHe={vm.blocker?.missingHe ?? []}
              stageHe={vm.blocker?.stageHe ?? null}
              sourceHe={vm.blocker?.sourceHe ?? null}
              onStart={() => dispatch({ type: "create-instance" })}
            />
          ) : (
            <Lifecycle
              def={def}
              inst={inst}
              matter={state.matter}
              vm={vm}
              baselineVm={baselineVm}
              waitReason={waitReason}
              setWaitReason={setWaitReason}
              openConfirm={openConfirm}
              close={close}
              dispatch={dispatch}
            />
          )}
        </div>

        {inst && inst.notifications.length > 0 && <Notifications inst={inst} />}
        {inst && inst.audit.length > 0 && <AuditTrail inst={inst} />}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function Header({ def, inst, onClose }: { def: WorkflowDefinition; inst: WorkflowInstance | null; onClose: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line-strong bg-surface/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-status-urgent-wash text-status-urgent">
          <TaskGlyph size={18} />
        </span>
        <div>
          <h2 className="text-subheading font-semibold text-foreground">{def.titleHe}</h2>
          <p className="text-caption text-foreground-faint">{def.subtitleHe}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {inst && <StatusChip status={inst.status} />}
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-sm text-foreground-faint transition-colors hover:bg-surface-sunken hover:text-foreground"
          aria-label="סגירה"
        >
          <CloseGlyph size={16} />
        </button>
      </div>
    </header>
  );
}

function StatusChip({ status }: { status: WorkflowInstance["status"] }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium", WASH[tone], TEXT[tone])}>
      <span className={cx("h-1.5 w-1.5 rounded-pill", DOT[tone])} />
      {STATUS_HE[status]}
    </span>
  );
}

function Stepper({ status }: { status: WorkflowInstance["status"] }) {
  const step = STATUS_MACRO[status] ?? 0;
  return (
    <ol className="flex items-center gap-1.5 border-b border-line-strong px-6 py-3">
      {MACRO.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-1.5">
            <span
              className={cx(
                "grid h-5 w-5 shrink-0 place-items-center rounded-pill text-micro font-semibold",
                done && "bg-status-completed text-paper-0",
                active && "bg-ink-900 text-paper-0",
                !done && !active && "bg-surface-sunken text-foreground-faint",
              )}
            >
              {done ? <CheckGlyph size={11} /> : i + 1}
            </span>
            <span className={cx("truncate text-micro", active ? "font-semibold text-foreground" : "text-foreground-faint")}>
              {s.labelHe}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------------- explain */

function Explain({
  blockerTitleHe,
  whyHe,
  missingHe,
  stageHe,
  sourceHe,
  onStart,
}: {
  blockerTitleHe: string;
  whyHe: string;
  missingHe: string[];
  stageHe: string | null;
  sourceHe: string | null;
  onStart: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-status-urgent/30 bg-status-urgent-wash/60 p-4">
        <div className="flex items-center gap-2 text-status-urgent">
          <AlertGlyph size={15} />
          <span className="text-caption font-semibold">זוהה על ידי דינו</span>
        </div>
        <h3 className="mt-2 text-body font-semibold text-foreground">{blockerTitleHe}</h3>
        {whyHe && <p className="mt-1.5 text-small leading-relaxed text-foreground-soft">{whyHe}</p>}
      </div>

      <dl className="space-y-2.5 text-small">
        {stageHe && <Row label="שלב נוכחי" value={stageHe} />}
        {missingHe.length > 0 && <Row label="חסר" value={missingHe.join(" · ")} />}
        {sourceHe && <Row label="מקור" value={sourceHe} />}
      </dl>

      <p className="text-small leading-relaxed text-foreground-soft">
        פתח משימה כדי לנהל את הטיפול מקצה לקצה — הקצאה, יעד, ביצוע, אישור והשלמה — מבלי לצאת מחדר התיק.
      </p>

      <Button intent="primary" className="w-full" onClick={onStart}>
        פתח משימת טיפול
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- lifecycle */

function Lifecycle({
  def,
  inst,
  matter,
  vm,
  baselineVm,
  waitReason,
  setWaitReason,
  openConfirm,
  close,
  dispatch,
}: {
  def: WorkflowDefinition;
  inst: WorkflowInstance;
  matter: import("../../types").Matter;
  vm: import("../types").RoomViewModel;
  baselineVm: import("../types").RoomViewModel;
  waitReason: string;
  setWaitReason: (v: string) => void;
  openConfirm: ReturnType<typeof useRoom>["openConfirm"];
  close: ReturnType<typeof useRoom>["close"];
  dispatch: ReturnType<typeof useRoom>["dispatch"];
}) {
  const task = inst.task;
  const owners = def.ownerOptions(matter);
  const maxDue = def.dueMaxISO(matter);

  const setField = (key: string, value: string) =>
    dispatch({ type: "wf", event: { type: "update-fields", patch: { fields: { [key]: value } } } });

  const isDocument = def.uiKind === "document";

  if (inst.status === "draft" && isDocument) return <DocumentDraft />;
  if (inst.status === "in_review" && isDocument) return <DocumentReview />;

  if (inst.status === "draft") {
    return (
      <div className="space-y-4">
        <Field label="כותרת המשימה">
          <input
            value={task.titleHe}
            onChange={(e) => dispatch({ type: "wf", event: { type: "update-fields", patch: { titleHe: e.target.value } } })}
            className={inputCx}
          />
        </Field>
        <Field label="פירוט">
          <textarea
            value={task.detailHe}
            onChange={(e) => dispatch({ type: "wf", event: { type: "update-fields", patch: { detailHe: e.target.value } } })}
            rows={2}
            className={cx(inputCx, "resize-none leading-relaxed")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="אחראי">
            <select
              value={task.ownerId ?? ""}
              onChange={(e) => {
                const opt = owners.find((o) => o.id === e.target.value) ?? null;
                dispatch({ type: "wf", event: { type: "update-fields", patch: { ownerId: opt?.id ?? null, ownerNameHe: opt?.nameHe ?? null } } });
              }}
              className={inputCx}
            >
              <option value="" disabled>
                בחר אחראי…
              </option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nameHe} · {o.roleHe}
                </option>
              ))}
            </select>
          </Field>
          <Field label="יעד לביצוע">
            <input
              type="date"
              value={task.dueDateISO ?? ""}
              min={matter.asOf}
              max={maxDue ?? undefined}
              onChange={(e) => dispatch({ type: "wf", event: { type: "update-fields", patch: { dueDateISO: e.target.value || null } } })}
              className={inputCx}
            />
          </Field>
        </div>
        {maxDue && <p className="-mt-2 text-caption text-foreground-faint">לפני המועד הקשיח ({formatShortHe(maxDue)}).</p>}

        {def.fields.length > 0 && (
          <div className="rounded-lg border border-line-strong bg-surface-sunken/60 p-3.5">
            <p className="mb-2.5 flex items-center gap-1.5 text-caption font-semibold text-foreground-soft">
              <EvidenceGlyph size={14} /> פרטי הביצוע
            </p>
            <div className="space-y-3">
              {def.fields.map((f) => (
                <Field key={f.key} label={f.labelHe}>
                  <input
                    value={task.fields[f.key] ?? ""}
                    placeholder={f.placeholderHe}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={inputCx}
                  />
                </Field>
              ))}
            </div>
          </div>
        )}

        <Button
          intent="primary"
          className="w-full"
          disabled={!task.ownerId || !task.dueDateISO}
          onClick={() => dispatch({ type: "wf", event: { type: "execute" } })}
        >
          צור, הקצה והתחל ביצוע
        </Button>
      </div>
    );
  }

  if (inst.status === "completed") {
    const changes = describeHealthDelta(baselineVm, vm);
    const focus = remainingFocus(vm);
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-status-completed/30 bg-status-completed-wash/60 p-4 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-pill bg-status-completed text-paper-0">
            <CheckGlyph size={22} />
          </span>
          <h3 className="mt-3 text-subheading font-semibold text-foreground">התיק נעשה בריא יותר</h3>
          <p className="mt-1 text-small text-foreground-soft">
            המשימה אושרה והושלמה. המנוע חישב מחדש את המצב, הניקוד, הנרטיב ואבן הדרך.
          </p>
        </div>

        <ul className="space-y-2.5">
          {changes.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-lg border border-line-strong bg-surface p-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-status-completed-wash text-status-completed">
                <CheckGlyph size={12} />
              </span>
              <div className="min-w-0">
                <p className="text-small font-medium text-foreground">{c.labelHe}</p>
                {c.detailHe && <p className="text-caption text-foreground-soft">{c.detailHe}</p>}
              </div>
            </li>
          ))}
        </ul>

        {focus && (
          <div className="rounded-lg border border-status-today/30 bg-status-today-wash/50 p-3.5">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-status-today">
              <ClockGlyph size={13} /> המוקד הבא
            </p>
            <p className="mt-1 text-small text-foreground-soft">{focus}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button intent="primary" className="flex-1" onClick={close}>
            צפה בתיק המעודכן
          </Button>
          <Button className="shrink-0" onClick={() => openConfirm("reopen")}>
            פתח מחדש
          </Button>
        </div>
      </div>
    );
  }

  // execution states share the task card + contextual controls
  return (
    <div className="space-y-4">
      {isDocument ? <DocumentSummary /> : <TaskCard def={def} task={task} status={inst.status} />}

      {inst.status === "rejected" && inst.rejectionReasonHe && (
        <div className="rounded-lg border border-status-risk/30 bg-status-risk-wash/50 p-3.5">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-status-risk">
            <AlertGlyph size={13} /> הבקשה נדחתה
          </p>
          <p className="mt-1 text-small text-foreground-soft">{inst.rejectionReasonHe}</p>
        </div>
      )}

      {inst.status === "waiting" && inst.waitingForHe && (
        <div className="rounded-lg border border-status-waiting/30 bg-status-waiting-wash/50 p-3.5">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-status-waiting">
            <ClockGlyph size={13} /> ממתין
          </p>
          <p className="mt-1 text-small text-foreground-soft">{inst.waitingForHe}</p>
        </div>
      )}

      {/* in_progress controls */}
      {inst.status === "in_progress" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => dispatch({ type: "wf", event: { type: "pause" } })}>
              השהה
            </Button>
            <Button
              className="flex-1"
              onClick={() => dispatch({ type: "wf", event: { type: "wait", reasonHe: waitReason.trim() || "ממתין למענה חיצוני" } })}
            >
              סמן כממתין
            </Button>
          </div>
          <input
            value={waitReason}
            onChange={(e) => setWaitReason(e.target.value)}
            placeholder="סיבת ההמתנה (רשות)"
            className={inputCx}
          />
          <Button
            intent="primary"
            className="w-full"
            disabled={!def.canSubmit(task)}
            onClick={() => dispatch({ type: "wf", event: { type: "submit" } })}
          >
            שלח לאישור {inst.approverHe ? `· ${inst.approverHe}` : ""}
          </Button>
          {def.requiresApproval && (
            <p className="text-center text-caption text-foreground-faint">
              ההשלמה טעונה אישור לפני חישוב מחדש של התיק.
            </p>
          )}
        </div>
      )}

      {inst.status === "paused" && (
        <Button intent="primary" className="w-full" onClick={() => dispatch({ type: "wf", event: { type: "resume" } })}>
          חדש ביצוע
        </Button>
      )}

      {inst.status === "waiting" && (
        <Button intent="primary" className="w-full" onClick={() => dispatch({ type: "wf", event: { type: "resume" } })}>
          התקבל מענה — המשך
        </Button>
      )}

      {inst.status === "rejected" && (
        <Button intent="primary" className="w-full" onClick={() => dispatch({ type: "wf", event: { type: "resume" } })}>
          טפל בהערות והגש מחדש
        </Button>
      )}

      {/* in_review: the approver acts */}
      {inst.status === "in_review" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-status-reviewed/30 bg-status-reviewed-wash/50 p-3.5">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-status-reviewed">
              <UserGlyph size={13} /> ממתין לאישור {inst.approverHe ?? ""}
            </p>
            <p className="mt-1 text-small text-foreground-soft">בדוק את פרטי הביצוע ואשר, או החזר לטיפול עם הערה (בדיאלוג אישור).</p>
          </div>
          <div className="flex gap-2">
            <Button intent="primary" className="flex-1" onClick={() => openConfirm("approve")}>
              בדוק ואשר
            </Button>
            <Button className="flex-1" onClick={() => openConfirm("reject")}>
              דחה
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ def, task, status }: { def: WorkflowDefinition; task: WorkflowInstance["task"]; status: WorkflowInstance["status"] }) {
  return (
    <div className="rounded-lg border border-line-strong bg-surface p-4 shadow-hairline">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-semibold text-foreground">{task.titleHe}</h3>
        <StatusChip status={status} />
      </div>
      <p className="mt-1.5 text-small text-foreground-soft">{task.detailHe}</p>
      <dl className="mt-3 space-y-2 border-t border-line-strong pt-3 text-caption">
        <Row label="אחראי" value={task.ownerNameHe ?? "—"} tight />
        <Row label="יעד" value={task.dueDateISO ? formatShortHe(task.dueDateISO) : "—"} tight />
        {def.fields.map((f) => (
          <Row key={f.key} label={f.labelHe} value={task.fields[f.key]?.trim() || "—"} tight />
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------- notify + audit */

function Notifications({ inst }: { inst: WorkflowInstance }) {
  return (
    <section className="border-t border-line-strong bg-surface-sunken/40 px-6 py-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-caption font-semibold text-foreground-soft">
        <BellGlyph size={14} /> התראות
      </h3>
      <ol className="space-y-2">
        {inst.notifications.map((n) => {
          const tone = n.tone === "success" ? "completed" : n.tone === "warn" ? "risk" : "scheduled";
          return (
            <li key={n.id} className="flex items-start gap-2.5">
              <span className={cx("mt-1 h-1.5 w-1.5 shrink-0 rounded-pill", DOT[tone as keyof typeof DOT])} />
              <div className="min-w-0 flex-1">
                <p className="text-caption text-foreground">
                  <span className="font-medium">{n.toHe}:</span> {n.titleHe}
                </p>
                {n.bodyHe && <p className="text-micro text-foreground-faint">{n.bodyHe}</p>}
              </div>
              <span className="shrink-0 text-micro tabular-nums text-foreground-faint">{timeHe(n.atISO)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AuditTrail({ inst }: { inst: WorkflowInstance }) {
  return (
    <section className="border-t border-line-strong bg-surface-sunken/50 px-6 py-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-caption font-semibold text-foreground-soft">
        <HistoryGlyph size={14} /> יומן ביקורת
      </h3>
      <ol className="space-y-2.5">
        {inst.audit.map((a) => {
          const Icon = AUDIT_ICON[a.kind] ?? HistoryGlyph;
          return (
            <li key={a.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-surface text-foreground-faint shadow-hairline">
                <Icon size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption text-foreground">
                  {a.summaryHe} <span className="text-foreground-faint">· {a.actorHe}</span>
                </p>
                {a.detailHe && <p className="text-micro text-foreground-faint">{a.detailHe}</p>}
              </div>
              <span className="shrink-0 text-micro tabular-nums text-foreground-faint">{timeHe(a.atISO)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ atoms */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-caption font-medium text-foreground-soft">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, tight }: { label: string; value: string; tight?: boolean }) {
  return (
    <div className={cx("flex gap-2", tight ? "" : "items-baseline")}>
      <dt className="w-20 shrink-0 text-foreground-faint">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground-soft">{value}</dd>
    </div>
  );
}
