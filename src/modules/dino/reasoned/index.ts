/**
 * Reasoned Dino (Capability 4, Slice 4.1.0) — public surface.
 * The live path renders a LegalOpinion into a grounded ReasonedDinoResponse.
 */
export * from "./types.ts";
export { runReasonedDinoTurn, type ReasonedTurnInput, type ReasonedDeps } from "./pipeline.ts";
export { composeReasonedResponse, REASONED_DINO_VERSION } from "./compose.ts";
export { validateProviderProse } from "./validate.ts";
export { deterministicReasonedProvider, createAnthropicReasonedProvider, buildReasonedRequest } from "./providers.ts";
export { toCitationView, splitCitations, buildClaims } from "./citations.ts";
