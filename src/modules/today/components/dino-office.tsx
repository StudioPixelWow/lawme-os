"use client";

import { useState } from "react";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { DINO_OFFICE_INSIGHTS } from "../office";

/**
 * דינו — מודיעין המשרד. Cross-office intelligence: findings that no
 * single matter view can see. Collapsed to one quiet navy line;
 * expanded, each insight carries its why, related objects, evidence
 * and action. Selecting an insight opens its evidence drawer.
 */
export function DinoOffice() {
  const [open, setOpen] = useState(false);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);

  return (
    <section
      id="section-dino"
      aria-label="דינו — מודיעין המשרד"
      className="surface-navy rounded-xl"
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setEvidenceFor(null);
        }}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-6 py-4 text-start md:px-7"
      >
        <span className="flex items-center gap-2 text-small font-semibold text-paper-0">
          <AIMark surface="navy" />
          דינו · מודיעין המשרד
        </span>
        <span className="min-w-0 flex-1 truncate text-caption text-ink-200">
          תקדים רוחבי אחד, שני מועדים בסיכון, עומס צוות ו־18.5 שעות שטרם חויבו
        </span>
        <span className="flex shrink-0 items-center gap-3 text-micro text-ink-200">
          {DINO_OFFICE_INSIGHTS.length} ממצאים רוחביים · עודכן 07:20
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
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DINO_OFFICE_INSIGHTS.map((insight) => {
              const evidenceOpen = evidenceFor === insight.id;
              return (
                <li
                  key={insight.id}
                  className={cx(
                    "glass-navy relative rounded-lg p-4",
                    evidenceOpen && "md:col-span-2 xl:col-span-1",
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-4 start-0 w-0.5 rounded-pill bg-gold-500/70"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <StatusText surface="navy" status={insight.status}>
                      {insight.kindLabel}
                    </StatusText>
                    <span className="text-micro tabular-nums text-ink-300">
                      {insight.updatedAt}
                    </span>
                  </div>
                  <p className="mt-2.5 text-small leading-snug font-semibold text-paper-0">
                    {insight.finding}
                  </p>
                  <p className="mt-1.5 text-caption leading-relaxed text-ink-100">
                    {insight.why}
                  </p>

                  {/* related objects */}
                  <p className="mt-2.5 flex flex-wrap gap-1.5">
                    {insight.related.map((item) => (
                      <span
                        key={item}
                        className="rounded-xs bg-paper-0/10 px-2 py-0.5 text-micro text-ink-100"
                      >
                        {item}
                      </span>
                    ))}
                  </p>

                  {/* the evidence drawer */}
                  {evidenceOpen ? (
                    <p className="animate-rise mt-3 rounded-md border-s-2 border-gold-500/70 bg-ink-950/40 p-3 text-micro leading-relaxed text-ink-100">
                      ראיות: {insight.evidence}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEvidenceFor(evidenceOpen ? null : insight.id)
                      }
                      aria-expanded={evidenceOpen}
                      className="rounded-xs text-micro font-medium text-ink-200 transition-colors hover:text-paper-0"
                      style={{ transitionDuration: "var(--motion-quick)" }}
                    >
                      {evidenceOpen ? "סגור ראיות" : "הצג ראיות"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xs text-caption font-semibold text-gold-300 transition-colors hover:text-gold-200"
                      style={{ transitionDuration: "var(--motion-quick)" }}
                    >
                      {insight.action} ←
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
