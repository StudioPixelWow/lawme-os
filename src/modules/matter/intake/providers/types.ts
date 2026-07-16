/**
 * Hybrid intake provider seam (Capability 2 · Slice 2A, Decision 1).
 *
 * The DETERMINISTIC pipeline stays authoritative for every safety-bearing
 * decision (domain/Triad gates, epistemic restrictions, deadline honesty,
 * source-span validation, human-review routing, persistence eligibility,
 * fail-closed behavior). A provider is ONLY an extraction/classification
 * ASSISTANT that SUGGESTS candidate items. Its output is UNTRUSTED and must
 * pass the deterministic validators before it can appear in an Intake Draft.
 *
 * No provider-specific SDK types are allowed to leak across this boundary.
 */

import type {
  ContactDraft,
  DeadlineDraft,
  Extracted,
  FactDraft,
  MentionedDocumentDraft,
} from "../contracts.ts";

export type IntakeProviderMode = "deterministic" | "model_assisted" | "production_disabled";

export interface ProviderInput {
  /** sanitized story text (spans index into this). */
  story: string;
  /** sanitized pasted text (spans index into this). */
  pasted: string;
  /** deterministic "now". */
  atISO: string;
}

/**
 * The raw suggestions a provider returns. These are the ONLY things a provider
 * may propose: participants, statements, dates, and document mentions. Domain,
 * Triad coverage, contradictions, evidence requirements, legal issues,
 * clarifications, confidence and routing remain deterministic + authoritative
 * in the pipeline — a provider never decides them.
 */
export interface ProviderSuggestions {
  contacts: Array<Extracted<ContactDraft>>;
  facts: Array<Extracted<FactDraft>>;
  deadlines: Array<Extracted<DeadlineDraft>>;
  mentionedDocuments: Array<Extracted<MentionedDocumentDraft>>;
  /** which provider produced these. */
  providerId: string;
  /**
   * Whether the producer is itself trusted (deterministic rules) or untrusted
   * (a model). Untrusted output is force-flagged for human review and every
   * item is re-validated regardless.
   */
  trusted: boolean;
}

/** The provider-neutral extraction interface. */
export interface MatterIntakeExtractionProvider {
  readonly id: string;
  /** must be false in this Part — no network provider is approved yet. */
  readonly makesNetworkCalls: boolean;
  /** disabled providers refuse to run. */
  readonly enabled: boolean;
  extract(input: ProviderInput): Promise<ProviderSuggestions>;
}
