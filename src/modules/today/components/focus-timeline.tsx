"use client";

import { useState } from "react";
import {
  CalendarGlyph,
  CheckGlyph,
  ClockGlyph,
  CourtGlyph,
  PhoneGlyph,
  PinGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { MicroProgress, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { TIMELINE_EVENTS, TIMELINE_NOW, type TimelineEvent } from "../data";

function kindGlyph(kind: TimelineEvent["kind"], size = 13) {
  switch (kind) {
    case "hearing":
      return <CourtGlyph size={size} />;
    case "call":
      return <PhoneGlyph size={size} />;
    case "deadline":
      return <ClockGlyph size={size} />;
    case "meeting":
      return <UsersGlyph size={size} />;
    default:
      return <CheckGlyph size={size} />;
  }
}

/** One node on the compact rail. */
function RailNode({
  event,
  active,
  onSelect,
}: {
  event: TimelineEvent;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const done = event.status === "done";
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      aria-pressed={active}
      aria-label={`${event.time} ${event.title}`}
      data-live={active || undefined}
      className={cx(
        "living-edge group flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-start transition-all",
        active
          ? "glass shadow-gold-glow"
          : "hover:bg-surface-sunken/60",
        done && !active && "opacity-55",
      )}
      style={{ transitionDuration: "var(--motion-quick)" }}
    >
      <span
        aria-hidden
        className={cx(
          "flex h-2.5 w-2.5 items-center justify-center rounded-pill",
          active
            ? "bg-gold-500 shadow-gold-breath"
            : done
              ? "bg-ink-400"
              : "border border-line-strong bg-surface-raised",
        )}
      />
      <span className="min-w-0">
        <span
          className={cx(
            "block text-micro font-semibold tabular-nums",
            active ? "text-gold-700" : "text-foreground-soft",
          )}
        >
          {event.time}
        </span>
        <span
          className={cx(
            "block max-w-32 truncate text-caption",
            active ? "font-semibold text-foreground" : "text-foreground-soft",
          )}
        >
          {event.title}
        </span>
        {/* the preparation appears on hover */}
        {typeof event.prep === "number" ? (
          <span
            className="block h-0 overflow-hidden opacity-0 transition-all group-hover:mt-1 group-hover:h-auto group-hover:opacity-100"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <MicroProgress
              value={event.prep}
              status={event.prep >= 0.8 ? "completed" : "progress"}
              label="מוכנות"
            />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * The integrated timeline — the day flows beneath Today Focus,
 * connected to it by the gold meridian. Default: now, the active
 * event, what's next. Expands in place to the full day.
 */
export function FocusTimeline({
  focusedId,
  onSelect,
}: {
  focusedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const lastDone = [...TIMELINE_EVENTS].reverse().find((e) => e.status === "done");
  const next = TIMELINE_EVENTS.find((e) => e.status === "next");
  const upcoming = TIMELINE_EVENTS.filter((e) => e.status === "upcoming");
  const compactEvents = [lastDone, next, upcoming[0]].filter(
    (e): e is TimelineEvent => Boolean(e),
  );
  const hiddenCount = TIMELINE_EVENTS.length - compactEvents.length;

  return (
    <div aria-label="ציר היום">
      {!expanded ? (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {compactEvents.map((event, i) => (
            <div key={event.id} className="flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <span aria-hidden className="hidden h-px w-6 bg-line-strong sm:block" />
              ) : null}
              {/* the time cursor sits between the past and the active event */}
              {event.status === "next" ? (
                <span className="me-1 hidden items-center gap-1.5 sm:flex">
                  <span className="glass rounded-pill px-2 py-0.5 text-micro font-semibold tabular-nums text-foreground">
                    {TIMELINE_NOW.label}
                  </span>
                  <span aria-hidden className="h-px w-4 bg-gold-500/60" />
                </span>
              ) : null}
              <RailNode
                event={event}
                active={event.id === focusedId}
                onSelect={onSelect}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="living-edge ms-auto flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <CalendarGlyph size={14} />
            כל היום · עוד {hiddenCount}
          </button>
        </div>
      ) : (
        <div className="animate-rise">
          <ol className="flex flex-col">
            {TIMELINE_EVENTS.map((event) => {
              const active = event.id === focusedId;
              const done = event.status === "done";
              return (
                <li key={event.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(event.id)}
                    aria-pressed={active}
                    data-live={active || undefined}
                    className={cx(
                      "living-edge grid w-full grid-cols-[3.5rem_auto_minmax(0,1fr)] items-center gap-x-3 rounded-md px-2 py-2.5 text-start transition-colors",
                      active ? "glass" : "hover:bg-surface-sunken/60",
                      done && !active && "opacity-55",
                    )}
                    style={{ transitionDuration: "var(--motion-quick)" }}
                  >
                    <time
                      className={cx(
                        "text-caption font-semibold tabular-nums",
                        active ? "text-gold-700" : "text-foreground-soft",
                      )}
                    >
                      {event.time}
                    </time>
                    <span
                      aria-hidden
                      className={cx(
                        "flex h-2.5 w-2.5 items-center justify-center justify-self-center rounded-pill",
                        active
                          ? "bg-gold-500 shadow-gold-breath"
                          : done
                            ? "bg-ink-400"
                            : "border border-line-strong bg-surface-raised",
                      )}
                    />
                    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={cx(
                          "flex items-center gap-1.5 text-small",
                          active
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground-soft",
                        )}
                      >
                        <span className="text-foreground-faint">
                          {kindGlyph(event.kind)}
                        </span>
                        {event.title}
                      </span>
                      {event.matter ? (
                        <span className="text-micro text-foreground-faint">
                          {event.matter}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1 text-micro text-foreground-faint">
                        <PinGlyph size={11} />
                        {event.location}
                      </span>
                      {typeof event.prep === "number" ? (
                        <MicroProgress
                          value={event.prep}
                          status={event.prep >= 0.8 ? "completed" : "progress"}
                          label="מוכנות"
                        />
                      ) : null}
                      {done ? (
                        <StatusText status="completed">הסתיים</StatusText>
                      ) : null}
                    </span>
                  </button>
                  {/* the meridian threads the active event */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-2 start-0 w-0.5 rounded-pill bg-gold-500/80"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-2 rounded-xs text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            צמצם את היום ↑
          </button>
        </div>
      )}
    </div>
  );
}
