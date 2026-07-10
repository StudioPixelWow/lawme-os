import Link from "next/link";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import { AI_INSIGHTS, AI_INSIGHTS_META } from "../data";
import { SectionHeading } from "./section-heading";

const INSIGHT_LINKS: Record<string, string> = {
  "i-1": "/matters",
  "i-2": "/documents",
  "i-3": "/matters",
};

/**
 * תובנות AI — gold-marked findings with confidence, source and a
 * concrete next step. Provenance is stated once, plainly.
 */
export function AIInsightsSection() {
  return (
    <section aria-label="תובנות AI" className="flex h-full flex-col">
      <SectionHeading
        title="תובנות AI"
        caption={`נוצר על ידי ${AI_INSIGHTS_META.generatedBy} · עודכן ${AI_INSIGHTS_META.updatedAt}`}
      />
      <div className="mt-5 flex flex-1 flex-col gap-3">
        {AI_INSIGHTS.map((insight) => (
          <article
            key={insight.id}
            className="rounded-md border-s-2 border-accent bg-gold-100/60 p-4 transition-shadow hover:shadow-raised"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <p className="text-small leading-relaxed text-foreground">
              {insight.text}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-micro tabular-nums text-foreground-soft">
                ביטחון {insight.confidence}%
              </span>
              <div
                aria-hidden
                className="h-1 w-14 overflow-hidden rounded-pill bg-gold-200"
              >
                <div
                  className="h-full rounded-pill bg-gold-600"
                  style={{ width: `${insight.confidence}%` }}
                />
              </div>
              <span className="min-w-0 flex-1 truncate text-end text-micro text-foreground-faint">
                {insight.source}
              </span>
            </div>
            <Link
              href={INSIGHT_LINKS[insight.id] ?? "/matters"}
              className="mt-3 inline-block rounded-xs text-small font-medium text-foreground transition-colors hover:text-gold-700"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {insight.action} ←
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-micro text-foreground-faint">
        <SparkleGlyph size={11} className="shrink-0 text-gold-600" />
        מבוסס על מסמכי המשרד ונט המשפט · עמית עשוי לטעות — בדוק לפני הסתמכות
      </p>
    </section>
  );
}
