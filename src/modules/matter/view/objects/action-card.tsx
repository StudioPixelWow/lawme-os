import { Button } from "@/design-system/primitives/button";
import { CourtGlyph } from "@/design-system/icons/glyphs";
import type { ActionVM } from "../types";

/**
 * The next-action card (approved concept) — "what we do now": the move, its
 * tempo, who acts and under what approval/review, its expected effect, and the
 * one primary control.
 */
export function ActionCard({ action }: { action: ActionVM }) {
  const rows: { label: string; value: string }[] = [];
  if (action.ownerHe) rows.push({ label: "אחראי", value: action.ownerHe });
  rows.push({ label: "אישור", value: action.requiresApproval ? "נדרש" : "אינו נדרש" });
  if (action.reviewTargetHe) rows.push({ label: "בדיקה", value: action.reviewTargetHe });

  return (
    <section className="flex flex-col rounded-xl border border-line-strong bg-surface p-5 shadow-lift" aria-label="הצעד הבא">
      <div className="flex items-center gap-2 text-caption font-semibold text-foreground-soft">
        <CourtGlyph size={15} className="text-gold-600" />
        מה עושים עכשיו
      </div>

      <h3 className="mt-3 text-subheading font-semibold leading-snug text-foreground">
        {action.labelHe}
      </h3>
      <p className="mt-1.5 text-small text-foreground-soft">{action.reasonHe}</p>

      <dl className="mt-4 space-y-2 border-t border-line-strong pt-4 text-caption">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-12 shrink-0 text-foreground-faint">{r.label}</dt>
            <dd className="text-foreground-soft">{r.value}</dd>
          </div>
        ))}
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-foreground-faint">השפעה</dt>
          <dd className="text-foreground-soft">{action.expectedEffectHe}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <Button intent="primary" className="w-full gap-1.5">
          התחל בצעד <span aria-hidden>‹</span>
        </Button>
      </div>
    </section>
  );
}
