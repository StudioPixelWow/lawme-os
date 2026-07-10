/**
 * Single source of truth for the OS navigation.
 * Five calm Hebrew destinations — rendered by the side rail (desktop),
 * icon rail (tablet) and bottom bar (mobile).
 */
export type NavItem = {
  href: string;
  label: string;
  /** Short line shown in the command bar results. */
  hint: string;
  /** Glyph key — resolved by the shell against the icon set. */
  icon: "home" | "briefcase" | "users" | "calendar" | "document";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "היום", hint: "סביבת העבודה היומית", icon: "home" },
  { href: "/matters", label: "תיקים", hint: "כל תיקי המשרד", icon: "briefcase" },
  { href: "/clients", label: "לקוחות", hint: "אנשים וחברות", icon: "users" },
  { href: "/calendar", label: "יומן", hint: "דיונים, מועדים ופגישות", icon: "calendar" },
  { href: "/documents", label: "מסמכים", hint: "ספריית המסמכים", icon: "document" },
];
