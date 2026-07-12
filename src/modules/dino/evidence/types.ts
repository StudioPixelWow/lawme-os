/** Evidence-ledger model (Epic 3A, Phase 15). */

export interface EvidenceLedgerItem {
  evidenceId: string;
  issueId: string;
  claimSupportedHe: string | null;   // filled by the claim planner
  documentId: string;
  versionId: string;
  titleHe: string;
  sourceAuthorityClass: string;
  quote: string;
  pageNumber: number | null;
  anchorKey: string;
  charStart: number;
  charEnd: number;
  canonicalUrl: string | null;
  retrievedAt: string;
  verificationStatus: string;
  supportDirectness: "direct" | "indirect";
  supportStrength: number;            // raw absolute coverage
  limitationsHe: string[];
  contradictionStatus: "none" | "involved_in_contradiction";
  permissionStatus: string;
  supportingOrOpposing: "supporting" | "opposing";
  temporalClass: "current" | "historical" | "unknown";
}

export interface EvidenceLedger {
  items: EvidenceLedgerItem[];
  byIssue: Record<string, string[]>;        // issueId -> evidenceIds
  byAuthority: Record<string, string[]>;
  invalidAnchorCount: number;               // MUST be 0 in final output
  assemblerVersion: string;
}
