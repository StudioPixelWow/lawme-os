import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { DOT, TEXT } from "./tone";
import type { ActionVM, BlockerVM } from "../types";

/**
 * The operational workspace — one conversation, not two cards.
 * Why the matter is blocked (start edge) flows across the gold meridian into what
 * we do about it (end edge): problem → resolution, read as a single thought. The
 * next move is the one irresistible control on the page.
 */
export function OperationalWorkspace({
  blocker,
  action,
}: {
  blocker: BlockerVM | null;
  action: ActionVM | null;
}) {
  if (!blocker && !action) return null;

  const meta = action
    ? [
        action.ownerHe,
        action.dueHe,
        action.requiresApproval ? "טעון אישור אנושי" : null,
        action.reviewTargetHe,
        action.expectedEffectHe,
      ].filter((p): p is string => Boolean(p))
    : [];

  return (
    <section className="mt-12" aria-label="מוקד תפעולי">
      <div className="grid gap-10 md:grid-cols-2 md:gap-0">
        {blocker ? (
          <div className="min-w-0 md:pe-12">
            <div className={cx("flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em]", TEXT[blocker.tone])}>
              <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[blocker.tone])} />
              מה חוסם
            </div>
            <h3 className="mt-2.5 text-subheading font-semibold leading-snug text-foreground">
              {blocker.titleHe}
            </h3>
            <p className="mt-2 max-w-[46ch] text-small leading-relaxed text-foreground-soft">
              {blocker.whyHe}
            </p>
            <dl className="mt-4 space-y-1.5 text-caption text-foreground-faint">
              {blocker.missingHe.length ? (
                <div className="flex gap-2">
                  <dt className="w-10 shrink-0">חסר</dt>
                  <dd className="text-foreground-soft">{blocker.missingHe.join(" · ")}</dd>
                </div>
              ) : null}
              {blocker.sourceHe ? (
                <div className="flex gap-2">
                  <dt className="w-10 shrink-0">מקור</dt>
                  <dd className="text-foreground-soft">{blocker.sourceHe}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
          <div />
        )}

        {action ? (
          <div className="min-w-0 border-t border-gold-500/25 pt-8 md:border-t-0 md:border-s md:pt-0 md:ps-12">
            <div className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
              מה עושים עכשיו
            </div>
            <p className="mt-2.5 text-subheading font-semibold leading-snug text-foreground">
              {action.labelHe}
            </p>
            <p className="mt-1.5 text-small text-foreground-soft">{action.reasonHe}</p>
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
      </div>
    </section>
  );
}
