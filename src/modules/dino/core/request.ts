/**
 * DinoRequest — the typed entry model of every Dino run (Epic 3A, Phase 2).
 * All fields beyond `question` are optional and explicit — Dino never
 * invents them; missing critical fields trigger the Clarification Gate.
 */

export type DinoOutputType =
  | "research_summary"
  | "issue_outline"
  | "source_memorandum"
  | "evidence_matrix"
  | "retrieval_list"
  | "clarification_only";

export type DinoConfidentiality = "internal" | "client_confidential" | "privileged";

export type DinoAiPolicy =
  | "allowed"
  | "allowed_with_review"
  | "restricted_no_private_context"
  | "prohibited";

export interface DinoRequest {
  question: string;
  userId?: string | null;
  organizationId?: string | null;
  matterId?: string | null;
  clientId?: string | null;
  legalDomain?: string | null;        // e.g. "labor"
  jurisdiction?: string | null;       // e.g. "IL"
  courtOrAuthority?: string | null;
  documentObjective?: string | null;
  requestedOutputType?: DinoOutputType | null;
  dateContext?: string | null;        // "the law as of" (ISO date)
  temporalCutoff?: string | null;     // ignore sources after this date
  sourceRestrictions?: string[];      // e.g. ["primary_only"]
  confidentiality?: DinoConfidentiality;
  aiPolicy?: DinoAiPolicy;            // client/matter-level AI policy
  language?: "he" | "en";
  tone?: "advisory" | "assertive" | "neutral";
  urgency?: "routine" | "urgent" | "deadline_critical";
  humanReviewer?: string | null;
  allowedTools?: string[];
  forbiddenTools?: string[];
  /** explicit user-supplied context items (POC: the only private context) */
  suppliedContext?: SuppliedContextItem[];
}

export interface SuppliedContextItem {
  /** free text supplied by the user, e.g. "העובדת הועסקה 8 חודשים" */
  statement: string;
  /** who asserts it */
  assertedBy: "our_client" | "opposing_party" | "document" | "user_unknown";
}

/* ---------------- intent model ---------------- */

export const DINO_INTENTS = [
  "legal_research",
  "legal_question",
  "case_analysis",
  "statute_analysis",
  "judgment_analysis",
  "document_drafting",
  "document_review",
  "contract_review",
  "hearing_preparation",
  "meeting_preparation",
  "evidence_analysis",
  "deadline_analysis",
  "client_update",
  "communication_draft",
  "office_operation",
  "unsupported_request",
] as const;

export type DinoIntent = (typeof DINO_INTENTS)[number];

/** Intents the POC pipeline may execute end-to-end today. */
export const POC_ALLOWED_INTENTS: ReadonlySet<DinoIntent> = new Set([
  "legal_research",
  "legal_question",
  "case_analysis",
  "statute_analysis",
  "judgment_analysis",
]);

export interface IntentClassification {
  primaryIntent: DinoIntent;
  secondaryIntents: DinoIntent[];
  confidence: number; // 0..1 deterministic
  /** which textual evidence triggered the classification */
  evidence: { pattern: string; matched: string }[];
  ambiguity: string[];
  requiredClarification: string[];
  allowedPipeline: DinoIntent[];
  prohibitedPipeline: { intent: DinoIntent; reasonHe: string }[];
}
