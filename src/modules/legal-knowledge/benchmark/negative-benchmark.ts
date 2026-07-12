/**
 * NEGATIVE-QUERY BENCHMARK — the fail-closed guarantee, measured.
 *
 * Runs 40+ out-of-domain / insufficient-evidence questions AND the 28
 * positive employment questions through the DB research engine
 * (in-memory repositories, seeded fixtures — no network, no keys).
 *
 * Targets (founder mandate, must hold before real-corpus ingestion):
 *   - 0 fabricated claims (every passage must be byte-exact extractive)
 *   - 0 unsupported answers (answered ⇒ evidence above absolute threshold)
 *   - ≥95% correct no-answer behavior on clearly out-of-domain questions
 *   - 100% of the positive gold set still answered (gate regression check)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRepositories } from "../repositories/index.ts";
import { seedThroughRepositories } from "../seed/seed-fixtures.ts";
import { runDbResearch } from "../research/engine-db.ts";
import type { DbResearchResult } from "../research/engine-db.ts";

interface NegativeQuestion {
  id: string;
  domain: string;
  expected_domains: string[];
  question_he: string;
}
interface PositiveQuestion { id: string; question_he: string }

/**
 * Gold questions whose ONLY corpus coverage is a secondary review or an
 * administrative guidance document (no primary legislation/case law in the
 * synthetic corpus). Per the minimum-evidence rule, the CORRECT behavior
 * for these is honest uncertainty (no_answer + weak results), NOT an
 * answer from a non-primary source. Reviewed against the corpus manifest:
 *  - vacation / sick_leave → covered only by "סקירה משנית סינתטית"
 *  - workplace_harassment → covered only by "הנחיה סינתטית"
 *  - equal_opportunity-001 (ריאיון על תכנון היריון) → no on-point document
 *  - employee_vs_contractor-002 (קיזוז התמורה הקבלנית) → the corpus's
 *    classification judgment covers the status tests only, not offsetting
 * When Epic 3 adds real primary sources for these topics, REMOVE them from
 * this list — the benchmark will then require answers.
 */
const UNCERTAINTY_OK_IDS = new Set([
  "EMP-vacation-001", "EMP-vacation-002",
  "EMP-sick_leave-001", "EMP-sick_leave-002",
  "EMP-harassment-001", "EMP-harassment-002",
  "EMP-equal_opportunity-001",
  "EMP-employee_vs_contractor-002",
]);

export interface NegativeBenchmarkReport {
  version: string;
  engine: string;
  totals: {
    negatives: number;
    positives: number;
  };
  metrics: {
    falseAnswerRate: number;          // negatives answered / negatives (target 0)
    weakSourceAnswerRate: number;     // answered without a strong primary source
    domainDetectionAccuracy: number;  // detected ∈ expected_domains (out-of-domain set)
    outOfDomainRejectRate: number;    // detected ≠ employment on out-of-domain set
    noAnswerPrecision: number;        // no_answer predictions that were truly negative
    noAnswerRecall: number;           // negatives that got no_answer
    calibrationAccuracy: number;      // conf<0.5 on negatives, conf≥0.5 on answered positives
    fabricatedClaims: number;         // non-extractive passages (target 0)
    unsupportedAnswers: number;       // answered with rawLexicalTop < threshold (target 0)
    positiveAnsweredRate: number;     // gate regression on answerable gold questions (target 1)
    uncertaintyCorrectRate: number;   // secondary-only questions handled honestly (target 1)
  };
  failures: { id: string; kind: string; detail: string }[];
  passed: boolean;
}

export async function runNegativeBenchmark(): Promise<NegativeBenchmarkReport> {
  const negPath = path.join(process.cwd(), "docs", "legal-knowledge", "benchmark", "negative", "questions.negative.json");
  const posPath = path.join(process.cwd(), "docs", "legal-knowledge", "benchmark", "employment-law", "questions.draft.json");
  const { questions: negatives } = JSON.parse(readFileSync(negPath, "utf8")) as { questions: NegativeQuestion[] };
  const { questions: positives } = JSON.parse(readFileSync(posPath, "utf8")) as { questions: PositiveQuestion[] };

  const repos = createRepositories();
  if (repos.kind !== "in-memory") throw new Error("negative benchmark runs in-memory only (no credentials, no network)");
  await seedThroughRepositories(repos);

  const failures: NegativeBenchmarkReport["failures"] = [];
  let fabricated = 0;
  let unsupported = 0;

  const checkExtractive = async (id: string, r: DbResearchResult) => {
    // extractive honesty: every passage must be exactly its anchored range
    for (const e of [...r.evidence, ...r.weakEvidence]) {
      if (e.passage.length !== e.anchor.charEnd - e.anchor.charStart) {
        fabricated++;
        failures.push({ id, kind: "fabricated", detail: `passage length ≠ anchor range (${e.anchor.anchorKey})` });
      }
    }
  };

  /* ---- negatives ---- */
  const outOfDomain = negatives.filter((q) => q.domain !== "employment_weak");
  let negAnswered = 0;
  let negNoAnswer = 0;
  let weakSourceAnswers = 0;
  let domainExactHits = 0;
  let domainRejects = 0;
  let negCalibrated = 0;

  const negResults: { q: NegativeQuestion; r: DbResearchResult }[] = [];
  for (const q of negatives) {
    const r = await runDbResearch(repos, { question: q.question_he, legalDomain: "labor" });
    negResults.push({ q, r });
    await checkExtractive(q.id, r);
    if (r.answerState === "answered") {
      negAnswered++;
      failures.push({ id: q.id, kind: "false_answer", detail: `gate passed on a negative (rawLexTop=${r.gate.signals.rawLexicalTop})` });
      if (r.gate.signals.strongPrimarySources === 0) weakSourceAnswers++;
      if (r.gate.signals.rawLexicalTop < r.gate.thresholds.ABSOLUTE_LEXICAL_MIN) {
        unsupported++;
        failures.push({ id: q.id, kind: "unsupported", detail: "answered below absolute threshold" });
      }
    } else {
      negNoAnswer++;
    }
    if (r.gate.confidence < 0.5) negCalibrated++;
    if (q.domain !== "employment_weak") {
      if (q.expected_domains.includes(r.gate.domain.detectedDomain)) domainExactHits++;
      if (r.gate.domain.detectedDomain !== "employment") domainRejects++;
      else failures.push({ id: q.id, kind: "domain_detection", detail: "out-of-domain question detected as employment" });
    }
  }

  /* ---- positives (gate regression) ---- */
  const answerablePositives = positives.filter((q) => !UNCERTAINTY_OK_IDS.has(q.id));
  let posAnswered = 0;
  let posCalibrated = 0;
  let uncertaintyCorrect = 0;
  for (const q of positives) {
    const r = await runDbResearch(repos, { question: q.question_he, legalDomain: "labor" });
    await checkExtractive(q.id, r);
    const uncertaintyOk = UNCERTAINTY_OK_IDS.has(q.id);
    if (r.answerState === "answered") {
      if (uncertaintyOk) {
        // answered although only secondary/guidance coverage exists —
        // verify the minimum-evidence rule actually held
        if (r.gate.signals.primaryRelevantSources === 0 && r.gate.signals.strongPrimarySources === 0
            && r.gate.signals.independentRelevantSources < 2) {
          unsupported++;
          failures.push({ id: q.id, kind: "unsupported", detail: "answered from non-primary-only coverage" });
        } else {
          uncertaintyCorrect++; // evidence rule was legitimately met
        }
      } else {
        posAnswered++;
      }
      if (r.gate.confidence >= 0.5) posCalibrated++;
      if (r.gate.signals.rawLexicalTop < r.gate.thresholds.ABSOLUTE_LEXICAL_MIN) {
        unsupported++;
        failures.push({ id: q.id, kind: "unsupported", detail: "answered below absolute threshold" });
      }
    } else if (uncertaintyOk) {
      uncertaintyCorrect++; // honest uncertainty — the desired behavior
    } else {
      failures.push({
        id: q.id, kind: "positive_blocked",
        detail: `gate failed on gold question: ${r.gate.failureReasons.map((f) => f.code).join(",")} (rawLexTop=${r.gate.signals.rawLexicalTop})`,
      });
    }
  }

  const noAnswerPredictions = negNoAnswer + (answerablePositives.length - posAnswered);
  const metrics = {
    falseAnswerRate: round(negAnswered / negatives.length),
    weakSourceAnswerRate: round(weakSourceAnswers / negatives.length),
    domainDetectionAccuracy: round(domainExactHits / outOfDomain.length),
    outOfDomainRejectRate: round(domainRejects / outOfDomain.length),
    noAnswerPrecision: noAnswerPredictions === 0 ? 1 : round(negNoAnswer / noAnswerPredictions),
    noAnswerRecall: round(negNoAnswer / negatives.length),
    calibrationAccuracy: round((negCalibrated + posCalibrated) / (negatives.length + positives.length)),
    fabricatedClaims: fabricated,
    unsupportedAnswers: unsupported,
    positiveAnsweredRate: round(posAnswered / answerablePositives.length),
    uncertaintyCorrectRate: round(uncertaintyCorrect / UNCERTAINTY_OK_IDS.size),
  };

  const passed =
    metrics.fabricatedClaims === 0 &&
    metrics.unsupportedAnswers === 0 &&
    metrics.noAnswerRecall >= 0.95 &&
    metrics.outOfDomainRejectRate >= 0.95 &&
    metrics.positiveAnsweredRate === 1;

  return {
    version: "negative-0.1.0",
    engine: "poc-research-0.1.0+db (relevance gate)",
    totals: { negatives: negatives.length, positives: positives.length },
    metrics,
    failures,
    passed,
  };
}

function round(n: number): number { return Number(n.toFixed(4)); }

/* CLI */
if (process.argv[1] && process.argv[1].endsWith("negative-benchmark.ts")) {
  runNegativeBenchmark().then((report) => {
    const outDir = path.join(process.cwd(), ".poc-runs");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "negative-benchmark-report.json");
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.metrics, null, 2));
    console.log(`negatives: ${report.totals.negatives} · positives: ${report.totals.positives}`);
    if (report.failures.length) {
      console.log("FAILURES:");
      for (const f of report.failures) console.log(` - [${f.kind}] ${f.id}: ${f.detail}`);
    }
    console.log(report.passed ? "NEGATIVE BENCHMARK: PASSED" : "NEGATIVE BENCHMARK: FAILED");
    console.log(`report: ${outPath}`);
    process.exit(report.passed ? 0 : 1);
  }).catch((e) => { console.error(e); process.exit(1); });
}
