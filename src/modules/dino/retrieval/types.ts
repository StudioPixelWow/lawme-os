/** Retrieval-orchestration types (Epic 3A, Phase 10). */
import type { DbResearchResult, DbEvidenceItem } from "../../legal-knowledge/research/engine-db.ts";

export interface IssueRetrievalResult {
  issueId: string;
  research: DbResearchResult;      // full engine result incl. gate + raw scores
  evidence: DbEvidenceItem[];      // answered evidence only
  weakEvidence: DbEvidenceItem[];
}

export interface RetrievalBundle {
  perIssue: IssueRetrievalResult[];
  /** union across issues, deduplicated by document+anchor */
  allEvidence: DbEvidenceItem[];
  allWeakEvidence: DbEvidenceItem[];
  /** true when at least one issue's relevance gate passed */
  anyGatePassed: boolean;
  /** every issue's gate failed → global stop */
  allGatesFailed: boolean;
  orchestratorVersion: string;
}
