/**
 * Deterministic hybrid ranker (Epic 1 POC) — no external AI key required.
 * Combines: BM25 lexical + mock-vector cosine + metadata filters +
 * authority weighting + source-trust weighting + freshness + court
 * hierarchy. Every score ships with its full breakdown (explainability).
 */
import { MockEmbeddingProvider, cosineSimilarity } from "../embeddings/mock-provider.ts";
import type { Corpus, CorpusDocument } from "../corpus/load.ts";
import { LexicalIndex } from "./lexical.ts";
import type { DocumentType } from "../ingestion/core/types.ts";

export interface RetrievalFilters {
  documentTypes?: DocumentType[];
  legalDomain?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  courts?: string[];
}

export interface ScoreBreakdown {
  lexical: number;      // 0..1 (normalized BM25)
  vector: number;       // 0..1 (cosine, clamped)
  authority: number;    // 0..1 (court hierarchy + doc type)
  trust: number;        // 0..1 (source tier)
  freshness: number;    // 0..1 (age decay)
  final: number;
  weights: Record<string, number>;
}

export interface RankedPassage {
  documentId: string;
  chunkIndex: number;
  anchorKey: string;
  passage: string;
  score: ScoreBreakdown;
  matchedTerms: string[];
  warnings: string[];
}

const WEIGHTS = { lexical: 0.40, vector: 0.25, authority: 0.18, trust: 0.10, freshness: 0.07 };

/** Court-hierarchy weighting — rule-derived, no invention. */
function authorityWeight(doc: CorpusDocument): number {
  const court = doc.doc.court ?? "";
  const type = doc.doc.documentType;
  if (type === "legislation" || type === "regulation" || type === "order") return 1.0;
  if (court.includes("העליון")) return 1.0;
  if (court.includes("הארצי")) return 0.85;
  if (court.includes("האזורי") || court.includes("מחוזי")) return 0.6;
  if (type === "guidance" || type === "circular") return 0.55;
  if (type === "academic_article") return 0.3;
  return 0.4; // unknown court/type — middle-low, never rewarded
}

/** Source-trust weighting from the trust model tiers (fixture corpus = tier by doc type). */
function trustWeight(doc: CorpusDocument): number {
  switch (doc.doc.documentType) {
    case "legislation": case "regulation": case "order": return 1.0;   // tier 1-2
    case "judgment": case "decision": return 0.9;                       // tier 1
    case "guidance": case "circular": case "regulator_decision": return 0.8;
    case "academic_article": return 0.5;                                 // tier 4-5
    default: return 0.6;
  }
}

function freshnessWeight(doc: CorpusDocument): number {
  const d = doc.doc.documentDate ?? doc.doc.versionDate ?? doc.doc.effectiveDate;
  if (!d) return 0.5; // unknown date is mid, never top
  const ageYears = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears <= 2) return 1.0;
  if (ageYears <= 5) return 0.85;
  if (ageYears <= 10) return 0.7;
  if (ageYears <= 20) return 0.55;
  return 0.4; // old ≠ wrong (may be binding precedent) — authority carries that
}

function passesFilters(doc: CorpusDocument, f: RetrievalFilters): boolean {
  if (f.documentTypes && !f.documentTypes.includes(doc.doc.documentType)) return false;
  if (f.legalDomain && !doc.doc.legalDomains.includes(f.legalDomain)) return false;
  if (f.courts && f.courts.length > 0 && !f.courts.some((c) => (doc.doc.court ?? "").includes(c))) return false;
  const d = doc.doc.documentDate;
  if (f.dateFrom && d && d < f.dateFrom) return false;
  if (f.dateTo && d && d > f.dateTo) return false;
  return true;
}

export interface HybridSearchArgs {
  corpus: Corpus;
  index: LexicalIndex;
  queryTerms: string[];   // original + expansions
  filters?: RetrievalFilters;
  limit?: number;
  /** diversify: max passages per document in the final list */
  maxPerDocument?: number;
}

export async function hybridSearch(args: HybridSearchArgs): Promise<RankedPassage[]> {
  const { corpus, index, queryTerms } = args;
  const filters = args.filters ?? {};
  const limit = args.limit ?? 10;
  const maxPerDoc = args.maxPerDocument ?? 2;

  const provider = new MockEmbeddingProvider();
  const [queryVector] = await provider.embed([queryTerms.join(" ")]);

  const lexicalHits = index.search(queryTerms, 100);
  const maxLexical = lexicalHits[0]?.score ?? 1;

  const byDoc = new Map<string, CorpusDocument>(corpus.documents.map((d) => [d.id, d]));
  const candidates: RankedPassage[] = [];

  // union of lexical hits + all chunks (vector-only recall on a small corpus)
  const seen = new Set<string>();
  const pushCandidate = (documentId: string, chunkIndex: number, lexicalScore: number, matched: string[]) => {
    const key = `${documentId}:${chunkIndex}`;
    if (seen.has(key)) return;
    seen.add(key);
    const doc = byDoc.get(documentId);
    if (!doc || !passesFilters(doc, filters)) return;
    const chunk = doc.chunks[chunkIndex];
    if (!chunk) return;

    const vector = Math.max(0, cosineSimilarity(queryVector, doc.chunkVectors[chunkIndex]));
    const breakdown: ScoreBreakdown = {
      lexical: maxLexical > 0 ? lexicalScore / maxLexical : 0,
      vector,
      authority: authorityWeight(doc),
      trust: trustWeight(doc),
      freshness: freshnessWeight(doc),
      final: 0,
      weights: WEIGHTS,
    };
    breakdown.final =
      WEIGHTS.lexical * breakdown.lexical +
      WEIGHTS.vector * breakdown.vector +
      WEIGHTS.authority * breakdown.authority +
      WEIGHTS.trust * breakdown.trust +
      WEIGHTS.freshness * breakdown.freshness;

    const warnings: string[] = [];
    if (doc.doc.provenance.isFixture) warnings.push("fixture content — not legal authority");
    if (doc.doc.verificationStatus === "unverified") warnings.push("source unverified");

    candidates.push({
      documentId,
      chunkIndex,
      anchorKey: chunk.anchorKey,
      passage: chunk.text,
      score: breakdown,
      matchedTerms: matched,
      warnings,
    });
  };

  for (const hit of lexicalHits) pushCandidate(hit.documentId, hit.chunkIndex, hit.score, hit.matchedTerms);
  for (const doc of corpus.documents) {
    for (const chunk of doc.chunks) pushCandidate(doc.id, chunk.chunkIndex, 0, []);
  }

  // require some evidence of relevance: lexical match OR meaningful cosine
  const relevant = candidates.filter((c) => c.score.lexical > 0 || c.score.vector > 0.18);
  relevant.sort((a, b) => b.score.final - a.score.final);

  // source diversification: cap passages per document
  const perDoc = new Map<string, number>();
  const diversified: RankedPassage[] = [];
  for (const c of relevant) {
    const n = perDoc.get(c.documentId) ?? 0;
    if (n >= maxPerDoc) continue;
    perDoc.set(c.documentId, n + 1);
    diversified.push(c);
    if (diversified.length >= limit) break;
  }
  return diversified;
}
