/**
 * In-memory lexical retrieval (BM25) over the POC corpus.
 * Mirrors the future Postgres FTS('simple') + trigram strategy: the SAME
 * tokenizer/normalizer is used here and at ingestion, so behavior carries
 * over to the database implementation.
 */
import { tokenize } from "../extraction/normalize-text.ts";
import type { Corpus, CorpusDocument } from "../corpus/load.ts";
import type { Chunk } from "../embeddings/types.ts";

export interface LexicalHit {
  documentId: string;
  chunkIndex: number;
  score: number;
  matchedTerms: string[];
}

interface IndexedChunk {
  documentId: string;
  chunkIndex: number;
  tokens: string[];
  tf: Map<string, number>;
  length: number;
}

export class LexicalIndex {
  private chunks: IndexedChunk[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;

  static build(corpus: Corpus): LexicalIndex {
    const index = new LexicalIndex();
    for (const doc of corpus.documents) {
      for (const chunk of doc.chunks) {
        index.addChunk(doc, chunk);
      }
    }
    index.finalize();
    return index;
  }

  private addChunk(doc: CorpusDocument, chunk: Chunk): void {
    const tokens = tokenize(chunk.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.chunks.push({ documentId: doc.id, chunkIndex: chunk.chunkIndex, tokens, tf, length: tokens.length });
  }

  private finalize(): void {
    this.avgLength =
      this.chunks.reduce((s, c) => s + c.length, 0) / Math.max(1, this.chunks.length);
  }

  /** BM25 (k1=1.4, b=0.75) over query terms + expansions. */
  search(queryTerms: string[], limit = 20): LexicalHit[] {
    const k1 = 1.4;
    const b = 0.75;
    const N = this.chunks.length;
    const qTokens = [...new Set(queryTerms.flatMap((t) => tokenize(t)))];

    const hits: LexicalHit[] = [];
    for (const chunk of this.chunks) {
      let score = 0;
      const matched: string[] = [];
      for (const q of qTokens) {
        const tf = chunk.tf.get(q) ?? 0;
        if (tf === 0) continue;
        const df = this.df.get(q) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (chunk.length / this.avgLength))));
        matched.push(q);
      }
      if (score > 0) {
        hits.push({ documentId: chunk.documentId, chunkIndex: chunk.chunkIndex, score, matchedTerms: matched });
      }
    }
    return hits.sort((a, b2) => b2.score - a.score).slice(0, limit);
  }
}
