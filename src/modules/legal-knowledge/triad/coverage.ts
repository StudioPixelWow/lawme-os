/**
 * Triad coverage model (Epic 3B Triad).
 * Evaluates a matter-specific question across the THREE pillars —
 * Legislation, Case Law, Procedure — and returns a coverage state.
 * A substantive matter recommendation is allowed only for triad_complete
 * or a clearly-justified partial state; single-pillar coverage is not
 * enough. This is what Dino's coverage evaluator consumes for real matters.
 */
import { EMPLOYMENT_CASE_LAW } from "../case-law/catalog.ts";
import { assessAuthority } from "../case-law/authority.ts";
import { EMPLOYMENT_PROCEDURES } from "../procedure/catalog.ts";
import type { EmploymentProcedureType } from "../procedure/types.ts";

export const TRIAD_COVERAGE_VERSION = "triad-coverage-1.0.0";

export type TriadState =
  | "triad_complete"
  | "legislation_only"
  | "legislation_and_case_law"
  | "legislation_and_procedure"
  | "case_law_only"
  | "procedure_only"
  | "insufficient_case_law"
  | "insufficient_procedure"
  | "insufficient_legislation"
  | "insufficient_facts"
  | "requires_specialist_review";

export interface PillarStatus {
  present: boolean;
  usable: boolean;               // present AND admissible (verified where required)
  countFound: number;
  missingHe: string[];
}

export interface TriadCoverage {
  topic: string;
  legislation: PillarStatus;
  caseLaw: PillarStatus;
  procedure: PillarStatus;
  state: TriadState;
  canProduceMatterRecommendation: boolean;
  nextResearchActionsHe: string[];
  version: string;
}

export interface TriadInput {
  topic: string;                       // subdomain key, e.g. "pregnancy_dismissal"
  /** legislation refIds available in the corpus for this topic */
  availableLegislationRefIds: string[];
  procedureType?: EmploymentProcedureType | null;
  /** whether the caller confirmed the required matter facts */
  factsConfirmed: boolean;
}

/** topic → the governing legislation refIds that a statutory claim needs */
const TOPIC_LEGISLATION: Record<string, string[]> = {
  pregnancy_dismissal: ["E3B-LEG-007", "E3B-LEG-008"],
  severance: ["E3B-LEG-001"],
  constructive_dismissal: ["E3B-LEG-001"],
  hearing_duty: [],
  overtime: ["E3B-LEG-003", "E3B-LEG-010"],
  notice_period: ["E3B-LEG-002"],
  pension: ["E3B-ORD-001"],
  employee_vs_contractor: [],
  equal_opportunity: ["E3B-LEG-008"],
  workplace_harassment: ["E3B-LEG-009"],
  wage_claims: ["E3B-LEG-010"],
};

const TOPIC_PROCEDURE: Record<string, EmploymentProcedureType> = {
  pregnancy_dismissal: "pregnancy_dismissal",
  severance: "severance_claim",
  constructive_dismissal: "severance_claim",
  hearing_duty: "hearing_before_dismissal",
  overtime: "wage_overtime_claim",
  pension: "pension_rights_claim",
  equal_opportunity: "discrimination_claim",
  workplace_harassment: "harassment_complaint",
  wage_claims: "wage_overtime_claim",
};

export function evaluateTriad(input: TriadInput): TriadCoverage {
  const required = TOPIC_LEGISLATION[input.topic] ?? [];
  // hearing_duty / employee_vs_contractor are case-law-driven (no single statute)
  const caseLawDriven = required.length === 0;

  // Legislation pillar
  const haveLeg = required.filter((r) => input.availableLegislationRefIds.includes(r));
  const legislation: PillarStatus = {
    present: caseLawDriven ? true : haveLeg.length > 0,
    usable: caseLawDriven ? true : haveLeg.length === required.length,
    countFound: haveLeg.length,
    missingHe: required.filter((r) => !input.availableLegislationRefIds.includes(r)).map((r) => `חקיקה נדרשת חסרה: ${r}`),
  };

  // Case-law pillar — present if candidates exist; USABLE only if a verified
  // judgment exists (POC candidates are all unverified → not usable yet)
  const topicCases = EMPLOYMENT_CASE_LAW.filter((c) => c.legalTopics.includes(input.topic));
  const usableCases = topicCases.filter((c) => assessAuthority(c).usableForClaim);
  const caseLaw: PillarStatus = {
    present: topicCases.length > 0,
    usable: usableCases.length > 0,
    countFound: topicCases.length,
    missingHe: usableCases.length === 0 ? ["אין פסיקה מאומתת בקורפוס — הרשומות הן מועמדות לגילוי בלבד"] : [],
  };

  // Procedure pillar
  const procType = input.procedureType ?? TOPIC_PROCEDURE[input.topic] ?? null;
  const proc = procType ? EMPLOYMENT_PROCEDURES.find((p) => p.type === procType) ?? null : null;
  const procedure: PillarStatus = {
    present: proc !== null,
    usable: proc !== null,
    countFound: proc ? 1 : 0,
    missingHe: proc ? [] : ["אין מודל הליך לנושא זה"],
  };

  // Derive state
  let state: TriadState;
  if (!input.factsConfirmed) state = "insufficient_facts";
  else if (!legislation.present && !caseLawDriven) state = "insufficient_legislation";
  // case-law-DRIVEN topic (no governing statute): case law IS the substance;
  // if it isn't usable, no amount of statute/procedure rescues it.
  else if (caseLawDriven && !caseLaw.usable) state = "requires_specialist_review";
  else if (legislation.usable && caseLaw.usable && procedure.usable) state = "triad_complete";
  else if (legislation.usable && !caseLaw.usable && procedure.usable) state = "insufficient_case_law";
  else if (legislation.usable && caseLaw.usable && !procedure.usable) state = "insufficient_procedure";
  else if (legislation.usable && procedure.usable) state = "legislation_and_procedure";
  else if (legislation.usable && caseLaw.present) state = "legislation_and_case_law";
  else if (legislation.usable) state = "legislation_only";
  else state = "requires_specialist_review";

  // A matter recommendation needs triad_complete, OR the justified partial
  // where a governing STATUTE + procedure carry the claim and the only
  // missing pillar is (disclosed) case law. Case-law-driven topics with no
  // usable case law can NEVER recommend.
  const canRecommend =
    state === "triad_complete" ||
    (state === "insufficient_case_law" && !caseLawDriven && legislation.usable && procedure.usable);

  const nextActions: string[] = [];
  if (!caseLaw.usable) nextActions.push("אימות פסיקה מחייבת מול המקור הרשמי לפני קביעה");
  if (!legislation.usable && !caseLawDriven) nextActions.push("השלמת החקיקה החסרה לנושא");
  if (!procedure.usable) nextActions.push("הוספת מודל הליך לנושא");
  if (!input.factsConfirmed) nextActions.push("השלמת עובדות מכריעות");

  return {
    topic: input.topic,
    legislation, caseLaw, procedure,
    state,
    canProduceMatterRecommendation: canRecommend,
    nextResearchActionsHe: nextActions,
    version: TRIAD_COVERAGE_VERSION,
  };
}
