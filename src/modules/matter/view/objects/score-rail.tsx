import { cx } from "@/design-system/utils/cx";
import { DOT, TEXT } from "./tone";
import type { ScoreRailVM } from "../types";

/**
 * The diagnostic strip — a living band, not a table.
 * The Matter Score read at a glance across one horizontal strip: each dimension a
 * categorical state (never a percentage), the weakest quietly marked. Strong /
 * weak / at-risk in a single sweep of the eye — no KPI grid.
 */
export function ScoreRail({ rail }: { rail: ScoreRailVM }) {
  return (
    <section aria-label="אבחון התיק" className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
          אבחון התיק
        </h2>
        <button
          type="button"
          className="text-caption text-foreground-faint transition-colors hover:text-foreground-soft"
        >
          אבחון מלא <span aria-hidden>←</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-surface-sunken/50 px-5 py-4 sm:grid-cols-4 sm:gap-x-4">
        {rail.rows.map((row) => (
          <div key={row.labelHe} className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className={cx("h-2 w-2 shrink-0 rounded-pill", DOT[row.tone])} />
            <span className="min-w-0">
              <span className="block truncate text-small font-medium text-foreground">
                {row.labelHe}
                {row.emphasis === "weak" ? (
                  <span className="ms-1.5 text-micro font-normal text-foreground-faint">החלש</span>
                ) : null}
              </span>
              <span className={cx("block truncate text-caption", TEXT[row.tone])}>{row.stateHe}</span>
            </span>
          </div>
        ))}
      </div>

      {rail.noteHe ? (
        <p className="mt-2 text-caption text-foreground-faint">{rail.noteHe}</p>
      ) : null}
    </section>
  );
}
