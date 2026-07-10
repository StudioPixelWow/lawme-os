import Link from "next/link";
import {
  AlertGlyph,
  BookGlyph,
  LedgerGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import {
  AIMark,
  ConfidenceBar,
  StatusText,
  type Status,
} from "@/design-system/primitives/indicators";
import { AI_INSIGHTS, AI_INSIGHTS_META, type Insight } from "../data";
import { SectionHeading } from "./section-heading";

const CATEGORY: Record<
  Insight["category"],
  {
    Glyph: typeof BookGlyph;
    variant: "info" | "urgent" | "finance";
    status: Status;
  }
> = {
  precedent: { Glyph: BookGlyph, variant: "info", status: "new" },
  risk: { Glyph: AlertGlyph, variant: "urgent", status: "risk" },
  billing: { Glyph: LedgerGlyph, variant: "finance", status: "today" },
};

const INSIGHT_LINKS: Record<string, string> = {
  "i-1": "/matters",
  "i-2": "/documents",
  "i-3": "/matters",
};

/**
 * תובנות AI — categorized, gold-marked findings: icon, explanation,
 * confidence, source, related matter, impact, one action each.
 */
export function AIInsightsSection() {
  return (
    <section aria-label="תובנות AI" className="flex h-full flex-col">
      <SectionHeading
        title="תובנות AI"
        caption={`נוצר על ידי ${AI_INSIGHTS_META.generatedBy} · עודכן ${AI_INSIGHTS_META.updatedAt}`}
      />
      <div className="mt-5 flex flex-1 flex-col gap-3">
        {AI_INSIGHTS.map((insight) => {
          const cat = CATEGORY[insight.category];
          return (
            <article
              key={insight.id}
              className="group rounded-md border-s-2 border-accent bg-gold-100/60 p-4 transition-all hover:-translate-y-px hover:shadow-lift"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <div className="flex items-center gap-2.5">
                <IconContainer variant={cat.variant} size="sm" interactive>
                  <cat.Glyph size={14} />
                </IconContainer>
                <p className="flex-1 truncate text-small font-semibold text-foreground">
                  {insight.categoryLabel}
                  <span className="ms-2 font-normal text-foreground-faint">
                    {insight.matter}
                  </span>
                </p>
                <StatusText status={cat.status}>
                  השפעה {insight.impact}
                </StatusText>
              </div>
              <p className="mt-2.5 text-small leading-relaxed text-foreground">
                {insight.text}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <ConfidenceBar value={insight.confidence} />
                <span className="min-w-0 flex-1 truncate text-end text-micro text-foreground-faint">
                  {insight.source}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gold-300/50 pt-2.5">
                <Link
                  href={INSIGHT_LINKS[insight.id] ?? "/matters"}
                  className="rounded-xs text-small font-medium text-foreground transition-colors hover:text-gold-700"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {insight.action} ←
                </Link>
                <AIMark />
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-micro text-foreground-faint">
        <AIMark />
        מבוסס על מסמכי המשרד ונט המשפט · עמית עשוי לטעות — בדוק לפני הסתמכות
      </p>
    </section>
  );
}
