"use client";

/**
 * Matter working surface — Documents lens (Capability 1, Slice A).
 *
 * The one Matter-scoped working surface, opened at ?panel=work&lens=documents
 * through the approved panel/URL grammar. Only one lens is active at a time;
 * Slice A ships the Documents lens (others are present but not yet built). The
 * surface is a right-anchored RTL drawer consistent with the existing panel
 * host: Esc closes, focus is trapped and restored, and every control performs a
 * real action against the server API. All persistence/authorization happens
 * server-side; this component only fetches and posts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { CheckGlyph, AlertGlyph } from "@/design-system/icons/glyphs";
import { useRoom } from "../room-store";
import { normalizeLens, WORK_LENSES, type WorkLens } from "./panel-state";
import {
  DOCUMENT_TYPE_HE, EVIDENCE_DECISION_HE, VERIFICATION_HE, SCAN_STATUS_HE,
  type EvidenceDocument,
} from "../../documents/types";

const LENS_HE: Record<WorkLens, string> = {
  documents: "מסמכים", evidence: "ראיות", tasks: "משימות",
  notes: "הערות", activity: "פעילות", research: "מחקר",
};

type LoadState =
  | { s: "loading" }
  | { s: "ready"; docs: EvidenceDocument[]; durable: boolean; mode: string }
  | { s: "error"; messageHe: string };

export function WorkSurface() {
  const { state, open, close } = useRoom();
  const matterId = state.matterId;
  const panel = state.panel;
  const active = panel?.kind === "work";
  const lens = normalizeLens(panel?.param);

  const ref = useRef<HTMLDivElement | null>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [load, setLoad] = useState<LoadState>({ s: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoad({ s: "loading" });
    try {
      const res = await fetch(`/api/matters/${matterId}/documents`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setLoad({ s: "ready", docs: json.documents ?? [], durable: Boolean(json.durable), mode: json.storageMode ?? "" });
    } catch {
      setLoad({ s: "error", messageHe: "טעינת המסמכים נכשלה. נסה שוב." });
    }
  }, [matterId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (active && lens === "documents") void refresh();
  }, [active, lens, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* focus management */
  useEffect(() => {
    if (active) {
      restore.current = document.activeElement as HTMLElement;
      ref.current?.focus();
    } else if (restore.current) {
      restore.current.focus();
      restore.current = null;
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, close]);

  if (!active) return null;

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", file.name);
      const res = await fetch(`/api/matters/${matterId}/documents`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.messageHe || "ההעלאה נכשלה. בדוק סוג וגודל הקובץ.");
      } else if (json.durable === false) {
        setNotice("הקובץ אומת ונשמר לתצוגה, אך אחסון קבוע אינו מוגדר בסביבה זו.");
      } else {
        setNotice("המסמך נשמר.");
      }
      await refresh();
    } catch {
      setNotice("ההעלאה נכשלה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-start" role="dialog" aria-modal="true" aria-label="משטח עבודה — מסמכים" dir="rtl">
      <button type="button" aria-label="סגור" onClick={close} className="absolute inset-0 bg-ink-950/50" />
      <div
        ref={ref}
        tabIndex={-1}
        data-work-surface
        className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-surface shadow-raised outline-none sm:w-[34rem]"
      >
        <header className="border-b border-line-strong px-5 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-subheading font-semibold text-foreground">משטח עבודה</h2>
            <button type="button" onClick={close} className="rounded-sm px-2 py-1 text-caption text-foreground-faint hover:text-foreground" aria-label="סגור">סגור ✕</button>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto pb-2" aria-label="עדשות עבודה">
            {WORK_LENSES.map((l) => {
              const on = l === lens;
              const ready = l === "documents";
              return (
                <button
                  key={l}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  disabled={!ready}
                  onClick={() => open("work", l)}
                  className={cx(
                    "shrink-0 rounded-full px-3 py-1 text-caption transition-colors",
                    on ? "bg-ink-900 text-surface" : ready ? "bg-surface-sunken text-foreground-soft hover:bg-surface-sunken/70" : "cursor-not-allowed text-foreground-faint/60",
                  )}
                  title={ready ? undefined : "בקרוב"}
                >
                  {LENS_HE[l]}{!ready ? " ·" : ""}
                </button>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lens !== "documents" ? (
            <p className="mt-8 text-center text-small text-foreground-faint">עדשה זו תיבנה בפרוסה הבאה.</p>
          ) : (
            <DocumentsLens load={load} busy={busy} notice={notice} onUpload={onUpload} onRetry={refresh} />
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentsLens({
  load, busy, notice, onUpload, onRetry,
}: {
  load: LoadState; busy: boolean; notice: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRetry: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-caption text-foreground-faint">
          {load.s === "ready" ? `${load.docs.length} מסמכים${load.durable ? "" : " · לא קבוע"}` : " "}
        </p>
        <label className={cx("inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-ink-900 px-3 py-1.5 text-caption text-surface", busy && "opacity-60")}>
          {busy ? "מעלה…" : "העלה מסמך"}
          <input type="file" className="sr-only" onChange={onUpload} disabled={busy}
            accept="application/pdf,image/png,image/jpeg,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        </label>
      </div>

      {notice && (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-line-strong bg-surface-sunken/50 p-2.5 text-caption text-foreground-soft">
          <CheckGlyph size={13} className="mt-0.5 shrink-0 text-status-completed" /> {notice}
        </p>
      )}

      {load.s === "loading" && <p className="mt-8 text-center text-small text-foreground-faint">טוען…</p>}

      {load.s === "error" && (
        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-small text-status-risk"><AlertGlyph size={14} /> {load.messageHe}</p>
          <Button className="mt-3" onClick={onRetry}>נסה שוב</Button>
        </div>
      )}

      {load.s === "ready" && load.docs.length === 0 && (
        <p className="mt-8 text-center text-small text-foreground-faint">אין עדיין מסמכים בתיק. העלה את הראשון.</p>
      )}

      {load.s === "ready" && load.docs.length > 0 && (
        <ul className="space-y-2">
          {load.docs.map((d) => <DocumentRow key={d.id} doc={d} />)}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({ doc }: { doc: EvidenceDocument }) {
  return (
    <li className="rounded-lg border border-line-strong bg-surface-sunken/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-small font-medium text-foreground">{doc.title}</p>
          <p className="mt-0.5 text-micro text-foreground-faint">
            {DOCUMENT_TYPE_HE[doc.documentType]} · v{doc.version} · {doc.uploadedByHe}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-micro text-foreground-soft">
          {VERIFICATION_HE[doc.verificationState]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-micro text-foreground-faint">
        <Chip>{SCAN_STATUS_HE[doc.scanStatus]}</Chip>
        {doc.evidenceDecision ? <Chip>{EVIDENCE_DECISION_HE[doc.evidenceDecision]}</Chip> : null}
        <Chip>{doc.approvalState}</Chip>
      </div>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line-strong px-2 py-0.5">{children}</span>;
}
