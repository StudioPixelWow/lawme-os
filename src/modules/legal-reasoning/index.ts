/**
 * Legal Reasoning Engine (Capability 4, Slice 4.0.0) — public surface.
 *
 * Produces the canonical, immutable `LegalOpinion` — the legal reasoning object.
 * A future provider adapter consumes ONLY this object; its sole job is to convert
 * the opinion into excellent Hebrew. The provider never determines legal
 * reasoning. No LLM, no prose, no UI in this layer.
 */
export * from "./types.ts";
export { buildLegalOpinion, LEGAL_REASONING_VERSION } from "./engine.ts";
export { resolveGoverningProcedure, FACT_KEY_HE } from "./catalog.ts";
