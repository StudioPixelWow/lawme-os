"use client";

import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { FINANCE_MONTHS, FINANCE_TOTALS } from "../data";
import { SectionHeading } from "./section-heading";

const CHART_HEIGHT = 104;

/**
 * ביצועים פיננסיים — a light, professional billing chart + totals.
 * Single series (monthly billing) in desaturated ink; the current
 * month carries the gold emphasis and a direct label. RTL: months
 * flow right → left (past on the right). Per-bar hover tooltip.
 */
export function FinancePanel() {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...FINANCE_MONTHS.map((m) => m.billed));

  return (
    <section aria-label="ביצועים פיננסיים" className="flex h-full flex-col">
      <SectionHeading
        title="ביצועים פיננסיים"
        caption="חיוב חודשי, ½ שנה אחרונה · ₪ אלפים"
      />

      <div className="mt-5 flex flex-1 flex-col rounded-xl bg-surface-raised p-5 shadow-hairline">
        <div
          role="img"
          aria-label={`חיוב חודשי: ${FINANCE_MONTHS.map((m) => `${m.month} ${m.billed} אלף ₪`).join(", ")}`}
          className="flex items-end justify-between gap-2"
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
              <dd className="mt-0.5 text-small font-semibold tabular-nums text-foreground">
                {total.value}
              </dd>
              <p
                className="text-micro tabular-nums text-foreground-soft"
                dir="ltr"
              >
                {total.trend}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
