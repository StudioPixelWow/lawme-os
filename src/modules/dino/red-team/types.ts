/** Red Team model (Epic 3A, Phase 22) — structurally separate from drafting. */

export interface RedTeamChallenge {
  id: string;
  challengeHe: string;
  affectedClaimIds: string[];
  evidenceHe: string;
  severity: "low" | "medium" | "high" | "blocking";
  responseHe: string;
  unresolved: boolean;
  confidenceImpact: number;   // negative delta applied by the confidence engine
  requiresHumanReview: boolean;
}

export interface RedTeamReport {
  challenges: RedTeamChallenge[];
  blockingCount: number;
  unresolvedCount: number;
  redTeamVersion: string;
}
