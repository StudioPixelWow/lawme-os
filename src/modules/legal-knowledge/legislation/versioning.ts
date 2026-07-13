/**
 * Legislation versioning (Epic 3B, Phase 5).
 * First-class statute/regulation version model + resolution utilities.
 * INVARIANT: never claim a rule is "current" when version status is
 * unknown — resolution returns an explicit uncertainty instead.
 */
export const LEGISLATION_VERSIONING_VERSION = "legislation-versioning-1.0.0";

export type VersionState = "current" | "historical" | "repealed" | "unknown";

export interface StatuteVersion {
  statuteId: string;              // canonical slug
  canonicalId: string;            // e.g. "severance-pay-law@1963-05-01"
  currentTitleHe: string;
  historicalTitleHe: string | null;
  enactedDate: string | null;     // ISO
  publicationDate: string | null;
  effectiveDate: string | null;
  amendmentDate: string | null;
  repealDate: string | null;
  versionStart: string | null;    // this version's validity window
  versionEnd: string | null;      // null = open (possibly current)
  state: VersionState;
  transitionalProvisionsHe: string | null;
  sourcePublication: string | null; // e.g. "ספר החוקים 1963"
  supersedesVersionId: string | null;
  supersededByVersionId: string | null;
  verificationDate: string | null;
  verificationStatus: "verified" | "unverified";
}

export interface SectionVersion {
  statuteId: string;
  sectionNumber: string;          // normalized, e.g. "14"
  sectionTitleHe: string | null;
  subsection: string | null;
  versionDate: string | null;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  anchorKey: string;
  canonicalSourceUrl: string | null;
  verificationStatus: "verified" | "unverified";
}

/** Is `date` (ISO) within [start,end)? Unknown bounds are permissive on
 * that side but recorded by the caller. */
export function dateInWindow(date: string, start: string | null, end: string | null): boolean {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return false;
  if (start && t < Date.parse(start)) return false;
  if (end && t >= Date.parse(end)) return false;
  return true;
}

export interface VersionResolution {
  resolved: StatuteVersion | null;
  certainty: "certain" | "uncertain" | "none";
  reasonHe: string;
}

/**
 * Resolve the version in force at `asOf` (ISO). If any candidate has
 * unknown/unverified bounds that could match, return `uncertain` rather
 * than asserting currency.
 */
export function resolveVersionAsOf(versions: StatuteVersion[], asOf: string): VersionResolution {
  if (versions.length === 0) return { resolved: null, certainty: "none", reasonHe: "אין גרסאות ידועות" };
  const verified = versions.filter((v) => v.verificationStatus === "verified");
  const pool = verified.length ? verified : versions;

  const matches = pool.filter((v) => v.state !== "repealed" && dateInWindow(asOf, v.versionStart, v.versionEnd));
  if (matches.length === 1) {
    const v = matches[0];
    const certain = v.verificationStatus === "verified" && v.versionStart != null;
    return {
      resolved: v,
      certainty: certain ? "certain" : "uncertain",
      reasonHe: certain ? "גרסה מאומתת עם חלון תוקף ידוע" : "גרסה תואמת אך חלון/אימות חלקי — אין לקבוע כדין נוכחי בוודאות",
    };
  }
  if (matches.length > 1) {
    return { resolved: null, certainty: "uncertain", reasonHe: `נמצאו ${matches.length} גרסאות חופפות — נדרשת הכרעה אנושית` };
  }
  return { resolved: null, certainty: "none", reasonHe: "לא נמצאה גרסה בתוקף במועד המבוקש" };
}

/** Resolve the CURRENT version (asOf = today's date, supplied by caller to
 * keep the function pure/deterministic). */
export function resolveCurrentVersion(versions: StatuteVersion[], todayIso: string): VersionResolution {
  const openEnded = versions.filter((v) => v.versionEnd === null && v.state !== "repealed");
  if (openEnded.length === 1 && openEnded[0].verificationStatus === "verified") {
    return { resolved: openEnded[0], certainty: "certain", reasonHe: "גרסה פתוחה מאומתת יחידה" };
  }
  return resolveVersionAsOf(versions, todayIso);
}

/** Detect superseded versions (those with a supersededBy pointer or a
 * closed window overlapped by a later open one). */
export function isSuperseded(v: StatuteVersion, all: StatuteVersion[]): boolean {
  if (v.supersededByVersionId) return true;
  if (v.state === "repealed") return true;
  if (v.versionEnd === null) return false;
  return all.some((o) => o.canonicalId !== v.canonicalId && o.versionStart && v.versionEnd && Date.parse(o.versionStart) >= Date.parse(v.versionEnd));
}

/** Compare two versions chronologically (-1 a<b, 1 a>b, 0 equal/unknown). */
export function compareVersions(a: StatuteVersion, b: StatuteVersion): number {
  const ta = a.versionStart ? Date.parse(a.versionStart) : NaN;
  const tb = b.versionStart ? Date.parse(b.versionStart) : NaN;
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** Validate an effective date is not before enactment/publication. */
export function effectiveDateValid(v: StatuteVersion): { ok: boolean; reasonHe: string } {
  if (!v.effectiveDate) return { ok: false, reasonHe: "אין תאריך תחילה — לא ניתן לקבוע תוקף" };
  const eff = Date.parse(v.effectiveDate);
  for (const [label, d] of [["חקיקה", v.enactedDate], ["פרסום", v.publicationDate]] as const) {
    if (d && eff < Date.parse(d)) return { ok: false, reasonHe: `תאריך התחילה קודם לתאריך ה${label}` };
  }
  return { ok: true, reasonHe: "תאריך תחילה עקבי" };
}
