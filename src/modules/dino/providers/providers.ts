/**
 * Providers (Epic 3A, Phase 17): DeterministicProvider + MockModelProvider
 * + ProviderRouter. No live calls anywhere; future adapters (OpenAI,
 * Anthropic, Google, Mistral, local) are DOCUMENTED ONLY
 * (docs/dino/DINO_PROVIDER_ARCHITECTURE.md) and must route through the
 * same interface with the same validation.
 */
import type { ModelProvider, ProviderCapability, ProviderResult, ProviderTask } from "./types.ts";

/** Executes nothing model-like — signals "this stage ran pure rules". */
export class DeterministicProvider implements ModelProvider {
  readonly name = "deterministic";
  readonly version = "1.0.0";
  readonly capabilities = new Set<ProviderCapability>([
    "classification", "planning", "structured_output", "hebrew_support",
  ]);
  readonly makesNetworkCalls = false;

  async execute(task: ProviderTask): Promise<ProviderResult> {
    return {
      ok: true,
      output: { note: "deterministic stage — no model executed", policyId: task.policyId },
      provider: this.name,
      providerVersion: this.version,
      validated: true,
    };
  }
}

/** Test double: returns canned structured outputs keyed by policyId. */
export class MockModelProvider implements ModelProvider {
  readonly name = "mock-model";
  readonly version = "1.0.0";
  readonly capabilities = new Set<ProviderCapability>([
    "classification", "planning", "extraction", "summarization", "drafting",
    "comparison", "contradiction_analysis", "structured_output", "hebrew_support", "long_context",
  ]);
  readonly makesNetworkCalls = false;
  private canned = new Map<string, Record<string, unknown>>();

  setCanned(policyId: string, output: Record<string, unknown>): void {
    this.canned.set(policyId, output);
  }

  async execute(task: ProviderTask): Promise<ProviderResult> {
    const output = this.canned.get(task.policyId) ?? null;
    return {
      ok: output !== null,
      output,
      provider: this.name,
      providerVersion: this.version,
      validated: false, // caller MUST validate against the policy schema
      errorHe: output === null ? "אין פלט מוכן למדיניות זו" : undefined,
    };
  }
}

/** Routes a task to a provider by capability; refuses network providers. */
export class ProviderRouter {
  private providers: ModelProvider[];
  constructor(providers: ModelProvider[]) {
    // explicit field assignment — Node strip-types forbids parameter properties
    this.providers = providers;
    const live = providers.filter((p) => p.makesNetworkCalls);
    if (live.length > 0) {
      throw new Error(`REFUSED: live/network providers are not approved (${live.map((p) => p.name).join(", ")})`);
    }
  }
  route(capability: ProviderCapability): ModelProvider {
    const p = this.providers.find((pr) => pr.capabilities.has(capability));
    if (!p) throw new Error(`no provider for capability: ${capability}`);
    return p;
  }
}
