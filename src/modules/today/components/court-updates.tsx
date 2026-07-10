"use client";

import { useState } from "react";
import { CourtGlyph } from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { COURT_UPDATES } from "../office";
import { SectionHeading } from "./section-heading";

/**
 * חדש בתיקים — the procedural event stream. What arrived from the
 * courts and Net-HaMishpat, in official language, with דינו's
 * analysis, the deadline impact and the tasks already created.
 * Selecting an update opens its full procedural record.
 */
export function CourtUpdates() {
  const [selected, setSelected] = useState(COURT_UPDATES[0].id);

  return (
    <section id="section-court" aria-label="חדש בתיקים">
      <SectionHeading
        title="חדש בתיקים"
        caption="עדכוני בתי משפט ונט המשפט · מנותחים על ידי דינו"
      />

      {/* the docket — a procedural spine, not a notification list */}
      <ol className="relative mt-6 flex flex-col gap-4 ps-5">
        {/* the spine */}
        <span
          aria-hidden
          className="absolute inset-y-2 start-1.5 w-px bg-line-strong"
        />
        {COURT_UPDATES.map((update) => {
          const open = update.id === selected;
          return (
            <li key={update.id} className="relative">
              {/* the procedural seal on the spine */}
              <span
                aria-hidden
                className={cx(
                  "absolute -start-5 top-5 flex h-3 w-3 items-center justify-center rounded-pill ring-4 ring-surface",
                  update.status === "new"
                    ? "bg-gold-500 shadow-gold-breath"
                    : "border border-line-strong bg-surface-raised",
                )}
                style={{ insetInlineStart: "-1.44rem" }}
              />
              <article
                className={cx(
                  "living-edge relative overflow-hidden rounded-xl",
                  open ? "surface-paper-raised" : "surface-paper",
                )}
                data-live={open || undefined}
              >
                <button
                  type="button"
                  onClick={() => setSelected(open ? "" : update.id)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 text-start"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <CourtGlyph size={14} className="shrink-0 text-foreground-faint" />
                      <span className="text-micro font-medium tracking-wide text-foreground-faint">
                        {update.source}
                      </span>
                      <StatusText status={update.status} className="text-micro">
                        {update.kindLabel}
                      </StatusText>
                    </span>
                    <span className="text-small font-semibold text-foreground">
                      {update.matter}
                      <span className="ms-2 font-normal text-foreground-soft">
                        {update.summary}
                      </span>
                    </span>
                  </span>
                  <time className="shrink-0 text-micro tabular-nums text-foreground-faint">
                    התקבל {update.receivedAt}
                  </time>
                </button>

                {open ? (
                  <div className="animate-rise border-t border-line/60 px-5 pt-3.5 pb-4">
                    <p className="flex max-w-3xl items-start gap-2 border-s-2 border-accent ps-3 text-caption leading-relaxed text-foreground-soft">
                      <AIMark className="mt-0.5 shrink-0" />
                      <span className="min-w-0">{update.dinoAnalysis}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-micro">
                      {update.deadlineImpact ? (
                        <span className="font-semibold text-status-today">
                          {update.deadlineImpact}
                        </span>
                      ) : null}
                      {update.tasksCreated > 0 ? (
                        <span className="text-foreground-soft">
                          נוצרו {update.tasksCreated} משימות
                        </span>
                      ) : null}
                      <StatusText
                        status={update.clientUpdated === "sent" ? "completed" : "waiting"}
                        className="text-micro"
                      >
                        {update.clientUpdated === "sent"
                          ? "הלקוח עודכן"
                          : "עדכון לקוח ממתין"}
                      </StatusText>
                      <button
                        type="button"
                        className="ms-auto inline-flex h-9 items-center rounded-md bg-ink-900 px-4 text-caption font-semibold text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
                        style={{ transitionDuration: "var(--motion-quick)" }}
                      >
                        {update.action}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
