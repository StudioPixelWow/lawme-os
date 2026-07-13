import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { CalendarGlyph, CourtGlyph, UserGlyph, CheckGlyph } from "@/design-system/icons/glyphs";
import { TEXT } from "./tone";
import type { ActionVM, DeadlineVM } from "../types";

/**
 * The decision area (approved concept) — one card, three reads:
 * the critical deadline (start), the matter's current state (center), and the
 * next action as a highlighted nested card (end).
 */
export function DecisionArea({
  briefingHe,
  deadline,
  action,
}: {
  briefingHe: string[];
  deadline: DeadlineVM | null;
  action: ActionVM | null;
}) {
  return (
    <section
      className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-lift md:p-6"
      aria-label="מצב התיק והצעד הבא"
    >
      <div className="grid gap-6 md:grid-cols-[0.85fr_1.25fr_1.55fr] md:gap-0">
        {/* deadline */}
        {deadline ? (
          <div className="flex flex-col justify-center md:border-e md:border-line-strong md:pe-6">
            <div className={cx("flex items-center gap-2 text-caption font-medium", TEXT[deadline.tone])}>
              <CalendarGlyph size={15} />
              {deadline.labelHe} בעוד
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[2.5rem] font-bold leading-none tabular-nums text-foreground">
                {deadline.daysRemaining}
              </span>
              <span className="text-heading font-semibold text-foreground">ימים</span>
            </div>
            <div className="mt-1.5 text-caption text-foreground-faint">{deadline.dateHe}</div>
          </div>
        ) : (
          <div />
        )}

        {/* matter state */}
        <div className="flex flex-col justify-center md:border-e md:border-line-strong md:px-6">
          <h2 className="text-caption font-semibold uppercase tracking-[0.12em] text-foreground-faint">
            מצב התיק
          </h2>
          <p className="mt-2.5 max-w-[38ch] text-small leading-relaxed text-foreground-soft">
            {briefingHe[0]}
          </p>
        </div>

        {/* next action — highlighted nested card */}
        {action ? (
          <div className="md:ps-6">
            <div className="rounded-lg border border-line-strong bg-surface-raised p-4 shadow-seat">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-caption font-semibold uppercase tracking-[0.12em] text-foreground-faint">
                    הפעולה הבאה
                  </div>
                  <h3 className="mt-1.5 text-subheading font-semibold leading-snug text-foreground">
                    {action.labelHe}
                  </h3>
                  <p className="mt-1 text-caption text-foreground-soft">{action.reasonHe}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold-100 text-gold-600">
                  <CourtGlyph size={20} />
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {action.ownerHe ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-caption text-foreground-soft">
                    <UserGlyph size={13} className="text-foreground-faint" />
                    אחראי: {action.ownerHe}
                  </span>
                ) : null}
                {action.requiresApproval ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-caption text-foreground-soft">
                    <CheckGlyph size={13} className="text-foreground-faint" />
                    אישור: נדרש
                  </span>
                ) : null}
                <Button intent="primary" className="gap-1.5">
                  התחל בצעד <span aria-hidden>‹</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
