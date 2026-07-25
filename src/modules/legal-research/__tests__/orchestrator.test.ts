/**
 * Legal Research Orchestrator — pure, deterministic tests (Slice 3.1.0). No AI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runLegalResearch, LEGAL_RESEARCH_VERSION } from "../orchestrator.ts";
import { classifyLegalDomain } from "../domain.ts";
import { extractLegalEntities } from "../entities.ts";
import { DEFAULT_ADAPTERS } from "../adapters/index.ts";
import type { KnowledgeSourceAdapter, CanonicalSource } from "../types.ts";

const NOW = "2026-07-25T09:00:00+03:00";
const Q_PREG = "האם נדרש היתר לפי סעיף 9 לחוק עבודת נשים לפיטורי עובדת בהריון?";
const Q_OOS = "שאלה על דיני מקרקעין ודמי שכירות בין שכנים";

test("legal-domain classification recognizes labor and marks other domains out of scope", () => {
  const labor = classifyLegalDomain(Q_PREG);
  assert.equal(labor.domain, "labor");
  assert.equal(labor.inScope, true);
  const oos = classifyLegalDomain(Q_OOS);
  assert.equal(oos.domain, "unknown");
  assert.equal(oos.inScope, false);
});

test("entity extraction pulls sections, laws and topics", () => {
  const e = extractLegalEntities(Q_PREG, "pregnancy_dismissal");
  assert.ok(e.sections.includes("סעיף 9"));
  assert.ok(e.laws.some((l) => l.includes("עבודת נשים")));
  assert.ok(e.topics.includes("pregnancy_dismissal"));
});

test("orchestrator runs the full pipeline and prefers binding legislation", async () => {
  const r = await runLegalResearch({ question: Q_PREG, asOfISO: NOW });
  assert.equal(r.meta.version, LEGAL_RESEARCH_VERSION);
  assert.equal(r.domain.inScope, true);
  assert.equal(r.executedSearches.length, 2);
  assert.ok(r.executedSearches.every((x) => x.available));
  assert.ok(r.matchedLegislation.some((s) => s.recordId === "E3B-LEG-007"));
  assert.ok(r.matchedCases.length >= 1);
  assert.equal(r.ranking[0].sourceKind, "legislation");   // highest authority
  assert.equal(r.confidence.level, "moderate");           // verified binding statute
  assert.ok(r.verifiedCitations.some((c) => c.recordId === "E3B-LEG-007"));
});

test("case law is surfaced but flagged discovery-only with follow-ups", async () => {
  const r = await runLegalResearch({ question: Q_PREG, asOfISO: NOW });
  assert.ok(r.matchedCases.every((s) => !s.usableForClaim));
  assert.ok(r.missingInformation.some((m) => m.code === "CASE_LAW_UNVERIFIED"));
  assert.ok(r.recommendedFollowUps.some((f) => f.code === "VERIFY_CASE_NUMBERS"));
  assert.ok(r.recommendedFollowUps.some((f) => f.code === "SEARCH_REGULATIONS")); // no regulation adapter yet
});

test("out-of-scope question yields no confidence and honest coverage", async () => {
  const r = await runLegalResearch({ question: Q_OOS, asOfISO: NOW });
  assert.equal(r.domain.inScope, false);
  assert.equal(r.confidence.level, "none");
  assert.equal(r.matchedLegislation.length, 0);
  assert.equal(r.matchedCases.length, 0);
});

test("the orchestrator is provider-agnostic — a new adapter drops in with no change", async () => {
  const stubSource: CanonicalSource = {
    sourceId: "regulation", sourceKind: "regulation", recordId: "REG-001",
    citationHe: "תקנה לדוגמה", titleHe: "תקנה לדוגמה", authorityLevel: "guidance",
    bindingClass: "persuasive", court: null, dateISO: null, sectionHe: null, url: null,
    verification: "unverified", usableForClaim: false, status: "unknown", topics: [],
    matchedTerms: ["x"], citationFrequency: 0, publisherHe: null, provenanceHe: "מקור בדיקה", limitationsHe: [],
  };
  const stub: KnowledgeSourceAdapter = {
    id: "regulation", kind: "regulation", labelHe: "תקנות", available: true,
    async search() { return { sourceId: "regulation", sourceKind: "regulation", matchedCount: 1, sources: [stubSource], notesHe: [] }; },
  };
  const r = await runLegalResearch({ question: Q_PREG, asOfISO: NOW }, [...DEFAULT_ADAPTERS, stub]);
  assert.equal(r.executedSearches.length, 3);
  assert.ok(r.sourceMetadata.some((m) => m.recordId === "REG-001"));
  assert.ok(r.ranking.some((x) => x.recordId === "REG-001"));
});

test("the result is deeply immutable and deterministic", async () => {
  const a = await runLegalResearch({ question: Q_PREG, asOfISO: NOW });
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.ranking));
  assert.ok(Object.isFrozen(a.matchedLegislation));
  assert.throws(() => {
    (a as { question: string }).question = "x";
  });
  const b = await runLegalResearch({ question: Q_PREG, asOfISO: NOW });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
