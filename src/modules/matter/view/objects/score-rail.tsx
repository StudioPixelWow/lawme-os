import { cx } from "@/design-system/utils/cx";
import { DOT, TEXT } from "./tone";
import type { ScoreRailVM } from "../types";

/**
 * The diagnostic rail — calm, not loud.
 * A short read of the Matter Score: each dimension a categorical state (never a
 * percentage), with only the weakest and strongest quietly marked. Enough to
 * know where to look; never a wall of cards.
 */
export function ScoreRail({ rail }: { rail: ScoreRailVM }) {
  return (
    <section aria-label="אבחון התיק" className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
          אבחון
        </h2>
        <button
          type="button"
          className="text-caption text-foreground-faint transition-colors hover:text-foreground-soft"
        >
          מלא <span aria-hidden>←</span>
        </button>
      </div>

      <dl>
        {rail.rows.map((row) => (
          <div key={row.labelHe} className="flex items-center justify-between gap-4 py-2">
            <dt className="flex items-baseline gap-2 text-small text-foreground">
              {row.labelHe}
              {row.emphasis === "weak" ? (
                <span className="text-micro text-foreground-faint">החלש ביותר</span>
              ) : row.emphasis === "strong" ? (
                <span className="text-micro text-foreground-faint">החזק ביותר</span>
              ) : null}
            </dt>
            <dd className={cx("flex shrink-0 items-center gap-1.5 text-small", TEXT[row.tone])}>
              <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[row.tone])} />
              {row.stateHe}
            </dd>
          </div>
        ))}
      </dl>

      {rail.noteHe ? (
        <p className="mt-2 text-caption text-foreground-faint">{rail.noteHe}</p>
      ) : null}
    </section>
  );
}
