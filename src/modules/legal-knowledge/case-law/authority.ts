/**
 * Case-law authority model (Epic 3B Triad, Pillar B).
 * Deterministic ranking so Dino never treats all judgments equally:
 * a Regional Labor Court ruling must not outrank National Labor Court
 * authority, and an old judgment must not be presented as current without
 * later-treatment being checked.
 */
import type { AuthorityClass, CourtInstance, JudgmentRecord } from "./types.ts";

export const CASE_AUTHORITY_VERSION = "case-authority-1.0.0";

/** Court-hierarchy weight (higher binds lower). */
export const COURT_WEIGHT: Record<CourtInstance, number> = {
  supreme: 4, national_labor: 3, regional_labor: 1.5, other: 0.5,
};

export function bindingClass(court: CourtInstance): AuthorityClass {
  if (court === "supreme" || court === "national_labor") return "binding";
  if (court === "regional_labor") return "persuasive";
  return "informative";
}

export interface AuthorityAssessment {
  caseId: string;
  courtWeight: number;
  authorityClass: AuthorityClass;
  currentnessHe: string;         // never asserts "current" without later-treatment
  usableForClaim: boolean;       // may back a substantive claim?
  requiresHumanReview: boolean;
  reasonsHe: string[];
}

export function assessAuthority(rec: JudgmentRecord): AuthorityAssessment {
  const reasons: string[] = [];
  const overruled = rec.laterTreatment.some((t) => t.kind === "overruled");
  const limited = rec.laterTreatment.some((t) => t.kind === "limited");
  const checkedLater = rec.laterTreatment.length > 0 && !rec.laterTreatment.some((t) => t.kind === "unknown");

  let currentnessHe: string;
  if (overruled) currentnessHe = "בוטלה בפסיקה מאוחרת — אין להסתמך";
  else if (limited) currentnessHe = "צומצמה בפסיקה מאוחרת — להשתמש בזהירות";
  else if (checkedLater) currentnessHe = "נבדק טיפול מאוחר — לא אותרה הפיכה";
  else currentnessHe = "טיפול מאוחר לא נבדק — אין להציג כהלכה עדכנית בוודאות";

  // a case may back a claim only if verified, not overruled, and its number
  // is confirmed — POC candidates (unverified) are discovery-only
  const usableForClaim =
    rec.verification === "verified_official" &&
    rec.caseNumberStatus === "verified" &&
    !overruled;

  if (rec.verification !== "verified_official") reasons.push("פסק דין לא אומת מול המקור הרשמי — לגילוי בלבד");
  if (rec.caseNumberStatus !== "verified") reasons.push("מספר ההליך טרם אומת");
  if (overruled) reasons.push("בוטל בפסיקה מאוחרת");
  if (!checkedLater && !overruled) reasons.push("לא נבדק טיפול מאוחר");

  return {
    caseId: rec.id,
    courtWeight: COURT_WEIGHT[rec.court],
    authorityClass: rec.authorityClass,
    currentnessHe,
    usableForClaim,
    requiresHumanReview: true, // POC: every case-law reliance needs a lawyer
    reasonsHe: reasons,
  };
}

/** Rank judgments for a topic: binding-first, then court weight, then
 * verified-first. NEVER lets a regional ruling outrank a national one. */
export function rankJudgments(records: JudgmentRecord[]): JudgmentRecord[] {
  const rank = (r: JudgmentRecord) =>
    COURT_WEIGHT[r.court] * 10 +
    (r.authorityClass === "binding" ? 5 : r.authorityClass === "persuasive" ? 2 : 0) +
    (r.verification === "verified_official" ? 3 : 0);
  return [...records].sort((a, b) => rank(b) - rank(a));
}
