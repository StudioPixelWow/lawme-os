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
      className="surface-navy flex h-full flex-col rounded-xl p-6"
    >
      <div className="flex items-center gap-2.5">
        <h2 className="text-heading font-semibold text-paper-50">סיכום יומי</h2>
        <span className="rounded-pill border border-gold-500/40 px-2 py-0.5 text-micro font-medium text-gold-400">
          LawME Intelligence
        </span>
      </div>

      <p className="mt-4 text-small leading-relaxed text-ink-100">
        {DAILY_SUMMARY.headline}
      </p>

      <dl className="mt-6 flex flex-1 flex-col gap-5">
        {DAILY_SUMMARY.metrics.map((metric) => (
          <div key={metric.id}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-caption text-ink-200">{metric.label}</dt>
              <dd className="text-subheading font-semibold tabular-nums text-paper-0">
                {metric.value}
              </dd>
            </div>
            <div
              aria-hidden
              className="mt-2 h-1 overflow-hidden rounded-pill bg-ink-700"
            >
              <div
                className="h-full rounded-pill bg-gold-500"
                style={{ width: `${Math.round(metric.ratio * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-6 flex items-center gap-1.5 text-micro text-ink-200">
        <SparkleGlyph size={11} className="shrink-0 text-gold-400" />
        נוצר על ידי {DAILY_SUMMARY.generatedBy} · עודכן {DAILY_SUMMARY.updatedAt} ·{" "}
        {DAILY_SUMMARY.sources}
      </p>
    </section>
  );
}
