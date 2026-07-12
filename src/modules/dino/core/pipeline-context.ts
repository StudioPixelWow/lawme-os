/**
 * DinoPipelineContext — the single mutable state object a run carries
 * through the 26 stages. Artifacts are TYPED and SAFE (no model
 * chain-of-thought; only structured, auditable reasoning products).
 */
import type { DinoRequest, IntentClassification } from "./request.ts";
import type { DinoStageRecord, StopCondition } from "./pipeline-types.ts";
import type { MatterContextPackage } from "../context/types.ts";
import type { ClarificationResult } from "../clarification/types.ts";
import type { QuestionClassification } from "../classification/types.ts";
import type { ResearchPlan } from "../planning/types.ts";
import type { IssueGraph } from "../issues/types.ts";
import type { SourcePlan } from "../sources/types.ts";
import type { QueryStrategySet } from "../retrieval/query-strategy.ts";
import type { RetrievalBundle } from "../retrieval/types.ts";
import type { AuthorityValidationReport } from "../authority/types.ts";
import type { ContradictionReport } from "../contradictions/types.ts";
import type { CoverageReport } from "../coverage/types.ts";
import type { EvidenceLedger } from "../evidence/types.ts";
import type { ClaimPlan } from "../claims/types.ts";
import type { ControlledDraft } from "../drafting/types.ts";
import type { CitationVerificationReport } from "../citations/types.ts";
import type { LegalQaReport } from "../qa/types.ts";
import type { RedTeamReport } from "../red-team/types.ts";
import type { ConfidenceReport } from "../confidence/types.ts";
import type { ReviewRoute } from "../review/types.ts";
import type { Repositories } from "../../legal-knowledge/repositories/types.ts";

/** Safe, auditable reasoning artifacts — one optional slot per stage. */
export interface DinoArtifacts {
  intent?: IntentClassification;
  matterContext?: MatterContextPackage;
  questionClassification?: QuestionClassification;
  clarification?: ClarificationResult;
  researchPlan?: ResearchPlan;
  issueGraph?: IssueGraph;
  sourcePlan?: SourcePlan;
  queryStrategies?: QueryStrategySet;
  retrieval?: RetrievalBundle;
  authority?: AuthorityValidationReport;
  contradictions?: ContradictionReport;
  coverage?: CoverageReport;
  evidence?: EvidenceLedger;
  claims?: ClaimPlan;
  draft?: ControlledDraft;
  citations?: CitationVerificationReport;
  qa?: LegalQaReport;
  redTeam?: RedTeamReport;
  confidence?: ConfidenceReport;
  review?: ReviewRoute;
}

export type DinoRunMode = "deterministic_test" | "development" | "future_provider";

export interface DinoPipelineContext {
  runId: string;
  correlationId: string;
  mode: DinoRunMode;
  request: DinoRequest;
  repositories: Repositories;
  artifacts: DinoArtifacts;
  stageRecords: DinoStageRecord[];
  stopConditions: StopCondition[];
  /** decision log — one safe line per material decision */
  decisionLog: { at: string; stageId: string; decisionHe: string }[];
  startedAt: string;
}
