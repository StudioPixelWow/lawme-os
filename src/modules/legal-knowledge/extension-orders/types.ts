/** Extension-order domain model (Epic 3B, Phase 6). */

export type ExtensionOrderScope = "general" | "sectoral";

export interface ExtensionOrder {
  orderId: string;                 // canonical slug
  titleHe: string;
  scope: ExtensionOrderScope;
  sectorHe: string | null;         // for sectoral orders
  coverageHe: string;              // what it grants (e.g. פנסיה חובה)
  geographicScopeHe: string;       // usually "כלל המשק"
  employeeCategoriesHe: string[];
  employerCategoriesHe: string[];
  relatedCollectiveAgreementHe: string | null;
  publicationDate: string | null; // ISO
  effectiveDate: string | null;
  expirationDate: string | null;
  replacementOrderId: string | null;   // order that this one replaces
  supersededByOrderId: string | null;  // order that replaces this one
  amendments: { date: string; summaryHe: string }[];
  applicabilityNotesHe: string[];
  officialSourceUrl: string | null;
  publisherHe: string;             // e.g. "זרוע העבודה / רשומות"
  verificationStatus: "verified" | "unverified";
}

export interface OrderSection {
  orderId: string;
  sectionNumber: string;
  sectionTitleHe: string | null;
  anchorKey: string;
  charStart: number;
  charEnd: number;
  content: string;
  canonicalSourceUrl: string | null;
}
