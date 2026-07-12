/**
 * DinoCoverageEvaluator (Epic 3A, Phase 13).
 * Coverage is not relevance: a relevant passage is not enough if the
 * REQUIRED authority is missing, and a high-authority source is not
 * enough if it is not relevant. Evaluates the source plan against the
 * validated evidence, per issue.
 */
import type { IssueGraph } from "../issues/types.ts";
import type { SourcePlan, SourceRequirement } from "../sources/types.ts";
import type { RetrievalBundle } from "../retrieval/types.ts";
import type { AuthorityValidationReport } from "../authority/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { CoverageReport, CoverageState, IssueCoverageRow } from "./types.ts";

export const COVERAGE_EVALUATOR_VERSION = "coverage-evaluator-1.0.0";

function requirementMet(
  req: SourceRequirement,
  issueEvidenceClasses: Map<string, number>,
): boolean {
  const countOf = (cls: string) => issueEvidenceClasses.get(cls) ?? 0;
  switch (req.sourceType) {
    case "current_statutory_text":
      return countOf("legislation") >= req.minimumCount;
    case "binding_supreme_authority":
      return countOf("supreme") >= req.minimumCount;
    case "national_labor_authority":
      return countOf("national_labor") >= req.minimumCount ||
             req.acceptableSubstitutes.includes("binding_supreme_authority") && countOf("supreme") >= req.minimumCount;
    case "regional_persuasive_authority":
      return countOf("regional") + countOf("national_labor") + countOf("supreme") >= req.minimumCount;
    case "extension_order":
      return countOf("legislation") >= 1; // POC: orders classified as legislation
    case "official_guidance":
      return countOf("guidance") >= req.minimumCount;
    case "licensed_secondary_commentary":
      return countOf("secondary") >= req.minimumCount;
    default:
      return false;
  }
}

export function evaluateCoverage(
  issueGraph: IssueGraph,
  sourcePlan: SourcePlan,
  retrieval: RetrievalBundle,
  authority: AuthorityValidationReport,
  contradictions: ContradictionReport,
): CoverageReport {
  const matrix: IssueCoverageRow[] = [];

  for (const issue of issueGraph.issues) {
    const per = retrieval.perIssue.find((p) => p.issueId === issue.id);
    const evidence = per?.evidence ?? [];
    const classes = new Map<string, number>();
    for (const e of evidence) {
      // only count sources whose anchors validated
      const assessed = authority.assessments.find((a) => a.documentId === e.documentId && a.anchorKey === e.anchor.anchorKey);
      if (assessed && !assessed.anchorValid) continue;
      classes.set(e.authorityClass, (classes.get(e.authorityClass) ?? 0) + 1);
    }

    const reqs = sourcePlan.requirements.filter((r) => r.issueId === issue.id);
    const mandatory = reqs.filter((r) => r.mandatory);
    const metMandatory = mandatory.filter((r) => requirementMet(r, classes));
    const missingTypes = mandatory.filter((r) => !requirementMet(r, classes)).map((r) => r.sourceType);

    const primaryMet = (classes.get("legislation") ?? 0) + (classes.get("supreme") ?? 0) +
                       (classes.get("national_labor") ?? 0) + (classes.get("regional") ?? 0) > 0;
    const bindingMet = (classes.get("legislation") ?? 0) + (classes.get("supreme") ?? 0) + (classes.get("national_labor") ?? 0) > 0;

    const gatePassed = per?.research.gate.status === "pass";
    const supported = gatePassed && metMandatory.length === mandatory.length && evidence.length > 0;
    issue.resolution = supported ? "supported"
      : issue.missingFacts.length > 0 ? "blocked_on_facts"
      : "blocked_on_sources";

    matrix.push({
      issueId: issue.id,
      titleHe: issue.titleHe,
      supported,
      primarySourceMet: primaryMet,
      bindingAuthorityMet: bindingMet,
      mandatoryRequirementsMet: metMandatory.length,
      mandatoryRequirementsTotal: mandatory.length,
      missingSourceTypes: missingTypes,
      missingFacts: issue.missingFacts,
      notesHe: [
        ...(gatePassed ? [] : ["שער הרלוונטיות לא עבר לסוגיה זו"]),
        ...(supported ? [] : ["הסוגיה אינה נתמכת במלואה — ראו עמודות חוסר"]),
      ],
    });
  }

  const supportedCount = matrix.filter((m) => m.supported).length;
  const primaryCoverage = matrix.length ? matrix.filter((m) => m.primarySourceMet).length / matrix.length : 0;
  const bindingCoverage = matrix.length ? matrix.filter((m) => m.bindingAuthorityMet).length / matrix.length : 0;
  const allFacts = issueGraph.issues.flatMap((i) => i.requiredFacts);
  const availableFacts = issueGraph.issues.flatMap((i) => i.availableFacts);
  const factCoverage = allFacts.length ? availableFacts.length / allFacts.length : 1;

  let overallState: CoverageState;
  if (retrieval.allGatesFailed) overallState = "corpus_not_covered";
  else if (contradictions.unresolvedMaterialCount > 0) overallState = "conflicting_authority";
  else if (primaryCoverage === 0) overallState = "insufficient_primary_sources";
  else if (bindingCoverage < 0.5 && matrix.some((m) => !m.bindingAuthorityMet && m.missingSourceTypes.length)) overallState = "insufficient_case_law";
  else if (factCoverage < 0.5 && allFacts.length > 0) overallState = "insufficient_facts";
  else if (supportedCount === matrix.length) overallState = "complete_for_poc";
  else overallState = "partially_covered";

  return {
    matrix,
    issuesIdentified: matrix.length,
    issuesSupported: supportedCount,
    issuesUnsupported: matrix.length - supportedCount,
    primarySourceCoverage: Number(primaryCoverage.toFixed(2)),
    bindingAuthorityCoverage: Number(bindingCoverage.toFixed(2)),
    currentVersionCoverage: "unknown_poc",
    contradictionSearchDone: true,
    factualContextCoverage: Number(factCoverage.toFixed(2)),
    corpusDomainCovered: !retrieval.allGatesFailed,
    missingSourceCategories: [...new Set(matrix.flatMap((m) => m.missingSourceTypes))],
    missingFacts: [...new Set(matrix.flatMap((m) => m.missingFacts))],
    missingJurisdictionInfo: [],
    overallState,
    evaluatorVersion: COVERAGE_EVALUATOR_VERSION,
  };
}
