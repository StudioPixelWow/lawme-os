/**
 * DinoLegalQA (Epic 3A, Phase 21).
 * Deterministic quality gate over the assembled draft/claims/coverage.
 * A blocking finding prevents final output.
 */
import type { ClaimPlan } from "../claims/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { CitationVerificationReport } from "../citations/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { ControlledDraft } from "../drafting/types.ts";
import type { QaFinding, LegalQaReport } from "./types.ts";

export const LEGAL_QA_VERSION = "legal-qa-1.0.0";

export function runLegalQa(
  draft: ControlledDraft,
  claimPlan: ClaimPlan,
  ledger: EvidenceLedger,
  coverage: CoverageReport,
  citations: CitationVerificationReport,
  contradictions: ContradictionReport,
): LegalQaReport {
  const blocking: QaFinding[] = [];
  const warnings: QaFinding[] = [];
  let n = 1;
  const F = (checkHe: string, passed: boolean, blockingF: boolean, detailHe: string, affected: string[] = []): QaFinding =>
    ({ id: `qa-${n++}`, checkHe, passed, blocking: blockingF, detailHe, affectedClaimIds: affected });

  // 1. no invalid anchors in the ledger
  const anchorsClean = ledger.invalidAnchorCount === 0;
  (anchorsClean ? warnings : blocking).push(
    F("כל העוגנים תקינים", anchorsClean, true, anchorsClean ? "אין עוגנים פסולים" : `${ledger.invalidAnchorCount} עוגנים פסולים נשמטו`),
  );

  // 2. no blocked citation feeds a drafted paragraph
  const draftedClaims = new Set(draft.paragraphs.flatMap((p) => p.claimIds));
  const blockedInDraft = citations.blockedClaimIds.filter((c) => draftedClaims.has(c));
  (blockedInDraft.length === 0 ? warnings : blocking).push(
    F("אין ציטוט חסום בטיוטה", blockedInDraft.length === 0, true,
      blockedInDraft.length === 0 ? "כל הציטוטים בטיוטה עברו אימות" : `טענות עם ציטוט חסום: ${blockedInDraft.join(", ")}`, blockedInDraft),
  );

  // 3. every substantive paragraph has a citation
  const uncited = draft.paragraphs.filter((p) => p.claimIds.length > 0 && p.citationRefs.length === 0);
  (uncited.length === 0 ? warnings : blocking).push(
    F("כל טענה מהותית מצוטטת", uncited.length === 0, true,
      uncited.length === 0 ? "אין טענה ללא ציטוט" : `${uncited.length} פסקאות ללא ציטוט`, uncited.flatMap((p) => p.claimIds)),
  );

  // 4. no unsafe_to_state claim was drafted
  const unsafeDrafted = claimPlan.claims.filter((c) => !c.safeToState && draftedClaims.has(c.claimId));
  (unsafeDrafted.length === 0 ? warnings : blocking).push(
    F("לא נוסחה טענה שסומנה כלא-בטוחה", unsafeDrafted.length === 0, true,
      unsafeDrafted.length === 0 ? "כל הטענות שנוסחו בטוחות" : "נוסחה טענה לא-בטוחה", unsafeDrafted.map((c) => c.claimId)),
  );

  // 5. mandatory label present
  const labelOk = draft.mandatoryLabelHe.includes("נדרשת בדיקת עורך דין");
  (labelOk ? warnings : blocking).push(F("תווית חובה מוצגת", labelOk, true, labelOk ? "התווית קיימת" : "חסרה תווית חובה"));

  // 6. limitations / corpus coverage visible (non-blocking but required)
  warnings.push(F("כיסוי קורפוס גלוי", true, false, `מצב כיסוי: ${coverage.overallState}`));

  // 7. unresolved contradictions disclosed (non-blocking; lowers confidence)
  warnings.push(F("סתירות בלתי פתורות נחשפו", true, false, `סתירות מהותיות בלתי פתורות: ${contradictions.unresolvedMaterialCount}`));

  // 8. primary source used where required
  const primaryOk = coverage.primarySourceCoverage > 0 || coverage.issuesIdentified === 0;
  (primaryOk ? warnings : blocking).push(
    F("נעשה שימוש במקור ראשי היכן שנדרש", primaryOk, coverage.issuesSupported > 0,
      primaryOk ? "יש כיסוי מקור ראשי" : "אין מקור ראשי לסוגיות נתמכות"),
  );

  const passed = blocking.every((f) => f.passed);
  const claimsRemoved = [...new Set([...blockedInDraft, ...unsafeDrafted.map((c) => c.claimId)])];

  return {
    passed,
    blockingFindings: blocking.filter((f) => !f.passed),
    nonBlockingWarnings: warnings,
    claimsRemoved,
    claimsRevised: [],
    requiredHumanActionsHe: [
      "בדיקת עורך דין לכל טענה משפטית",
      ...(contradictions.unresolvedMaterialCount > 0 ? ["הכרעה בסתירות שאותרו"] : []),
      ...(coverage.overallState !== "complete_for_poc" ? ["השלמת מקורות חסרים"] : []),
    ],
    qaVersion: LEGAL_QA_VERSION,
  };
}
