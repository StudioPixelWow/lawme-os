/**
 * Embedding provider abstraction (Epic 1 POC).
 * The product is NOT locked to one provider: the engine consumes this
 * interface only. Paid APIs are NEVER called without explicit approval —
 * the only implementation shipped in the POC is deterministic and local.
 */

export interface EmbeddingModelInfo {
  provider: string;         // "mock" | "openai" | "voyage" | ...
  model: string;            // provider model id
  version: string;          // model/version stamp stored with every vector
  dims: number;
  /** true when calling this provider costs money / requires a key */
  requiresApiKey: boolean;
}

export interface EmbeddingVector {
  values: number[];
  norm: number;
}

export interface EmbeddingProvider {
  readonly info: EmbeddingModelInfo;
  embed(texts: string[]): Promise<EmbeddingVector[]>;
}

export interface Chunk {
  /** anchor of the block the chunk starts at */
  anchorKey: string;
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ChunkingStrategy {
  readonly name: string;
  readonly maxChars: number;
  readonly overlapBlocks: number;
}

/** POC default: paragraph-window chunks, anchor-preserving. */
export const POC_CHUNKING: ChunkingStrategy = {
  name: "paragraph-window-v1",
  maxChars: 1200,
  overlapBlocks: 1,
};

/**
 * Re-embedding status vocabulary (mirrors legal_embeddings.status in the
 * POC migration): current | stale | re_embedding. Version bumps or model
 * changes mark vectors stale — re-embedding is a tracked migration.
 */
export type EmbeddingStatus = "current" | "stale" | "re_embedding";
