import Link from "next/link";
import {
  ClockGlyph,
  DocumentGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { ATTENTION_ITEMS } from "../data";

const LINKS: Record<string, string> = {
  "att-2": "/documents",
  "att-3": "/clients",
};

const ICONS = { document: DocumentGlyph, client: UserGlyph } as const;

/**
 * העדיפויות התומכות — the secondary priorities of the day, rendered
 * quietly under the mission. The mission dominates; these whisper.
 */
export function SupportingPriorities() {
  const secondary = ATTENTION_ITEMS.filter((item) => item.kind !== "hearing");

  return (
    <div className="mt-6">
      <p className="text-micro font-medium tracking-wide text-ink-200">
        אחרי הדיון · {secondary.length} עדיפויות נוספות
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:gap-8">
        {secondary.map((item) => {
          const Glyph = ICONS[item.kind as keyof typeof ICONS] ?? DocumentGlyph;
          return (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-2 text-small text-ink-100"
            >
              <Glyph size={13} className="shrink-0 text-ink-200" />
              <span className="min-w-0 truncate">
                {item.title}
                <span className="text-ink-200"> · {item.matter}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-micro tabular-nums text-ink-200">
                <ClockGlyph size={10} />
                {item.time}
              </span>
              <Link
                href={LINKS[item.id] ?? "/matters"}
                className="shrink-0 rounded-xs text-micro font-medium text-ink-200 transition-colors hover:text-gold-300"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {item.action} ←
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
