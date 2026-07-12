# Provider Architecture

> Epic 3A — Dino Legal Intelligence Orchestration Engine. POC over the
> synthetic employment-law corpus. Deterministic core; provider-independent;
> safe auditable artifacts only (no model chain-of-thought).

providers/. Provider-independent model layer. `ModelProvider` interface
(name, version, capabilities, makesNetworkCalls, execute). Implementations:
**DeterministicProvider** (signals a pure-rules stage) and
**MockModelProvider** (canned structured outputs for tests). `ProviderRouter`
routes by capability and REFUSES any network provider. No provider-specific
type leaks into Dino domain modules; providers return STRUCTURED output
only (never free reasoning), validated by the caller against the policy
schema.

Future adapters (OpenAI, Anthropic, Google, Mistral, local/private) are
DOCUMENTED ONLY and must: route through the same interface, validate
output, receive only per-stage minimised context, carry zero-retention +
private-deployment terms, and never receive a service-role credential.
Changing a provider must not require rewriting Dino's legal workflow.
