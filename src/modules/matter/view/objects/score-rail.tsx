import type { ComponentType, SVGProps } from "react";
import { cx } from "@/design-system/utils/cx";
import {
  CourtGlyph,
  EvidenceGlyph,
  CalendarGlyph,
  DocumentGlyph,
  UsersGlyph,
  ClockGlyph,
} from "@/design-system/icons/glyphs";
import { DOT, TEXT } from "./tone";
import type { ScoreRailVM } from "../types";

const ICON: Record<string, ComponentType<SVGProps<SVGSVGElement> & { size?: number }>> = {
  משפטי: CourtGlyph,
  ראיות: EvidenceGlyph,
  מועדים: CalendarGlyph,
  מסמכים: DocumentGlyph,
  צוות: UsersGlyph,
};

/**
 * The diagnostic card (approved concept) — "overall matter state".
 * A short read of the Matter Score: each dimension with its icon and a
 * categorical state (never a percentage), and a route to the full diagnostic.
 */
export function ScoreRail({ rail }: { rail: ScoreRailVM }) {
  return (
    <section className="flex flex-col rounded-xl border border-line-strong bg-surface p-5 shadow-lift" aria-label="אבחון התיק">
      <div className="flex items-baseline justify-between">
        <button
          type="button"
          className="text-caption text-foreground-faint transition-colors hover:text-foreground-soft"
        >
          אבחון מלא <span aria-hidden>‹</span>
        </button>
        <h2 className="text-caption font-semibold text-foreground-soft">מצב תיק כללי</h2>
      </div>

      <dl className="mt-3 divide-y divide-line-strong">
        {rail.rows.map((row) => {
          const Icon = ICON[row.labelHe] ?? DocumentGlyph;
          return (
            <div key={row.labelHe} className="flex items-center justify-between gap-3 py-2.5">
              <dd className={cx("flex shrink-0 items-center gap-1.5 text-small font-medium", TEXT[row.tone])}>
                <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[row.tone])} />
                {row.stateHe}
              </dd>
              <dt className="flex items-center gap-2 text-small text-foreground">
                <span className="text-foreground-faint">{row.labelHe}</span>
                <Icon size={16} className="text-foreground-faint" />
              </dt>
            </div>
          );
        })}
      </dl>

      <p className="mt-auto flex items-center justify-end gap-1.5 pt-4 text-micro text-foreground-faint">
        {rail.noteHe ?? "נתונים מתעדכנים לפי מידע בתיק"}
        <ClockGlyph size={12} />
      </p>
    </section>
  );
}
