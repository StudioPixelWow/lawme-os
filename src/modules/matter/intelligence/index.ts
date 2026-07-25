/**
 * Matter Intelligence Layer (Capability 2, Slice 2.1.0) — public surface.
 *
 * The canonical Matter read model. Every future capability (Dino, Legal AI,
 * hearing prep, draft generation, timeline reasoning, missing-information
 * detection) consumes `MatterIntelligence` via `loadMatterIntelligence` — never
 * the raw tables. No AI in this layer.
 */
export type { MatterSource } from "./source.ts";
export * from "./types.ts";
export { buildMatterIntelligence, MATTER_INTELLIGENCE_VERSION } from "./derive.ts";
export { loadMatterSource } from "./read.ts";
export { loadMatterIntelligence, type MatterIntelligenceLoad } from "./loader.ts";
