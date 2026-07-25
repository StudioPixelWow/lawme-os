/**
 * Knowledge-source adapter registry (Slice 3.1.0).
 * The orchestrator is provider-agnostic: it searches whatever adapters are
 * registered here (or injected). Initial adapters: legislation + case law.
 * Future adapters (regulations, ministry guidelines, internal knowledge, office
 * precedents, legal articles, contracts, uploaded documents) implement the same
 * `KnowledgeSourceAdapter` contract and drop in with no orchestrator change.
 */
import type { KnowledgeSourceAdapter } from "../types.ts";
import { legislationAdapter } from "./legislation.ts";
import { caseLawAdapter } from "./case-law.ts";

export { legislationAdapter } from "./legislation.ts";
export { caseLawAdapter } from "./case-law.ts";

/** The default, currently-available adapter set. */
export const DEFAULT_ADAPTERS: readonly KnowledgeSourceAdapter[] = [legislationAdapter, caseLawAdapter];
