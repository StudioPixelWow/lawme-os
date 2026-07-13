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
  const caption =
    kind === "current" ? "עכשיו" : kind === "past" ? "הושלם" : blocked ? "חסום" : "הבא";
  const isCurrent = kind === "current";
  return (
    <li className={cx("flex min-w-0 flex-col items-center gap-3 px-1 text-center", !isCurrent && "pt-0.5")}>
      <span className="relative flex h-7 items-center justify-center">
        {isCurrent ? (
          <>
            <span aria-hidden className="absolute h-7 w-7 rounded-pill bg-gold-400/20" />
            <span
              aria-hidden
              className="relative h-3.5 w-3.5 rounded-pill bg-gold-500 ring-4 ring-gold-300/40"
            />
          </>
        ) : kind === "past" ? (
          <span aria-hidden className="h-2 w-2 rounded-pill bg-ink-300" />
        ) : (
          <span
            aria-hidden
            className={cx(
              "h-2 w-2 rounded-pill border-2 bg-surface",
              blocked ? "border-status-urgent" : "border-ink-300",
            )}
          />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cx(
            "block text-balance leading-tight",
            isCurrent
              ? "text-body font-semibold text-foreground"
              : "text-small text-foreground-faint",
          )}
        >
          {label ?? "—"}
        </span>
        {isCurrent ? (
          <span aria-hidden className="mx-auto mt-2 block h-0.5 w-10 rounded-pill bg-gold-500" />
        ) : null}
        <span
          className={cx(
            "mt-1.5 block text-caption",
            isCurrent
              ? "font-medium text-gold-600"
              : kind === "next" && blocked
                ? "text-status-urgent"
                : "text-foreground-faint",
          )}
        >
          {caption}
        </span>
      </span>
    </li>
  );
}

/**
 * Level 3 — the Milestone Spine.
 * The procedure position on the gold meridian: previous stage, the current node
 * (gold, "now"), and the next stage — with the transition marked blocked when
 * the matter cannot advance. Derived from the deterministic procedure graph.
 */
export function MilestoneSpine({ spine }: { spine: SpineVM }) {
  return (
    <section className="mt-10" aria-label="מסלול ההליך">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
          מסלול ההליך
        </h2>
        <span className="text-caption tabular-nums text-foreground-faint">{spine.stageNumberHe}</span>
      </div>

      <div className="relative">
        <span aria-hidden className="absolute inset-x-[16.6%] top-3 -z-10 h-px bg-ink-900/12" />
        <ol className="relative grid grid-cols-3">
          <SpineNode label={spine.prevHe} kind="past" />
          <SpineNode label={spine.currentHe} kind="current" />
          <SpineNode label={spine.nextHe} kind="next" blocked={spine.blocked} />
        </ol>
      </div>

      {spine.blocked && spine.blockedReasonHe ? (
        <p className="mt-5 flex items-center justify-center gap-2 text-caption text-status-urgent">
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-status-urgent" />
          {spine.blockedReasonHe}
        </p>
      ) : null}
    </section>
  );
}
