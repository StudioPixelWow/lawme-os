"use client";

/**
 * Sprint 1 · P0-1 — the Compact Answer shown in the conversation panel.
 * Answer-first, scannable in ~5 seconds. Everything deeper (full reasoning, all
 * citations, excerpts, trace, counter-arguments, confidence/coverage detail)
 * lives in Full Research Mode — the compact view is never the whole answer.
 * Presentation only over ReasonedDinoResponse.
 */
import { cx } from "@/design-system/utils/cx";
import type { ReasonedDinoResponse } from "../types";
import {
  STATUS_TONE, CONF_TONE, ConfidenceMeter, CoverageMeter, RichCitation,
  MatterStatusLine, TrustChip, primaryCitation, deriveNextActions,
} from "./presentation";

export function CompactAnswer({ r, onExpand }: { r: ReasonedDinoResponse; onExpand: () => void }) {
  const primary = primaryCitation(r);
  const topAction = deriveNextActions(r)[0] ?? null;
  return (
    <div className="rounded-md border-s-2 border-accent bg-gold-100/50 p-4">
      {/* meta row */}
      <div className="flex items-center justify-between gap-2">
        <span className={cx("rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>
        <TrustChip r={r} />
      </div>

      {/* bottom line — HERO */}
      <p className="mt-2.5 text-subheading font-semibold leading-snug text-pretty text-foreground">{r.bottomLine.statementHe}</p>

      {/* confidence + coverage */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <ConfidenceMeter level={r.confidence.level} />
          <span className={cx("text-micro font-medium", CONF_TONE[r.confidence.level])}>ביטחון: {r.confidence.labelHe}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-micro text-foreground-faint">
          כיסוי: <CoverageMeter level={r.coverage.level} labelHe={r.coverage.labelHe} />
        </span>
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
          <ul className="mt-1"><RichCitation c={primary} /></ul>
        </div>
      ) : (
        <p className="mt-3 text-caption text-foreground-faint">אין כרגע אסמכתה מאומתת התומכת במסקנה.</p>
      )}

      {/* next action (single, top) */}
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
      >
        תצוגת מחקר מלאה — נימוק, כל המקורות, טענות נגד →
      </button>
    </div>
  );
}
