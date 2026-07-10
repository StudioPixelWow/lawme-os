import { ClockGlyph, PinGlyph } from "@/design-system/icons/glyphs";
import { cx } from "@/design-system/utils/cx";
import { TIMELINE_EVENTS, TIMELINE_NOW } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * היום ביומן — the signature horizontal timeline.
 * The day flows right → left (RTL): a progress hairline records what
 * has passed in solid ink, a gold now-marker floats at the current
 * moment, and the next event stands slightly taller than the rest.
 * Mobile: the same cards, horizontally swipeable with scroll-snap.
 */
export function DailyTimeline() {
  const doneCount = TIMELINE_EVENTS.filter((e) => e.status === "done").length;

  return (
    <section aria-label="היום ביומן">
      <SectionHeading
        title="היום ביומן"
        caption={`${TIMELINE_EVENTS.length} אירועים · הושלמו ${doneCount} · הבא: דיון בתיק כהן, 11:30`}
        href="/calendar"
        linkLabel="ליומן המלא"
      />

      <div className="relative mt-8">
        {/* the day's line: passed (solid ink) → ahead (hairline) */}
        <div aria-hidden className="absolute inset-x-2 top-1 hidden md:block">
          <div className="relative h-px w-full bg-line">
            <div
              className="absolute inset-y-0 start-0 bg-ink-300"
              style={{ width: `${TIMELINE_NOW.position * 100}%` }}
            />
          </div>
        </div>

        {/* the now-marker — a small glass lozenge riding the line */}
        <div
          aria-hidden
          className="glass absolute -top-2.5 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-pill px-2.5 py-1 md:flex rtl:translate-x-1/2"
          style={{ insetInlineStart: `${TIMELINE_NOW.position * 100}%` }}
        >
          <span className="animate-breath h-1.5 w-1.5 rounded-pill bg-gold-500" />
          <span className="text-micro font-medium tabular-nums text-foreground">
            {TIMELINE_NOW.label}
          </span>
        </div>

        <ol className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pt-6 pb-1 md:pt-8">
          {TIMELINE_EVENTS.map((event) => {
            const next = event.status === "next";
            const done = event.status === "done";
            return (
              <li
                key={event.id}
                className="relative w-64 shrink-0 snap-start md:w-auto md:flex-1"
              >
                {/* dot on the line */}
                <span
                  aria-hidden
                  className={cx(
                    "absolute -top-[26px] start-2 hidden h-2.5 w-2.5 rounded-pill md:block",
                    next
                      ? "bg-gold-500 shadow-gold-breath"
                      : done
                        ? "bg-ink-300"
                        : "border border-ink-200 bg-surface",
                  )}
                />
                {/* connector from dot to card */}
                <span
                  aria-hidden
                  className={cx(
                    "absolute -top-4 start-[13px] hidden h-4 w-px md:block",
                    next ? "bg-gold-400" : "bg-line",
                  )}
                />
                <article
                  className={cx(
                    "h-full rounded-lg p-4 transition-all",
                    next
                      ? "border-s-2 border-accent bg-surface-raised shadow-float md:-translate-y-1"
                      : done
                        ? "bg-surface-raised/40 shadow-hairline opacity-70 hover:opacity-100"
                        : "bg-surface-raised/60 shadow-hairline hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-raised",
                  )}
                  style={{ transitionDuration: "var(--motion-settle)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <time
                      className={cx(
                        "text-small font-semibold tabular-nums",
                        next ? "text-gold-700" : "text-foreground",
                      )}
                    >
                      {event.time}
                    </time>
                    <span
                      className={cx(
                        "rounded-pill px-2 py-0.5 text-micro font-medium",
                        next
                          ? "bg-gold-100 text-gold-700"
                          : "bg-surface-sunken text-foreground-soft",
                      )}
                    >
                      {next ? "הבא · בעוד 48 דק׳" : done ? "הסתיים" : event.kind}
                    </span>
                  </div>
                  <p className="mt-2.5 text-small font-semibold text-foreground">
                    {event.title}
                  </p>
                  {event.matter ? (
                    <p className="mt-0.5 truncate text-caption text-foreground-soft">
                      {event.matter}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-caption text-foreground-faint">
                      {event.kind}
                    </p>
                  )}
                  <p className="mt-2.5 flex items-center gap-1 truncate border-t border-line/50 pt-2.5 text-micro text-foreground-faint">
                    {event.location.includes("טלפון") ? (
                      <ClockGlyph size={11} className="shrink-0" />
                    ) : (
                      <PinGlyph size={11} className="shrink-0" />
                    )}
                    <span className="truncate">{event.location}</span>
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
