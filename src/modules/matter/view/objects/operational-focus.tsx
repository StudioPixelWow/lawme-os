import { cx } from "@/design-system/utils/cx";
import { Button } from "@/design-system/primitives/button";
import { DOT, TEXT } from "./tone";
import type { ActionVM, BlockerVM } from "../types";

/** The top blocker — an open operational object, not a paragraph. */
function Blocker({ blocker }: { blocker: BlockerVM }) {
  return (
    <div className="min-w-0">
      <div className={cx("flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em]", TEXT[blocker.tone])}>
        <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[blocker.tone])} />
        חסם עיקרי
      </div>

      <h3 className="mt-3 text-subheading font-semibold leading-snug text-foreground">
        {blocker.titleHe}
      </h3>
      <p className="mt-2 max-w-[46ch] text-small leading-relaxed text-foreground-soft">
        {blocker.whyHe}
      </p>

      <dl className="mt-4 space-y-1.5 text-caption text-foreground-faint">
        {blocker.stageHe ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground-faint">שלב</dt>
            <dd className="text-foreground-soft">{blocker.stageHe}</dd>
          </div>
        ) : null}
        {blocker.missingHe.length ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground-faint">חסר</dt>
            <dd className="text-foreground-soft">{blocker.missingHe.join(" · ")}</dd>
          </div>
        ) : null}
        {blocker.sourceHe ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground-faint">מקור</dt>
            <dd className="text-foreground-soft">{blocker.sourceHe}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1.5 text-small font-medium text-foreground-soft transition-colors hover:text-foreground"
      >
        {blocker.actionLabelHe}
        <span aria-hidden>←</span>
      </button>
    </div>
  );
}

/** The top action — the matter's next move; the clearest interactive object. */
function ActionPanel({ action }: { action: ActionVM }) {
  const meta: { label: string; value: string }[] = [];
  if (action.ownerHe) meta.push({ label: "אחראי/ת", value: action.ownerHe });
  if (action.dueHe) meta.push({ label: "יעד", value: action.dueHe });
  meta.push({ label: "אישור", value: action.requiresApproval ? "נדרש אישור אנושי" : "אינו טעון אישור" });
  if (action.reviewTargetHe) meta.push({ label: "בדיקה", value: action.reviewTargetHe });
  meta.push({ label: "השפעה", value: action.expectedEffectHe });

  return (
    <div className="rounded-lg border-s-2 border-gold-500 bg-surface-raised p-6 shadow-raised md:p-7">
      <div className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground-faint">
        הצעד הבא
      </div>
      <h3 className="mt-3 text-subheading font-semibold leading-snug text-foreground">
        {action.labelHe}
      </h3>
      <p className="mt-2 text-small text-foreground-soft">{action.reasonHe}</p>

      <div className="mt-5">
        <Button intent="primary" className="w-full sm:w-auto">
          התחל בצעד
        </Button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-ink-900/8 pt-4 text-caption">
        {meta.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-foreground-faint">{m.label}</dt>
            <dd className="mt-0.5 truncate text-foreground-soft" title={m.value}>{m.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Level 4 — operational focus.
 * The blocker (why the matter is stuck) beside the top action (its next move).
 * Deliberately asymmetric: the blocker is open text; the action is the room's
 * single raised, gold-tied surface — so the eye lands on the move to make.
 */
export function OperationalFocus({
  blocker,
  action,
}: {
  blocker: BlockerVM | null;
  action: ActionVM | null;
}) {
  if (!blocker && !action) return null;
  // Mobile leads with the next move (DOM order: action → blocker); desktop
  // restores blocker at the start edge (right) and the action at the end (left).
  return (
    <section className="mt-10 border-t border-ink-900/10 pt-8" aria-label="מוקד תפעולי">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        {action ? (
          <div className="md:order-2">
            <ActionPanel action={action} />
          </div>
        ) : (
          <div className="md:order-2" />
        )}
        {blocker ? (
          <div className="md:order-1">
            <Blocker blocker={blocker} />
          </div>
        ) : (
          <div className="md:order-1" />
        )}
      </div>
    </section>
  );
}
