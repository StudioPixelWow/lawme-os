/**
 * DinoAuthorityValidator (Epic 3A, Phase 11).
 * Deterministic authority assessment per retrieved source. Authority is
 * NEVER upgraded by model confidence — only by verifiable metadata.
 */
import type { DbEvidenceItem } from "../../legal-knowledge/research/engine-db.ts";
import type { AuthorityAssessment, AuthorityValidationReport } from "./types.ts";

export const AUTHORITY_VALIDATOR_VERSION = "authority-validator-1.0.0";

const PRIMARY_CLASSES = new Set(["legislation", "supreme", "national_labor", "regional"]);

function courtHierarchy(authorityClass: string): AuthorityAssessment["courtHierarchy"] {
  if (authorityClass === "supreme") return "supreme";
  if (authorityClass === "national_labor") return "national_labor";
  if (authorityClass === "regional") return "regional";
  return "none";
}

export function validateAuthority(evidence: DbEvidenceItem[]): AuthorityValidationReport {
  const assessments: AuthorityAssessment[] = evidence.map((e) => {
    const primary = PRIMARY_CLASSES.has(e.authorityClass);
    const binding = e.authorityClass === "legislation" || e.authorityClass === "supreme" || e.authorityClass === "national_labor";
    const anchorValid = e.anchor.charEnd > e.anchor.charStart && e.passage.length === e.anchor.charEnd - e.anchor.charStart;
    const verified = e.verificationStatus === "verified";

    // deterministic reliability: authority class + verification + anchor
    const reliability =
      (e.authorityClass === "legislation" ? 0.9 :
       e.authorityClass === "supreme" ? 0.85 :
       e.authorityClass === "national_labor" ? 0.8 :
       e.authorityClass === "regional" ? 0.6 :
       e.authorityClass === "guidance" ? 0.55 : 0.4)
      * (verified ? 1 : 0.7) * (anchorValid ? 1 : 0.3);

    const admissibleFor: string[] = [];
    if (e.authorityClass === "legislation") admissibleFor.push("statutory_text", "regulatory_requirement");
    if (binding && e.authorityClass !== "legislation") admissibleFor.push("judicial_interpretation");
    if (e.authorityClass === "regional") admissibleFor.push("judicial_interpretation");
    if (e.authorityClass === "guidance") admissibleFor.push("official_guidance");
    if (e.authorityClass === "secondary") admissibleFor.push("secondary_explanation");
    // unverified/synthetic sources may only support DISCOVERY, never final claims:
    const limitationsHe: string[] = [];
    if (!verified) limitationsHe.push("מקור לא מאומת — קביל לגילוי בלבד, לא לטענה סופית");
    if (!anchorValid) limitationsHe.push("עוגן לא תקין — פסול משימוש");
    if (e.warnings.some((w) => w.includes("fixture"))) limitationsHe.push("תוכן סינתטי (POC) — אינו סמכות משפטית");

    return {
      documentId: e.documentId,
      anchorKey: e.anchor.anchorKey,
      titleHe: e.title,
      primaryOrSecondary: primary ? "primary" : "secondary",
      officialStatus: "synthetic_fixture",
      courtHierarchy: courtHierarchy(e.authorityClass),
      bindingOrPersuasive: binding ? "binding" : e.authorityClass === "regional" ? "persuasive" : "informative",
      temporalStatus: "unknown",
      verification: verified ? "verified" : "unverified",
      supersededStatus: "unknown",
      jurisdiction: "IL",
      supportDirectness: e.scoreBreakdown.raw.lexicalCoverage >= 0.5 ? "direct" : "indirect",
      reliabilityScore: Number(reliability.toFixed(3)),
      permissionStatus: "synthetic_fixture",
      anchorValid,
      authorityClass: e.authorityClass,
      authorityScore: e.scoreBreakdown.authority,
      admissibleFor,
      limitationsHe,
      requiresHumanReview: !verified || !anchorValid,
    };
  });

  return {
    assessments,
    validatorVersion: AUTHORITY_VALIDATOR_VERSION,
    invariantsHe: [
      "סמכות אינה משודרגת לעולם על בסיס ביטחון מודל",
      "מקור לא מאומת אינו קביל לטענה סופית",
      "עוגן שבור פוסל את המקור",
    ],
  };
}
