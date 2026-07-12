/**
 * DinoControlledDraftingEngine (Epic 3A, Phase 19).
 * Produces ONLY structured research artifacts — never a filing-ready
 * pleading, final opinion, or client-facing advice. Every paragraph
 * traces to atomic claims; every substantive claim carries citations.
 * unsafe_to_state claims are never drafted (they go to omittedClaimIds).
 */
import type { ClaimPlan } from "../claims/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { IssueGraph } from "../issues/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { ControlledDraft, DraftParagraph } from "./types.ts";

export const DRAFTER_VERSION = "controlled-drafting-1.0.0";
export const MANDATORY_DRAFT_LABEL_HE = "טיוטת מחקר משפטי — נדרשת בדיקת עורך דין";

export function buildControlledDraft(
  issueGraph: IssueGraph,
  claimPlan: ClaimPlan,
  ledger: EvidenceLedger,
  coverage: CoverageReport,
  contradictions: ContradictionReport,
): ControlledDraft {
  const paragraphs: DraftParagraph[] = [];
  const omitted: string[] = [];
  let pid = 1;

  for (const issue of issueGraph.issues) {
    const issueClaims = claimPlan.claims.filter((c) => c.issueId === issue.id);
    const safe = issueClaims.filter((c) => c.safeToState);
    const unsafe = issueClaims.filter((c) => !c.safeToState);
    omitted.push(...unsafe.map((c) => c.claimId));

    if (safe.length === 0) {
      paragraphs.push({
        id: `p-${pid++}`,
        sectionHe: issue.titleHe,
        textHe: `לגבי סוגיה זו לא נמצאו בקורפוס מקורות מספיקים לקביעה. ${
          issue.missingFacts.length ? `בנוסף חסרות עובדות: ${issue.missingFacts.join(", ")}.` : ""
        } נדרש מחקר משלים או מקור ראשי.`,
        claimIds: [],
        citationRefs: [],
      });
      continue;
    }

    for (const claim of safe) {
      const cites = claim.supportingEvidenceIds
        .map((eid) => ledger.items.find((i) => i.evidenceId === eid))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .map((i) => ({ evidenceId: i.evidenceId, anchorKey: i.anchorKey, titleHe: i.titleHe }));
      paragraphs.push({
        id: `p-${pid++}`,
        sectionHe: issue.titleHe,
        textHe: claim.propositionHe,
        claimIds: [claim.claimId],
        citationRefs: cites,
      });
    }
  }

  const questionsForReview: string[] = [
    ...issueGraph.issues.filter((i) => i.missingFacts.length).map((i) => `הבהרת עובדות עבור "${i.titleHe}": ${i.missingFacts.join(", ")}`),
    ...(contradictions.unresolvedMaterialCount > 0 ? ["הכרעה בסתירה בין מקורות — נדרשת שיקול דעת משפטי"] : []),
  ];

  const nextResearch: string[] = [
    ...coverage.missingSourceCategories.map((c) => `השלמת מקור מסוג: ${c}`),
    ...(coverage.overallState !== "complete_for_poc" ? ["הרחבת הקורפוס למקורות ראשיים אמיתיים בתחום"] : []),
  ];

  return {
    artifactType: "research_summary",
    titleHe: "סיכום מחקר משפטי מובנה (POC)",
    mandatoryLabelHe: MANDATORY_DRAFT_LABEL_HE,
    paragraphs,
    questionsForReviewHe: questionsForReview,
    nextResearchRecommendationsHe: nextResearch,
    omittedClaimIds: omitted,
    drafterVersion: DRAFTER_VERSION,
  };
}
