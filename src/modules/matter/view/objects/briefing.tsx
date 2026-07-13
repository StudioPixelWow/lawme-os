import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { DOT, TEXT } from "./tone";
import type { ActionVM, DeadlineVM, ReviewVM } from "../types";

/**
 * The situation briefing + the next move — the emotional and operational center.
 * A single band that fills the canvas: the situation on the gold meridian (the
 * room's dominant text, two partner-briefing sentences) reads first, the next
 * move sits beside it at the end edge. Situation → move, nothing between them.
 */
export function Briefing({
  briefingHe,
  action,
  deadline,
  review,
}: {
  briefingHe: string[];
  action: ActionVM | null;
  deadline: DeadlineVM | null;
  review: ReviewVM | null;
}) {
  const meta = action
    ? [
        action.ownerHe,
        action.dueHe,
        action.requiresApproval ? "טעון אישור אנושי" : null,
        action.reviewTargetHe && !review ? action.reviewTargetHe : null,
        action.expectedEffectHe,
      ].filter((p): p is string => Boolean(p))
    : [];

  return (
    <section
      className="mt-8 grid gap-8 md:mt-9 md:grid-cols-[1.5fr_1fr] md:items-start md:gap-14"
      aria-label="מצב התיק והצעד הבא"
    >
      <div className="border-s-2 border-gold-500 ps-5 md:ps-6">
        {briefingHe.map((sentence, i) => (
          <p
            key={i}
            className={cx(
              i === 0
                ? "max-w-[42ch] text-balance text-heading font-semibold leading-snug text-foreground"
                : "mt-2 max-w-[50ch] text-body leading-relaxed text-foreground-soft",
            )}
          >
            {sentence}
          </p>
        ))}

        {deadline ? (
          <p className="mt-3.5 flex items-center gap-2 text-small">
            <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[deadline.tone])} />
            <span className={cx("font-semibold", TEXT[deadline.tone])}>{deadline.whenHe}</span>
            <span className="text-foreground-faint">
              · {deadline.labelHe}
              {deadline.strict ? " · מועד קשיח" : ""}
            </span>
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="md:pt-0.5">
          <div className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
            הצעד הבא
          </div>
          <p className="mt-2 text-body font-medium leading-snug text-foreground">{action.labelHe}</p>
          <div className="mt-4">
            <Button intent="primary" className="w-full sm:w-auto">
              התחל בצעד
            </Button>
          </div>
          {meta.length ? (
            <p className="mt-3 text-caption leading-relaxed text-foreground-faint">{meta.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
