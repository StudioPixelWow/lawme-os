/**
 * Provider-independent model layer (Epic 3A, Phase 17).
 * LLMs are replaceable execution providers. NO provider-specific type
 * may leak into Dino domain modules; NO live/paid provider exists here.
 */

export type ProviderCapability =
  | "classification"
  | "planning"
  | "extraction"
  | "summarization"
  | "drafting"
  | "comparison"
  | "contradiction_analysis"
  | "structured_output"
  | "hebrew_support"
  | "long_context"
  | "private_deployment";

export interface ProviderTask {
  /** policy id from the registry — the ONLY way to instruct a provider */
  policyId: string;
  /** minimized, stage-scoped context — never the full matter file */
  input: Record<string, unknown>;
  expectedSchema: string;         // schema name from the policy registry
}

export interface ProviderResult {
  ok: boolean;
  /** structured output ONLY — providers never return free reasoning text */
  output: Record<string, unknown> | null;
  provider: string;
  providerVersion: string;
  validated: boolean;             // schema-checked by the caller
  errorHe?: string;
}

export interface ModelProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: ReadonlySet<ProviderCapability>;
  readonly makesNetworkCalls: boolean;
  execute(task: ProviderTask): Promise<ProviderResult>;
}
