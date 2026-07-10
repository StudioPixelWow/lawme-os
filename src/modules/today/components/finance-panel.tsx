"use client";

import { useState } from "react";
import { StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { FINANCE_MONTHS, FINANCE_TARGET, FINANCE_TOTALS } from "../data";
import { SectionHeading } from "./section-heading";

const CHART_HEIGHT = 104;

/**
 * ביצועים פיננסיים — light, professional billing chart + totals.
 * Single series in desaturated ink; the current month in champagne
 * gold with a direct label; a subtle dashed target line; semantic
 * trend indicators only where direction matters. RTL: months flow
 * right → left (past on the right). Per-bar hover tooltip.
 */
export function FinancePanel() {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...FINANCE_MONTHS.map((m) => m.billed), FINANCE_TARGET);
  const targetY = Math.round((FINANCE_TARGET / max) * CHART_HEIGHT);

  return (
    <section aria-label="ביצועים פיננסיים" className="flex h-full flex-col">
      <SectionHeading
        title="ביצועים פיננסיים"
        caption="חיוב חודשי, ½ שנה אחרונה · ₪ אלפים"
      />

      <div className="surface-paper-raised mt-5 flex flex-1 flex-col rounded-xl p-5">
        <div className="relative">
          {/* subtle target line */}
          <div
            aria-hidden
            className="absolute inset-x-0 z-0 border-t border-dashed border-line-strong"
            style={{ bottom: 24 + targetY }}
          >
            <span className="absolute -top-2 end-0 bg-transparent text-micro text-foreground-faint">
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

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          {FINANCE_TOTALS.map((total) => (
            <div key={total.id}>
              <dt className="text-micro text-foreground-faint">
                {total.label}
              </dt>
              <dd className="mt-1 text-subheading font-semibold tracking-tight tabular-nums text-foreground">
                {total.value}
              </dd>
              <StatusText status={total.trendStatus} className="mt-0.5">
                <span dir="ltr" className="tabular-nums">
                  {total.trend}
                </span>
              </StatusText>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
