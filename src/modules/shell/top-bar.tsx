"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BellGlyph,
  SearchGlyph,
  SparkleGlyph,
} from "@/design-system/icons/glyphs";
import { Kbd } from "@/design-system/primitives/kbd";
import { cx } from "@/design-system/utils/cx";
import { useShell } from "./shell-provider";

/**
 * The top bar — integrated workspace chrome spanning the central
 * canvas between the navy sidebar (start) and the utility rail (end).
 * Search · דינו · notifications · profile. Hardware, not a header.
 */
export function TopBar() {
  const { setCommandOpen, assistantOpen, setAssistantOpen } = useShell();

  return (
    <header className="glass fixed top-0 end-0 start-0 z-30 md:start-20 lg:start-64 xl:end-72">
      <div className="flex h-16 w-full items-center gap-3 px-4 md:gap-6 md:px-8">
        {/* mobile-only logo (the sidebar owns it from md up) */}
        <Link
          href="/today"
          aria-label="LawME — היום"
          className="flex shrink-0 items-center rounded-xs md:hidden"
        >
          <Image
            src="/brand/lawme-logo.png"
            alt="LawME"
            width={60}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="group surface-paper hidden h-11 flex-1 items-center gap-3 rounded-lg px-5 text-small text-foreground-faint transition-all hover:shadow-lift sm:flex md:max-w-2xl"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <SearchGlyph size={16} className="shrink-0" />
          <span className="flex-1 text-start">
            חיפוש חכם: תיקים, לקוחות, מסמכים…
          </span>
          <Kbd>⌘K</Kbd>
        </button>
        <div className="flex-1 sm:hidden" />
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="חיפוש"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-foreground-soft transition-colors hover:bg-surface-sunken sm:hidden"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <SearchGlyph size={19} />
        </button>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAssistantOpen(!assistantOpen)}
            aria-label="דינו — הדינו המשפטי"
            aria-pressed={assistantOpen}
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-all",
              assistantOpen
                ? "bg-gold-100 text-gold-600 shadow-gold-breath"
                : "text-foreground-soft hover:bg-gold-100/70 hover:text-gold-700",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <SparkleGlyph size={19} />
          </button>

          <button
            type="button"
            aria-label="התראות — 2 חדשות"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-foreground-soft transition-colors hover:bg-surface-sunken"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <BellGlyph size={19} />
            <span
              aria-hidden
              className="absolute end-2.5 top-2.5 h-1.5 w-1.5 rounded-pill bg-gold-500"
            />
          </button>

          <div
            aria-label="דניאל לוי — פרופיל"
            title="דניאל לוי"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-caption text-paper-0 shadow-raised"
          >
            ד
          </div>
        </div>
      </div>
    </header>
  );
}
