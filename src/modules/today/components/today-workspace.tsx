"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AIMark } from "@/design-system/primitives/indicators";
import { DEFAULT_FOCUS, eventById, focusedMatter, type FocusRef } from "../focus";
import { DinoOffice } from "./dino-office";
import { MatterBoard } from "./matter-board";
import { OfficeAttentionStrip } from "./office-attention";
import { TodayFocus } from "./today-focus";
import { WorkspaceLaunchers } from "./workspace-launchers";

/**
 * The Morning Workspace — the approved V10 composition. A small
 * number of large product objects: the Today Focus briefing, one
 * office attention strip, the mixed Active Matters composition, the
 * workspace launchers, and דינו's compact intelligence footer.
 * Everything else lives in the rails, drawers and dedicated
 * workspaces. One focus state; Esc returns to the day's default.
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
  const selectedMatter = focusedMatter(focus) ?? focusedMatter(DEFAULT_FOCUS)!;
  const isDefault =
    focus.kind === DEFAULT_FOCUS.kind && focus.id === DEFAULT_FOCUS.id;

  return (
    <div>
      {/* 1 · the briefing */}
      <TodayFocus
        dateLine={dateLine}
        focusedEvent={focusedEvent}
        onSelectEvent={(id) => setFocus({ kind: "event", id })}
        isDefault={isDefault}
      />

      {/* 2 · the office attention strip */}
      <div className="animate-rise mt-8" style={{ animationDelay: "120ms" }}>
        <OfficeAttentionStrip />
      </div>

      {/* 3 · the work */}
      <div className="animate-rise mt-10 md:mt-12" style={{ animationDelay: "200ms" }}>
        <MatterBoard
          selectedId={selectedMatter.id}
          onSelect={(id) => setFocus({ kind: "matter", id })}
        />
      </div>

      {/* 4 · the doors to the dedicated workspaces */}
      <div className="animate-rise mt-10 md:mt-12" style={{ animationDelay: "280ms" }}>
        <WorkspaceLaunchers />
      </div>

      {/* 5 · דינו — the compact intelligence footer */}
      <div className="animate-rise mt-10 md:mt-12" style={{ animationDelay: "360ms" }}>
        <DinoOffice />
        <p className="mt-4 flex items-center justify-center gap-2 text-micro text-foreground-faint">
          <AIMark />
          דינו תמיד לצידך — אינטליגנציה משפטית ומשרדית
        </p>
      </div>
    </div>
  );
}
