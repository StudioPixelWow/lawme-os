import { ClockGlyph } from "@/design-system/icons/glyphs";
import { ATTENTION_ITEMS, PRIORITY_LABELS } from "../data";
import { ToneChip } from "./section-heading";

/**
 * The attention surface — what needs the lawyer right now,
 * with clear priority labels and times.
 */
export function AttentionPanel() {
  return (
    <div className="rounded-xl bg-surface-raised shadow-raised">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-small font-semibold text-foreground">
          דורש את תשומת לבך
        </h2>
        <span className="text-micro text-foreground-faint">
          {ATTENTION_ITEMS.length} פריטים
        </span>
      </div>
      <ul>
        {ATTENTION_ITEMS.map((item, index) => {
          const priority = PRIORITY_LABELS[item.priority];
          return (
            <li
              key={item.id}
              className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-sunken/50 ${
                index > 0 ? "border-t border-line/60" : ""
              }`}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-caption text-foreground-soft">
                  {item.detail}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <ToneChip
                  label={priority.label}
                  tone={priority.tone === "neutral" ? "neutral" : priority.tone}
                />
                <span className="flex items-center gap-1 text-micro tabular-nums text-foreground-faint">
                  <ClockGlyph size={11} />
                  {item.time}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
