"use client";

import {
  AlertGlyph,
  BookGlyph,
  SparkleGlyph,
  TaskGlyph,
  TrendGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark } from "@/design-system/primitives/indicators";
import { useShell } from "@/modules/shell";
import { AI_FINDINGS, AI_STATUS } from "../data";

const FINDING_ICON = {
  precedent: { Glyph: BookGlyph, variant: "info" as const },
  opportunity: { Glyph: TrendGlyph, variant: "success" as const },
  risk: { Glyph: AlertGlyph, variant: "urgent" as const },
  ready: { Glyph: TaskGlyph, variant: "gold" as const },
};

/**
 * עמית's intelligence surface — the brain of the office, on deep
 * lit navy: context, calm progress, four rich findings (icon,
 * count, explanation, action), provenance, one CTA.
 */
export function AIIntelligencePanel() {
  const { setAssistantOpen } = useShell();

  return (
    <section
      aria-label="עמית — מרכז הבינה של המשרד"
      className="surface-navy flex h-full flex-col rounded-xl p-7"
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

      <p className="mt-6 flex items-center gap-2 text-small text-ink-100">
        <span
          aria-hidden
          className="animate-breath h-1.5 w-1.5 shrink-0 rounded-pill bg-gold-400"
        />
        {AI_STATUS.statusLine}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={AI_STATUS.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={AI_STATUS.progressLabel}
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
      <p className="mt-1.5 text-micro text-ink-200">
        {AI_STATUS.progressLabel}
      </p>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {AI_FINDINGS.map((finding) => {
          const { Glyph, variant } = FINDING_ICON[finding.kind];
          return (
            <li
              key={finding.id}
              className="group flex items-center gap-4 rounded-md border border-paper-0/10 bg-ink-800/60 p-4 transition-all hover:-translate-y-px hover:border-gold-500/30 hover:bg-ink-800"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <IconContainer variant={variant} surface="navy" interactive>
                <Glyph size={17} />
              </IconContainer>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-baseline gap-2 text-small font-semibold text-paper-0">
                  <span className="truncate">{finding.label}</span>
                  <span className="shrink-0 text-subheading font-semibold tabular-nums text-gold-300">
                    {finding.count}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-micro leading-relaxed text-ink-200">
                  {finding.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="shrink-0 rounded-xs text-micro font-medium text-ink-200 transition-colors hover:text-gold-300"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {finding.action} ←
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-gold-500/50 text-small font-medium text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-500/10"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        לצפייה בכל התובנות
        <span aria-hidden>←</span>
      </button>

      <p className="mt-4 flex items-center gap-1.5 border-t border-paper-0/10 pt-4 text-micro text-ink-200">
        <AIMark surface="navy" />
        נוצר על ידי עמית · מקורות: {AI_STATUS.sources}
      </p>
    </section>
  );
}
