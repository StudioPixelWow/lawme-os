"use client";

import {
  BellGlyph,
  ChatGlyph,
  CourtGlyph,
  MailGlyph,
  PhoneGlyph,
  SearchGlyph,
  TaskGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark } from "@/design-system/primitives/indicators";
import { COMM_DRAFTS_WAITING, COMM_SUMMARY } from "@/modules/today/office";
import { cx } from "@/design-system/utils/cx";
import {
  MINI_CALENDAR,
  NEXT_COMMITMENTS,
  NOTIFICATIONS,
  REMINDERS,
  TEAM,
} from "./utility-data";
import { useShell } from "./shell-provider";

function MiniCalendar() {
  const cells: Array<number | null> = [
    ...Array.from({ length: MINI_CALENDAR.startOffset }, () => null),
    ...Array.from({ length: MINI_CALENDAR.daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <div>
      <p className="text-small font-semibold text-foreground">
        {MINI_CALENDAR.title}
      </p>
      <div className="mt-2.5 grid grid-cols-7 gap-y-1 text-center">
        {MINI_CALENDAR.weekdays.map((d) => (
          <span key={d} className="text-micro font-medium text-foreground-faint">
            {d}
          </span>
        ))}
        {cells.map((day, i) => (
          <span
            key={i}
            className={cx(
              "relative mx-auto flex h-7 w-7 items-center justify-center rounded-pill text-micro tabular-nums",
              day === null && "invisible",
              day === MINI_CALENDAR.today
                ? "bg-gold-500 font-semibold text-ink-950 shadow-gold-breath"
                : "text-foreground-soft hover:bg-surface-sunken",
            )}
          >
            {day ?? ""}
            {day !== null &&
            day !== MINI_CALENDAR.today &&
            MINI_CALENDAR.marked.includes(day) ? (
              <span
                aria-hidden
                className="absolute bottom-0.5 h-1 w-1 rounded-pill bg-gold-600"
              />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The utility rail — the day's live companion, fixed to the end edge
 * (left, RTL). Calendar, countdown, commitments, reminders,
 * notifications, team availability, one quick action. Light paper,
 * always present; never a second menu.
 */
export function UtilityRail() {
  const { setCommandOpen } = useShell();

  return (
    <aside
      aria-label="לוח היום"
      className="surface-paper fixed inset-y-0 end-0 z-20 hidden w-72 flex-col overflow-y-auto border-s border-line/70 px-5 py-5 xl:flex"
    >
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink-900 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        <SearchGlyph size={15} />
        פעולה מהירה
      </button>

      <div className="mt-6">
        <MiniCalendar />
      </div>

      {/* the next commitments — the live block */}
      <div className="mt-6 border-t border-line/60 pt-5">
        <p className="text-micro font-semibold tracking-wide text-foreground-faint">
          הבא בתור
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {NEXT_COMMITMENTS.map((item, index) => (
            <li
              key={item.id}
              className={cx(
                "rounded-md p-3",
                index === 0
                  ? "glass border-s-2 border-accent shadow-gold-glow"
                  : "surface-paper",
              )}
            >
              <div className="flex items-center gap-2.5">
                <IconContainer
                  variant={item.kind === "hearing" ? "urgent" : "info"}
                  size="sm"
                >
                  {item.kind === "hearing" ? (
                    <CourtGlyph size={14} />
                  ) : (
                    <PhoneGlyph size={14} />
                  )}
                </IconContainer>
                <time className="text-small font-semibold tabular-nums text-foreground">
                  {item.time}
                </time>
                <span
                  className={cx(
                    "ms-auto text-micro font-medium",
                    index === 0 ? "text-gold-700" : "text-foreground-faint",
                  )}
                >
                  {item.countdown}
                </span>
              </div>
              <p className="mt-1.5 truncate text-small font-medium text-foreground">
                {item.title}
              </p>
              <p className="truncate text-micro text-foreground-faint">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* reminders */}
      <div className="mt-6 border-t border-line/60 pt-5">
        <p className="text-micro font-semibold tracking-wide text-foreground-faint">
          תזכורות
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {REMINDERS.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-center gap-2 text-caption text-foreground-soft"
            >
              <TaskGlyph size={13} className="shrink-0 text-foreground-faint" />
              <span className="min-w-0 truncate">{reminder.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* communication intelligence — channels awaiting the office */}
      <div className="mt-6 border-t border-line/60 pt-5">
        <p className="text-micro font-semibold tracking-wide text-foreground-faint">
          תקשורת ממתינה
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {COMM_SUMMARY.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="living-edge flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-caption text-foreground-soft transition-colors hover:text-foreground"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm",
                    c.channel === "whatsapp"
                      ? "bg-status-completed-wash text-status-completed"
                      : c.channel === "email"
                        ? "bg-status-progress-wash text-status-progress"
                        : "bg-status-scheduled-wash text-status-scheduled",
                  )}
                >
                  {c.channel === "whatsapp" ? (
                    <ChatGlyph size={13} />
                  ) : c.channel === "email" ? (
                    <MailGlyph size={13} />
                  ) : (
                    <PhoneGlyph size={13} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-start">{c.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {c.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-micro text-foreground-faint">
          <AIMark />
          {COMM_DRAFTS_WAITING}
        </p>
      </div>

      {/* notifications */}
      <div className="mt-6 border-t border-line/60 pt-5">
        <p className="text-micro font-semibold tracking-wide text-foreground-faint">
          התראות אחרונות
        </p>
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id} className="flex items-start gap-2">
              <BellGlyph
                size={13}
                className="mt-0.5 shrink-0 text-foreground-faint"
              />
              <span className="min-w-0 flex-1 text-caption leading-snug text-foreground-soft">
                {n.text}
                <span className="ms-1.5 text-micro tabular-nums text-foreground-faint">
                  {n.time}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* team availability */}
      <div className="mt-auto border-t border-line/60 pt-5">
        <p className="text-micro font-semibold tracking-wide text-foreground-faint">
          הצוות עכשיו
        </p>
        <ul className="mt-3 flex items-center gap-3">
          {TEAM.map((member) => (
            <li key={member.id} className="flex items-center gap-1.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0 shadow-seat">
                {member.initial}
                <span
                  aria-hidden
                  className={cx(
                    "absolute -bottom-0.5 -start-0.5 h-2.5 w-2.5 rounded-pill ring-2 ring-surface-raised",
                    member.state === "available"
                      ? "bg-status-completed"
                      : "bg-status-urgent",
                  )}
                />
              </span>
            </li>
          ))}
          <li className="text-micro text-foreground-faint">
            2 זמינים · 1 בדיון
          </li>
        </ul>
      </div>
    </aside>
  );
}
