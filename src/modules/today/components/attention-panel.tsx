import Link from "next/link";
import { ClockGlyph } from "@/design-system/icons/glyphs";
import { ATTENTION_ITEMS, PRIORITY_LABELS } from "../data";
import { ToneChip } from "./section-heading";

const ATTENTION_LINKS: Record<string, string> = {
  "att-1": "/matters",
  "att-2": "/documents",
  "att-3": "/clients",
};

/**
 * The attention surface — large, elegant cards:
 * time · priority · matter · one concrete action each.
 */
export function AttentionPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-small font-semibold text-foreground">
          דורש את תשומת לבך
        </h2>
        <span className="text-micro text-foreground-faint">
          {ATTENTION_ITEMS.length} פריטים · לפי דחיפות
        </span>
      </div>

      {ATTENTION_ITEMS.map((item) => {
        const priority = PRIORITY_LABELS[item.priority];
        return (
          <article
            key={item.id}
            className="group rounded-xl bg-surface-raised p-5 shadow-raised transition-all hover:-translate-y-0.5 hover:shadow-float"
            style={{ transitionDuration: "var(--motion-settle)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-subheading font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <ToneChip
                    label={priority.label}
                    tone={
                      priority.tone === "neutral" ? "neutral" : priority.tone
                    }
                  />
                </div>
                <p className="mt-1.5 truncate text-small text-foreground-soft">
                  {item.matter}
                  <span className="text-foreground-faint"> · {item.detail}</span>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 pt-1 text-small font-medium tabular-nums text-foreground-soft">
                <ClockGlyph size={14} className="text-foreground-faint" />
                {item.time}
              </span>
            </div>
            <div className="mt-4 border-t border-line/60 pt-3">
              <Link
                href={ATTENTION_LINKS[item.id] ?? "/matters"}
                className="rounded-xs text-small font-medium text-foreground transition-colors group-hover:text-gold-700"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {item.action} ←
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
