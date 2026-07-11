"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BriefcaseGlyph,
  CalendarGlyph,
  DinoGlyph,
  DocumentGlyph,
  GearGlyph,
  HomeGlyph,
  LedgerGlyph,
  PlusGlyph,
  ReportGlyph,
  ResearchGlyph,
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

/** Visual placeholders — no routes exist for these yet (visual sprint). */
const SECONDARY = [
  { label: "מחקר משפטי", Glyph: ResearchGlyph },
  { label: "דינו", Glyph: DinoGlyph },
  { label: "פיננסים", Glyph: LedgerGlyph },
  { label: "צוות", Glyph: UsersGlyph },
  { label: "דוחות", Glyph: ReportGlyph },
];

/**
 * The permanent navy sidebar — LawME's product anchor, fixed to the
 * start edge (right, RTL). Deep navy with a soft top light, gold
 * illuminated active state, logo plate, profile, main + secondary
 * navigation, settings at the bottom. Tablet: icon mode.
 */
export function SideRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className="surface-sidebar fixed inset-y-0 start-0 z-40 hidden w-20 flex-col border-e border-paper-0/10 md:flex lg:w-64"
    >
      {/* the logo — the brand plate itself */}
      <div className="flex justify-center px-4 pt-5 lg:px-5">
        <Link
          href="/today"
          aria-label="LawME — היום"
          className="block w-full overflow-hidden rounded-lg shadow-raised"
        >
          <Image
            src="/brand/lawme-logo2.png"
            alt="LawME"
            width={432}
            height={288}
            priority
            className="mx-auto h-14 w-auto rounded-md object-cover lg:h-auto lg:w-full lg:rounded-lg"
          />
        </Link>
      </div>

      {/* profile */}
      <div className="mt-6 flex items-center justify-center gap-3 border-y border-paper-0/8 px-4 py-4 lg:justify-start lg:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-gold-500/15 text-small font-semibold text-gold-300 shadow-seat">
          ד
        </span>
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-small font-semibold text-paper-0">
            עו״ד דניאל לוי
          </span>
          <span className="block truncate text-micro text-ink-200">
            שותף מנהל
          </span>
        </span>
      </div>

      {/* main navigation */}
      <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto px-3 lg:px-4">
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
                "relative flex h-12 items-center justify-center gap-3.5 rounded-lg px-3 text-body transition-all lg:justify-start lg:px-4",
                active
                  ? "bg-linear-to-b from-gold-500/22 to-gold-500/10 font-semibold text-gold-200 shadow-seat"
                  : "font-medium text-ink-100 hover:-translate-x-px hover:bg-paper-0/8 hover:text-paper-0",
              )}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <span
                aria-hidden
                className={cx(
                  "absolute start-0 h-6 w-0.5 rounded-pill bg-gold-400 transition-opacity",
                  active ? "animate-underline opacity-100" : "opacity-0",
                )}
              />
              <Glyph size={22} className="shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}

        {/* secondary navigation */}
        <p className="mt-6 hidden px-4 text-micro font-medium tracking-wider text-ink-300 lg:block">
          בקרוב
        </p>
        <div className="mt-1 flex flex-col gap-1">
          {SECONDARY.map((item) => (
            <span
              key={item.label}
              title={`${item.label} · בקרוב`}
              className="flex h-11 cursor-default items-center justify-center gap-3.5 rounded-md px-3 text-small font-medium text-ink-300/70 lg:justify-start lg:px-4"
            >
              <item.Glyph size={20} className="shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* primary action + settings — bottom */}
      <div className="border-t border-paper-0/8 px-3 py-4 lg:px-4">
        <button
          type="button"
          title="פעולה חדשה"
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-paper-0/10 px-3 text-small font-semibold text-paper-0 shadow-seat transition-all hover:-translate-y-px hover:bg-paper-0/15 hover:shadow-lift lg:justify-start lg:px-4"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <PlusGlyph size={18} className="shrink-0 text-gold-300" />
          <span className="hidden lg:inline">פעולה חדשה</span>
        </button>
        <span
          title="הגדרות · בקרוב"
          className="mt-1.5 flex h-11 cursor-default items-center justify-center gap-3.5 rounded-md px-3 text-small font-medium text-ink-200 lg:justify-start lg:px-4"
        >
          <GearGlyph size={20} className="shrink-0" />
          <span className="hidden lg:inline">הגדרות המשרד</span>
        </span>
        <p className="mt-2 hidden px-4 text-micro text-ink-300 lg:block">
          LawME OS · גרסה 0.9
        </p>
      </div>
    </nav>
  );
}
