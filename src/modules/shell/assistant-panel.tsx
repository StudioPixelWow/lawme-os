"use client";

import { CloseGlyph, SparkleGlyph } from "@/design-system/icons/glyphs";
import { cx } from "@/design-system/utils/cx";
import { useShell } from "./shell-provider";

/**
 * עמית — the floating AI companion panel (placeholder).
 * Glass, floating at the start edge; slides in from that edge
 * (physical +x here because the start edge is the right edge in RTL —
 * an LTR variant would flip this offset). `inert` keeps its controls
 * out of the tab order while closed.
 * Docs: docs/design-system/11-ai-visual-language.md
 */
export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen } = useShell();

  return (
    <aside
      aria-label="עמית — העמית המשפטי"
      inert={!assistantOpen}
      className={cx(
        "glass fixed z-40 flex flex-col rounded-xl",
        "start-3 top-18 bottom-3 w-[min(24rem,calc(100vw-1.5rem))] md:start-6 md:bottom-6",
        "ease-settle transition-all",
        assistantOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-8 opacity-0",
      )}
      style={{ transitionDuration: "var(--motion-scene)" }}
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <SparkleGlyph
          size={18}
          className={cx("text-gold-600", assistantOpen && "animate-breath")}
        />
        <div className="flex-1">
          <p className="font-display text-subheading font-medium text-foreground">
            עמית
          </p>
          <p className="text-caption text-foreground-faint">
            העמית המשפטי של המשרד
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssistantOpen(false)}
          aria-label="סגירת עמית"
          className="flex h-8 w-8 items-center justify-center rounded-pill text-foreground-soft transition-colors hover:bg-surface-sunken"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <CloseGlyph size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-md border-s-2 border-accent bg-gold-100 p-4">
          <p className="text-small text-foreground">
            שלום, אני עמית. בקרוב אדע לסכם תיקים, לנסח טיוטות, לאתר מועדים
            במסמכים ולענות על שאלות — הכול בתוך ההקשר שבו אתם עובדים.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-micro text-foreground-faint">
            <SparkleGlyph size={11} className="text-gold-600" />
            עמית · דוגמה לאופן שבו תוכן של עמית יופיע
          </p>
        </div>

        <p className="mt-6 px-1 text-caption text-foreground-faint">
          עמית תמיד יציע — ואתם תמיד תחליטו. שום פעולה לא תתבצע בלי אישור
          שלכם.
        </p>
      </div>

      <footer className="border-t border-line p-4">
        <input
          disabled
          placeholder="לכתוב לעמית… (בקרוב)"
          className="h-11 w-full rounded-sm bg-surface-raised px-4 text-small text-foreground shadow-hairline outline-none disabled:opacity-60"
        />
      </footer>
    </aside>
  );
}
