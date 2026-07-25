/**
 * Dino Conversation Engine (Capability 3, Slice 3.0.0) — public surface.
 *
 * Deterministic conversation orchestration over MatterIntelligence — NO AI.
 * A provider adapter (Anthropic / OpenAI) consumes ONLY
 * `ConversationContext.recommendedPromptInputs`; connecting a model is a single
 * adapter, nothing else.
 */
export * from "./types.ts";
export { buildConversationContext, DINO_CONVERSATION_VERSION } from "./engine.ts";
export { classifyIntent, INTENT_CONFIG, INTENT_KEYWORDS, INTENT_PRIORITY } from "./intents.ts";
