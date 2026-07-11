/**
 * POC corpus loader — runs the full local pipeline in memory:
 * adapter (fixtures) → extraction → chunking → mock embeddings.
 * This is the stand-in for the repository layer until the migration is
 * approved and applied; nothing here touches a database.
 */
import { SupremeDecisionsAdapter } from "../ingestion/adapters/supreme-decisions/adapter.ts";
import type { NormalizedLegalDocument } from "../ingestion/core/types.ts";
import { extractDocument } from "../extraction/extract.ts";
import type { ExtractionResult } from "../extraction/types.ts";
import { chunkBlocks } from "../embeddings/chunking.ts";
import { MockEmbeddingProvider } from "../embeddings/mock-provider.ts";
import type { Chunk, EmbeddingVector } from "../embeddings/types.ts";

export interface CorpusDocument {
  id: string; // externalId from the adapter
  doc: NormalizedLegalDocument;
  extraction: ExtractionResult;
  chunks: Chunk[];
  chunkVectors: EmbeddingVector[];
  validation: { valid: boolean; errors: string[]; warnings: string[] };
}

export interface Corpus {
  documents: CorpusDocument[];
  embeddingModel: string;
  loadedAt: string;
}

export async function loadPocCorpus(): Promise<Corpus> {
  const adapter = new SupremeDecisionsAdapter();
  const provider = new MockEmbeddingProvider();
  const items = await adapter.discover();
  const documents: CorpusDocument[] = [];

  for (const item of items) {
    const { doc, validation } = await adapter.mapToUnifiedSchema(item);
    const extraction = await extractDocument(doc.rawContent ?? "", doc.rawContentType ?? "text/plain");
    const chunks = chunkBlocks(extraction.blocks);
    const chunkVectors = await provider.embed(chunks.map((c) => c.text));
    documents.push({ id: item.externalId, doc, extraction, chunks, chunkVectors, validation });
  }

  return {
    documents,
    embeddingModel: `${provider.info.provider}/${provider.info.model}@${provider.info.version}`,
    loadedAt: new Date().toISOString(),
  };
}
