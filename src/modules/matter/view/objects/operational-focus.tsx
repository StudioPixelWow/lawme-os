import { cx } from "@/design-system/utils/cx";
import { AlertGlyph } from "@/design-system/icons/glyphs";
import { TEXT } from "./tone";
import type { BlockerVM } from "../types";

/**
 * The top blocker (approved concept) — a card: why the matter is stuck, the
 * sourced specifics, and the drill-down to resolve it.
 */
export function BlockerCard({ blocker, onAction }: { blocker: BlockerVM; onAction?: () => void }) {
  const rows: { label: string; value: string }[] = [];
  if (blocker.stageHe) rows.push({ label: "שלב", value: blocker.stageHe });
  if (blocker.missingHe.length) rows.push({ label: "חסר", value: blocker.missingHe.join(" · ") });
  if (blocker.sourceHe) rows.push({ label: "מקור", value: blocker.sourceHe });

  return (
    <section className="flex flex-col rounded-xl border border-line-strong bg-surface p-5 shadow-lift" aria-label="חסם עיקרי">
      <div className={cx("flex items-center justify-between gap-2 text-caption font-semibold", TEXT[blocker.tone])}>
        חסם עיקרי
        <AlertGlyph size={15} />
      </div>

      <h3 className="mt-3 text-subheading font-semibold leading-snug text-foreground">
        {blocker.titleHe}
      </h3>
      <p className="mt-2 text-small leading-relaxed text-foreground-soft">{blocker.whyHe}</p>

      <dl className="mt-4 space-y-2 border-t border-line-strong pt-4 text-caption">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-10 shrink-0 text-foreground-faint">{r.label}</dt>
            <dd className="text-foreground-soft">{r.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onAction}
        className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-small font-medium text-foreground-soft transition-colors hover:text-foreground"
      >
        {blocker.actionLabelHe}
        <span aria-hidden>‹</span>
      </button>
    </section>
  );
}
