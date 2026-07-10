import {
  ClockGlyph,
  CourtGlyph,
  DocumentGlyph,
  PhoneGlyph,
  PinGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import {
  MicroProgress,
  StatusText,
  type Status,
} from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { TIMELINE_EVENTS, TIMELINE_NOW, type TimelineEvent } from "../data";
import { SectionHeading } from "./section-heading";

const KIND_TREATMENT: Record<
  TimelineEvent["kind"],
  {
    Glyph: typeof CourtGlyph;
    variant: "urgent" | "info" | "calendar" | "warning" | "neutral";
    status: Status;
  }
> = {
  hearing: { Glyph: CourtGlyph, variant: "urgent", status: "urgent" },
  call: { Glyph: PhoneGlyph, variant: "info", status: "progress" },
  deadline: { Glyph: DocumentGlyph, variant: "warning", status: "today" },
  meeting: { Glyph: UsersGlyph, variant: "calendar", status: "scheduled" },
  internal: { Glyph: UsersGlyph, variant: "neutral", status: "waiting" },
};

/**
 * היום ביומן — the signature horizontal timeline.
 * Day flows right → left; passed time is solid ink on the day-line;
 * a glass now-marker floats at the current moment; the next event is
 * glass, raised toward the user; done events are quiet; each kind
 * carries its own icon + semantic color; prepared events show
 * readiness. Mobile: scroll-snap swipe. Keyboard: cards focusable.
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
        <div aria-hidden className="absolute inset-x-2 top-1 hidden xl:block">
          <div className="relative h-px w-full bg-line">
            <div
              className="absolute inset-y-0 start-0 bg-ink-300"
              style={{ width: `${TIMELINE_NOW.position * 100}%` }}
            />
          </div>
        </div>

        <div
          aria-hidden
          className="glass absolute -top-2.5 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-pill px-2.5 py-1 xl:flex rtl:translate-x-1/2"
          style={{ insetInlineStart: `${TIMELINE_NOW.position * 100}%` }}
        >
          <span className="animate-breath h-1.5 w-1.5 rounded-pill bg-gold-500" />
          <span className="text-micro font-medium tabular-nums text-foreground">
            {TIMELINE_NOW.label}
          </span>
        </div>

        <ol className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pt-6 pb-1 xl:grid xl:grid-cols-6 xl:overflow-visible xl:pt-8">
          {TIMELINE_EVENTS.map((event) => {
            const next = event.status === "next";
            const done = event.status === "done";
            const kind = KIND_TREATMENT[event.kind];
            return (
              <li
                key={event.id}
                className="relative w-64 shrink-0 snap-start xl:w-auto xl:min-w-0"
              >
                <span
                  aria-hidden
                  className={cx(
                    "absolute -top-[26px] start-2 hidden h-2.5 w-2.5 rounded-pill xl:block",
                    next
                      ? "bg-gold-500 shadow-gold-breath"
                      : done
                        ? "bg-ink-300"
                        : "border border-ink-200 bg-surface",
                  )}
                />
                <span
                  aria-hidden
                  className={cx(
                    "absolute -top-4 start-[13px] hidden h-4 w-px xl:block",
                    next ? "bg-gold-400" : "bg-line",
                  )}
                />
                <article
                  tabIndex={0}
                  aria-label={`${event.time} · ${event.title}`}
                  className={cx(
                    "h-full rounded-lg p-4 transition-all",
                    next
                      ? "glass border-s-2 border-accent shadow-gold-glow xl:-translate-y-1"
                      : done
                        ? "surface-paper opacity-65 hover:opacity-100"
                        : "surface-paper hover:-translate-y-0.5 hover:shadow-lift",
                  )}
                  style={{ transitionDuration: "var(--motion-settle)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5">
                      <IconContainer variant={kind.variant} size="sm">
                        <kind.Glyph size={14} />
                      </IconContainer>
                      <time
                        className={cx(
                          "text-small font-semibold tabular-nums",
                          next ? "text-gold-700" : "text-foreground",
                        )}
                      >
                        {event.time}
                      </time>
                    </span>
                    {next ? (
                      <span className="min-w-0 truncate rounded-pill bg-gold-100 px-2 py-0.5 text-micro font-medium text-gold-700">
                        בעוד 48 דק׳
                      </span>
                    ) : (
                      <StatusText status={done ? "completed" : kind.status}>
                        {done ? "הסתיים" : event.kindLabel}
                      </StatusText>
                    )}
                  </div>
                  <p className="mt-2.5 text-small font-semibold text-foreground">
                    {event.title}
                  </p>
                  <p className="mt-0.5 truncate text-caption text-foreground-soft">
                    {event.matter ?? event.kindLabel}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/50 pt-2.5">
                    <p className="flex min-w-0 items-center gap-1 truncate text-micro text-foreground-faint">
                      {event.kind === "call" ? (
                        <ClockGlyph size={11} className="shrink-0" />
                      ) : (
                        <PinGlyph size={11} className="shrink-0" />
                      )}
                      <span className="truncate">{event.location}</span>
                    </p>
                    {!done && event.prep !== undefined ? (
                      <MicroProgress
                        value={event.prep}
                        status={event.prep >= 0.8 ? "completed" : "progress"}
                        label="מוכנות"
                        showValue={false}
                        className="shrink-0"
                      />
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
