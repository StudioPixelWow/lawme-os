/** Controlled-drafting model (Epic 3A, Phase 19). */

export type DraftArtifactType =
  | "research_summary"
  | "issue_outline"
  | "source_memorandum"
  | "evidence_matrix"
  | "questions_for_review"
  | "next_research_recommendations";

export interface DraftParagraph {
  id: string;
  sectionHe: string;
  textHe: string;
  /** every substantive paragraph traces to atomic claims */
  claimIds: string[];
  citationRefs: { evidenceId: string; anchorKey: string; titleHe: string }[];
}

export interface ControlledDraft {
  artifactType: DraftArtifactType;
  titleHe: string;
  mandatoryLabelHe: string;   // "טיוטת מחקר משפטי — נדרשת בדיקת עורך דין"
  paragraphs: DraftParagraph[];
  questionsForReviewHe: string[];
  nextResearchRecommendationsHe: string[];
  /** claims deliberately omitted because unsafe_to_state */
  omittedClaimIds: string[];
  drafterVersion: string;
}
