/**
 * Professional verified-legislation citation formatting (P1-S1 Phase 11/12).
 * Produces the display + copyable forms, badges, honest pinpoint statement,
 * and a Word-compatible export block — all license-aware.
 */
import type { LegalLicensePolicy } from "./types.ts";
import type { ResolvedProvision } from "./store.ts";
import { enforceExcerpt } from "./license.ts";
import { isWholeDocumentPinpoint } from "./invariants.ts";

const STATUTE_TITLES: Record<string, { titleHe: string; year: number }> = {
  "vlc-notice-2002": { titleHe: "חוק הודעה לעובד ולמועמד לעבודה (תנאי עבודה והליכי מיון וקבלה לעבודה)", year: 2002 },
  "vlc-minwage-1987": { titleHe: "חוק שכר מינימום", year: 1987 },
  "vlc-minwage-rate": { titleHe: "שיעור שכר המינימום במשק", year: 2026 },
};

export interface CitationView {
  citationId: string;
  sourceId: string;
  versionId: string;
  effectiveStatus: string; // "in_force" | ...
  titleHe: string;
  year: number | null;
  sectionHe: string; // e.g. "סעיף 1"
  verifiedBadgeHe: string; // "מאומת"
  officialBadge: boolean; // true only when the LINK is an official-gazette link
  officialSourceLabelHe: string | null;
  effectiveDateHe: string | null;
  currentnessHe: string;
  link: string | null;
  pinpointResolvable: boolean;
  pinpointStatementHe: string | null;
  excerptHe: string | null;
  excerptTruncated: boolean;
  attributionHe: string | null;
  displayFormHe: string;
  copyableForm: string;
  supportsProposition: string;
}

function titleFor(sourceId: string): { titleHe: string; year: number } {
  return STATUTE_TITLES[sourceId] ?? { titleHe: sourceId, year: 0 };
}

function heDate(iso: string | null): string | null {
  if (iso === null) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function toCitationView(r: ResolvedProvision, license: LegalLicensePolicy): CitationView {
  const meta = titleFor(r.source.sourceId);
  const sectionHe = r.pinpoint.provisionOrParagraph;
  const excerpt = enforceExcerpt(license, r.provision.text);
  const pinpointResolvable = r.pinpoint.pinpointStatus === "verified" && !isWholeDocumentPinpoint(r.pinpoint);
  // Official badge is honest: our accessible link is a verified secondary source
  // page (Kol-Zchut), NOT the official gazette → officialBadge is false.
  const officialBadge = false;
  const effectiveHe = heDate(r.version.effectiveDate);
  const displayForm = `${meta.titleHe}${meta.year ? ` (${meta.year})` : ""}, ${sectionHe}`;
  const copyable = `${meta.titleHe} (${meta.year}), ${sectionHe}${effectiveHe ? ` [נוסח תקף ${effectiveHe}]` : ""}`;
  return {
    citationId: `cit-${r.provision.provisionId}`,
    sourceId: r.source.sourceId,
    versionId: r.version.versionId,
    effectiveStatus: r.provision.inForce,
    titleHe: meta.titleHe,
    year: meta.year || null,
    sectionHe,
    verifiedBadgeHe: r.version.verificationStatus === "verified" ? "מאומת" : "טעון אימות",
    officialBadge,
    officialSourceLabelHe: "אומת מול מקור משני (Kol-Zchut) — לא הפרסום הרשמי",
    effectiveDateHe: effectiveHe,
    currentnessHe: r.canSupport ? "נוסח תקף" : "לא ניתן לביסוס במועד המבוקש",
    link: r.version.permalink,
    pinpointResolvable,
    pinpointStatementHe: r.pinpoint.pinpointStatementHe,
    excerptHe: excerpt.text,
    excerptTruncated: excerpt.truncated,
    attributionHe: excerpt.attributionHe,
    displayFormHe: displayForm,
    copyableForm: copyable,
    supportsProposition: r.propositionHe,
  };
}

/** Word-compatible export block (plain text with the citation + excerpt). */
export function toWordExportBlock(views: CitationView[]): string {
  const lines: string[] = [];
  lines.push("מקורות משפטיים מאומתים");
  lines.push("");
  for (const v of views) {
    lines.push(`• ${v.copyableForm}`);
    if (v.excerptHe) lines.push(`  “${v.excerptHe}${v.excerptTruncated ? "…" : ""}”`);
    if (v.link) lines.push(`  מקור: ${v.link}`);
    if (v.attributionHe) lines.push(`  ${v.attributionHe}`);
    lines.push("");
  }
  return lines.join("\n");
}
