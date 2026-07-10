import { SparkleGlyph } from "@/design-system/icons/glyphs";
import { DAILY_SUMMARY } from "../data";

/**
 * סיכום יומי — LawME intelligence summary on deep navy with
 * restrained gold data bars. Provenance stated in the footer.
 */
export function DailySummaryPanel() {
  return (
    <section
      aria-label="סיכום יומי"
      className="surface-paper-raised flex h-full flex-col rounded-xl border-s-2 border-accent p-6 md:p-7"
    >
      <h2 className="text-heading font-semibold tracking-tight text-foreground">
        סיכום יומי
      </h2>

      <p className="mt-3 max-w-reading text-small leading-relaxed text-pretty text-foreground-soft">
        {DAILY_SUMMARY.headline}
      </p>

      <dl className="mt-6 flex flex-1 flex-col justify-center gap-4">
        {DAILY_SUMMARY.metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-caption text-foreground-soft">
              {metric.label}
            </dt>
            <dd className="text-heading font-semibold tracking-tight tabular-nums text-foreground">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 flex items-center gap-1.5 border-t border-line/60 pt-4 text-micro text-foreground-faint">
        <SparkleGlyph size={11} className="shrink-0 text-gold-600" />
        נוצר על ידי {DAILY_SUMMARY.generatedBy} · עודכן {DAILY_SUMMARY.updatedAt} ·{" "}
        {DAILY_SUMMARY.sources}
      </p>
    </section>
  );
}
