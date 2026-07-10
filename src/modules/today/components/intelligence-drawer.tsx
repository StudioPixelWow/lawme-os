"use client";

import { useState } from "react";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { AI_INSIGHTS, AI_INSIGHTS_META, DAILY_SUMMARY } from "../data";

const CATEGORY_STATUS: Record<string, "reviewed" | "risk" | "completed"> = {
  precedent: "reviewed",
  risk: "risk",
  billing: "completed",
};

/**
 * The Intelligence Drawer — the one place עמית's full analysis can
 * be reviewed in depth. Collapsed: a single quiet line. Expanded:
 * every finding with its why, source and confidence, plus the day's
 * numbers. AI stays contextual everywhere else.
 */
export function IntelligenceDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="המודיעין של עמית" className="surface-navy rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-6 py-4 text-start md:px-7"
      >
        <span className="flex items-center gap-2 text-small font-semibold text-paper-0">
          <AIMark surface="navy" />
          המודיעין של עמית
        </span>
        <span className="min-w-0 flex-1 truncate text-caption text-ink-200">
          {DAILY_SUMMARY.headline}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-micro text-ink-200">
          {AI_INSIGHTS.length} ממצאים · עודכן {AI_INSIGHTS_META.updatedAt}
          <span
            aria-hidden
            className={cx(
              "inline-block text-gold-300 transition-transform",
              open && "rotate-90",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            ‹
          </span>
        </span>
      </button>

      {open ? (
        <div className="animate-rise border-t border-paper-0/10 px-6 pt-5 pb-6 md:px-7">
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {AI_INSIGHTS.map((insight) => (
              <li
                key={insight.id}
                className="glass-navy relative rounded-lg p-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-4 start-0 w-0.5 rounded-pill bg-gold-500/70"
                />
                <div className="flex items-center justify-between gap-2">
                  <StatusText
                    surface="navy"
                    status={CATEGORY_STATUS[insight.category] ?? "reviewed"}
                  >
                    {insight.categoryLabel}
                  </StatusText>
                  <span className="text-micro text-ink-300">
                    השפעה {insight.impact}
                  </span>
                </div>
                <p className="mt-2.5 text-small leading-relaxed text-paper-0">
                  {insight.text}
                </p>
                <p className="mt-2 text-micro text-ink-300">
                  {insight.matter} · מקור: {insight.source}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-micro tabular-nums text-ink-200">
                    ביטחון {insight.confidence}%
                  </span>
                  <button
                    type="button"
                    className="rounded-xs text-caption font-semibold text-gold-300 transition-colors hover:text-gold-200"
                    style={{ transitionDuration: "var(--motion-quick)" }}
                  >
                    {insight.action} ←
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* the day in numbers */}
          <dl className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-paper-0/10 pt-4">
            {DAILY_SUMMARY.metrics.map((metric) => (
              <div key={metric.id} className="flex items-baseline gap-2.5">
                <dd className="text-subheading font-semibold tabular-nums text-paper-0">
                  {metric.value}
                </dd>
                <dt className="text-caption text-ink-200">{metric.label}</dt>
              </div>
            ))}
            <p className="ms-auto text-micro text-ink-300">
              מקורות: {DAILY_SUMMARY.sources}
            </p>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
