import { ClockGlyph, PinGlyph } from "@/design-system/icons/glyphs";
import { cx } from "@/design-system/utils/cx";
import { TIMELINE_EVENTS } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * היום ביומן — a wide horizontal timeline. RTL: the day flows
 * right → left. The next event carries the gold emphasis.
 * Mobile: horizontally swipeable (scroll-snap, hidden scrollbar).
 */
export function DailyTimeline() {
  return (
    <section aria-label="היום ביומן">
      <SectionHeading
        title="היום ביומן"
        caption="שישה אירועים · הבא: דיון בתיק כהן, 11:30"
        href="/calendar"
        linkLabel="ליומן המלא"
      />

      <div className="relative mt-6">
        {/* the day's hairline */}
        <div
          aria-hidden
          className="absolute inset-x-2 top-[9px] hidden h-px bg-line md:block"
        />
        <ol className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
          {TIMELINE_EVENTS.map((event) => {
            const next = event.status === "next";
            const done = event.status === "done";
            return (
              <li
                key={event.id}
                className="w-64 shrink-0 snap-start md:w-auto md:flex-1"
              >
                <div className="relative hidden md:block">
                  <span
                    className={cx(
                      "absolute start-2 top-[5px] block h-2.5 w-2.5 rounded-pill",
                      next
                        ? "bg-gold-500 shadow-gold-breath"
                        : done
                          ? "bg-ink-200"
                          : "border border-ink-300 bg-surface",
                    )}
                  />
                </div>
                <div
                  className={cx(
                    "h-full rounded-lg p-4 transition-all md:mt-6",
                    next
                      ? "border-s-2 border-accent bg-surface-raised shadow-raised"
                      : "bg-surface-raised/60 shadow-hairline hover:bg-surface-raised hover:shadow-raised",
                    done && "opacity-60",
                  )}
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cx(
                        "text-small font-semibold tabular-nums",
                        next ? "text-gold-700" : "text-foreground",
                      )}
                    >
                      {event.time}
                    </span>
                    <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-micro font-medium text-foreground-soft">
                      {next ? "הבא" : event.kind}
                    </span>
                  </div>
                  <p className="mt-2 text-small font-medium text-foreground">
                    {event.title}
                  </p>
                  {event.matter ? (
                    <p className="mt-0.5 truncate text-caption text-foreground-soft">
                      {event.matter}
                    </p>
                  ) : null}
                  <p className="mt-2 flex items-center gap-1 truncate text-micro text-foreground-faint">
                    {event.location.includes("טלפון") ? (
                      <ClockGlyph size={11} className="shrink-0" />
                    ) : (
                      <PinGlyph size={11} className="shrink-0" />
                    )}
                    <span className="truncate">{event.location}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
