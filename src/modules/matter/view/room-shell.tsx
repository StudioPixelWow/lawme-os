"use client";

/**
 * Matter App — the room's client boundary (Sprint 1).
 * The single client wrapper that anchors the room to the open matter (from the
 * store) and carries the accessible label + the stable selection/test anchor
 * (`data-matter-id`) that later interactive sprints build on. Server-rendered
 * zones are passed through as children.
 */
import type { ReactNode } from "react";
import { useRoom } from "./room-store";

export function RoomShell({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  const { state } = useRoom();
  return (
    <section aria-label={ariaLabel} data-matter-id={state.matterId} data-matter-room="">
      {children}
    </section>
  );
}
