"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_FOCUS, eventById, focusedMatter, type FocusRef } from "../focus";
import { ACTIVE_ROLE, ROLE_SECTIONS } from "../office";
import { ClientWaiting } from "./client-waiting";
import { ContextDock } from "./context-dock";
import { CourtUpdates } from "./court-updates";
import { DinoOffice } from "./dino-office";
import { DocumentShelf } from "./document-shelf";
import { FinanceStrip } from "./finance-strip";
import { LeadStrip } from "./lead-strip";
import { MatterBoard } from "./matter-board";
import { OfficeAttentionStrip } from "./office-attention";
import { TeamWorkload } from "./team-workload";
import { TodayFocus } from "./today-focus";

/**
 * The central workspace orchestrator — the live operational map of
 * the firm. One focus drives the transformation; the section order
 * follows the active office role (Partner mode today); modules
 * expand only when the day's scenario justifies it. Esc returns one
 * focus level.
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

  /* the role-ordered office sections (focus + attention always lead) */
  const SECTIONS: Record<string, ReactNode> = {
    matters: (
      <MatterBoard
        selectedId={dockMatter.id}
        onSelect={(id) => setFocus({ kind: "matter", id })}
      />
    ),
    team: <TeamWorkload />,
    clients: <ClientWaiting />,
    court: <CourtUpdates />,
    documents: <DocumentShelf />,
    leads: <LeadStrip />,
    finance: <FinanceStrip />,
    dino: <DinoOffice />,
  };
  const order = ROLE_SECTIONS[ACTIVE_ROLE].filter((key) => SECTIONS[key]);

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

      {/* ── the office attention strip — the health of the firm ── */}
      <div className="animate-rise mt-6" style={{ animationDelay: "120ms" }}>
        <OfficeAttentionStrip />
      </div>

      {/* ── the office, in the active role's priority order ── */}
      {order.map((key, i) => (
        <div
          key={key}
          id={key === "matters" ? "section-matters" : undefined}
          className="animate-rise mt-10 md:mt-12"
          style={{ animationDelay: `${180 + i * 60}ms` }}
        >
          {SECTIONS[key]}
        </div>
      ))}
    </div>
  );
}
