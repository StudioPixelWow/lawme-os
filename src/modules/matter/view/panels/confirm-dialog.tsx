"use client";

/**
 * Matter Room — confirmation dialog (Sprint 3.2 + final correction).
 * The one modal surface for materially-consequential decisions: reject, reopen,
 * and APPROVE. Approval is a full sourced review with stale-state/version guards
 * before it runs the unchanged Workflow Engine approve transition. Focus-trapped,
 * Esc cancels, URL-backed (?confirm=…), full-screen on mobile.
 */
import { useEffect, useRef, useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { AlertGlyph, CheckGlyph } from "@/design-system/icons/glyphs";
import { useRoom } from "../room-store";
import { TEXT } from "../objects/tone";
import type { Tone } from "../types";
import { approvalPreconditions, approvalVersion, isStale, buildApprovalReview } from "../../workflow/approval-guard";

const SIMPLE: Record<string, { titleHe: string; bodyHe: string; confirmHe: string; danger?: boolean; reason?: boolean }> = {
  reject: { titleHe: "דחיית הבדיקה", bodyHe: "הדחייה תשאיר את החסם פתוח והתיק לא ישתפר. נמק את הדחייה:", confirmHe: "דחה", reason: true },
  reopen: { titleHe: "פתיחה מחדש", bodyHe: "פתיחה מחדש תבטל את החישוב שנגזר מההשלמה — החסם יחזור עד להשלמה מאושרת. להמשיך?", confirmHe: "פתח מחדש", danger: true },
};

export function ConfirmDialog() {
  const { state, dispatch, closeConfirm } = useRoom();
  const kind = state.confirm;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const openedVersion = useRef<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const restore = useRef<HTMLElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (kind) {
      restore.current = document.activeElement as HTMLElement;
      setError(null);
      setSubmitting(false);
      openedVersion.current = kind === "approve" && state.instance ? approvalVersion(state.instance) : null;
      ref.current?.focus();
    } else if (restore.current) {
      restore.current.focus();
    }
  }, [kind]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!kind) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); closeConfirm(); return; }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [kind, closeConfirm]);

  if (!kind) return null;

  /* ---------- APPROVE: rich review + guards ---------- */
  if (kind === "approve") {
    const inst = state.instance;
    if (!inst) return null;
    const review = buildApprovalReview(inst, state.matter);

    function confirmApprove() {
      if (submitting) return; // idempotent: no double submission
      const pre = approvalPreconditions(inst!, state.matter);
      if (!pre.ok) { setError(pre.reasonHe); return; }
      if (openedVersion.current && isStale(openedVersion.current, approvalVersion(inst!))) {
        setError("מצב התיק השתנה מאז פתיחת הדיאלוג — רענן ובדוק שוב לפני אישור. שום שינוי לא הוחל.");
        return;
      }
      setSubmitting(true);
      dispatch({ type: "wf", event: { type: "approve" } }); // existing engine transition
      closeConfirm();
    }

    return (
      <Shell labelledby="confirmTitle" onCancel={closeConfirm} innerRef={ref} wide>
        <h2 id="confirmTitle" className="text-subheading font-semibold text-foreground">{review.actionHe}</h2>
        <p className="mt-1 text-caption text-foreground-faint">מאשר: {review.approverHe}</p>

        <dl className="mt-3 space-y-1.5 rounded-lg border border-line-strong bg-surface-sunken/50 p-3 text-small">
          {review.rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <dt className="w-32 shrink-0 text-foreground-faint">{r.label}</dt>
              <dd className={cx("min-w-0 flex-1 font-medium", r.tone ? TEXT[r.tone as Tone] : "text-foreground")}>{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className={cx("mt-3 rounded-lg border p-3", review.willConfirmFact ? "border-status-completed/30 bg-status-completed-wash/40" : "border-status-waiting/30 bg-status-waiting-wash/40")}>
          <p className="mb-1.5 text-caption font-semibold text-foreground-soft">השפעות צפויות על התיק</p>
          <ul className="space-y-1">
            {review.effectsHe.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-caption text-foreground-soft">
                <CheckGlyph size={12} className={cx("mt-0.5 shrink-0", review.willConfirmFact ? "text-status-completed" : "text-foreground-faint")} /> {e}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-2 text-micro text-foreground-faint">{review.provenanceHe}</p>
        <p className="mt-2 flex items-start gap-1.5 text-caption text-status-today">
          <AlertGlyph size={13} className="mt-0.5 shrink-0" /> {review.warningHe}
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-status-risk/30 bg-status-risk-wash/50 p-3 text-small text-status-risk">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button intent="primary" className="flex-1" disabled={submitting} onClick={confirmApprove}>אשר את הבדיקה</Button>
          <Button className="flex-1" onClick={closeConfirm}>ביטול</Button>
        </div>
      </Shell>
    );
  }

  /* ---------- REJECT / REOPEN: simple confirm ---------- */
  const c = SIMPLE[kind];
  function confirmSimple() {
    if (kind === "reject") dispatch({ type: "wf", event: { type: "reject", reasonHe: reason.trim() || "הראיה אינה מספקת לאישור" } });
    else if (kind === "reopen") dispatch({ type: "wf", event: { type: "reopen" } });
    setReason("");
    closeConfirm();
  }

  return (
    <Shell labelledby="confirmTitle" onCancel={closeConfirm} innerRef={ref}>
      <h2 id="confirmTitle" className="text-subheading font-semibold text-foreground">{c.titleHe}</h2>
      <p className="mt-2 text-small leading-relaxed text-foreground-soft">{c.bodyHe}</p>
      {c.reason && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="נימוק הדחייה" className="mt-3 w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-small text-foreground outline-none focus:border-ink-500" />
      )}
      <div className="mt-4 flex gap-2">
        <Button intent="primary" className={c.danger ? "flex-1 bg-status-risk hover:bg-status-risk/90" : "flex-1"} onClick={confirmSimple}>{c.confirmHe}</Button>
        <Button className="flex-1" onClick={closeConfirm}>ביטול</Button>
      </div>
    </Shell>
  );
}

function Shell({ children, onCancel, innerRef, labelledby, wide }: { children: React.ReactNode; onCancel: () => void; innerRef: React.RefObject<HTMLDivElement | null>; labelledby: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby={labelledby}>
      <button type="button" aria-label="ביטול" onClick={onCancel} className="absolute inset-0 bg-ink-950/50" />
      <div
        ref={innerRef}
        tabIndex={-1}
        className={cx(
          "relative flex w-full flex-col overflow-y-auto bg-surface p-5 shadow-raised outline-none",
          "h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border sm:border-line-strong",
          wide ? "sm:max-w-lg" : "sm:max-w-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}
