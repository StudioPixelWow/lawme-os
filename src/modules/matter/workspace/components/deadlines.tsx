import { CalendarGlyph } from "@/design-system/icons/glyphs";
import type { WorkspaceDeadlines, DeadlineView } from "../types";
import { WorkspaceSection, EmptyNote, ToneChip, ToneText } from "./section";

function DeadlineRow({ d }: { d: DeadlineView }) {
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-small font-medium text-foreground">{d.labelHe}</span>
        <ToneChip tone={d.tone}>{d.relativeHe ?? "ללא מועד"}</ToneChip>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-foreground-faint">
        {d.dueLabelHe ? <span className="tabular-nums text-foreground-soft">{d.dueLabelHe}</span> : <span>מועד טרם נקבע</span>}
        {d.strict ? <span className="text-status-urgent">מועד מחייב</span> : null}
        <span>מקור: {d.sourceLabelHe}</span>
      </div>
      {d.basisHe ? <p className="text-caption text-pretty text-foreground-faint">{d.basisHe}</p> : null}
    </li>
  );
}

export function DeadlinesSection({ deadlines }: { deadlines: WorkspaceDeadlines }) {
  const meta = deadlines.total > 0 ? `${deadlines.total} מועדים` : undefined;
  return (
    <WorkspaceSection title="מועדים" icon={<CalendarGlyph size={16} />} iconVariant="calendar" meta={meta}>
      {deadlines.total === 0 ? (
        <EmptyNote line="אין מועדים בתיק זה כרגע. מועדים חדשים יופיעו כאן." />
      ) : (
        <div className="space-y-5">
          {deadlines.buckets.map((bucket) => (
            <div key={bucket.key}>
              <div className="flex items-center justify-between">
                <ToneText tone={bucket.tone}>{bucket.labelHe}</ToneText>
                <span className="text-micro tabular-nums text-foreground-faint">{bucket.items.length}</span>
              </div>
              <ul className="mt-1 divide-y divide-line-strong">
                {bucket.items.map((d) => (
                  <DeadlineRow key={d.id} d={d} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
