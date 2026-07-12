/** Authority-validation model (Epic 3A, Phase 11). */

export interface AuthorityAssessment {
  documentId: string;
  anchorKey: string;
  titleHe: string;
  primaryOrSecondary: "primary" | "secondary";
  officialStatus: "official" | "unofficial" | "synthetic_fixture";
  courtHierarchy: "supreme" | "national_labor" | "regional" | "none";
  bindingOrPersuasive: "binding" | "persuasive" | "informative";
  temporalStatus: "current" | "historical" | "unknown";
  verification: "verified" | "unverified";
  supersededStatus: "active" | "superseded" | "unknown";
  jurisdiction: string;
  supportDirectness: "direct" | "indirect";
  reliabilityScore: number;        // 0..1 deterministic
  permissionStatus: string;        // license_status from the document
  anchorValid: boolean;
  authorityClass: string;
  authorityScore: number;
  /** which claim types this source may support */
  admissibleFor: string[];
  limitationsHe: string[];
  requiresHumanReview: boolean;
}

export interface AuthorityValidationReport {
  assessments: AuthorityAssessment[];
  validatorVersion: string;
  /** codified rule: model confidence NEVER upgrades authority */
  invariantsHe: string[];
}
