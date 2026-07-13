import { cx } from "@/design-system/utils/cx";
import { DOT, TEXT } from "./tone";
import type { ScoreRailVM } from "../types";

/**
 * Level 5 — the compact diagnostic rail.
 * Not twelve cards: a curated, decision-relevant read of the Matter Score —
 * each dimension a categorical state (never an overall percentage), with the
 * weakest and strongest gently marked. Access to the full diagnostic sits quiet.
 */
export function ScoreRail({ rail }: { rail: ScoreRailVM }) {
  return (
    <section aria-label="אבחון התיק" className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
          אבחון התיק
        </h2>
        <button
          type="button"
          className="text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
        >
          אבחון מלא <span aria-hidden>←</span>
        </button>
      </div>

      <dl className="divide-y divide-ink-900/8">
        {rail.rows.map((row) => (
          <div key={row.labelHe} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-small text-foreground">
              {row.labelHe}
              {row.emphasis === "weak" ? (
                <span className="text-caption font-medium text-status-risk">· החוליה החלשה</span>
              ) : row.emphasis === "strong" ? (
                <span className="text-caption text-foreground-faint">· החזק ביותר</span>
              ) : null}
            </dt>
            <dd className={cx("flex shrink-0 items-center gap-1.5 text-small font-medium", TEXT[row.tone])}>
              <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[row.tone])} />
              {row.stateHe}
            </dd>
          </div>
        ))}
      </dl>

      {rail.noteHe ? (
        <p className="mt-2.5 text-caption text-foreground-faint">{rail.noteHe}</p>
      ) : null}
    </section>
  );
}
