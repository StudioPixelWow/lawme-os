/**
 * Legal Procedure Graph — types (Epic 3B Triad, Pillar C).
 * Procedure is modeled as a GRAPH of stages/transitions, never a flat
 * checklist. Every procedural rule carries provenance and distinguishes
 * mandatory law from professional best practice — best practice is NEVER
 * presented as mandatory law.
 */

/** Where a procedural rule comes from — provenance is mandatory. */
export type ProcedureSourceKind =
  | "legislation"          // statute/regulation
  | "court_rules"          // תקנות סדר הדין / labor-court rules
  | "case_law"             // binding/persuasive judgment
  | "official_guidance"    // ministry / NII guidance
  | "professional_practice"// widely-accepted lawyering practice (NOT law)
  | "firm_practice";       // firm-specific convention (NOT law)

/** Legal weight of a rule — drives whether Dino may state it as required. */
export type RuleAuthority = "mandatory_law" | "recommended" | "discretionary" | "best_practice";

export interface SourceLink {
  kind: ProcedureSourceKind;
  refId: string | null;          // statute/section/case id in the graph, if any
  citationHe: string;            // human-readable citation
  canonicalUrl: string | null;
  authority: RuleAuthority;
  verification: "verified" | "unverified";
  note?: string;
}

export type ActorRole =
  | "client" | "lawyer" | "employer" | "opposing_counsel"
  | "regional_labor_court" | "national_labor_court" | "supreme_court"
  | "ministry_of_labor" | "national_insurance" | "equal_opportunity_commission";

export interface EvidenceRequirement {
  id: string;
  labelHe: string;
  evidenceType: "document" | "testimony" | "record" | "communication" | "expert" | "physical";
  mandatory: boolean;
  whyHe: string;
  sources: SourceLink[];
}

export interface DocumentRequirement {
  id: string;
  labelHe: string;
  docType: "demand_letter" | "application" | "pleading" | "affidavit" | "summation" | "form" | "notice" | "agreement";
  templateAvailable: boolean;
  sources: SourceLink[];
}

export type DeadlineBasis =
  | "from_dismissal" | "from_event" | "from_filing" | "from_judgment"
  | "statute_of_limitations" | "court_set" | "none";

export interface DeadlineRule {
  id: string;
  labelHe: string;
  basis: DeadlineBasis;
  /** duration expressed in ISO-8601-ish parts; null when court-set/unknown */
  days: number | null;
  years: number | null;
  strict: boolean;                // missing it bars the claim/step
  sources: SourceLink[];
  calculationNoteHe: string;
}

export interface LegalAction {
  id: string;
  labelHe: string;
  actor: ActorRole;
  kind: "advise" | "draft" | "file" | "serve" | "request_relief" | "negotiate" | "collect_evidence" | "calculate" | "appeal" | "enforce";
  requiresHumanApproval: boolean;  // POC: always true for anything external
  sources: SourceLink[];
  riskHe: string | null;
}

export type StageKind =
  | "intake" | "fact_confirmation" | "evidence_preservation" | "assessment"
  | "pre_litigation" | "administrative" | "filing" | "interim_relief"
  | "pleadings" | "disclosure" | "hearing" | "summations" | "judgment"
  | "remedy" | "enforcement" | "appeal";

export interface ProcedureStage {
  id: string;
  procedureId: string;
  orderIndex: number;
  titleHe: string;
  kind: StageKind;
  actor: ActorRole;
  authorityOrCourt: ActorRole | null;
  requiredFacts: string[];        // context field names
  evidence: EvidenceRequirement[];
  documents: DocumentRequirement[];
  deadlines: DeadlineRule[];
  actions: LegalAction[];
  risksHe: string[];
  exceptionsHe: string[];
  /** supporting authority for THIS stage existing/being required */
  sources: SourceLink[];
}

export interface StageTransition {
  from: string;                   // stage id
  to: string;                     // stage id
  conditionHe: string;
  kind: "next" | "alternative" | "conditional" | "appeal";
  triggerHe: string | null;
}

export type EmploymentProcedureType =
  | "pre_dismissal_dispute" | "pregnancy_dismissal" | "hearing_before_dismissal"
  | "severance_claim" | "wage_overtime_claim" | "pension_rights_claim"
  | "discrimination_claim" | "harassment_complaint" | "regional_labor_court_civil"
  | "appeal_to_national_labor_court" | "national_insurance_claim" | "settlement_enforcement";

export interface Procedure {
  id: string;
  type: EmploymentProcedureType;
  titleHe: string;
  descriptionHe: string;
  legalDomain: "labor";
  rootStageId: string;
  /** statutes/orders this procedure is governed by (graph refs) */
  governingLegislation: SourceLink[];
  /** case-law that shapes this procedure (graph refs) */
  shapingCaseLaw: SourceLink[];
  stages: ProcedureStage[];
  transitions: StageTransition[];
  limitationsHe: string[];
  version: string;
}

export interface ProcedureGraph {
  procedures: Procedure[];
  graphVersion: string;
}
