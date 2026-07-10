"use client";

import { useState } from "react";
import { TrendGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import {
  FINANCE_AI_INSIGHT,
  FINANCE_FORECAST,
  FINANCE_MONTHS,
  FINANCE_TARGET,
  FINANCE_TOTALS,
} from "../data";
import { SectionHeading } from "./section-heading";

const CHART_HEIGHT = 112;

/**
 * העסק — a full-width executive instrument: the billing chart at the
 * start, the totals + forecast in the middle, and one contextual AI
 * insight (unbilled time) with its action at the end. Restrained,
 * professional, RTL (past on the right). Per-bar hover tooltip.
 */
export function FinancePanel() {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...FINANCE_MONTHS.map((m) => m.billed), FINANCE_TARGET);
  const targetY = Math.round((FINANCE_TARGET / max) * CHART_HEIGHT);

  return (
    <section aria-label="ביצועים פיננסיים">
      <SectionHeading
        title="ביצועים פיננסיים"
        caption={`חיוב חודשי, ½ שנה אחרונה · ₪ אלפים · ${FINANCE_FORECAST}`}
      />

      <div className="surface-paper-raised mt-6 grid grid-cols-1 gap-8 rounded-xl p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] lg:p-7">
        {/* the chart */}
        <div className="min-w-0">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-x-0 z-0 border-t border-dashed border-line-strong"
              style={{ bottom: 24 + targetY }}
            >
              <span className="absolute -top-2 end-0 text-micro text-foreground-faint">
                יעד ₪{FINANCE_TARGET}K
              </span>
            </div>
            <div
              role="img"
              aria-label={`חיוב חודשי: ${FINANCE_MONTHS.map((m) => `${m.month} ${m.billed} אלף ₪`).join(", ")} · יעד ${FINANCE_TARGET} אלף ₪`}
              className="relative z-10 flex items-end justify-between gap-2"
              style={{ height: CHART_HEIGHT + 24 }}
            >
              {FINANCE_MONTHS.map((m) => {
                const h = Math.round((m.billed / max) * CHART_HEIGHT);
                const active = hovered === m.month;
                return (
                  <div
                    key={m.month}
                    className="relative flex flex-1 flex-col items-center justify-end"
                    onMouseEnter={() => setHovered(m.month)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {(m.current || active) && (
                      <span
                        className={cx(
                          "mb-1.5 text-micro font-medium tabular-nums",
                          m.current ? "text-gold-700" : "text-foreground-soft",
                        )}
                      >
                        ₪{m.billed}K
                      </span>
                    )}
                    <div
                      className={cx(
                        "w-full max-w-9 rounded-t-xs transition-all",
                        m.current
                          ? "bg-gold-600"
                          : active
                            ? "bg-ink-500"
                            : "bg-ink-500/70",
                      )}
                      style={{
                        height: h,
                        transitionDuration: "var(--motion-quick)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between gap-2 border-t border-line pt-2">
            {FINANCE_MONTHS.map((m) => (
              <span
                key={m.month}
                className={cx(
                  "flex-1 text-center text-micro",
                  m.current
                    ? "font-medium text-foreground"
                    : "text-foreground-faint",
                )}
              >
                {m.month}
              </span>
            ))}
          </div>
        </div>

        {/* totals + forecast */}
        <dl className="flex min-w-0 flex-col justify-center gap-5 border-line lg:border-s lg:ps-8">
          {FINANCE_TOTALS.map((total) => (
            <div
              key={total.id}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="text-small text-foreground-soft">{total.label}</dt>
              <dd className="text-heading font-semibold tracking-tight tabular-nums text-foreground">
                {total.value}
                <StatusText status={total.trendStatus} className="ms-3">
                  <span dir="ltr" className="tabular-nums">
                    {total.trend}
                  </span>
                </StatusText>
              </dd>
            </div>
          ))}
          <p className="border-t border-line/60 pt-3 text-caption text-foreground-faint">
            {FINANCE_FORECAST}
          </p>
        </dl>

        {/* contextual AI insight */}
        <div className="flex min-w-0 flex-col justify-center rounded-md border-s-2 border-accent bg-gold-100/60 p-5">
          <div className="flex items-center gap-2.5">
            <IconContainer variant="finance" size="sm">
              <TrendGlyph size={14} />
            </IconContainer>
            <p className="text-small font-semibold text-foreground">
              שעות שלא חויבו
            </p>
          </div>
          <p className="mt-2.5 text-small leading-relaxed text-foreground">
            {FINANCE_AI_INSIGHT.text}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-micro text-foreground-faint">
            <AIMark />
            {FINANCE_AI_INSIGHT.source} · עודכן {FINANCE_AI_INSIGHT.updatedAt}
          </p>
          <button
            type="button"
            className="mt-4 inline-flex h-10 w-fit items-center rounded-md bg-ink-900 px-5 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {FINANCE_AI_INSIGHT.action}
          </button>
        </div>
      </div>
    </section>
  );
}
