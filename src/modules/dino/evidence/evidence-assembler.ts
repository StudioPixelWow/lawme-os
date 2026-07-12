/**
 * DinoEvidenceAssembler (Epic 3A, Phase 15).
 * Builds the structured evidence ledger. HARD RULE: no source enters
 * final output without a valid anchor — invalid anchors are dropped here
 * and counted.
 */
import { createHash } from "node:crypto";
import type { RetrievalBundle } from "../retrieval/types.ts";
import type { AuthorityValidationReport } from "../authority/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { EvidenceLedger, EvidenceLedgerItem } from "./types.ts";

export const EVIDENCE_ASSEMBLER_VERSION = "evidence-assembler-1.0.0";

export function assembleEvidence(
  retrieval: RetrievalBundle,
  authority: AuthorityValidationReport,
  contradictions: ContradictionReport,
): EvidenceLedger {
  const items: EvidenceLedgerItem[] = [];
  let invalidAnchors = 0;

  const contradictionKeys = new Set(
    contradictions.records.flatMap((r) => [
      `${r.sourceA.documentId}:${r.sourceA.anchorKey}`,
      `${r.sourceB.documentId}:${r.sourceB.anchorKey}`,
    ]),
  );

  for (const per of retrieval.perIssue) {
    for (const e of per.evidence) {
      const assessment = authority.assessments.find(
        (a) => a.documentId === e.documentId && a.anchorKey === e.anchor.anchorKey,
      );
      if (!assessment || !assessment.anchorValid) {
        invalidAnchors++;
        continue; // no valid anchor → never enters the ledger
      }
      const key = `${e.documentId}:${e.anchor.anchorKey}`;
      items.push({
        evidenceId: "ev-" + createHash("sha256").update(per.issueId + key).digest("hex").slice(0, 10),
        issueId: per.issueId,
        claimSupportedHe: null,
        documentId: e.documentId,
        versionId: e.versionId,
        titleHe: e.title,
        sourceAuthorityClass: e.authorityClass,
        quote: e.passage,
        pageNumber: e.anchor.pageNumber ?? null,
        anchorKey: e.anchor.anchorKey,
        charStart: e.anchor.charStart,
        charEnd: e.anchor.charEnd,
        canonicalUrl: e.sourceUrl,
        retrievedAt: e.anchor.retrievedAt,
        verificationStatus: e.verificationStatus,
        supportDirectness: assessment.supportDirectness,
        supportStrength: e.scoreBreakdown.raw.lexicalCoverage,
        limitationsHe: assessment.limitationsHe,
        contradictionStatus: contradictionKeys.has(key) ? "involved_in_contradiction" : "none",
        permissionStatus: assessment.permissionStatus,
        supportingOrOpposing: contradictionKeys.has(key) &&
          contradictions.records.some((r) => `${r.sourceB.documentId}:${r.sourceB.anchorKey}` === key)
          ? "opposing" : "supporting",
        temporalClass: assessment.temporalStatus,
      });
    }
  }

  const byIssue: Record<string, string[]> = {};
  const byAuthority: Record<string, string[]> = {};
  for (const it of items) {
    (byIssue[it.issueId] ??= []).push(it.evidenceId);
    (byAuthority[it.sourceAuthorityClass] ??= []).push(it.evidenceId);
  }

  return { items, byIssue, byAuthority, invalidAnchorCount: invalidAnchors, assemblerVersion: EVIDENCE_ASSEMBLER_VERSION };
}
