"use client";

/**
 * Compact Answer (Sprint 1 clarity + Sprint 2 delight).
 * Answer-first, scannable in ~5s, wrapped in a premium trust header. Depth lives
 * in Full Research Mode. Presentation only over ReasonedDinoResponse.
 */
import { cx } from "@/design-system/utils/cx";
import type { ReasonedDinoResponse } from "../types";
import {
  STATUS_TONE, ResponseTrustHeader, InteractiveConfidence, CoverageMeter,
  PremiumSourceCard, MatterStatusLine, primaryCitation, deriveNextActions,
} from "./presentation";

export function CompactAnswer({ r, onExpand }: { r: ReasonedDinoResponse; onExpand: () => void }) {
  const primary = primaryCitation(r);
  const topAction = deriveNextActions(r)[0] ?? null;
  return (
    <div className="animate-rise">
      <ResponseTrustHeader r={r} />
      <div className="rounded-b-md border-s-2 border-accent bg-gold-100/50 p-4">
        {/* legal status */}
        <span className={cx("rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>

        {/* bottom line — HERO (memo typography) */}
        <p className="mt-2.5 font-display text-subheading font-semibold leading-snug text-pretty text-foreground">{r.bottomLine.statementHe}</p>

        {/* interactive confidence + coverage */}
        <div className="mt-3 flex flex-col items-start gap-2">
          <InteractiveConfidence r={r} />
          <span className="inline-flex items-center gap-1.5 text-micro text-foreground-faint">כיסוי: <CoverageMeter level={r.coverage.level} labelHe={r.coverage.labelHe} /></span>
        </div>

        {/* matter status */}
        {r.applicationToMatter.hasMatter ? (
          <div className="mt-3 border-t border-line pt-2.5">
            <p className="text-micro font-semibold tracking-wide text-foreground-faint">מצב התיק</p>
            <div className="mt-1"><MatterStatusLine r={r} /></div>
          </div>
        ) : null}

        {/* primary verified citation */}
        {primary ? (
          <div className="mt-3">
            <p className="text-micro font-semibold tracking-wide text-foreground-faint">אסמכתה מרכזית מאומתת</p>
            <ul className="mt-1"><PremiumSourceCard c={primary} /></ul>
          </div>
        ) : (
          <p className="mt-3 text-caption text-foreground-faint">אין כרגע אסמכתה מאומתת התומכת במסקנה.</p>
        )}

        {/* next action */}
        {topAction ? (
          <div className="mt-3 rounded-sm bg-surface-raised/70 px-2.5 py-2">
            <p className="text-micro font-semibold text-foreground-faint">הצעד הבא</p>
            <p className="mt-0.5 text-caption font-medium text-foreground">☐ {topAction.textHe}</p>
          </div>
        ) : null}

        {/* expand */}
        <button
          type="button"
          onClick={onExpand}
          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-sm border border-line-strong bg-surface px-3 py-2 text-small font-medium text-gold-700 transition-colors hover:bg-surface-sunken"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          תצוגת מחקר מלאה — נימוק, כל המקורות, טענות נגד →
        </button>
      </div>
    </div>
  );
}
