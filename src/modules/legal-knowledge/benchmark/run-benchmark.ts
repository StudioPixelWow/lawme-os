/**
 * POC benchmark harness — MACHINERY scoring only (see evaluation-rubric.md).
 * Runs the draft employment gold set through the research engine against
 * the synthetic fixture corpus. Measures retrieval mechanics, citation
 * integrity, warning honesty and label discipline — NOT legal quality.
 * No network, no database, no API keys.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadPocCorpus } from "../corpus/load.ts";
import { runResearch, ENGINE_VERSION } from "../research/engine.ts";
import { buildStructuredAnswer, ANSWER_LABEL } from "../research/answer.ts";
import { recordRun } from "../observability/run-log.ts";

interface DraftQuestion {
  id: string;
  category: string;
  difficulty: string;
  status: string;
  question_he: string;
  expected_topics: string[];
}

interface QuestionResult {
  id: string;
  category: string;
  topicRetrieved: boolean;
  citationsIntact: boolean;
  warningsHonest: boolean;
  labelsDisciplined: boolean;
  missingSourceHonest: boolean;
  evidenceCount: number;
  passed: boolean;
}

export async function runPocBenchmark(): Promise<{ results: QuestionResult[]; passRate: number }> {
  const goldPath = path.join(
    process.cwd(), "docs", "legal-knowledge", "benchmark", "employment-law", "questions.draft.json",
  );
  const { questions } = JSON.parse(readFileSync(goldPath, "utf8")) as { questions: DraftQuestion[] };
  const corpus = await loadPocCorpus();
  const topicsInCorpus = new Set(corpus.documents.flatMap((d) => d.doc.legalDomains));

  const results: QuestionResult[] = [];
  for (const q of questions) {
    const research = await runResearch(corpus, {
      question: q.question_he,
      legalDomain: "labor",
      authorityPreference: "binding_first",
    });
    const answer = buildStructuredAnswer(research);

    const corpusCanAnswer = q.expected_topics.some((t) => topicsInCorpus.has(t));
    const retrievedDocs = new Set(research.evidence.map((e) => e.documentId));
    const retrievedTopics = new Set(
      corpus.documents.filter((d) => retrievedDocs.has(d.id)).flatMap((d) => d.doc.legalDomains),
    );

    const topicRetrieved = corpusCanAnswer
      ? q.expected_topics.some((t) => retrievedTopics.has(t))
      : true; // topic absent from fixture corpus → retrieval not penalized
    const citationsIntact = research.evidence.every(
      (e) => e.citation.includes("פסקה") && e.anchor.anchorKey.length > 0,
    );
    const warningsHonest = research.evidence.every((e) =>
      e.warnings.some((w) => w.includes("fixture")),
    );
    const labelsDisciplined =
      answer.label === ANSWER_LABEL &&
      answer.extractiveFindings.every((c) =>
        ["secondary_supported", "unverified", "unresolved"].includes(c.label),
      );
    const missingSourceHonest =
      research.evidence.length > 0 || research.missingSourceNotice !== null;

    const passed = topicRetrieved && citationsIntact && warningsHonest && labelsDisciplined && missingSourceHonest;
    results.push({
      id: q.id, category: q.category,
      topicRetrieved, citationsIntact, warningsHonest, labelsDisciplined, missingSourceHonest,
      evidenceCount: research.evidence.length, passed,
    });
  }

  const passRate = results.filter((r) => r.passed).length / results.length;

  recordRun({
    kind: "benchmark",
    timestamp: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    modelProvider: "mock/trigram-hash@1.0.0",
    parserVersion: "poc-0.1.0-fixture",
    query: null,
    sourceAdapters: ["LSR-038(fixture)"],
    documentsRetrieved: results.reduce((s, r) => s + r.evidenceCount, 0),
    rankScores: [],
    citationsReturned: results.reduce((s, r) => s + r.evidenceCount, 0),
    verificationStatus: ["unverified(fixtures)"],
    warnings: ["machinery scoring only — not legal quality"],
    failures: results.filter((r) => !r.passed).map((r) => r.id),
    benchmarkResult: { total: results.length, passed: results.filter((r) => r.passed).length, passRate },
  });

  return { results, passRate };
}

// CLI entry
const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  runPocBenchmark().then(({ results, passRate }) => {
    console.log("LILB employment-law MACHINERY benchmark (fixtures, mock provider)");
    console.log("id | topic | citations | warnings | labels | missing-src | evidence | PASS");
    for (const r of results) {
      console.log(
        `${r.id} | ${r.topicRetrieved ? "✓" : "✗"} | ${r.citationsIntact ? "✓" : "✗"} | ${r.warningsHonest ? "✓" : "✗"} | ${r.labelsDisciplined ? "✓" : "✗"} | ${r.missingSourceHonest ? "✓" : "✗"} | ${r.evidenceCount} | ${r.passed ? "PASS" : "FAIL"}`,
      );
    }
    console.log(`\npass rate: ${(passRate * 100).toFixed(1)}% (${results.filter((r) => r.passed).length}/${results.length})`);
    console.log("NOTE: machinery scoring only — legal quality requires expert-validated gold (see evaluation-rubric.md)");
    process.exit(passRate === 1 ? 0 : 1);
  });
}
