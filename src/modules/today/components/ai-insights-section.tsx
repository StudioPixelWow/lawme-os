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

function InsightCard({
  insight,
  featured = false,
}: {
  insight: Insight;
  featured?: boolean;
}) {
  const cat = CATEGORY[insight.category];
  return (
    <article
      className={`group flex h-full flex-col rounded-md border-s-2 border-accent bg-gold-100/60 transition-all hover:-translate-y-px hover:shadow-lift ${
        featured ? "p-6 md:p-7" : "p-5"
      }`}
      style={{ transitionDuration: "var(--motion-quick)" }}
    >
      <div className="flex items-center gap-2.5">
        <IconContainer
          variant={cat.variant}
          size={featured ? "md" : "sm"}
          interactive
        >
          <cat.Glyph size={featured ? 17 : 14} />
        </IconContainer>
        <p className="min-w-0 flex-1 truncate text-small font-semibold text-foreground">
          {insight.categoryLabel}
          <span className="ms-2 font-normal text-foreground-faint">
            {insight.matter}
          </span>
        </p>
        <StatusText status={cat.status}>השפעה {insight.impact}</StatusText>
      </div>
      <p
        className={`mt-3 leading-relaxed text-pretty text-foreground ${
          featured ? "max-w-2xl text-subheading" : "text-small"
        }`}
      >
        {insight.text}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        <Link
          href={INSIGHT_LINKS[insight.id] ?? "/matters"}
          className="rounded-xs text-small font-medium text-foreground transition-colors hover:text-gold-700"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {insight.action} ←
        </Link>
        <ConfidenceBar value={insight.confidence} className="ms-auto" />
        <span className="truncate text-micro text-foreground-faint">
          {insight.source}
        </span>
      </div>
    </article>
  );
}

/**
 * מה עמית מצא — one featured finding, two quiet supporting ones.
 * Asymmetric by design; the intelligence area, not an analytics grid.
 */
export function AIInsightsSection() {
  const [featured, ...rest] = AI_INSIGHTS;
  return (
    <section aria-label="תובנות AI">
      <SectionHeading
        title="מה עמית מצא הבוקר"
        caption={`עודכן ${AI_INSIGHTS_META.updatedAt} · מבוסס על מסמכי המשרד ונט המשפט`}
      />
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InsightCard insight={featured} featured />
        <div className="flex flex-col gap-5">
          {rest.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-micro text-foreground-faint">
        <AIMark />
        עמית עשוי לטעות — בדוק לפני הסתמכות
      </p>
    </section>
  );
}
