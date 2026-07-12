/** Clarification Gate types (Epic 3A, Phase 4). */

export interface ClarificationQuestion {
  id: string;
  field: string;
  questionHe: string;
  critical: boolean;
  whyHe: string;
}

export interface ClarificationResult {
  canProceed: boolean;
  missingCriticalFields: string[];
  missingOptionalFields: string[];
  clarificationQuestions: ClarificationQuestion[];
  /** what Dino WOULD have to assume to proceed — it never silently assumes */
  assumptionsThatWouldBeRequired: string[];
  prohibitedAssumptions: string[];
  recommendedNextStepHe: string;
}
