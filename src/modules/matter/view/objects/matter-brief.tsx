import { cx } from "@/design-system/utils/cx";
import { CalendarGlyph } from "@/design-system/icons/glyphs";
import { DinoMark } from "@/design-system/primitives/indicators";
import { TEXT, WASH } from "./tone";
import type { DeadlineVM, ReviewVM } from "../types";

/**
 * Level 2 — Matter state.
 * One strong narrative sentence ("what is happening"), then the two facts that
 * set the tempo: the critical deadline and the human-review requirement.
 */
export function MatterBrief({
  narrativeHe,
  deadline,
  review,
}: {
  narrativeHe: string;
  deadline: DeadlineVM | null;
  review: ReviewVM | null;
}) {
  return (
    <section className="mt-8">
      <p className="max-w-[52ch] text-balance text-heading font-medium leading-snug text-foreground">
        {narrativeHe}
      </p>

      {deadline || review ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          {deadline ? (
            <span
              className={cx(
                "inline-flex items-center gap-2.5 rounded-lg px-4 py-2.5",
                WASH[deadline.tone],
              )}
            >
              <CalendarGlyph size={16} className={cx("shrink-0", TEXT[deadline.tone])} />
              <span className="text-small">
                <span className={cx("font-semibold", TEXT[deadline.tone])}>{deadline.whenHe}</span>
                <span className="text-foreground-soft">
                  {" · "}
                  {deadline.labelHe}
                  {deadline.strict ? " · מועד קשיח" : ""}
                </span>
              </span>
            </span>
          ) : null}

          {review ? (
            <span className="inline-flex items-center gap-1.5 text-small text-foreground-soft">
              <DinoMark />
              טעון {review.targetHe}
              {review.requiresApproval ? " ואישור אנושי" : ""}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
