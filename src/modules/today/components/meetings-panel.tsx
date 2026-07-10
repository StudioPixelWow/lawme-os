import Link from "next/link";
import {
  DocumentGlyph,
  PhoneGlyph,
  PinGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark, MicroProgress } from "@/design-system/primitives/indicators";
import { MEETINGS } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * הכנה לפגישות — not a duplicate of the day timeline: this is the
 * preparation view. Each meeting shows who, which matter, prep
 * completeness, required material, and עמית's one-line prep.
 */
export function MeetingsPanel() {
  return (
    <section aria-label="הכנה לפגישות" className="flex h-full flex-col">
      <SectionHeading
        title="הכנה לפגישות"
        caption="ההקשר והחומרים — לא היומן"
        href="/calendar"
        linkLabel="ליומן"
      />
      <ul className="surface-paper mt-6 flex-1 rounded-xl">
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
                <p className="px-5 pt-3.5 text-micro font-semibold text-foreground-faint">
                  {meeting.day}
                </p>
              ) : null}
              <div className="flex gap-3.5 px-5 py-4">
                <IconContainer
                  variant={meeting.kind === "call" ? "info" : "calendar"}
                  size="md"
                  interactive
                >
                  {meeting.kind === "call" ? (
                    <PhoneGlyph size={16} />
                  ) : (
                    <UsersGlyph size={16} />
                  )}
                </IconContainer>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <time className="text-small font-semibold tabular-nums text-foreground">
                      {meeting.time}
                    </time>
                    <p className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
                      {meeting.title} · {meeting.with}
                    </p>
                    <MicroProgress
                      value={meeting.prep}
                      status={meeting.prep >= 0.8 ? "completed" : "progress"}
                      label="מוכנות"
                      showValue={false}
                      className="shrink-0"
                    />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-caption text-foreground-soft">
                    <PinGlyph size={11} className="shrink-0 text-foreground-faint" />
                    <span className="truncate">
                      {meeting.location}
                      {meeting.matter ? ` · ${meeting.matter}` : ""}
                    </span>
                    {meeting.docsNeeded ? (
                      <>
                        <span aria-hidden className="text-foreground-faint">·</span>
                        <DocumentGlyph
                          size={11}
                          className="shrink-0 text-foreground-faint"
                        />
                        <span className="truncate text-foreground-faint">
                          {meeting.docsNeeded}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-micro leading-relaxed text-foreground-soft">
                    <AIMark className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">{meeting.aiPrep}</span>
                    <Link
                      href="/calendar"
                      className="shrink-0 rounded-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      style={{ transitionDuration: "var(--motion-quick)" }}
                    >
                      {meeting.action} ←
                    </Link>
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
