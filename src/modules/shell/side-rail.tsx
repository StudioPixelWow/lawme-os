"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BriefcaseGlyph,
  CalendarGlyph,
  DocumentGlyph,
  HomeGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { cx } from "@/design-system/utils/cx";
import { NAV_ITEMS, type NavItem } from "@/config/navigation";

const GLYPHS: Record<
  NavItem["icon"],
  ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
> = {
  home: HomeGlyph,
  briefcase: BriefcaseGlyph,
  users: UsersGlyph,
  calendar: CalendarGlyph,
  document: DocumentGlyph,
};

/**
 * The floating navigation rail — detached from the start edge (right,
 * in RTL), raised paper with soft depth. Tablet: icons only.
 * Desktop: icon + word. Mobile: hidden (floating bottom bar instead).
 */
export function SideRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className="glass fixed start-4 top-28 bottom-4 z-30 hidden w-20 flex-col gap-1.5 rounded-xl px-3 py-5 md:flex lg:start-6 lg:w-56"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const Glyph = GLYPHS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={cx(
              "relative flex h-11 items-center justify-center gap-3 rounded-md px-3 transition-all lg:justify-start",
              active
                ? "bg-gold-100/50 text-foreground shadow-gold-glow"
                : "text-foreground-soft hover:-translate-x-px hover:bg-surface-sunken/60 hover:text-foreground",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <span
              aria-hidden
              className={cx(
                "absolute start-0 h-5 w-0.5 rounded-pill bg-accent transition-opacity",
                active ? "animate-underline opacity-100" : "opacity-0",
              )}
            />
            <Glyph size={20} className="shrink-0" />
            <span className="hidden text-small font-medium lg:inline">
              {item.label}
            </span>
          </Link>
        );
      })}

      <div className="mt-auto hidden px-3 lg:block">
        <p className="text-micro text-foreground-faint">
          LawME · מערכת ההפעלה המשפטית
        </p>
      </div>
    </nav>
  );
}
