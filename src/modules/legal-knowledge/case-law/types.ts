/**
 * Case-law model (Epic 3B Triad, Pillar B).
 * Judgments are catalogued as metadata/pointer records to the OFFICIAL
 * judiciary source (supremedecisions.court.gov.il / court.gov.il). No
 * crawler, no full text without permission, and case numbers are NEVER
 * fabricated — an unverified number is marked to_verify.
 */

export type CourtInstance =
  | "supreme" | "national_labor" | "regional_labor" | "other";

export type AuthorityClass = "binding" | "persuasive" | "informative";

export type DecisionType = "judgment" | "interim_decision" | "procedural_decision";

export type CaseVerification =
  | "verified_official"      // confirmed against the official source
  | "unverified"             // candidate; details/number to confirm
  | "number_to_verify";      // doctrine known, exact case number unconfirmed

export type CaseAccess = "full_text_allowed" | "metadata_only" | "pointer_only" | "permission_required" | "rejected";

export interface CitedStatute {
  statuteRefId: string | null;   // graph ref (E3B-LEG-###)
  citationHe: string;
  sectionHe: string | null;
}

export interface LaterTreatment {
  kind: "followed" | "distinguished" | "limited" | "overruled" | "cited" | "unknown";
  byCaseId: string | null;
  note: string;
}

export interface JudgmentRecord {
  id: string;                     // internal id, e.g. CL-EMP-001
  caseNumberRaw: string | null;   // null when unknown — never invented
  caseNumberStatus: "verified" | "to_verify" | "unknown";
  court: CourtInstance;
  instanceLabelHe: string;
  judgmentDate: string | null;
  decisionType: DecisionType;
  titleHe: string;                // neutral descriptor (parties only if lawfully public)
  legalTopics: string[];
  doctrineHe: string;             // the legal principle/test the case is known for
  citedStatutes: CitedStatute[];
  proceduralStageHe: string | null;
  outcomeHe: string | null;
  remediesHe: string[];
  authorityClass: AuthorityClass;
  appealStatusHe: string | null;
  relatedProceedings: string[];
  laterTreatment: LaterTreatment[];
  canonicalSourceUrl: string;     // official judiciary pointer — always present
  publisherHe: string;
  access: CaseAccess;
  verification: CaseVerification;
  factualSimilarityNote: string | null;
  limitationsHe: string[];
}

export interface CaseLawCatalog {
  records: JudgmentRecord[];
  accessResearchHe: string[];
  catalogVersion: string;
}
