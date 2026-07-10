"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_FOCUS, eventById, focusedMatter, type FocusRef } from "../focus";
import { ContextDock } from "./context-dock";
import { DocumentShelf } from "./document-shelf";
import { FinanceStrip } from "./finance-strip";
import { IntelligenceDrawer } from "./intelligence-drawer";
import { MatterBoard } from "./matter-board";
import { TodayFocus } from "./today-focus";

/**
 * The central workspace orchestrator — one focus, one transformation.
 * Selecting a timeline event re-aims Today Focus; selecting a matter
 * re-aims the Context Dock; Esc returns to the day's default focus.
 * The page is an operating surface, not a document.
 */
export function TodayWorkspace({ dateLine }: { dateLine: ReactNode }) {
  const [focus, setFocus] = useState<FocusRef>(DEFAULT_FOCUS);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFocus(DEFAULT_FOCUS);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusedEvent =
    (focus.kind === "event" ? eventById(focus.id) : undefined) ??
    eventById(DEFAULT_FOCUS.id)!;
  const dockMatter = focusedMatter(focus) ?? focusedMatter(DEFAULT_FOCUS)!;
  const isDefault =
    focus.kind === DEFAULT_FOCUS.kind && focus.id === DEFAULT_FOCUS.id;

  return (
    <div>
      {/* ── the first viewport: the scene + its live context ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <TodayFocus
          dateLine={dateLine}
          focusedEvent={focusedEvent}
          onSelectEvent={(id) => setFocus({ kind: "event", id })}
          isDefault={isDefault}
        />

        {/* desktop: a docked floating layer beside the scene */}
        <ContextDock
          key={`dock-${dockMatter.id}`}
          matter={dockMatter}
          className="hidden xl:flex xl:sticky xl:top-24"
        />

        {/* smaller widths: the dock becomes a sheet-like expander */}
        <details className="group/dock xl:hidden">
          <summary
            className="living-edge surface-paper flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-3.5 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-pill bg-gold-500 shadow-gold-breath"
            />
            ההקשר הפעיל · {dockMatter.name}
            <span
              aria-hidden
              className="ms-auto text-foreground-faint transition-transform group-open/dock:rotate-90"
            >
              ‹
            </span>
          </summary>
          <ContextDock matter={dockMatter} className="mt-3" />
        </details>
      </div>

      {/* ── the work — the operations board ── */}
      <div className="animate-rise mt-12 md:mt-14" style={{ animationDelay: "160ms" }}>
        <MatterBoard
          selectedId={dockMatter.id}
          onSelect={(id) => setFocus({ kind: "matter", id })}
        />
      </div>

      {/* ── the documents — physical objects ── */}
      <div className="animate-rise mt-12 md:mt-14" style={{ animationDelay: "240ms" }}>
        <DocumentShelf />
      </div>

      {/* ── the business — one smart strip ── */}
      <div className="animate-rise mt-12 md:mt-14" style={{ animationDelay: "320ms" }}>
        <FinanceStrip />
      </div>

      {/* ── עמית in depth — on demand only ── */}
      <div className="animate-rise mt-6" style={{ animationDelay: "400ms" }}>
        <IntelligenceDrawer />
      </div>
    </div>
  );
}
