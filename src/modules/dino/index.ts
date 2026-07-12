/**
 * Dino Legal Intelligence Orchestration Engine (Epic 3A).
 * Public surface: the orchestrator + the typed pipeline contract.
 * Provider-independent; deterministic core; safe auditable artifacts only.
 */
export { runDinoPipeline } from "./orchestrator.ts";
export type { DinoRunOptions } from "./orchestrator.ts";
export type { DinoRequest, DinoIntent, IntentClassification } from "./core/request.ts";
export type { DinoRunResult, DinoRunOutcome } from "./core/pipeline-result.ts";
export type { DinoStageRecord, DinoStageId, DinoStageStatus } from "./core/pipeline-types.ts";
export { DINO_ENGINE_VERSION, DINO_STAGES } from "./core/pipeline-types.ts";
export type { DinoArtifacts } from "./core/pipeline-context.ts";
export type { SyntheticMatterFixture } from "./context/matter-context-assembler.ts";
export { DINO_POLICIES } from "./policies/registry.ts";
export { DeterministicProvider, MockModelProvider, ProviderRouter } from "./providers/providers.ts";
