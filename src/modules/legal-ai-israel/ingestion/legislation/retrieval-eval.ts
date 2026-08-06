/**
 * Retrieval evaluation harness for legislation RAG (Step 16).
 *
 * Computes Recall@k, MRR, citation correctness, and wrong-version rate for a set
 * of legislation questions against a retrieval function (FTS baseline today;
 * vector/hybrid later). No chat agent — retrieval + metrics only. Pure/offline;
 * the retrieval function is injected (a DB-backed FTS retriever plugs in here).
 */

export interface EvalQuestion {
  id: string;
  question: string;
  expectedLawId: string;
  expectedSection: string;
  expectedVersion?: string;
}

export interface RetrievedChunk {
  lawId: string;
  sectionNumber: string;
  version: string;
  hasCitation: boolean;
}

export type Retriever = (question: string, k: number) => Promise<readonly RetrievedChunk[]>;

export interface EvalResult {
  n: number;
  recallAt5: number;
  recallAt10: number;
  mrr: number;
  citationCorrectness: number;
  wrongVersionRate: number;
  perQuestion: readonly {
    id: string; hit: boolean; rank: number | null; citedOk: boolean; wrongVersion: boolean;
  }[];
}

function isHit(r: RetrievedChunk, q: EvalQuestion): boolean {
  return r.lawId === q.expectedLawId && r.sectionNumber === q.expectedSection;
}

export async function evaluateRetrieval(
  questions: readonly EvalQuestion[],
  retrieve: Retriever,
  k = 10,
): Promise<EvalResult> {
  let hits5 = 0, hits10 = 0, rrSum = 0, citedOk = 0, wrongVersion = 0;
  const per: EvalResult["perQuestion"] = [] as EvalResult["perQuestion"];
  const perMut = per as { id: string; hit: boolean; rank: number | null; citedOk: boolean; wrongVersion: boolean }[];

  for (const q of questions) {
    const results = await retrieve(q.question, k);
    let rank: number | null = null;
    let wv = false;
    for (let i = 0; i < results.length; i += 1) {
      if (isHit(results[i], q)) {
        rank = i + 1;
        if (q.expectedVersion && results[i].version !== q.expectedVersion) wv = true;
        break;
      }
    }
    const hit = rank !== null;
    if (hit && rank !== null && rank <= 5) hits5 += 1;
    if (hit && rank !== null && rank <= 10) hits10 += 1;
    if (hit && rank !== null) rrSum += 1 / rank;
    const cited = results.length > 0 && results.every((r) => r.hasCitation);
    if (cited) citedOk += 1;
    if (wv) wrongVersion += 1;
    perMut.push({ id: q.id, hit, rank, citedOk: cited, wrongVersion: wv });
  }

  const n = questions.length || 1;
  return {
    n: questions.length,
    recallAt5: Number((hits5 / n).toFixed(4)),
    recallAt10: Number((hits10 / n).toFixed(4)),
    mrr: Number((rrSum / n).toFixed(4)),
    citationCorrectness: Number((citedOk / n).toFixed(4)),
    wrongVersionRate: Number((wrongVersion / n).toFixed(4)),
    perQuestion: per,
  };
}
