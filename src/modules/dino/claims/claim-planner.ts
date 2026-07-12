/**
 * DinoClaimPlanner (Epic 3A, Phase 16).
 * Atomic claims BEFORE drafting. A claim is safe_to_state only when its
 * evidence, facts and contradiction status allow it; unsafe claims are
 * never drafted.
 */
import { createHash } from "node:crypto";
import type { IssueGraph } from "../issues/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { AtomicClaim, ClaimPlan, ClaimType } from "./types.ts";

export const CLAIM_PLANNER_VERSION = "claim-planner-1.0.0";

function claimTypeFor(authorityClass: string): ClaimType {
  switch (authorityClass) {
    case "legislation": return "statutory_text";
    case "supreme":
    case "national_labor":
    case "regional": return "judicial_interpretation";
    case "guidance": return "official_guidance";
    case "secondary": return "secondary_explanation";
    default: return "unresolved";
  }
}

export function planClaims(
  issueGraph: IssueGraph,
  ledger: EvidenceLedger,
  contradictions: ContradictionReport,
): ClaimPlan {
  const claims: AtomicClaim[] = [];

  for (const issue of issueGraph.issues) {
    const evidenceIds = ledger.byIssue[issue.id] ?? [];
    const items = evidenceIds
      .map((id) => ledger.items.find((i) => i.evidenceId === id)!)
      .filter(Boolean);

    if (items.length === 0) {
      claims.push({
        claimId: "claim-" + createHash("sha256").update(issue.id + "none").digest("hex").slice(0, 8),
        issueId: issue.id,
        propositionHe: `לא ניתן לקבוע דבר לגבי "${issue.titleHe}" — אין ראיות מספקות בקורפוס`,
        claimType: "unresolved",
        requiredEvidenceHe: "מקור ראשי רלוונטי",
        supportingEvidenceIds: [],
        opposingEvidenceIds: [],
        factualDependencies: issue.missingFacts,
        confidence: 0,
        safeToState: true, // stating the ABSENCE is safe and honest
        unsafeReasonsHe: [],
        wordingConstraintsHe: ["יש לנסח כהיעדר מקור, לא כמסקנה שלילית"],
        citationRequired: false,
        requiresHumanReview: true,
      });
      continue;
    }

    for (const item of items.filter((i) => i.supportingOrOpposing === "supporting")) {
      const opposing = items.filter((i) => i.supportingOrOpposing === "opposing").map((i) => i.evidenceId);
      const inContradiction = item.contradictionStatus === "involved_in_contradiction";
      const secondaryOnly = item.sourceAuthorityClass === "secondary" || item.sourceAuthorityClass === "guidance";
      const missingFactBlock = issue.missingFacts.length > 0 && issue.issueType !== "procedural_requirement";

      const unsafeReasons: string[] = [];
      if (secondaryOnly) unsafeReasons.push("מקור משני/הנחיה בלבד — אסור כקביעה משפטית עצמאית");
      if (inContradiction && contradictions.unresolvedMaterialCount > 0) unsafeReasons.push("מעורב בסתירה מהותית בלתי פתורה");
      if (item.verificationStatus !== "verified") unsafeReasons.push("מקור לא מאומת — ניסוח כממצא אחזור בלבד (POC)");
      if (missingFactBlock) unsafeReasons.push(`תלוי בעובדות חסרות: ${issue.missingFacts.join(", ")}`);

      // POC honesty: unverified synthetic sources → claims are stated as
      // "what the retrieved source says", never as the law. That phrasing
      // is safe; a bare legal proposition is not.
      const safeToState = !secondaryOnly && !(inContradiction && contradictions.unresolvedMaterialCount > 0) && !missingFactBlock;

      claims.push({
        claimId: "claim-" + createHash("sha256").update(item.evidenceId).digest("hex").slice(0, 8),
        issueId: issue.id,
        propositionHe: `לפי ${item.titleHe} (${item.anchorKey}): ${item.quote.slice(0, 120)}…`,
        claimType: claimTypeFor(item.sourceAuthorityClass),
        requiredEvidenceHe: "ציטוט מעוגן מהמקור",
        supportingEvidenceIds: [item.evidenceId],
        opposingEvidenceIds: opposing,
        factualDependencies: issue.requiredFacts,
        confidence: Number(Math.min(1, item.supportStrength + (item.sourceAuthorityClass === "legislation" ? 0.3 : 0.15)).toFixed(2)),
        safeToState,
        unsafeReasonsHe: unsafeReasons.filter((r) => !safeToState || r.startsWith("מקור לא מאומת")),
        wordingConstraintsHe: [
          "ניסוח חילוצי בלבד — כדיווח על תוכן המקור",
          "חובה לציין שהקורפוס סינתטי ואינו סמכות",
        ],
        citationRequired: true,
        requiresHumanReview: true, // POC: every claim requires lawyer review
      });
      item.claimSupportedHe = `claim over ${issue.titleHe}`;
    }
  }

  return {
    claims,
    safeCount: claims.filter((c) => c.safeToState).length,
    unsafeCount: claims.filter((c) => !c.safeToState).length,
    plannerVersion: CLAIM_PLANNER_VERSION,
  };
}
