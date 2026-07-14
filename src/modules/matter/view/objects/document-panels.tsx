"use client";

/**
 * Document→Evidence panels (Sprint 3, Slice 1).
 * The document-specific bodies the generic Workflow Drawer renders when a
 * definition is uiKind:"document" — upload (drag/drop + picker + progress +
 * validation), preview, typed metadata, linkage, and the reviewer's evidentiary
 * decision. All lifecycle stays in the engine; these are presentation only.
 */
import { useRef, useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { DocumentGlyph, EvidenceGlyph, CheckGlyph, AlertGlyph, CloseGlyph, ShieldGlyph, UserGlyph } from "@/design-system/icons/glyphs";
import { useRoom } from "../room-store";
import {
  DOCUMENT_TYPE_HE,
  EVIDENCE_TYPE_HE,
  SOURCE_TYPE_HE,
  CONFIDENTIALITY_HE,
  EVIDENCE_DECISION_HE,
  SCAN_STATUS_HE,
  type EvidenceDecision,
} from "../../documents/types";
import { validateUpload, MAX_SIZE_BYTES } from "../../documents/validation";
import { whyNotConfirmedHe } from "../../documents/evidence-decision";
import { wouldConfirmFact } from "../../workflow/document-evidence";
import type { WorkflowTask } from "../../workflow/engine";

const inputCx =
  "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-small text-foreground outline-none transition-colors focus:border-ink-500";

function setField(dispatch: ReturnType<typeof useRoom>["dispatch"], key: string, value: string) {
  dispatch({ type: "wf", event: { type: "update-fields", patch: { fields: { [key]: value } } } });
}

/* ------------------------------------------------------------- upload zone */

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function UploadZone() {
  const { state, dispatch } = useRoom();
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setErrors([]);
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const v = validateUpload({ filename: file.name, declaredMime: file.type, size: file.size, head });
    if (!v.ok) {
      setErrors(v.issues.map((i) => i.messageHe));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `/api/matters/${state.matterId}/documents`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      xhrRef.current = null;
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const r = JSON.parse(xhr.responseText);
        dispatch({
          type: "wf",
          event: {
            type: "update-fields",
            patch: {
              titleHe: state.instance?.task.titleHe ?? "",
              fields: {
                storageRef: r.ref,
                hash: r.hash,
                filename: r.filename,
                mime: r.mimeType,
                size: String(r.size),
                scanStatus: r.scanStatus,
                previewUrl,
                serverPreviewUrl: r.previewUrl,
                title: r.filename.replace(/\.[a-z0-9]+$/i, ""),
              },
            },
          },
        });
      } else {
        try {
          const r = JSON.parse(xhr.responseText);
          setErrors((r.issues ?? []).map((i: { messageHe: string }) => i.messageHe).concat(r.messageHe ? [r.messageHe] : []));
        } catch {
          setErrors(["ההעלאה נכשלה. נסה שוב."]);
        }
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setProgress(null);
      setErrors(["שגיאת רשת בהעלאה."]);
    };
    setProgress(0);
    xhr.send(form);
  }

  function cancel() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setProgress(null);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="אזור העלאת מסמך — גרירה או בחירת קובץ"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-gold-400 bg-status-today-wash/40" : "border-line-strong bg-surface-sunken/40 hover:border-ink-400",
        )}
      >
        <span className="grid h-11 w-11 place-items-center rounded-pill bg-surface text-foreground-soft shadow-hairline">
          <DocumentGlyph size={20} />
        </span>
        <p className="text-small font-medium text-foreground">גרור לכאן מסמך או לחץ לבחירה</p>
        <p className="text-caption text-foreground-faint">PDF · DOCX · PNG · JPG · עד {Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {progress !== null && (
        <div className="rounded-lg border border-line-strong bg-surface p-3" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-caption text-foreground-soft">
            <span>מעלה… {progress}%</span>
            <button type="button" onClick={cancel} className="text-status-risk hover:underline">
              ביטול
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-sunken">
            <div className="h-full rounded-pill bg-ink-900 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-status-risk/30 bg-status-risk-wash/40 p-3" role="alert">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-caption text-status-risk">
              <AlertGlyph size={13} className="mt-0.5 shrink-0" /> {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- preview */

function Preview({ task }: { task: WorkflowTask }) {
  const url = task.fields.previewUrl;
  const mime = task.fields.mime;
  if (!url) return null;
  if (mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset
    return <img src={url} alt="תצוגה מקדימה של המסמך" className="max-h-56 w-full rounded-lg border border-line-strong object-contain bg-surface-sunken" />;
  }
  if (mime === "application/pdf") {
    return <iframe title="תצוגה מקדימה" src={url} className="h-56 w-full rounded-lg border border-line-strong bg-surface-sunken" />;
  }
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line-strong bg-surface-sunken/60 p-3 text-small text-foreground-soft">
      <DocumentGlyph size={18} /> {task.fields.filename} — אין תצוגה מקדימה מוטמעת לסוג זה.
    </div>
  );
}

/* ------------------------------------------------------------ metadata */

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-caption font-medium text-foreground-soft">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCx}>
        {options.map(([k, he]) => (
          <option key={k} value={k}>
            {he}
          </option>
        ))}
      </select>
    </label>
  );
}

function LinkChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-pill bg-surface-sunken px-2.5 py-1 text-caption text-foreground-soft shadow-hairline">
      <span className="text-foreground-faint">{label}:</span> {value}
    </div>
  );
}

export function DevStorageNote() {
  return (
    <p className="rounded-lg border border-status-waiting/30 bg-status-waiting-wash/40 px-3 py-2 text-caption text-foreground-soft" role="note">
      אחסון פיתוח בלבד (Preview) — הקבצים נשמרים בזיכרון התהליך ואינם אחסון קבוע/פרודקשן.
    </p>
  );
}

export function DocumentDraft() {
  const { state, dispatch } = useRoom();
  const inst = state.instance!;
  const task = inst.task;
  const reviewerOpts = findReviewerOptions(state);
  const uploaded = (task.fields.storageRef ?? "").length > 0;

  if (!uploaded) {
    return (
      <div className="space-y-4">
        <p className="text-small leading-relaxed text-foreground-soft">
          העלה את המסמך המעיד על ידיעת המעסיק על ההיריון. הקובץ ייבדק, יקושר לדרישת הראיה, וייבדק על ידי מאשר לפני עדכון התיק.
        </p>
        <DevStorageNote />
        <UploadZone />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-caption text-status-completed">
          <ShieldGlyph size={13} /> {SCAN_STATUS_HE[(task.fields.scanStatus || "scan_pending") as keyof typeof SCAN_STATUS_HE]}
        </div>
        <button
          type="button"
          onClick={() => {
            if (task.fields.previewUrl) URL.revokeObjectURL(task.fields.previewUrl);
            for (const k of ["storageRef", "hash", "filename", "mime", "size", "scanStatus", "previewUrl", "serverPreviewUrl"]) setField(dispatch, k, "");
          }}
          className="inline-flex items-center gap-1 text-caption text-foreground-faint transition-colors hover:text-status-risk"
        >
          <CloseGlyph size={12} /> הסר מסמך
        </button>
      </div>

      <Preview task={task} />
      <p className="text-caption text-foreground-faint" dir="ltr">
        {task.fields.filename} · {humanSize(Number(task.fields.size || 0))} · sha256 {task.fields.hash.slice(0, 12)}…
      </p>

      <div className="space-y-3 border-t border-line-strong pt-4">
        <label className="block">
          <span className="mb-1.5 block text-caption font-medium text-foreground-soft">כותרת המסמך</span>
          <input value={task.fields.title} onChange={(e) => setField(dispatch, "title", e.target.value)} className={inputCx} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Select label="סוג מסמך" value={task.fields.docType} onChange={(v) => setField(dispatch, "docType", v)} options={Object.entries(DOCUMENT_TYPE_HE)} />
          <Select label="סוג ראיה" value={task.fields.evidenceType} onChange={(v) => setField(dispatch, "evidenceType", v)} options={Object.entries(EVIDENCE_TYPE_HE)} />
          <Select label="מקור" value={task.fields.sourceType} onChange={(v) => setField(dispatch, "sourceType", v)} options={Object.entries(SOURCE_TYPE_HE)} />
          <Select label="חיסיון" value={task.fields.confidentiality} onChange={(v) => setField(dispatch, "confidentiality", v)} options={Object.entries(CONFIDENTIALITY_HE)} />
          <label className="block">
            <span className="mb-1.5 block text-caption font-medium text-foreground-soft">תאריך המסמך</span>
            <input type="date" value={task.fields.docDate} onChange={(e) => setField(dispatch, "docDate", e.target.value)} className={inputCx} />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-line-strong bg-surface-sunken/50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-foreground-soft">
          <EvidenceGlyph size={13} /> קישורים
        </p>
        <div className="flex flex-wrap gap-1.5">
          <LinkChip label="תיק" value="כהן נ׳ טק־לייף" />
          <LinkChip label="דרישת ראיה" value="ראיה לידיעת המעסיק" />
          <LinkChip label="סוגיה" value="ידיעת המעסיק על ההיריון" />
          <LinkChip label="שלב" value="אימות עובדות מכריעות" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line-strong pt-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-caption font-medium text-foreground-soft">
            <UserGlyph size={12} /> מאשר
          </span>
          <select
            value={task.ownerId ?? ""}
            onChange={(e) => {
              const opt = reviewerOpts.find((o) => o.id === e.target.value) ?? null;
              dispatch({ type: "wf", event: { type: "update-fields", patch: { ownerId: opt?.id ?? null, ownerNameHe: opt?.nameHe ?? null } } });
            }}
            className={inputCx}
          >
            <option value="" disabled>
              בחר מאשר…
            </option>
            {reviewerOpts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nameHe} · {o.roleHe}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-caption font-medium text-foreground-soft">יעד לבדיקה</span>
          <input
            type="date"
            value={task.dueDateISO ?? ""}
            min={state.matter.asOf}
            onChange={(e) => dispatch({ type: "wf", event: { type: "update-fields", patch: { dueDateISO: e.target.value || null } } })}
            className={inputCx}
          />
        </label>
      </div>

      <Button
        intent="primary"
        className="w-full"
        disabled={!task.ownerId || !task.dueDateISO}
        onClick={() => dispatch({ type: "wf", event: { type: "execute" } })}
      >
        קשר כראיה והתחל בדיקה
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------- review */

const DECISIONS: EvidenceDecision[] = ["supports", "contradicts", "inconclusive", "authenticity_uncertain", "incomplete"];

export function DocumentReview() {
  const { state, dispatch, openConfirm } = useRoom();
  const inst = state.instance!;
  const task = inst.task;
  const decision = (task.fields.decision || "") as EvidenceDecision | "";
  const willConfirm = wouldConfirmFact(task);
  const whyNot = decision
    ? whyNotConfirmedHe({ decision, scanStatus: (task.fields.scanStatus || "scan_pending") as never, hasConflictingEvidence: false, hasProvenance: (task.fields.sourceType ?? "").length > 0 })
    : null;

  return (
    <div className="space-y-4">
      <DocumentSummary />
      <DevStorageNote />

      <div>
        <p className="mb-2 text-caption font-semibold text-foreground-soft">קביעת המאשר — הערך הראייתי</p>
        <div className="space-y-1.5">
          {DECISIONS.map((d) => (
            <label
              key={d}
              className={cx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-small transition-colors",
                decision === d ? "border-ink-500 bg-surface-sunken" : "border-line-strong hover:bg-surface-sunken/50",
              )}
            >
              <input type="radio" name="decision" checked={decision === d} onChange={() => setField(dispatch, "decision", d)} className="h-4 w-4 accent-ink-900" />
              <span className="text-foreground">{EVIDENCE_DECISION_HE[d]}</span>
            </label>
          ))}
        </div>
      </div>

      {decision && (
        <div
          className={cx(
            "rounded-lg border p-3.5 text-small",
            willConfirm ? "border-status-completed/30 bg-status-completed-wash/50 text-foreground-soft" : "border-status-today/30 bg-status-today-wash/40 text-foreground-soft",
          )}
        >
          {willConfirm ? (
            <p className="flex items-start gap-1.5">
              <CheckGlyph size={14} className="mt-0.5 shrink-0 text-status-completed" /> אישור יאמת את העובדה, יסיר את החסם, ויחשב מחדש את התיק.
            </p>
          ) : (
            <p className="flex items-start gap-1.5">
              <AlertGlyph size={14} className="mt-0.5 shrink-0 text-status-today" /> {whyNot} התיק לא ישתפר.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button intent="primary" className="flex-1" disabled={!decision} onClick={() => openConfirm("approve")}>
          בדוק ואשר
        </Button>
        <Button className="flex-1" onClick={() => openConfirm("reject")}>
          דחה
        </Button>
      </div>
    </div>
  );
}

export function DocumentSummary() {
  const { state } = useRoom();
  const task = state.instance!.task;
  return (
    <div className="rounded-lg border border-line-strong bg-surface p-3.5 shadow-hairline">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-foreground-soft">
          <DocumentGlyph size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-small font-medium text-foreground">{task.fields.title || task.fields.filename}</p>
          <p className="truncate text-caption text-foreground-faint">
            {DOCUMENT_TYPE_HE[(task.fields.docType || "correspondence") as keyof typeof DOCUMENT_TYPE_HE]} · {SOURCE_TYPE_HE[(task.fields.sourceType || "client") as keyof typeof SOURCE_TYPE_HE]} · {SCAN_STATUS_HE[(task.fields.scanStatus || "scan_pending") as keyof typeof SCAN_STATUS_HE]}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ util */

function findReviewerOptions(state: ReturnType<typeof useRoom>["state"]) {
  // reviewers = partner + senior lawyer (approver roles)
  return state.matter.team
    .filter((m) => m.role === "partner" || m.role === "senior_lawyer")
    .map((m) => ({ id: m.id, nameHe: m.nameHe, roleHe: m.role === "partner" ? "שותף" : "עו״ד בכיר" }));
}
