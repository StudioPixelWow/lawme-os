import Link from "next/link";
import {
  ClockGlyph,
  CourtGlyph,
  DocumentGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
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
 * המסלול — the morning as an operational sequence, not stacked
 * rectangles: numbered stations on one connected line, in the
 * order עמית recommends walking them.
 */
export function AttentionPanel() {
  return (
    <div>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-small font-semibold text-foreground">
          המסלול שלך הבוקר
        </h2>
        <span className="text-micro text-foreground-faint">
          {ATTENTION_ITEMS.length} תחנות · לפי סדר מומלץ
        </span>
      </div>

      <ol className="mt-4">
        {ATTENTION_ITEMS.map((item, index) => {
          const priority = PRIORITY_LABELS[item.priority];
          const { Glyph, variant } = KIND_ICON[item.kind];
          const last = index === ATTENTION_ITEMS.length - 1;
          return (
            <li key={item.id} className="relative flex gap-4">
              {/* the route line */}
              <div className="flex flex-col items-center">
                <IconContainer variant={variant} size="md" interactive>
                  <Glyph size={16} />
                </IconContainer>
                {!last ? (
                  <span aria-hidden className="w-px flex-1 bg-line" />
                ) : null}
              </div>

              <div
                className={cx(
                  "group min-w-0 flex-1 pt-1",
                  !last && "pb-6",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-micro font-semibold tabular-nums text-foreground-faint">
                    {index + 1}
                  </span>
                  <h3 className="text-body font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <StatusText status={priority.status}>
                    {priority.label}
                  </StatusText>
                  <span className="ms-auto flex shrink-0 items-center gap-1 text-caption tabular-nums text-foreground-soft">
                    <ClockGlyph size={12} className="text-foreground-faint" />
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 truncate text-caption text-foreground-soft">
                  {item.matter}
                  <span className="text-foreground-faint"> · {item.detail}</span>
                </p>
                <Link
                  href={ATTENTION_LINKS[item.id] ?? "/matters"}
                  className="mt-1.5 inline-block rounded-xs text-caption font-medium text-foreground transition-colors hover:text-gold-700"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {item.action} ←
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
