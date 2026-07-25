/**
 * Dino Experience (Capability 3, Slice 3.2.0) — public surface.
 * Connects Matter Intelligence + Conversation Engine + Legal Research
 * Orchestrator into one grounded response, with an Anthropic provider adapter
 * that consumes only those objects and never queries a legal database.
 */
export * from "./types.ts";
export { runDinoTurn } from "./pipeline.ts";
export { composeGroundedResponse, DINO_EXPERIENCE_VERSION } from "./response-composer.ts";
export { deterministicProvider } from "./providers/deterministic.ts";
export { createAnthropicProvider, buildAnthropicRequest, type AnthropicConfig, type AnthropicTransport } from "./providers/anthropic.ts";
