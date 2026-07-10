/**
 * Single source of truth for the OS navigation.
 * Five calm Hebrew words — see docs/design-system/08-navigation.md.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Short line shown in the command bar results. */
  hint: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "היום", hint: "התדריך היומי של המשרד" },
  { href: "/matters", label: "תיקים", hint: "כל תיקי המשרד" },
  { href: "/clients", label: "לקוחות", hint: "אנשים וחברות" },
  { href: "/calendar", label: "יומן", hint: "דיונים, מועדים ופגישות" },
  { href: "/documents", label: "מסמכים", hint: "ספריית המסמכים" },
];
