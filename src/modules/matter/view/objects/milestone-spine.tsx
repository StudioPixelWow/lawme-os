import { cx } from "@/design-system/utils/cx";
import type { SpineVM } from "../types";

type NodeKind = "past" | "current" | "next";

function SpineNode({
  label,
  kind,
  blocked,
}: {
  label: string | null;
  kind: NodeKind;
  blocked?: boolean;
}) {
  const isCurrent = kind === "current";
  const caption = isCurrent ? "עכשיו" : kind === "past" ? "הושלם" : blocked ? "חסום" : "הבא";
  const captionClass = isCurrent
    ? "text-gold-600"
    : kind === "past"
      ? "text-status-completed"
      : blocked
        ? "text-status-urgent"
        : "text-foreground-faint";
  return (
    <li className="flex min-w-0 flex-col items-center gap-3 px-2 text-center">
      <span className="relative flex h-7 items-center justify-center">
        {isCurrent ? (
          <>
            <span aria-hidden className="absolute h-7 w-7 rounded-pill bg-gold-400/20" />
            <span aria-hidden className="relative h-3.5 w-3.5 rounded-pill bg-gold-500 ring-4 ring-gold-300/40" />
          </>
        ) : (
          <span
            aria-hidden
            className={cx(
              "h-3.5 w-3.5 rounded-pill",
              kind === "past" ? "bg-status-completed" : blocked ? "bg-status-urgent" : "bg-ink-300",
            )}
          />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cx(
            "block text-balance leading-tight",
            isCurrent ? "text-body font-semibold text-foreground" : "text-small text-foreground-soft",
          )}
        >
          {label ?? "—"}
        </span>
        <span className={cx("mt-1.5 block text-caption font-medium", captionClass)}>{caption}</span>
      </span>
    </li>
  );
}

/**
 * The milestone spine (approved concept) — the legal journey in a card.
 * The path threads from the completed stage (start) through the gold "now" to
 * the blocked next stage, with the blocked-transition note beneath.
 */
export function MilestoneSpine({ spine }: { spine: SpineVM }) {
  return (
    <section className="mt-6 rounded-xl border border-line-strong bg-surface p-6 shadow-lift" aria-label="מסלול ההליך">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="text-caption tabular-nums text-foreground-faint">{spine.stageNumberHe}</span>
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
          מסלול ההליך
        </h2>
      </div>

      <div className="relative">
        <span aria-hidden className="absolute inset-x-[16.6%] top-3 -z-10 h-0.5 rounded-pill bg-gold-400/35" />
        <ol className="relative grid grid-cols-3">
          <SpineNode label={spine.prevHe} kind="past" />
          <SpineNode label={spine.currentHe} kind="current" />
          <SpineNode label={spine.nextHe} kind="next" blocked={spine.blocked} />
        </ol>
      </div>

      {spine.blocked && spine.blockedReasonHe ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-caption text-status-urgent">
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-status-urgent" />
          {spine.blockedReasonHe}
        </p>
      ) : null}
    </section>
  );
}
