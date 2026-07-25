/**
 * Legal Research Orchestrator (Capability 3, Slice 3.1.0) — public surface.
 *
 * LawME's own verified legal-research pipeline — DETERMINISTIC, no AI. Produces
 * an immutable `LegalResearchResult`. A future model adapter consumes
 * MatterIntelligence + LegalResearchResult and never queries a legal database.
 */
export * from "./types.ts";
export { runLegalResearch, LEGAL_RESEARCH_VERSION } from "./orchestrator.ts";
export { classifyLegalDomain } from "./domain.ts";
export { extractLegalEntities } from "./entities.ts";
export { buildSearchPlans } from "./plan.ts";
export { rankSources, signalsFor } from "./rank.ts";
export { detectConflicts } from "./conflicts.ts";
export { DEFAULT_ADAPTERS, legislationAdapter, caseLawAdapter } from "./adapters/index.ts";
