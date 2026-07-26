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
      <div className="rounded-b-lg border-x border-b border-line-strong bg-surface p-5">
        {/* legal status — quiet eyebrow */}
        <span className={cx("inline-block rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>

        {/* bottom line — the memorandum's opening statement */}
        <p className="mt-3 max-w-[46ch] font-display text-subheading font-semibold leading-snug text-pretty text-foreground">{r.bottomLine.statementHe}</p>

        {/* confidence + coverage */}
        <div className="mt-4 flex flex-col items-start gap-2">
          <InteractiveConfidence r={r} />
          <span className="inline-flex items-center gap-1.5 text-micro text-foreground-faint">כיסוי: <CoverageMeter level={r.coverage.level} labelHe={r.coverage.labelHe} /></span>
        </div>

        {/* matter status */}
        {r.applicationToMatter.hasMatter ? (
          <section className="mt-6">
            <p className="text-micro uppercase tracking-widest text-foreground-faint">מצב התיק</p>
            <div className="mt-2"><MatterStatusLine r={r} /></div>
          </section>
        ) : null}

        {/* primary verified citation */}
        {primary ? (
          <section className="mt-6">
            <p className="text-micro uppercase tracking-widest text-foreground-faint">אסמכתה מרכזית</p>
            <ul className="mt-2"><PremiumSourceCard c={primary} /></ul>
          </section>
        ) : (
          <p className="mt-6 text-caption text-foreground-faint">אין כרגע אסמכתה מאומתת התומכת במסקנה.</p>
        )}

        {/* next action */}
        {topAction ? (
          <section className="mt-6">
            <p className="text-micro uppercase tracking-widest text-foreground-faint">הצעד הבא</p>
            <p className="mt-2 text-caption text-foreground">☐ {topAction.textHe}</p>
          </section>
        ) : null}

        {/* expand */}
        <button
          type="button"
          onClick={onExpand}
          className="mt-7 inline-flex items-center gap-1.5 text-small font-medium text-gold-700 hover:text-gold-800"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          תצוגת מחקר מלאה — נימוק, מקורות, טענות נגד →
        </button>
      </div>
    </div>
  );
}
