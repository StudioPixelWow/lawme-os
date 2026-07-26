/**
 * Ingestion quality gates (Open-Official Ingestion, Phase 1).
 * Validate → normalize → quarantine. Malformed records are QUARANTINED with
 * reasons, never silently discarded.
 */
import type { CanonicalSourceRecord } from "../types.ts";
import { sourceByKey } from "../registry.ts";

const AUTHORITY_TIERS = new Set([
  "binding_primary", "persuasive_primary", "official_regulatory", "licensed_editorial",
  "academic", "professional_commentary", "secondary_explanation", "discovery_material", "firm_internal",
]);
const MODES = new Set([
  "FULL_TEXT", "STRUCTURED_METADATA", "METADATA_AND_LINK", "DISCOVERY_ONLY", "BLOCKED",
]);
const OFFICIAL = new Set(["official", "secondary", "unofficial"]);
const VERIF = new Set(["ingested_unverified", "discovery_only", "verified"]);

function isHttpUrl(u: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(u);
}

/** Normalize an ISO-ish date to YYYY-MM-DD, or null. Returns undefined if the
 *  input is present but unparseable (→ a validation issue). */
export function normalizeDate(d: string | null): string | null | undefined {
  if (d === null) return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined; // present but malformed
}

export interface RecordIssue {
  field: string;
  messageHe: string;
}

export function validateRecord(r: CanonicalSourceRecord): RecordIssue[] {
  const issues: RecordIssue[] = [];

  // identity
  if (!r.recordId || r.recordId.trim().length === 0) issues.push({ field: "recordId", messageHe: "מזהה רשומה חסר" });
  if (!r.sourceKey || sourceByKey(r.sourceKey) === null) issues.push({ field: "sourceKey", messageHe: "מקור אינו רשום במרשם" });
  if (!r.sourceOwner || r.sourceOwner.trim().length === 0) issues.push({ field: "sourceOwner", messageHe: "בעל מקור חסר" });

  // classifications
  if (!MODES.has(r.acquisitionMode)) issues.push({ field: "acquisitionMode", messageHe: "מצב רכישה לא חוקי" });
  if (!AUTHORITY_TIERS.has(r.authorityTier)) issues.push({ field: "authorityTier", messageHe: "דרג סמכות לא חוקי" });
  if (!OFFICIAL.has(r.officialStatus)) issues.push({ field: "officialStatus", messageHe: "מעמד רשמי לא חוקי" });
  if (!VERIF.has(r.verificationStatus)) issues.push({ field: "verificationStatus", messageHe: "מצב אימות לא חוקי" });

  // urls
  if (r.sourceUrl !== null && !isHttpUrl(r.sourceUrl)) issues.push({ field: "sourceUrl", messageHe: "כתובת מקור לא תקינה" });

  // dates
  for (const [f, v] of [
    ["publicationDate", r.publicationDate], ["decisionDate", r.decisionDate],
    ["effectiveDate", r.effectiveDate], ["validFrom", r.validFrom], ["validTo", r.validTo],
  ] as const) {
    if (normalizeDate(v) === undefined) issues.push({ field: f, messageHe: `תאריך לא תקין: ${f}` });
  }

  // provenance / basis invariants
  if (r.fullTextAvailable && r.licenseRef === null) {
    issues.push({ field: "licenseRef", messageHe: "טקסט מלא ללא בסיס שימוש מתועד" });
  }
  if (r.verificationStatus === "verified") {
    issues.push({ field: "verificationStatus", messageHe: "אין לקבל רשומה כ'מאומת' דרך צינור הרכישה — נדרש שער עריכה" });
  }

  return issues;
}

export interface QuarantineResult {
  accepted: readonly CanonicalSourceRecord[];
  quarantined: readonly { record: CanonicalSourceRecord; issues: readonly RecordIssue[] }[];
}

/** Partition records; never discard. Malformed → quarantined with reasons. */
export function quarantine(records: readonly CanonicalSourceRecord[]): QuarantineResult {
  const accepted: CanonicalSourceRecord[] = [];
  const quarantined: { record: CanonicalSourceRecord; issues: readonly RecordIssue[] }[] = [];
  for (const r of records) {
    const issues = validateRecord(r);
    if (issues.length === 0) accepted.push(r);
    else quarantined.push({ record: r, issues });
  }
  return { accepted, quarantined };
}
