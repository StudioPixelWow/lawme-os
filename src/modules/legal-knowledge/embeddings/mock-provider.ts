/**
 * MockEmbeddingProvider — deterministic, local, key-free.
 * Hashes character trigrams of the (Hebrew-folded) text into a fixed-size
 * vector, L2-normalized. This yields REAL lexical-semantic similarity for
 * overlapping vocabulary — good enough to exercise ranking, chunking and
 * provenance end-to-end without any external API. Not a semantic model;
 * results are labeled accordingly by the engine.
 */
import { tokenize } from "../extraction/normalize-text.ts";
import type { EmbeddingProvider, EmbeddingVector } from "./types.ts";

const DIMS = 256;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function trigrams(token: string): string[] {
  const padded = `_${token}_`;
  const grams: string[] = [];
  for (let i = 0; i <= padded.length - 3; i++) grams.push(padded.slice(i, i + 3));
  return grams;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly info = {
    provider: "mock",
    model: "trigram-hash",
    version: "1.0.0",
    dims: DIMS,
    requiresApiKey: false,
  };

  async embed(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map((text) => {
      const values = new Array<number>(DIMS).fill(0);
      for (const token of tokenize(text)) {
        for (const gram of trigrams(token)) {
          const h = fnv1a(gram);
          const idx = h % DIMS;
          const sign = (h & 0x80000000) ? -1 : 1;
          values[idx] += sign;
        }
      }
      const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0)) || 1;
      return { values: values.map((v) => v / norm), norm };
    });
  }
}

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  let dot = 0;
  for (let i = 0; i < a.values.length; i++) dot += a.values[i] * b.values[i];
  return dot; // vectors are already L2-normalized
}

/**
 * Placeholder for future paid providers — intentionally throws so that no
 * code path can silently start calling external APIs without approval.
 */
export class UnapprovedProviderPlaceholder implements EmbeddingProvider {
  readonly info = {
    provider: "placeholder",
    model: "unconfigured",
    version: "0",
    dims: 0,
    requiresApiKey: true,
  };
  async embed(): Promise<EmbeddingVector[]> {
    throw new Error(
      "External embedding providers are not approved for the POC. " +
      "Founder approval + key provisioning required (see POC_RETRIEVAL_DESIGN.md).",
    );
  }
}
