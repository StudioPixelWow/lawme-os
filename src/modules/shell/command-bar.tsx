"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchGlyph, SparkleGlyph } from "@/design-system/icons/glyphs";
import { Kbd } from "@/design-system/primitives/kbd";
import { cx } from "@/design-system/utils/cx";
import { NAV_ITEMS } from "@/config/navigation";
import { useShell } from "./shell-provider";

/**
 * The command bar (⌘K) — the fast path.
 * Three groups: ניווט · יצירה · שאל את דינו.
 * Sprint 0: navigation is live; creation and דינו are designed placeholders.
 * The dialog mounts fresh on every open, so its state needs no reset effects.
 */
export function CommandBar() {
  const { commandOpen } = useShell();
  if (!commandOpen) return null;
  return <CommandDialog />;
}

function CommandDialog() {
  const { setCommandOpen, setAssistantOpen } = useShell();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const results = NAV_ITEMS.filter(
    (item) => item.label.includes(query.trim()) || query.trim() === "",
  );

  const go = (href: string) => {
    setCommandOpen(false);
    router.push(href);
  };

  const askDino = () => {
    setCommandOpen(false);
    setAssistantOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="סגירה"
        onClick={() => setCommandOpen(false)}
        className="absolute inset-0 bg-ink-950/25"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="חיפוש ופקודות"
        className="glass animate-rise relative mx-auto mt-[14vh] w-[min(92vw,36rem)] rounded-xl"
        style={{ animationDuration: "var(--motion-scene)" }}
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <SearchGlyph size={18} className="shrink-0 text-foreground-faint" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) go(results[0].href);
            }}
            placeholder="חיפוש, ניווט או שאלה לדינו…"
            className="h-14 w-full bg-transparent text-body text-foreground outline-none"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          <p className="px-3 pt-2 pb-1 text-caption text-foreground-faint">
            ניווט
          </p>
          {results.map((item, index) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              className={cx(
                "flex w-full items-baseline gap-3 rounded-sm px-3 py-2.5 text-start transition-colors duration-150 hover:bg-surface-sunken",
                index === 0 && "bg-surface-sunken/60",
              )}
            >
              <span className="text-small font-medium text-foreground">
                {item.label}
              </span>
              <span className="text-caption text-foreground-faint">
                {item.hint}
              </span>
            </button>
          ))}
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-small text-foreground-soft">
              אין תוצאות ניווט — אפשר לשאול את דינו.
            </p>
          ) : null}

          <p className="px-3 pt-4 pb-1 text-caption text-foreground-faint">
            יצירה
          </p>
          <div className="flex w-full items-baseline gap-3 rounded-sm px-3 py-2.5 opacity-50">
            <span className="text-small font-medium text-foreground">
              תיק חדש
            </span>
            <span className="text-caption text-foreground-faint">בקרוב</span>
          </div>

          <div className="mx-3 mt-3 border-t border-gold-300" />
          <button
            type="button"
            onClick={askDino}
            className="mt-1 flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-start transition-colors duration-150 hover:bg-gold-100"
          >
            <SparkleGlyph size={16} className="shrink-0 text-gold-600" />
            <span className="text-small font-medium text-foreground">
              {query.trim() === ""
                ? "שאל את דינו"
                : `לשאול את דינו: ״${query.trim()}״`}
            </span>
          </button>
        </div>

        <footer className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-micro text-foreground-faint">
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> ניווט
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> סגירה
          </span>
        </footer>
      </div>
    </div>
  );
}
