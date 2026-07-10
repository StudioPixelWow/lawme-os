import { PinGlyph } from "@/design-system/icons/glyphs";
import { MEETINGS } from "../data";
import { SectionHeading } from "./section-heading";

/** יומן פגישות — the next meetings, grouped by day labels. */
export function MeetingsPanel() {
  return (
    <section aria-label="יומן פגישות" className="flex h-full flex-col">
      <SectionHeading
        title="יומן פגישות"
        caption="הקרובות ביותר"
        href="/calendar"
        linkLabel="ליומן"
      />
      <ul className="mt-5 flex-1 rounded-xl bg-surface-raised shadow-hairline">
        {MEETINGS.map((meeting, index) => (
          <li
            key={meeting.id}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken/50 ${
              index > 0 ? "border-t border-line/60" : ""
            }`}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <div className="w-12 shrink-0 text-center">
              <p className="text-small font-semibold tabular-nums text-foreground">
                {meeting.time}
              </p>
              <p className="text-micro text-foreground-faint">{meeting.day}</p>
            </div>
            <div className="min-w-0 flex-1 border-s border-line ps-4">
              <p className="truncate text-small font-medium text-foreground">
                {meeting.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-caption text-foreground-soft">
                {meeting.with}
                <span className="text-foreground-faint">·</span>
                <PinGlyph size={11} className="shrink-0 text-foreground-faint" />
                <span className="truncate text-foreground-faint">
                  {meeting.location}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
