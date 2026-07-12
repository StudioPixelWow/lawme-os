/**
 * DinoRetrievalOrchestrator (Epic 3A, Phase 10).
 * Coordinates the EXISTING deterministic retrieval engine — per legal
 * issue, not once per question. Preserves: score decomposition, the
 * Relevance Gate, corpus-coverage warnings, mock-embeddings honesty.
 */
import { runDbResearch } from "../../legal-knowledge/research/engine-db.ts";
import type { Repositories } from "../../legal-knowledge/repositories/types.ts";
import type { DbEvidenceItem } from "../../legal-knowledge/research/engine-db.ts";
import type { IssueGraph } from "../issues/types.ts";
import type { QueryStrategySet } from "./query-strategy.ts";
import type { IssueRetrievalResult, RetrievalBundle } from "./types.ts";

export const RETRIEVAL_ORCHESTRATOR_VERSION = "retrieval-orchestrator-1.0.0";

export async function orchestrateRetrieval(
  repositories: Repositories,
  issueGraph: IssueGraph,
  strategies: QueryStrategySet,
  legalDomain: string,
): Promise<RetrievalBundle> {
  const perIssue: IssueRetrievalResult[] = [];

  for (const issue of issueGraph.issues) {
    const strategy = strategies.strategies.find((s) => s.issueId === issue.id);
    // issue-focused question: anchor on the ORIGINAL question (so generic/
    // fallback issues still retrieve on the real subject) + the issue's
    // custom terms for focus. primaryQuery is the normalized user question.
    const customTerms = strategy
      ? strategy.queryTerms.filter((t) => t !== strategy.primaryQuery).slice(0, 4)
      : [];
    const issueQuestion = strategy
      ? `${strategy.primaryQuery} ${issue.statementHe} ${customTerms.join(" ")}`.trim()
      : issue.statementHe;

    const research = await runDbResearch(repositories, {
      question: issueQuestion,
      legalDomain,
      authorityPreference: issue.authorityThreshold === "binding" ? "binding_first" : "balanced",
      limit: 6,
    });
    perIssue.push({
      issueId: issue.id,
      research,
      evidence: research.evidence,
      weakEvidence: research.weakEvidence,
    });
  }

  const seen = new Set<string>();
  const dedupe = (items: DbEvidenceItem[]) =>
    items.filter((e) => {
      const k = `${e.documentId}:${e.anchor.anchorKey}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const allEvidence = dedupe(perIssue.flatMap((p) => p.evidence));
  const allWeakEvidence = dedupe(perIssue.flatMap((p) => p.weakEvidence));

  return {
    perIssue,
    allEvidence,
    allWeakEvidence,
    anyGatePassed: perIssue.some((p) => p.research.gate.status === "pass"),
    allGatesFailed: perIssue.every((p) => p.research.gate.status === "fail"),
    orchestratorVersion: RETRIEVAL_ORCHESTRATOR_VERSION,
  };
}
