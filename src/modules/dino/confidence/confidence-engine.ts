/**
 * DinoConfidenceEngine (Epic 3A, Phase 23).
 * Confidence is a decomposed set of factors, never one opaque percentage,
 * and NEVER a numerical legal-outcome probability. Bands are chosen by
 * deterministic rules; the numeric score only illustrates the factor mix.
 */
import type { QuestionClassification } from "../classification/types.ts";
import type { ClarificationResult } from "../clarification/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { AuthorityValidationReport } from "../authority/types.ts";
import type { CitationVerificationReport } from "../citations/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { LegalQaReport } from "../qa/types.ts";
import type { RedTeamReport } from "../red-team/types.ts";
import type { ConfidenceBand, ConfidenceFactor, ConfidenceReport } from "./types.ts";

export const CONFIDENCE_ENGINE_VERSION = "confidence-engine-1.0.0";

interface FactorInput {
  classification: QuestionClassification;
  clarification: ClarificationResult;
  coverage: CoverageReport;
  authority: AuthorityValidationReport;
  citations: CitationVerificationReport;
  contradictions: ContradictionReport;
  qa: LegalQaReport;
  redTeam: RedTeamReport;
  gatePassed: boolean;
  domainMatch: boolean;
}

export function evaluateConfidence(input: FactorInput): ConfidenceReport {
  const verifiedCitations = input.citations.checks.filter((c) => c.status === "verified" || c.status === "anchor_valid_source_unverified");
  const citationRate = input.citations.checks.length ? verifiedCitations.length / input.citations.checks.length : 0;
  const avgReliability = input.authority.assessments.length
    ? input.authority.assessments.reduce((s, a) => s + a.reliabilityScore, 0) / input.authority.assessments.length
    : 0;

  const factors: ConfidenceFactor[] = [
    mk("question_clarity", "בהירות השאלה", input.classification.confidence, 0.08),
    mk("matter_context", "שלמות הקשר התיק", input.clarification.canProceed ? 1 : 0.3, 0.08),
    mk("domain_confidence", "ביטחון תחום", input.domainMatch ? 1 : 0, 0.12),
    mk("retrieval_relevance", "רלוונטיות אחזור", input.gatePassed ? 1 : 0, 0.12),
    mk("evidence_coverage", "כיסוי ראיות", input.coverage.issuesIdentified ? input.coverage.issuesSupported / input.coverage.issuesIdentified : 0, 0.12),
    mk("primary_source_coverage", "כיסוי מקור ראשי", input.coverage.primarySourceCoverage, 0.1),
    mk("authority_quality", "איכות סמכות", avgReliability, 0.08),
    mk("source_verification", "אימות מקורות", input.authority.assessments.length ? input.authority.assessments.filter((a) => a.verification === "verified").length / input.authority.assessments.length : 0, 0.06),
    mk("citation_verification", "אימות ציטוטים", citationRate, 0.08),
    mk("contradiction_resolution", "פתרון סתירות", input.contradictions.unresolvedMaterialCount === 0 ? 1 : 0.2, 0.06),
    mk("corpus_coverage", "כיסוי קורפוס", input.coverage.overallState === "complete_for_poc" ? 1 : 0.4, 0.05),
    mk("qa_status", "מצב QA", input.qa.passed ? 1 : 0, 0.03),
    mk("red_team_status", "מצב Red Team", input.redTeam.blockingCount === 0 ? 1 : 0, 0.02),
  ];

  const overallScore = Number(factors.reduce((s, f) => s + f.contribution, 0).toFixed(3));

  // BAND by deterministic rules — the score does not override these
  const blockingUncertainty: string[] = [];
  let band: ConfidenceBand;
  if (!input.domainMatch) { band = "domain_mismatch"; blockingUncertainty.push("אי-התאמת תחום"); }
  else if (!input.gatePassed || input.coverage.overallState === "corpus_not_covered") { band = "insufficient_evidence"; blockingUncertainty.push("שער הרלוונטיות נכשל / אין כיסוי"); }
  else if (!input.qa.passed || input.redTeam.blockingCount > 0 || input.citations.blockedClaimIds.length > 0) { band = "human_review_required"; blockingUncertainty.push("QA/Red Team/ציטוט חוסמים"); }
  else if (input.contradictions.unresolvedMaterialCount > 0) { band = "human_review_required"; blockingUncertainty.push("סתירה מהותית בלתי פתורה"); }
  else if (overallScore >= 0.75 && input.coverage.overallState === "complete_for_poc") band = "high_within_poc";
  else if (overallScore >= 0.5) band = "moderate";
  else band = "low";

  const reasons: string[] = [];
  if (input.coverage.overallState !== "complete_for_poc") reasons.push("הקורפוס סינתטי/חלקי — אינו סמכות אמיתית");
  if (input.authority.assessments.some((a) => a.verification !== "verified")) reasons.push("חלק מהמקורות אינם מאומתים");
  if (input.coverage.missingFacts.length) reasons.push(`עובדות חסרות: ${input.coverage.missingFacts.join(", ")}`);
  if (input.contradictions.unresolvedMaterialCount) reasons.push("קיימות סתירות בלתי פתורות");

  return {
    band,
    overallScore,
    factors,
    blockingUncertaintyHe: blockingUncertainty,
    requiresHumanReview: band === "human_review_required" || band === "domain_mismatch" || band === "insufficient_evidence" || true, // POC: always
    reasonsConfidenceCannotBeHigherHe: reasons,
    disclaimerHe: "אין כאן הערכת סבירות מספרית לתוצאה משפטית. הביטחון מתייחס לאיכות התהליך והראיות בלבד.",
    engineVersion: CONFIDENCE_ENGINE_VERSION,
  };
}

function mk(key: string, labelHe: string, score: number, weight: number): ConfidenceFactor {
  const s = Math.max(0, Math.min(1, score));
  return { key, labelHe, score: Number(s.toFixed(2)), weight, contribution: Number((s * weight).toFixed(3)), notesHe: "" };
}
