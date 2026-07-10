"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function clientSnapshot(): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * The live date line — a client-only value (server renders a
 * placeholder), so statically prerendered pages still greet
 * with today's actual date.
 */
export function TodayDate() {
  const label = useSyncExternalStore(
    emptySubscribe,
    clientSnapshot,
    () => null,
  );

  if (!label) {
    return (
      <span className="invisible" aria-hidden>
        יום ראשון, 1 בינואר 2026
      </span>
    );
  }

  return <span>{label}</span>;
}
