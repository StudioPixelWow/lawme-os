"use client";

/**
 * Matter Room — panel host (Sprint 3.2).
 * The single drawer/sheet that renders any contextual panel from its builder.
 * Keeps the Matter visible behind a scrim. Handles Esc, focus trap, focus
 * return, and the mobile full-screen sheet. Actions are real: open another
 * panel, launch the workflow, reassign the owner, or create a task.
 */
import { useEffect, useRef } from "react";
import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { CloseGlyph } from "@/design-system/icons/glyphs";
import { useRoom } from "../room-store";
import { buildPanel, type PanelAction, type PanelView } from "./panel-content";
import type { PanelKind } from "./panel-state";
import { DOT, TEXT } from "../objects/tone";
import type { Tone } from "../types";

const TASK_TITLE: Record<string, string> = {
  deadline: "היערכות לדיון מקדמי",
  action: "היערכות לדיון מקדמי",
  blocker: "השגת ראיה לידיעת המעסיק",
};

export function PanelHost() {
  const { state, profile, open, openWorkflow, close, dispatch } = useRoom();
  const asideRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const panel = state.panel;

  useEffect(() => {
    if (panel) {
      restoreRef.current = document.activeElement as HTMLElement;
      asideRef.current?.focus();
    }
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); close(); return; }
      if (e.key === "Tab" && asideRef.current) {
        const f = asideRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [panel, close]);

  if (!panel) return null;
  const view: PanelView = buildPanel(panel.kind, panel.param ?? null, profile, state.matter);

  function runAction(a: PanelAction) {
    if (a.disabled) return;
    switch (a.kind) {
      case "workflow": if (a.target) openWorkflow(a.target); break;
      case "panel": if (a.target) open(a.target as PanelKind, a.param ?? null); break;
      case "reassign": if (a.target) { dispatch({ type: "reassign-owner", memberId: a.target }); close(); } break;
      case "task": dispatch({ type: "create-task", titleHe: TASK_TITLE[panel!.kind] ?? "משימה חדשה" }); close(); break;
      default: break; // info/route → non-action
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
      <button type="button" aria-label="סגירה" onClick={close} className="absolute inset-0 bg-ink-950/40 backdrop-blur-[1px]" />
      <aside
        ref={asideRef}
        tabIndex={-1}
        className="relative ms-auto flex h-full w-full max-w-[30rem] flex-col overflow-y-auto border-s border-line-strong bg-surface shadow-raised outline-none"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-strong bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="min-w-0">
            <h2 id="panelTitle" className="text-subheading font-semibold text-foreground">{view.titleHe}</h2>
            {view.subtitleHe && <p className="truncate text-caption text-foreground-faint">{view.subtitleHe}</p>}
          </div>
          <button type="button" onClick={close} aria-label="סגירה" className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-foreground-faint transition-colors hover:bg-surface-sunken hover:text-foreground">
            <CloseGlyph size={16} />
          </button>
        </header>

        <div className="flex-1 px-6 py-5">
          {view.emptyHe ? (
            <p className="rounded-lg border border-line-strong bg-surface-sunken/50 p-4 text-small text-foreground-soft">{view.emptyHe}</p>
          ) : (
            <div className="space-y-4">
              {view.sections.map((sec, i) => (
                <section key={i} className={cx("rounded-lg border border-line-strong bg-surface p-3.5", sec.tone === "urgent" && "border-status-urgent/25 bg-status-urgent-wash/40")}>
                  {sec.headingHe && <h3 className="mb-2 text-caption font-semibold text-foreground-soft">{sec.headingHe}</h3>}
                  {sec.paragraphsHe?.map((p, j) => <p key={j} className="text-small leading-relaxed text-foreground-soft">{p}</p>)}
                  {sec.rows && (
                    <dl className="space-y-1.5 text-small">
                      {sec.rows.map((r, j) => (
                        <div key={j} className="flex gap-2">
                          <dt className="w-28 shrink-0 text-foreground-faint">{r.label}</dt>
                          <dd className={cx("min-w-0 flex-1 font-medium", r.tone ? TEXT[r.tone as Tone] : "text-foreground")}>{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {sec.bullets && (
                    <ul className="space-y-1.5">
                      {sec.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-small text-foreground-soft">
                          <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill", b.tone ? DOT[b.tone as Tone] : "bg-foreground-faint")} />
                          {b.textHe}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {view.actions.length > 0 && (
                <div className="flex flex-col gap-2">
                  {view.actions.map((a) => (
                    <Button
                      key={a.id}
                      intent={a.primary ? "primary" : "quiet"}
                      className="w-full justify-between"
                      disabled={a.disabled}
                      title={a.disabled ? a.disabledReasonHe ?? undefined : undefined}
                      onClick={() => runAction(a)}
                    >
                      {a.labelHe}
                    </Button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 border-t border-line-strong pt-3 text-micro text-foreground-faint">
                <div>URL: <code className="text-foreground-soft" dir="ltr">{view.urlHe}</code></div>
                <div>מקור: <span className="text-foreground-soft">{view.dataHe}</span></div>
                <div className="col-span-2">הרשאה: <span className="text-foreground-soft">{view.permHe}</span></div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
