/** Provenance construction — every adapter result carries one of these. */
import { sha256Hex } from "../core/hash.ts";
import type { FetchProvenance } from "../core/types.ts";

export interface ProvenanceInput {
  sourceId: string;
  originalUrl: string;
  canonicalUrl: string | null;
  retrievalMethod: FetchProvenance["retrievalMethod"];
  httpStatus: number | null;
  contentType: string | null;
  content: string;
  parserVersion: string;
}

export function buildProvenance(input: ProvenanceInput): FetchProvenance {
  return {
    sourceId: input.sourceId,
    originalUrl: input.originalUrl,
    canonicalUrl: input.canonicalUrl,
    retrievedAt: new Date().toISOString(),
    retrievalMethod: input.retrievalMethod,
    httpStatus: input.httpStatus,
    contentType: input.contentType,
    sha256: sha256Hex(input.content),
    parserVersion: input.parserVersion,
    isFixture: input.retrievalMethod === "fixture",
  };
}
