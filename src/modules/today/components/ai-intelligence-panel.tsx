"use client";

import { SparkleGlyph } from "@/design-system/icons/glyphs";
import { useShell } from "@/modules/shell";
import { AI_FINDINGS, AI_STATUS } from "../data";

/**
 * עמית's intelligence surface — a real operating interface on deep navy:
 * status, calm progress, four live findings, provenance, one action.
 * The only dark region of the workspace; gold is data, not decoration.
 */
export function AIIntelligencePanel() {
  const { setAssistantOpen } = useShell();

  return (
    <section
      aria-label="עמית — מרכז הבינה של המשרד"
      className="flex h-full flex-col rounded-xl bg-ink-900 p-6 shadow-float"
    >
      <div className="flex items-center gap-3">
        <SparkleGlyph size={20} className="text-gold-400" />
        <h2 className="text-subheading font-semibold text-paper-50">עמית</h2>
        <span className="rounded-pill border border-gold-500/40 px-2 py-0.5 text-micro font-medium tracking-wide text-gold-400">
          AI
        </span>
        <span className="ms-auto text-micro tabular-nums text-ink-200">
          עודכן {AI_STATUS.updatedAt}
        </span>
      </div>

      <p className="mt-5 text-small text-ink-100">{AI_STATUS.statusLine}</p>
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={AI_STATUS.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="התקדמות ניתוח הבוקר"
          className="h-1 flex-1 overflow-hidden rounded-pill bg-ink-700"
        >
          <div
            className="animate-breath h-full rounded-pill bg-gold-500"
            style={{ width: `${AI_STATUS.progress}%` }}
          />
        </div>
        <span className="text-micro tabular-nums text-ink-200">
          {AI_STATUS.progress}%
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        {AI_FINDINGS.map((finding) => (
          <div
            key={finding.id}
            className="rounded-md border border-paper-0/10 bg-ink-800/70 p-3.5 transition-colors hover:border-gold-500/30"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <dd className="text-title font-semibold tabular-nums text-paper-0">
              {finding.count}
            </dd>
            <dt className="mt-1 text-small font-medium text-ink-100">
              {finding.label}
            </dt>
            <p className="mt-1 text-micro leading-relaxed text-ink-200">
              {finding.detail}
            </p>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-md border border-gold-500/50 text-small font-medium text-gold-300 transition-colors hover:bg-gold-500/10"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        לצפייה בכל התובנות
      </button>

      <p className="mt-4 flex items-center gap-1.5 text-micro text-ink-200">
        <SparkleGlyph size={11} className="shrink-0 text-gold-400" />
        נוצר על ידי עמית · מקורות: {AI_STATUS.sources}
      </p>
    </section>
  );
}
