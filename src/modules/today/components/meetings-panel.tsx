import { PhoneGlyph, PinGlyph, UsersGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { MEETINGS } from "../data";
import { SectionHeading } from "./section-heading";

/** יומן פגישות — the next meetings, grouped by day, typed by kind. */
export function MeetingsPanel() {
  return (
    <section aria-label="יומן פגישות" className="flex h-full flex-col">
      <SectionHeading
        title="יומן פגישות"
        caption="הקרובות ביותר"
        href="/calendar"
        linkLabel="ליומן"
      />
      <ul className="surface-paper mt-5 flex-1 rounded-xl">
        {MEETINGS.map((meeting, index) => {
          const firstOfDay =
            index === 0 || MEETINGS[index - 1].day !== meeting.day;
          return (
            <li
              key={meeting.id}
              className={`group transition-colors hover:bg-surface-sunken/50 ${
                index > 0 ? "border-t border-line/60" : ""
              }`}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {firstOfDay ? (
                <p className="px-4 pt-3 text-micro font-medium text-foreground-faint">
                  {meeting.day}
                </p>
              ) : null}
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <IconContainer
                  variant={meeting.kind === "call" ? "info" : "calendar"}
                  size="sm"
                  interactive
                >
                  {meeting.kind === "call" ? (
                    <PhoneGlyph size={14} />
                  ) : (
                    <UsersGlyph size={14} />
                  )}
                </IconContainer>
                <div className="w-11 shrink-0 text-center">
                  <p className="text-small font-semibold tabular-nums text-foreground">
                    {meeting.time}
                  </p>
                </div>
                <div className="min-w-0 flex-1 border-s border-line ps-4">
                  <p className="truncate text-small font-medium text-foreground">
                    {meeting.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-caption text-foreground-soft">
                    {meeting.with}
                    <span className="text-foreground-faint">·</span>
                    <PinGlyph
                      size={11}
                      className="shrink-0 text-foreground-faint"
                    />
                    <span className="truncate text-foreground-faint">
                      {meeting.location}
                    </span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
