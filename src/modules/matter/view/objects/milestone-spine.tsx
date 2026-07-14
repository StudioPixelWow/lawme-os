"use client";

import { cx } from "@/design-system/utils/cx";
import type { SpineVM } from "../types";

type NodeKind = "past" | "current" | "next";
type OpenFn = (kind: string, param?: string | null) => void;

function SpineNode({
  label,
  kind,
  blocked,
  stageId,
  open,
}: {
  label: string | null;
  kind: NodeKind;
  blocked?: boolean;
  stageId: string | null;
  open?: OpenFn;
}) {
  const isCurrent = kind === "current";
  const caption = isCurrent ? "עכשיו" : kind === "past" ? "הושלם" : blocked ? "חסום" : "הבא";
  const captionClass = isCurrent ? "text-gold-600" : kind === "past" ? "text-status-completed" : blocked ? "text-status-urgent" : "text-foreground-faint";

  const inner = (
    <>
      <span className="relative flex h-7 items-center justify-center">
        {isCurrent ? (
          <>
            <span aria-hidden className="absolute h-7 w-7 rounded-pill bg-gold-400/20" />
            <span aria-hidden className="relative h-3.5 w-3.5 rounded-pill bg-gold-500 ring-4 ring-gold-300/40" />
          </>
        ) : (
          <span aria-hidden className={cx("h-3.5 w-3.5 rounded-pill", kind === "past" ? "bg-status-completed" : blocked ? "bg-status-urgent" : "bg-ink-300")} />
        )}
      </span>
      <span className="min-w-0">
        <span className={cx("block text-balance leading-tight", isCurrent ? "text-body font-semibold text-foreground" : "text-small text-foreground-soft")}>{label ?? "—"}</span>
        <span className={cx("mt-1.5 block text-caption font-medium", captionClass)}>{caption}</span>
      </span>
    </>
  );

  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      {open ? (
        <button
          type="button"
          data-spine-node
          onClick={() => open("milestone", stageId)}
          aria-label={`שלב: ${label ?? ""} (${caption}) — הצג פרטים`}
          className="flex min-w-0 flex-col items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-surface-sunken"
        >
          {inner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-col items-center gap-3 px-2 py-1">{inner}</div>
      )}
    </li>
  );
}

/**
 * The milestone spine (approved concept) — the legal journey in a card.
 * Every node opens its stage detail; the blocked-transition note drills to the
 * blocker. Roving arrow keys move between nodes.
 */
export function MilestoneSpine({ spine, open }: { spine: SpineVM; open?: OpenFn }) {
  function onKey(e: React.KeyboardEvent<HTMLOListElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-spine-node]"));
    const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    e.preventDefault();
    // RTL: ArrowRight moves to previous (visually right), ArrowLeft to next
    const delta = e.key === "ArrowLeft" ? 1 : -1;
    const next = nodes[(idx + delta + nodes.length) % nodes.length];
    next?.focus();
  }

  return (
    <section className="mt-6 rounded-xl border border-line-strong bg-surface p-6 shadow-lift" aria-label="מסלול ההליך">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="text-caption tabular-nums text-foreground-faint">{spine.stageNumberHe}</span>
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">מסלול ההליך</h2>
      </div>

      <div className="relative">
        <span aria-hidden className="absolute inset-x-[16.6%] top-3 -z-10 h-0.5 rounded-pill bg-gold-400/35" />
        <ol className="relative grid grid-cols-3" onKeyDown={onKey}>
          <SpineNode label={spine.prevHe} kind="past" stageId={spine.prevId} open={open} />
          <SpineNode label={spine.currentHe} kind="current" stageId={spine.currentId} open={open} />
          <SpineNode label={spine.nextHe} kind="next" blocked={spine.blocked} stageId={spine.nextId} open={open} />
        </ol>
      </div>

      {spine.blocked && spine.blockedReasonHe ? (
        <button
          type="button"
          onClick={open ? () => open("blocker") : undefined}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md py-1 text-caption text-status-urgent transition-colors hover:bg-status-urgent-wash/40"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-status-urgent" />
          {spine.blockedReasonHe} {open ? <span aria-hidden>‹</span> : null}
        </button>
      ) : null}
    </section>
  );
}
