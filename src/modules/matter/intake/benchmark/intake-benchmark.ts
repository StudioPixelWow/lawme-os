/**
 * Slice 2A — Intelligent Intake benchmark. Runs the deterministic pipeline over
 * the synthetic scenarios and enforces the founder's HARD safety targets plus
 * soft quality metrics. Self-executes and writes .poc-runs/intake-benchmark-report.json.
 *
 * No network, no model, no DB — pure in-process determinism.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { runIntakePipeline } from "../pipeline.ts";
import type { MatterIntakeDraft } from "../contracts.ts";
import { INTAKE_SCENARIOS, type IntakeScenario } from "./scenarios.ts";

const NOW = "2026-07-16T09:00:00+03:00";
const ORG = "00000000-0000-4000-8000-0000000000aa";

// A fabricated Israeli case citation would look like these — must NEVER appear.
const CITATION_RE = /(ע"ע|בג"ץ|ע"א|בש"א|רע"א|ה"ע|סע"ש)\s*\d{2,}/;

interface Row {
  id: string;
  domainOk: boolean;
  participantsOk: boolean;
  clientRoleOk: boolean;
  opposingRoleOk: boolean;
  factsOk: boolean;
  contradictionOk: boolean;
  relativeDeadlineNullOk: boolean;
  noPreliminaryOk: boolean;
  highRiskRoutedOk: boolean;
  confirmedFacts: number;
  fabricatedCitations: number;
  inventedDeadlines: number;
  untracedExtracted: number;
  reviewRequired: boolean;
}

function scoreScenario(sc: IntakeScenario, d: MatterIntakeDraft): Row {
  const e = sc.expect;
  const facts = d.facts;
  const contacts = d.contacts;

  // Hard-target counters.
  const confirmedFacts = facts.filter(
    (f) => (f.value.suggestedStatus as string) === "confirmed" || (f.value.suggestedStatus as string) === "document_derived",
  ).length;
  const fabricatedCitations = CITATION_RE.test(JSON.stringify(d)) ? 1 : 0;
  const inventedDeadlines = d.deadlines.filter(
    (dl) => dl.value.kind === "unknown_ambiguous" && dl.value.dueAt !== null,
  ).length;
  const extractedItems = [...contacts, ...facts, ...d.deadlines, ...d.mentionedDocuments].filter(
    (x) => x.extractionStatus === "extracted",
  );
  const untracedExtracted = extractedItems.filter((x) => x.span === null).length;

  const domainOk = d.legalCoverage.domainWithinScope === e.domainWithinScope;
  const participantsOk = contacts.length >= e.minParticipants;
  const clientRoleOk = !e.expectsClientRole || contacts.some((c) => c.value.suggestedRole === "client");
  const opposingRoleOk = !e.expectsOpposingRole || contacts.some((c) => c.value.suggestedRole === "opposing_party");
  const factsOk = facts.length >= e.minFacts;
  const contradictionOk = !e.expectsContradiction || d.contradictions.length > 0;
  const relativeDeadlineNullOk =
    !e.expectsRelativeDeadlineNull ||
    d.deadlines.some((dl) => dl.value.kind === "unknown_ambiguous" && dl.value.dueAt === null);
  const noPreliminaryOk = !e.expectsNoPreliminaryView || d.legalCoverage.canProducePreliminaryView === false;
  const highRiskRoutedOk =
    !e.highRisk ||
    d.reviewRoute.targets.includes("senior_lawyer_review") ||
    d.reviewRoute.targets.includes("specialist_review") ||
    d.reviewRoute.targets.includes("partner_review");

  return {
    id: sc.id,
    domainOk,
    participantsOk,
    clientRoleOk,
    opposingRoleOk,
    factsOk,
    contradictionOk,
    relativeDeadlineNullOk,
    noPreliminaryOk,
    highRiskRoutedOk,
    confirmedFacts,
    fabricatedCitations,
    inventedDeadlines,
    untracedExtracted,
    reviewRequired: d.confidenceReport.requiresHumanReview === true,
  };
}

export interface IntakeBenchmarkReport {
  scenarios: number;
  softMetrics: Record<string, number>;
  hardTargets: Record<string, { value: number; target: number; pass: boolean }>;
  passed: boolean;
  rows: Row[];
  engineVersion: string;
  generatedAt: string;
}

export async function runIntakeBenchmark(): Promise<IntakeBenchmarkReport> {
  const rows: Row[] = [];
  let engineVersion = "";
  for (const sc of INTAKE_SCENARIOS) {
    const draft = await runIntakePipeline(
      { organizationId: ORG, createdBy: null, storyHe: sc.storyHe, pastedHe: sc.pastedHe ?? null },
      { nowISO: NOW },
    );
    engineVersion = draft.engineVersion;
    rows.push(scoreScenario(sc, draft));
  }

  const n = rows.length;
  const rate = (pred: (r: Row) => boolean) => Number((rows.filter(pred).length / n).toFixed(4));

  const softMetrics: Record<string, number> = {
    domainAccuracy: rate((r) => r.domainOk),
    participantExtraction: rate((r) => r.participantsOk),
    clientRoleAccuracy: rate((r) => r.clientRoleOk),
    opposingRoleAccuracy: rate((r) => r.opposingRoleOk),
    factExtraction: rate((r) => r.factsOk),
    contradictionDetection: rate((r) => r.contradictionOk),
    deadlinePrecision: rate((r) => r.relativeDeadlineNullOk),
    coverageHonesty: rate((r) => r.noPreliminaryOk),
  };

  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
  const hard = (value: number, target: number) => ({ value, target, pass: value === target });
  const hardTargets: IntakeBenchmarkReport["hardTargets"] = {
    confirmedFactsCreated: hard(sum((r) => r.confirmedFacts), 0),
    fabricatedCitations: hard(sum((r) => r.fabricatedCitations), 0),
    inventedDeadlinesPersistable: hard(sum((r) => r.inventedDeadlines), 0),
    untracedExtractedItems: hard(sum((r) => r.untracedExtracted), 0),
    reviewBeforePersistence: hard(rows.filter((r) => r.reviewRequired).length, n),
    noAnswerOnInsufficientCoverage: hard(rows.filter((r) => r.noPreliminaryOk).length, n),
    highRiskRoutedToReview: hard(rows.filter((r) => r.highRiskRoutedOk).length, n),
  };

  const passed = Object.values(hardTargets).every((t) => t.pass);
  return {
    scenarios: n,
    softMetrics,
    hardTargets,
    passed,
    rows,
    engineVersion,
    generatedAt: NOW,
  };
}

// Self-executing entrypoint (matches the repo's benchmark convention).
if (process.argv[1]?.endsWith("intake-benchmark.ts")) {
  runIntakeBenchmark().then((report) => {
    try {
      mkdirSync(".poc-runs", { recursive: true });
      writeFileSync(".poc-runs/intake-benchmark-report.json", JSON.stringify(report, null, 2));
    } catch {
      /* reporting is best-effort */
    }
    console.log("=== INTELLIGENT INTAKE BENCHMARK ===");
    console.log("scenarios:", report.scenarios);
    console.log("soft metrics:", JSON.stringify(report.softMetrics, null, 2));
    console.log("hard targets:");
    for (const [k, v] of Object.entries(report.hardTargets)) {
      console.log(`  ${v.pass ? "✓" : "✗"} ${k}: ${v.value} (target ${v.target})`);
    }
    console.log(report.passed ? "INTAKE BENCHMARK: PASSED" : "INTAKE BENCHMARK: FAILED");
    process.exit(report.passed ? 0 : 1);
  });
}
