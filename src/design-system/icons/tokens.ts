/**
 * Semantic icon sizes — every icon in the product is placed through
 * one of these roles. No ad-hoc pixel sizing inside components.
 * Docs: docs/design-system/iconography.md
 */
export const ICON = {
  /** metadata rows, timestamps, micro facts */
  metadata: 14,
  /** inline with body text */
  inline: 16,
  /** compact actions, chips */
  action: 18,
  /** navigation items */
  nav: 20,
  /** section headers */
  section: 24,
  /** workspace launchers */
  launcher: 28,
  /** featured operational objects */
  featured: 32,
  /** major status / empty states */
  status: 40,
} as const;

export type IconRole = keyof typeof ICON;
