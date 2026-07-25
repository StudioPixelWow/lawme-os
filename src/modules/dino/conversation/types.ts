/**
 * Dino Conversation Engine — types (Capability 3, Slice 3.0.0). PURE.
 *
 * The engine is a DETERMINISTIC orchestrator: given MatterIntelligence, the
 * conversation history and the current user message, it produces a
 * `ConversationContext` that fully prepares a future AI turn — WITHOUT any AI.
 * No LLM, no prompts, no model invocation, no embeddings, no search.
 *
 * The `RecommendedPromptInputs` is the single seam: a provider adapter
 * (Anthropic / OpenAI) consumes it and nothing else. No React, no Supabase.
 */
import type {
  MatterIdentity, MatterStage, MatterClientInfo, ResponsibleLawyerInfo,
  PartyRecord, FactRecord, DocumentRecord, EvidenceRecord, DeadlineRecord,
  TimelineRecord, MatterRelationships, MatterCounts, MatterTiming,
  MatterCompleteness, MatterHealth, MatterScores, OutstandingIssue, KnownUnknown,
  MatterHealthStatus, MatterIntelligence,
} from "../../matter/intelligence/types.ts";

/** The supported user intents. */
export type DinoIntent =
  | "summarize_matter"
  | "explain_timeline"
  | "show_missing_information"
  | "explain_participants"
  | "explain_facts"
  | "explain_evidence"
  | "explain_deadlines"
  | "prepare_for_hearing"
  | "draft_request"
  | "general_question"
  | "unknown";

export const DINO_INTENTS: readonly DinoIntent[] = [
  "summarize_matter", "explain_timeline", "show_missing_information",
  "explain_participants", "explain_facts", "explain_evidence",
  "explain_deadlines", "prepare_for_hearing", "draft_request",
  "general_question", "unknown",
];

export type ConversationScope =
  | "whole_matter" | "single_section" | "general" | "unknown";

export type MatterSection =
  | "identity" | "stage" | "client" | "responsible_lawyer" | "participants"
  | "facts" | "documents" | "evidence" | "deadlines" | "timeline"
  | "relationships" | "counts" | "timing" | "completeness" | "health"
  | "scores" | "outstanding_issues" | "known_unknowns";

export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly atISO?: string;
}

/** An intent-scoped projection of MatterIntelligence — the ONLY data a future
 *  model may use. Only the relevant sections are populated. */
export interface MatterContextSections {
  readonly identity?: MatterIdentity;
  readonly stage?: MatterStage;
  readonly client?: MatterClientInfo;
  readonly responsibleLawyer?: ResponsibleLawyerInfo;
  readonly participants?: readonly PartyRecord[];
  readonly facts?: readonly FactRecord[];
  readonly documents?: readonly DocumentRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly deadlines?: readonly DeadlineRecord[];
  readonly timeline?: readonly TimelineRecord[];
  readonly relationships?: MatterRelationships;
  readonly counts?: MatterCounts;
  readonly timing?: MatterTiming;
  readonly completeness?: MatterCompleteness;
  readonly health?: MatterHealth;
  readonly scores?: MatterScores;
  readonly outstandingIssues?: readonly OutstandingIssue[];
  readonly knownUnknowns?: readonly KnownUnknown[];
}

export interface MatterContext {
  readonly matterId: string;
  readonly titleHe: string;
  readonly procedureLabelHe: string;
  readonly stageLabelHe: string;
  readonly status: string;
  readonly healthStatus: MatterHealthStatus | null;   // null in general (no-matter) mode
  readonly includedSections: readonly MatterSection[];
  readonly sections: MatterContextSections;
}

export interface RequiredFact {
  readonly code: string;
  readonly labelHe: string;
  readonly section: MatterSection;
  readonly satisfied: boolean;
}

export interface MissingFact {
  readonly code: string;
  readonly labelHe: string;
  readonly section: MatterSection;
  readonly reasonHe: string;
  readonly blocking: boolean;
}

export interface ClarificationQuestion {
  readonly code: string;
  readonly questionHe: string;
  readonly reasonHe: string;
  readonly blocking: boolean;
}

export type AnswerabilityLevel =
  | "ready" | "needs_clarification" | "insufficient_data" | "out_of_scope";

export interface Answerability {
  readonly level: AnswerabilityLevel;
  readonly score: number;          // 0..1
  readonly reasonHe: string;
}

/** The single adapter seam. A provider adapter consumes ONLY this. */
export interface RecommendedPromptInputs {
  readonly intent: DinoIntent;
  readonly locale: string;                 // "he-IL"
  readonly taskLabelHe: string;
  readonly directives: readonly string[];  // deterministic system rules
  readonly grounding: MatterContext;       // exactly the data the model may use
  readonly userMessage: string;
  readonly conversation: readonly ConversationTurn[];
  readonly openQuestions: readonly string[];
  readonly answerable: boolean;
}

export interface ConversationContextMeta {
  readonly version: string;
  readonly engine: string;
  readonly generatedAtISO: string;
}

export interface ConversationContext {
  readonly meta: ConversationContextMeta;
  readonly userMessage: string;
  readonly intent: DinoIntent;
  readonly intentConfidence: number;       // 0..1
  readonly scope: ConversationScope;
  readonly isFollowUp: boolean;
  readonly previousIntent: DinoIntent | null;
  readonly matterContext: MatterContext;
  readonly relevantSections: readonly MatterSection[];
  readonly requiredFacts: readonly RequiredFact[];
  readonly missingFacts: readonly MissingFact[];
  readonly clarificationQuestions: readonly ClarificationQuestion[];
  readonly answerability: Answerability;
  readonly recommendedPromptInputs: RecommendedPromptInputs;
  readonly history: readonly ConversationTurn[];
}

export interface ConversationRequest {
  /** Absent/null → general (no-matter) mode: intent is still classified, but
   *  there is no matter context and no matter-derived required/missing facts. */
  readonly intelligence?: MatterIntelligence | null;
  readonly history?: readonly ConversationTurn[];
  readonly message: string;
  readonly nowISO?: string;
}
