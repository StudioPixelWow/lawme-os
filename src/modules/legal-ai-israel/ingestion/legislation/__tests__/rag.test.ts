/**
 * Tests for the citation contract gate + retrieval-eval metrics.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gateChunkForServing, allResultsCited } from "../citation-contract.ts";
import type { ServableChunk } from "../citation-contract.ts";
import { evaluateRetrieval } from "../retrieval-eval.ts";
import type { EvalQuestion, RetrievedChunk } from "../retrieval-eval.ts";

function servable(overrides: Partial<ServableChunk>): ServableChunk {
  return {
    chunkId: "c1", published: true, licenseAllowed: true, provenanceComplete: true,
    quarantined: false, isCurrentVersion: true,
    citation: {
      lawTitle: "חוק לדוגמה", sectionNumber: "5", version: "1",
      sourceUrl: "https://x", sourceDocumentId: "dv1", lastVerified: "2026-08-06",
      chunkId: "c1", sourceSpan: { start: 0, end: 10 },
    },
    ...overrides,
  };
}

test("citation gate passes a complete, published, licensed chunk", () => {
  assert.equal(gateChunkForServing(servable({})).servable, true);
});

test("citation gate blocks unpublished / quarantined / uncited chunks", () => {
  assert.deepEqual(gateChunkForServing(servable({ published: false })).reasons, ["not_published"]);
  assert.ok(gateChunkForServing(servable({ quarantined: true })).reasons.includes("quarantined"));
  assert.ok(gateChunkForServing(servable({ citation: null })).reasons.includes("missing_citation"));
  assert.ok(gateChunkForServing(servable({ isCurrentVersion: false })).reasons.includes("not_current_version"));
});

test("allResultsCited is false if any result fails the gate", () => {
  assert.equal(allResultsCited([servable({}), servable({ licenseAllowed: false })]), false);
  assert.equal(allResultsCited([servable({}), servable({})]), true);
});

test("retrieval eval computes recall@k, MRR, citation correctness", async () => {
  const questions: EvalQuestion[] = [
    { id: "q1", question: "מינוי רשות", expectedLawId: "L1", expectedSection: "5" },
    { id: "q2", question: "הוראות מעבר", expectedLawId: "L1", expectedSection: "6" },
    { id: "q3", question: "לא קיים", expectedLawId: "L1", expectedSection: "99" },
  ];
  const retrieve = async (q: string): Promise<RetrievedChunk[]> => {
    if (q.includes("רשות")) return [{ lawId: "L1", sectionNumber: "5", version: "1", hasCitation: true }];
    if (q.includes("מעבר")) return [
      { lawId: "L1", sectionNumber: "2", version: "1", hasCitation: true },
      { lawId: "L1", sectionNumber: "6", version: "1", hasCitation: true },
    ];
    return [];
  };
  const res = await evaluateRetrieval(questions, retrieve, 10);
  assert.equal(res.n, 3);
  assert.equal(res.recallAt5, Number((2 / 3).toFixed(4))); // q1 rank1, q2 rank2, q3 miss
  assert.ok(res.mrr > 0 && res.mrr <= 1);
  assert.equal(res.perQuestion.find((p) => p.id === "q1")!.rank, 1);
  assert.equal(res.perQuestion.find((p) => p.id === "q3")!.hit, false);
});
