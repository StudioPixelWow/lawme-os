"use client";

import { useState } from "react";
import { TrendGlyph } from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import {
  FINANCE_FORECAST,
  FINANCE_MONTHS,
  FINANCE_TARGET,
} from "../data";
import { FINANCE_DINO, FINANCE_FLAGS, FINANCE_SENTENCE } from "../office";

const CHART_HEIGHT = 96;

/**
 * העסק — a smart executive strip, not a resident dashboard. One
 * quiet line of truth: billed / collected / outstanding / unbilled
 * time + one insight and its action. The chart unfolds on demand.
 */
export function FinanceStrip() {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(...FINANCE_MONTHS.map((m) => m.billed), FINANCE_TARGET);
  const targetY = Math.round((FINANCE_TARGET / max) * CHART_HEIGHT);

  return (
    <section id="section-finance" aria-label="העסק" className="surface-paper rounded-xl">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 px-6 py-4.5 md:px-7">
        <p className="flex items-center gap-2 text-small font-semibold text-foreground">
          <TrendGlyph size={15} className="text-foreground-faint" />
          העסק
        </p>

        {/* the executive sentence — the primary view */}
        <p className="min-w-0 flex-1 text-small leading-relaxed font-medium text-foreground">
          {FINANCE_SENTENCE}
        </p>

        {/* the one insight that matters */}
        <p className="flex min-w-0 items-center gap-1.5 text-caption text-foreground-soft">
          <AIMark />
          <span className="min-w-0 truncate">{FINANCE_DINO.text}</span>
          <button
            type="button"
            className="shrink-0 rounded-xs font-semibold text-gold-700 transition-colors hover:text-gold-600"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {FINANCE_DINO.action} ←
          </button>
        </p>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="living-edge ms-auto flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {expanded ? "צמצם" : "מבט חצי־שנתי"}
          <span
            aria-hidden
            className={cx("inline-block transition-transform", expanded && "rotate-90")}
          >
            ‹
          </span>
        </button>
      </div>

      {expanded ? (
        <div className="animate-rise border-t border-line/60 px-6 pt-5 pb-5 md:px-7">
          <div className="relative max-w-2xl">
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
                return (
                  <div
                    key={m.month}
                    className="group flex flex-1 flex-col items-center justify-end"
                  >
                    <span
                      className={cx(
                        "mb-1.5 text-micro font-medium tabular-nums",
                        m.current
                          ? "text-gold-700"
                          : "text-foreground-soft opacity-0 transition-opacity group-hover:opacity-100",
                      )}
                      style={{ transitionDuration: "var(--motion-quick)" }}
                    >
                      ₪{m.billed}K
                    </span>
                    <div
                      className={cx(
                        "w-full max-w-9 rounded-t-xs transition-colors group-hover:bg-ink-500",
                        m.current ? "bg-gold-600" : "bg-ink-500/70",
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
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <p className="text-caption text-foreground-faint">
              {FINANCE_FORECAST} · {FINANCE_DINO.source} · עודכן{" "}
              {FINANCE_DINO.updatedAt}
            </p>
            {FINANCE_FLAGS.map((flag) => (
              <StatusText key={flag.id} status={flag.status} className="text-micro">
                {flag.text}
              </StatusText>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
