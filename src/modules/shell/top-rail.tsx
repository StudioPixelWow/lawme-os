"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchGlyph, SparkleGlyph } from "@/design-system/icons/glyphs";
import { Kbd } from "@/design-system/primitives/kbd";
import { cx } from "@/design-system/utils/cx";
import { NAV_ITEMS } from "@/config/navigation";
import { useShell } from "./shell-provider";

/**
 * The top rail — the only persistent chrome.
 * Words, not icons. Glass, slim, calm.
 * Docs: docs/design-system/08-navigation.md
 */
export function TopRail() {
  const pathname = usePathname();
  const { setCommandOpen, assistantOpen, setAssistantOpen } = useShell();

  return (
    <header className="glass sticky top-0 z-40">
      <div className="mx-auto flex h-14 w-full max-w-page items-center gap-3 px-4 md:gap-8 md:px-12">
        <Link
          href="/today"
          className="rounded-xs font-display text-subheading font-medium text-foreground"
        >
          {/* Latin wordmark, bidi-isolated inside the Hebrew rail */}
          <span dir="ltr">LawME</span>
        </Link>

        <nav
          aria-label="ניווט ראשי"
          className="scrollbar-none flex h-full flex-1 items-center gap-1 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex h-full shrink-0 items-center rounded-xs px-3 text-small transition-colors",
                  active
                    ? "font-medium text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:animate-underline after:rounded-pill after:bg-accent"
                    : "text-foreground-soft hover:text-foreground",
                )}
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="group hidden h-9 items-center gap-3 rounded-pill bg-surface-raised/50 px-4 text-small text-foreground-soft shadow-hairline transition-all hover:bg-surface-raised hover:text-foreground hover:shadow-raised sm:flex"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <SearchGlyph
            size={15}
            className="text-foreground-faint transition-colors group-hover:text-foreground-soft"
          />
          <span>חיפוש</span>
          <Kbd>⌘K</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="חיפוש"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-foreground-soft transition-colors hover:bg-surface-sunken sm:hidden"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <SearchGlyph size={18} />
        </button>

        <button
          type="button"
          onClick={() => setAssistantOpen(!assistantOpen)}
          aria-label="עמית — העמית המשפטי"
          aria-pressed={assistantOpen}
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-pill transition-all",
            assistantOpen
              ? "bg-gold-100 text-gold-600 shadow-gold-breath"
              : "text-foreground-soft hover:bg-gold-100/70 hover:text-gold-700",
          )}
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <SparkleGlyph size={18} />
        </button>

        <div
          aria-label="תיק אישי — טל"
          title="טל"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-caption text-paper-0 shadow-raised"
        >
          ט
        </div>
      </div>
    </header>
  );
}
