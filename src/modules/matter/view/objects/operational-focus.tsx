import { cx } from "@/design-system/utils/cx";
import { DOT, TEXT } from "./tone";
import type { BlockerVM } from "../types";

/**
 * The top blocker — an open operational object, not a card and not a paragraph.
 * Why the matter is stuck, in the same rhythm as everything around it: a tinted
 * eyebrow, a plain-language title, the reason, and the sourced specifics.
 */
export function Blocker({ blocker }: { blocker: BlockerVM }) {
  return (
    <section className="min-w-0" aria-label="חסם עיקרי">
      <div className={cx("flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em]", TEXT[blocker.tone])}>
        <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[blocker.tone])} />
        חסם עיקרי
      </div>

      <h3 className="mt-2.5 text-subheading font-semibold leading-snug text-foreground">
        {blocker.titleHe}
      </h3>
      <p className="mt-2 max-w-[48ch] text-small leading-relaxed text-foreground-soft">
        {blocker.whyHe}
      </p>

      <dl className="mt-4 space-y-1.5 text-caption text-foreground-faint">
        {blocker.stageHe ? (
          <div className="flex gap-2">
            <dt className="w-10 shrink-0">שלב</dt>
            <dd className="text-foreground-soft">{blocker.stageHe}</dd>
          </div>
        ) : null}
        {blocker.missingHe.length ? (
          <div className="flex gap-2">
            <dt className="w-10 shrink-0">חסר</dt>
            <dd className="text-foreground-soft">{blocker.missingHe.join(" · ")}</dd>
          </div>
        ) : null}
        {blocker.sourceHe ? (
          <div className="flex gap-2">
            <dt className="w-10 shrink-0">מקור</dt>
            <dd className="text-foreground-soft">{blocker.sourceHe}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1.5 text-small font-medium text-foreground-soft transition-colors hover:text-foreground"
      >
        {blocker.actionLabelHe}
        <span aria-hidden>←</span>
      </button>
    </section>
  );
}
