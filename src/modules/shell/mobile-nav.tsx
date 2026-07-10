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

/** Mobile navigation — a glass bottom bar; the rail pattern for thumbs. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className="glass fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Glyph = GLYPHS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex min-w-14 flex-col items-center justify-center gap-1 rounded-md transition-colors",
                active
                  ? "text-foreground"
                  : "text-foreground-soft hover:text-foreground",
              )}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <span
                aria-hidden
                className={cx(
                  "absolute top-0 h-0.5 w-6 rounded-pill bg-accent transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Glyph size={20} />
              <span className="text-micro font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
