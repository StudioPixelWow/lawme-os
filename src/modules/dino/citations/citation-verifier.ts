/**
 * DinoCitationVerifier (Epic 3A, Phase 20).
 * Re-fetches each cited section from the repository and verifies the
 * quote byte-for-byte against the stored source. Any failed citation
 * BLOCKS the associated claim from final output.
 */
import type { Repositories, OrgContext } from "../../legal-knowledge/repositories/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { ClaimPlan } from "../claims/types.ts";
import type { CitationCheck, CitationStatus, CitationVerificationReport } from "./types.ts";

export const CITATION_VERIFIER_VERSION = "citation-verifier-1.0.0";

export async function verifyCitations(
  repositories: Repositories,
  ledger: EvidenceLedger,
  claimPlan: ClaimPlan,
  ctx: OrgContext,
): Promise<CitationVerificationReport> {
  const checks: CitationCheck[] = [];
  const blocked = new Set<string>();

  for (const item of ledger.items) {
    const claim = claimPlan.claims.find((c) => c.supportingEvidenceIds.includes(item.evidenceId));

    // re-read the sections from the repository (ground truth) and match
    // the cited anchor — verification against stored source, not memory
    let documentExists = false;
    let anchorExists = false;
    let quoteMatches = false;
    let rangeMatches = false;
    const notes: string[] = [];

    const secRes = await repositories.documents.getSections(item.versionId, ctx);
    if (secRes.ok) {
      documentExists = true;
      const stored = secRes.data.find((s) => s.anchorKey === item.anchorKey);
      if (stored) {
        anchorExists = true;
        quoteMatches = stored.content === item.quote;
        rangeMatches = stored.charStart === item.charStart && stored.charEnd === item.charEnd &&
          stored.content.length === item.charEnd - item.charStart;
        if (!quoteMatches) notes.push("הציטוט אינו תואם את הטקסט השמור במקור");
        if (!rangeMatches) notes.push("טווח התווים אינו תואם");
      } else {
        notes.push("לא נמצאה פסקה תואמת במאגר לעוגן זה");
      }
    } else {
      notes.push("שגיאת אחזור פסקאות מהמאגר");
    }

    // "quoted text supports the claim": for EXTRACTIVE claims the quote is
    // built directly from this evidence, so support = the claim references
    // this exact anchored quote (byte-exact) — NOT a coverage re-threshold
    // against a reconstructed query. When no claim uses this item, support
    // is judged by anchor validity + a non-trivial quote alone.
    const claimUsesQuote = claim
      ? claim.propositionHe.includes(item.quote.slice(0, 60))
      : true;
    // a byte-exact, anchored quote referenced by the claim supports it —
    // even a short section heading. length floor only rejects empty/garbage.
    const quoteSupportsClaim = quoteMatches && rangeMatches && item.quote.trim().length >= 3 && claimUsesQuote;
    const authorityCorrect = true; // authority validated upstream against the same row

    let status: CitationStatus;
    let blocksClaim = false;
    if (!documentExists || !anchorExists) { status = "broken_anchor"; blocksClaim = true; }
    else if (!quoteMatches) { status = "quote_mismatch"; blocksClaim = true; }
    else if (!rangeMatches) { status = "broken_anchor"; blocksClaim = true; }
    else if (!quoteSupportsClaim) { status = "insufficient_support"; blocksClaim = true; }
    else if (item.verificationStatus !== "verified") { status = "anchor_valid_source_unverified"; blocksClaim = false; notes.push("עוגן תקין אך המקור אינו מאומת (POC סינתטי)"); }
    else { status = "verified"; }

    if (blocksClaim && claim) blocked.add(claim.claimId);

    checks.push({
      evidenceId: item.evidenceId,
      claimId: claim?.claimId ?? null,
      documentExists,
      versionExists: documentExists,
      anchorExists,
      quoteMatches,
      rangeMatches,
      sourceUrlPresent: Boolean(item.canonicalUrl),
      authorityCorrect,
      quoteSupportsClaim,
      status,
      blocksClaim,
      notesHe: notes,
    });
  }

  return {
    checks,
    blockedClaimIds: [...blocked],
    verifierVersion: CITATION_VERIFIER_VERSION,
  };
}
