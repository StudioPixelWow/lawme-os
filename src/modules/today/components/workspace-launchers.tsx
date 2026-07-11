import Link from "next/link";
import type { ReactNode } from "react";
import {
  BriefcaseGlyph,
  CalendarGlyph,
  DinoGlyph,
  DocumentGlyph,
  LedgerGlyph,
  ResearchGlyph,
  UserGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { ICON } from "@/design-system/icons/tokens";
import { IconContainer, type IconContainerVariant } from "@/design-system/primitives/icon-container";
import { cx } from "@/design-system/utils/cx";
import { SectionHeading } from "./section-heading";

type Launcher = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  variant: IconContainerVariant;
  href?: string;
  soon?: boolean;
};

const LAUNCHERS: Launcher[] = [
  {
    id: "matters",
    name: "תיקים",
    description: "ניהול ההליכים והמשימות",
    icon: <BriefcaseGlyph size={ICON.launcher} />,
    variant: "matter",
    href: "/matters",
  },
  {
    id: "documents",
    name: "מסמכים",
    description: "שולחן העבודה במסמכים",
    icon: <DocumentGlyph size={ICON.launcher} />,
    variant: "document",
    href: "/documents",
  },
  {
    id: "research",
    name: "מחקר משפטי",
    description: "חיפוש פסיקה וניתוח",
    icon: <ResearchGlyph size={ICON.launcher} />,
    variant: "research",
    soon: true,
  },
  {
    id: "clients",
    name: "לקוחות",
    description: "תקשורת ועדכונים",
    icon: <UserGlyph size={ICON.launcher} />,
    variant: "client",
    href: "/clients",
  },
  {
    id: "calendar",
    name: "יומן",
    description: "דיונים, מועדים ופגישות",
    icon: <CalendarGlyph size={ICON.launcher} />,
    variant: "calendar",
    href: "/calendar",
  },
  {
    id: "team",
    name: "צוות",
    description: "עומסים, נוכחות וקיבולת",
    icon: <UsersGlyph size={ICON.launcher} />,
    variant: "team",
    soon: true,
  },
  {
    id: "finance",
    name: "פיננסים",
    description: "חיוב, גבייה ודוחות",
    icon: <LedgerGlyph size={ICON.launcher} />,
    variant: "finance",
    soon: true,
  },
  {
    id: "dino",
    name: "תובנות דינו",
    description: "אינטליגנציה משרדית",
    icon: <DinoGlyph size={ICON.launcher} />,
    variant: "dino",
    soon: true,
  },
];

function LauncherBody({ launcher }: { launcher: Launcher }) {
  return (
    <>
      <IconContainer variant={launcher.variant} size="xl" interactive>
        {launcher.icon}
      </IconContainer>
      <span className="mt-3 flex items-center gap-2 text-small font-semibold text-foreground">
        {launcher.name}
        {launcher.soon ? (
          <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-foreground-faint">
            בקרוב
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 text-micro leading-snug text-foreground-faint">
        {launcher.description}
      </span>
    </>
  );
}

/**
 * סביבת העבודה המשרדית — the doors into LawME's dedicated
 * applications. Each launcher is an entrance, not a tile: a premium
 * icon seat, the workspace name, one functional line. Hover lifts
 * the door into glass.
 */
export function WorkspaceLaunchers() {
  return (
    <section aria-label="סביבת העבודה המשרדית">
      <SectionHeading
        title="סביבת העבודה המשרדית"
        caption="כניסה ליישומי המשרד הייעודיים"
      />

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {LAUNCHERS.map((launcher) => {
          const inner = <LauncherBody launcher={launcher} />;
          const shared = cx(
            "living-edge group flex h-full w-full flex-col items-start rounded-xl p-4 text-start transition-all",
            "surface-paper hover:glass hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lift",
          );
          return (
            <li key={launcher.id} className="min-w-0">
              {launcher.href ? (
                <Link
                  href={launcher.href}
                  className={shared}
                  style={{ transitionDuration: "var(--motion-smooth)" }}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  className={shared}
                  style={{ transitionDuration: "var(--motion-smooth)" }}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
