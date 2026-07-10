import Link from "next/link";
import {
  ClockGlyph,
  CourtGlyph,
  DocumentGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { StatusText } from "@/design-system/primitives/indicators";
import { ATTENTION_ITEMS, PRIORITY_LABELS } from "../data";

const ATTENTION_LINKS: Record<string, string> = {
  "att-1": "/matters",
  "att-2": "/documents",
  "att-3": "/clients",
};

const KIND_ICON = {
  hearing: { Glyph: CourtGlyph, variant: "urgent" as const },
  document: { Glyph: DocumentGlyph, variant: "document" as const },
  client: { Glyph: UserGlyph, variant: "client" as const },
};

/**
 * The attention surface — large, elegant cards:
 * semantic icon · time · priority · matter · one concrete action.
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
        const { Glyph, variant } = KIND_ICON[item.kind];
        return (
          <article
            key={item.id}
            className="group surface-paper-raised rounded-xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            style={{ transitionDuration: "var(--motion-settle)" }}
          >
            <div className="flex items-start gap-5">
              <IconContainer variant={variant} size="lg" interactive>
                <Glyph size={20} />
              </IconContainer>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-subheading font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <StatusText status={priority.status}>
                    {priority.label}
                  </StatusText>
                </div>
                <p className="mt-1 truncate text-small text-foreground-soft">
                  {item.matter}
                  <span className="text-foreground-faint">
                    {" "}
                    · {item.detail}
                  </span>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 pt-1 text-small font-medium tabular-nums text-foreground-soft">
                <ClockGlyph size={14} className="text-foreground-faint" />
                {item.time}
              </span>
            </div>
            <div className="mt-5 border-t border-line/50 pt-3.5">
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
