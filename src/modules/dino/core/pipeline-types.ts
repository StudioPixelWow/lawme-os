/**
 * DINO PIPELINE CONTRACT — Epic 3A, Phase 1.
 *
 * Dino is LawME's legal-intelligence ORCHESTRATOR — not an LLM, not a
 * chatbot, not a single prompt. The durable IP is this typed pipeline;
 * model providers are replaceable execution details behind the provider
 * layer (src/modules/dino/providers).
 *
 * SAFETY: no stage stores or exposes private model chain-of-thought.
 * Every stage produces a SAFE, AUDITABLE structured artifact that
 * explains what Dino did and why at a professional level.
 */

/** The 26 official pipeline stages, in execution order. */
export const DINO_STAGES = [
  "request_intake",          // 1
  "intent_detection",        // 2
  "matter_context_assembly", // 3
  "question_classification", // 4
  "domain_classification",   // 5
  "clarification_gate",      // 6
  "research_plan",           // 7
  "issue_decomposition",     // 8
  "required_source_planning",// 9
  "query_strategy",          // 10
  "retrieval",               // 11
  "authority_validation",    // 12
  "contradiction_search",    // 13
  "coverage_evaluation",     // 14
  "relevance_gate",          // 15
  "evidence_assembly",       // 16
  "claim_planning",          // 17
  "answer_planning",         // 18
  "controlled_drafting",     // 19
  "citation_verification",   // 20
  "legal_qa",                // 21
  "red_team_review",         // 22
  "confidence_evaluation",   // 23
  "human_review_routing",    // 24
  "final_output",            // 25
  "audit_persistence",       // 26
] as const;

export type DinoStageId = (typeof DINO_STAGES)[number];

export type DinoStageStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "requires_clarification"
  | "insufficient_evidence"
  | "domain_mismatch"
  | "requires_human_review"
  | "blocked_by_policy";

/** Statuses that stop the pipeline (structured stop — never a generic error). */
export const BLOCKING_STATUSES: ReadonlySet<DinoStageStatus> = new Set([
  "failed",
  "requires_clarification",
  "insufficient_evidence",
  "domain_mismatch",
  "blocked_by_policy",
]);

export interface DeterministicRuleRef {
  name: string;
  version: string;
}

export interface StageProvenance {
  /** provider used for this stage ("deterministic" when no model ran) */
  provider: string;
  providerVersion: string;
  deterministicRules: DeterministicRuleRef[];
  policyIds: string[];
}

export interface StageError {
  code: string;
  messageHe: string;
  detail?: string;
}

export interface StopCondition {
  code: string;
  messageHe: string;
  /** which stage raised it */
  stageId: DinoStageId;
  /** what a human should do next */
  recommendedActionHe: string;
}

/**
 * The universal per-stage record. `artifactType` names the typed artifact
 * placed in DinoArtifacts — the artifact IS the safe reasoning output.
 */
export interface DinoStageRecord {
  stageId: DinoStageId;
  purposeHe: string;
  status: DinoStageStatus;
  startedAt: string | null;   // ISO
  completedAt: string | null; // ISO
  durationMs: number | null;
  /** 0..1, deterministic formulas only — never model self-belief */
  confidence: number | null;
  warnings: string[];
  errors: StageError[];
  stopConditions: StopCondition[];
  provenance: StageProvenance;
  /** key of the artifact this stage wrote into DinoArtifacts (if any) */
  artifactType: string | null;
  audit: {
    correlationId: string;
    inputSummaryHe: string;   // safe summary — never raw private content
    outputSummaryHe: string;
  };
}

export const DINO_ENGINE_VERSION = "dino-orchestrator-0.1.0";
