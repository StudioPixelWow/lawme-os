"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SectionHeading } from "./section-heading";
import styles from "./workspace-launchers.module.css";

type NavigationItem = {
  key: string;
  title: string;
  description: string;
  /** real transparent liquid-gold PNG from public/brand */
  icon: string;
  href?: string;
  soon?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    key: "cases",
    title: "תיקים",
    description: "ניהול התיקים והמשימות",
    icon: "/brand/תיקים.png",
    href: "/matters",
  },
  {
    key: "documents",
    title: "מסמכים",
    description: "שולחן העבודה במסמכים",
    icon: "/brand/מסמכים.png",
    href: "/documents",
  },
  {
    key: "legal-research",
    title: "מחקר משפטי",
    description: "חיפוש פסיקה וניתוח משפטי",
    icon: "/brand/מחקר משפטי.png",
    soon: true,
  },
  {
    key: "clients",
    title: "לקוחות",
    description: "תקשורת ועדכונים",
    icon: "/brand/לקוחות.png",
    href: "/clients",
  },
  {
    key: "calendar",
    title: "יומן",
    description: "דיונים, מועדים ופגישות",
    icon: "/brand/יומן.png",
    href: "/calendar",
  },
  {
    key: "team",
    title: "צוות",
    description: "עומסים, נוכחות וקיבולת",
    icon: "/brand/צוות.png",
    soon: true,
  },
  {
    key: "finance",
    title: "פיננסים",
    description: "חיוב, גבייה ודוחות",
    icon: "/brand/פיננסים.png",
    soon: true,
  },
  {
    key: "dino-insights",
    title: "תובנות דינו",
    description: "אינטליגנציה משרדית",
    icon: "/brand/תובנות דינו.png",
    soon: true,
  },
];

/** One Liquid Gold navigation card — the whole card is the control. */
function LawMeNavigationCard({
  item,
  active,
}: {
  item: NavigationItem;
  active: boolean;
}) {
  const body = (
    <>
      <span className={styles.iconWrap}>
        <Image
          src={item.icon}
          alt=""
          aria-hidden="true"
          width={264}
          height={264}
          className={styles.icon}
        />
      </span>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.description}>{item.description}</p>
      {item.soon ? <span className={styles.badge}>בקרוב</span> : null}
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-label={`${item.title} — ${item.description}`}
        data-active={active || undefined}
        className={styles.card}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${item.title} — ${item.description} (בקרוב)`}
      className={styles.card}
    >
      {body}
    </button>
  );
}

/**
 * סביבת העבודה המשרדית — the Liquid Gold navigation row. Deep
 * blue-black glass cards with a thin gold frame and the 3D
 * liquid-gold marks; the depth lives in the assets, the restraint
 * in the CSS. Routes, badges and behavior unchanged.
 */
export function WorkspaceLaunchers() {
  const pathname = usePathname();

  return (
    <section aria-label="סביבת העבודה המשרדית">
      <SectionHeading
        title="סביבת העבודה המשרדית"
        caption="כניסה ליישומי המשרד הייעודיים"
      />

      <ul className={`${styles.grid} mt-5 list-none`}>
        {navigationItems.map((item) => (
          <li key={item.key} className="min-w-0">
            <LawMeNavigationCard
              item={item}
              active={Boolean(item.href && pathname.startsWith(item.href))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
