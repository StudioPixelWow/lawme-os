/**
 * Shared Intelligence Core (Epic 4.1) — neutral primitives used by every
 * intelligence domain (Dino, Matter, and future Client/Document/Office/Team/
 * Finance). Contains SHAPES and CONTRACTS only — no domain business logic, and
 * no import of any domain orchestrator. Dependency direction is strictly:
 *   domains → intelligence/core → (nothing domain-specific)
 */
export * from "./severity.ts";
export * from "./epistemic-status.ts";
export * from "./provenance.ts";
export * from "./ai-policy.ts";
export * from "./confidentiality.ts";
export * from "./confidence.ts";
export * from "./review-route.ts";
export * from "./finding.ts";
export * from "./recommended-action.ts";
export * from "./warning.ts";
export * from "./blocking-condition.ts";
export * from "./assessment.ts";
export * from "./result.ts";

export const INTELLIGENCE_CORE_VERSION = "intelligence-core-1.0.0";
