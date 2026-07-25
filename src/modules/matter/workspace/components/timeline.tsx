import type { ReactNode } from "react";
import { IconContainer, type IconContainerVariant } from "@/design-system/primitives/icon-container";
import {
  HistoryGlyph, SparkleGlyph, DocumentGlyph, PenGlyph, UsersGlyph, CalendarGlyph, ChatGlyph, ClockGlyph,
} from "@/design-system/icons/glyphs";
import type { WorkspaceTimeline, TimelineEvent, TimelineGlyphKind } from "../types";
import { WorkspaceSection, EmptyNote } from "./section";

function glyphFor(kind: TimelineGlyphKind): { node: ReactNode; variant: IconContainerVariant } {
  switch (kind) {
    case "created": return { node: <SparkleGlyph size={14} />, variant: "gold" };
    case "document": return { node: <DocumentGlyph size={14} />, variant: "document" };
    case "fact": return { node: <PenGlyph size={14} />, variant: "info" };
    case "participant": return { node: <UsersGlyph size={14} />, variant: "client" };
    case "deadline": return { node: <CalendarGlyph size={14} />, variant: "calendar" };
    case "note": return { node: <ChatGlyph size={14} />, variant: "neutral" };
    default: return { node: <ClockGlyph size={14} />, variant: "neutral" };
  }
}

function EventRow({ event }: { event: TimelineEvent }) {
  const g = glyphFor(event.glyph);
  return (
    <li className="flex gap-3">
      <IconContainer variant={g.variant} size="sm">{g.node}</IconContainer>
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-small font-medium text-foreground">{event.kindLabelHe}</span>
          <span className="shrink-0 text-micro tabular-nums text-foreground-faint">{event.timeLabelHe}</span>
        </div>
        <p className="mt-0.5 text-small text-pretty text-foreground-soft">{event.descriptionHe}</p>
        {event.actorHe ? <p className="mt-1 text-caption text-foreground-faint">{event.actorHe}</p> : null}
      </div>
    </li>
  );
}

export function TimelineSection({ timeline }: { timeline: WorkspaceTimeline }) {
  const meta = timeline.total > 0 ? `${timeline.total} אירועים` : undefined;
  return (
    <WorkspaceSection title="ציר הזמן" icon={<HistoryGlyph size={16} />} iconVariant="research" meta={meta}>
      {timeline.total === 0 ? (
        <EmptyNote line="פעילות התיק תופיע כאן, מהאירוע האחרון ומעלה." />
      ) : (
        <div className="space-y-6">
          {timeline.days.map((day) => (
            <div key={day.dayISO}>
              <div className="mb-3 text-caption font-semibold text-foreground-soft">{day.dayLabelHe}</div>
              <ul>
                {day.events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
