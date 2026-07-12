/** Legal QA model (Epic 3A, Phase 21). */

export interface QaFinding {
  id: string;
  checkHe: string;
  passed: boolean;
  blocking: boolean;
  detailHe: string;
  affectedClaimIds: string[];
}

export interface LegalQaReport {
  passed: boolean;
  blockingFindings: QaFinding[];
  nonBlockingWarnings: QaFinding[];
  claimsRemoved: string[];
  claimsRevised: string[];
  requiredHumanActionsHe: string[];
  qaVersion: string;
}
