/**
 * Dino orchestration benchmark (Epic 3A, Phase 30).
 * Deterministic scenarios across intent, domain, clarification, issues,
 * source planning, coverage, contradictions, claim support, citation
 * verification, QA, red team, confidence calibration, stop behavior and
 * review routing. No network, no DB credentials, no paid providers.
 *
 * Hard targets (must hold before founder approval):
 *   - 0 fabricated citations
 *   - 0 unsupported claims in final output
 *   - 100% stop on explicit domain mismatch
 *   - 100% block on broken citation
 *   - ≥95% correct clarification behavior on critical missing facts
 *   - ≥95% correct human-review routing in high-risk synthetic scenarios
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRepositories } from "../../legal-knowledge/repositories/index.ts";
import { seedThroughRepositories } from "../../legal-knowledge/seed/seed-fixtures.ts";
import { runDinoPipeline } from "../orchestrator.ts";
import { verifyCitations } from "../citations/citation-verifier.ts";
import type { DinoRequest } from "../core/request.ts";
import type { SyntheticMatterFixture } from "../context/matter-context-assembler.ts";

interface BenchCase {
  id: string;
  category: string;
  request: DinoRequest;
  fixture: SyntheticMatterFixture | null;
  expect: {
    outcome?: string;
    domainMismatchStop?: boolean;
    clarificationRequired?: boolean;
    highRiskReview?: boolean;
    noAnswer?: boolean;
  };
}

const COMPLETE_PREG: SyntheticMatterFixture = {
  matterId: "m-preg-full", clientId: "c1", matterTitleHe: "פיטורי היריון — עובדות מלאות",
  items: [
    { field: "employment_duration", statementHe: "14 חודשים", status: "document_derived_fact" },
    { field: "employment_relationship", statementHe: "יחסי עבודה", status: "confirmed_fact" },
    { field: "pregnancy_status", statementHe: "בהיריון", status: "confirmed_fact" },
    { field: "employer_knowledge", statementHe: "ידע", status: "client_allegation" },
    { field: "permit_status", statementHe: "ללא היתר", status: "client_allegation" },
    { field: "hearing_held", statementHe: "לא נערך שימוע", status: "client_allegation" },
    { field: "dismissal_date", statementHe: "01/06/2026", status: "document_derived_fact" },
    { field: "salary", statementHe: "12000", status: "document_derived_fact" },
  ],
};

const CASES: BenchCase[] = [
  // domain mismatch (must stop) — one per foreign domain
  ...["מה הדין בירושת דירה בין אחים?", "מתי מורים על מעצר עד תום ההליכים?", "כיצד נקבעים דמי מזונות בגירושין?", "מהו שיעור מס הרכישה בדירה שנייה?", "כיצד מגישים בקשה לרישום פטנט?", "מהם התנאים להגשת עתירה מנהלית?", "כיצד נפתח הליך חדלות פירעון ליחיד?"].map((q, i) => ({
    id: `DOM-${i + 1}`, category: "domain_mismatch", request: { question: q, legalDomain: "labor" }, fixture: null,
    expect: { domainMismatchStop: true, noAnswer: true },
  })),
  // clarification required (first person, no matter facts)
  ...["פיטרו אותי בהיריון, האם זה חוקי?", "פוטרתי, מגיע לי פיצויי פיטורים?", "פוטרתי בהיריון בלי שימוע, מה מגיע לי?"].map((q, i) => ({
    id: `CLR-${i + 1}`, category: "clarification", request: { question: q, legalDomain: "labor" }, fixture: null,
    expect: { clarificationRequired: true },
  })),
  // strong coverage → completed, high-risk review
  {
    id: "COV-1", category: "coverage_complete",
    request: { question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?", legalDomain: "labor", matterId: COMPLETE_PREG.matterId },
    fixture: COMPLETE_PREG, expect: { outcome: "completed", highRiskReview: true },
  },
  {
    id: "COV-2", category: "coverage_complete",
    request: { question: "מהם רכיבי החובה של הליך שימוע תקין לפני פיטורים?", legalDomain: "labor" },
    fixture: null, expect: { outcome: "completed" },
  },
  {
    id: "COV-3", category: "coverage_complete",
    request: { question: "עובד פוטר לאחר שלוש שנות עבודה, כיצד מחושבים פיצויי הפיטורים?", legalDomain: "labor" },
    fixture: null, expect: { outcome: "completed", highRiskReview: true },
  },
  // contradiction case → completed with review
  {
    id: "CON-1", category: "contradiction",
    request: { question: "האם מגיע פיצוי בגין עוגמת נפש והלנת שכר בדיון מהיר?", legalDomain: "labor" },
    fixture: null, expect: { outcome: "completed" },
  },
  // AI-prohibited → policy stop
  {
    id: "POL-1", category: "policy",
    request: { question: "עובדת פוטרה בהיריון — מה זכויותיה?", legalDomain: "labor", aiPolicy: "prohibited", matterId: "m-block" },
    fixture: { matterId: "m-block", clientId: "cx", matterTitleHe: "חסום", aiPolicy: "prohibited", items: [] },
    expect: { outcome: "stopped_policy" },
  },
  // unsupported intent
  {
    id: "INT-1", category: "intent",
    request: { question: "תגיש תביעה לבית הדין לעבודה במקומי" }, fixture: null,
    expect: { outcome: "stopped_unsupported_intent" },
  },
];

export interface DinoBenchmarkReport {
  version: string;
  totals: { cases: number };
  metrics: {
    domainMismatchStopRate: number;    // target 1
    clarificationCorrectRate: number;  // target ≥0.95
    highRiskReviewRate: number;        // target ≥0.95
    brokenCitationBlockRate: number;   // target 1
    fabricatedCitations: number;       // target 0
    unsupportedClaimsInOutput: number; // target 0
    correctStopRate: number;
    completedNoFabrication: number;
  };
  failures: { id: string; kind: string; detail: string }[];
  passed: boolean;
}

export async function runDinoBenchmark(): Promise<DinoBenchmarkReport> {
  const repos = createRepositories();
  if (repos.kind !== "in-memory") throw new Error("Dino benchmark runs in-memory only");
  await seedThroughRepositories(repos);
  const orgCtx = { organizationId: null, actorProfileId: null, correlationId: "bench" };

  const failures: DinoBenchmarkReport["failures"] = [];
  let domainCases = 0, domainStops = 0;
  let clarCases = 0, clarCorrect = 0;
  let highRiskCases = 0, highRiskCorrect = 0;
  let fabricated = 0, unsupported = 0;
  let correctStops = 0, stopCases = 0;
  let completedNoFab = 0;

  for (const c of CASES) {
    const r = await runDinoPipeline(repos, c.request, { mode: "deterministic_test", matterFixture: c.fixture });

    if (c.expect.domainMismatchStop) {
      domainCases++;
      if (r.outcome === "stopped_domain_mismatch") domainStops++;
      else failures.push({ id: c.id, kind: "domain_stop", detail: `expected domain stop, got ${r.outcome}` });
    }
    if (c.expect.clarificationRequired) {
      clarCases++;
      const crit = r.artifacts.clarification?.clarificationQuestions.filter((q) => q.critical).length ?? 0;
      if (r.outcome === "stopped_clarification" && crit > 0) clarCorrect++;
      else failures.push({ id: c.id, kind: "clarification", detail: `expected clarification, got ${r.outcome} (${crit} critical Qs)` });
    }
    if (c.expect.outcome) {
      stopCases++;
      if (r.outcome === c.expect.outcome) correctStops++;
      else failures.push({ id: c.id, kind: "outcome", detail: `expected ${c.expect.outcome}, got ${r.outcome}` });
    }
    if (c.expect.highRiskReview) {
      highRiskCases++;
      const target = r.artifacts.review?.primaryTarget;
      const ok = target && ["senior_lawyer_review", "partner_review", "compliance_review"].includes(target);
      if (ok) highRiskCorrect++;
      else failures.push({ id: c.id, kind: "review_routing", detail: `expected senior+ review, got ${target ?? "none"}` });
    }

    // fabrication + unsupported-claim checks on ANY completed output
    if (r.outcome === "completed") {
      let fab = false;
      for (const item of r.artifacts.evidence?.items ?? []) {
        if (item.quote.length !== item.charEnd - item.charStart) { fabricated++; fab = true; failures.push({ id: c.id, kind: "fabricated", detail: item.anchorKey }); }
      }
      // every drafted paragraph with claims must carry citations
      for (const p of r.artifacts.draft?.paragraphs ?? []) {
        if (p.claimIds.length > 0 && p.citationRefs.length === 0) { unsupported++; failures.push({ id: c.id, kind: "unsupported", detail: p.id }); }
      }
      // blocked citations must not survive into the draft
      const drafted = new Set((r.artifacts.draft?.paragraphs ?? []).flatMap((p) => p.claimIds));
      for (const blocked of r.artifacts.citations?.blockedClaimIds ?? []) {
        if (drafted.has(blocked)) { unsupported++; failures.push({ id: c.id, kind: "blocked_in_draft", detail: blocked }); }
      }
      if (!fab) completedNoFab++;
    }
  }

  // broken-citation block test (deterministic injection)
  const brokenLedger = {
    items: [{
      evidenceId: "ev-x", issueId: "i", claimSupportedHe: null, documentId: "nope", versionId: "nope",
      titleHe: "מזויף", sourceAuthorityClass: "legislation", quote: "טקסט שאינו במאגר",
      pageNumber: null, anchorKey: "p:0", charStart: 0, charEnd: 16, canonicalUrl: null,
      retrievedAt: new Date(0).toISOString(), verificationStatus: "unverified",
      supportDirectness: "direct" as const, supportStrength: 0.9, limitationsHe: [],
      contradictionStatus: "none" as const, permissionStatus: "x",
      supportingOrOpposing: "supporting" as const, temporalClass: "unknown" as const,
    }],
    byIssue: { i: ["ev-x"] }, byAuthority: {}, invalidAnchorCount: 0, assemblerVersion: "t",
  };
  const brokenClaim = {
    claims: [{ claimId: "c-x", issueId: "i", propositionHe: "p", claimType: "statutory_text" as const, requiredEvidenceHe: "-", supportingEvidenceIds: ["ev-x"], opposingEvidenceIds: [], factualDependencies: [], confidence: 0.9, safeToState: true, unsafeReasonsHe: [], wordingConstraintsHe: [], citationRequired: true, requiresHumanReview: true }],
    safeCount: 1, unsafeCount: 0, plannerVersion: "t",
  };
  const brokenReport = await verifyCitations(repos, brokenLedger, brokenClaim, orgCtx);
  const brokenBlocked = brokenReport.blockedClaimIds.includes("c-x") ? 1 : 0;
  if (!brokenBlocked) failures.push({ id: "BRK-1", kind: "broken_citation", detail: "broken citation not blocked" });

  const metrics = {
    domainMismatchStopRate: domainCases ? round(domainStops / domainCases) : 1,
    clarificationCorrectRate: clarCases ? round(clarCorrect / clarCases) : 1,
    highRiskReviewRate: highRiskCases ? round(highRiskCorrect / highRiskCases) : 1,
    brokenCitationBlockRate: brokenBlocked,
    fabricatedCitations: fabricated,
    unsupportedClaimsInOutput: unsupported,
    correctStopRate: stopCases ? round(correctStops / stopCases) : 1,
    completedNoFabrication: completedNoFab,
  };

  const passed =
    metrics.domainMismatchStopRate === 1 &&
    metrics.brokenCitationBlockRate === 1 &&
    metrics.fabricatedCitations === 0 &&
    metrics.unsupportedClaimsInOutput === 0 &&
    metrics.clarificationCorrectRate >= 0.95 &&
    metrics.highRiskReviewRate >= 0.95;

  return { version: "dino-benchmark-0.1.0", totals: { cases: CASES.length }, metrics, failures, passed };
}

function round(n: number): number { return Number(n.toFixed(4)); }

if (process.argv[1] && process.argv[1].endsWith("orchestration-benchmark.ts")) {
  runDinoBenchmark().then((report) => {
    const outDir = path.join(process.cwd(), ".poc-runs");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "dino-benchmark-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.metrics, null, 2));
    console.log(`cases: ${report.totals.cases}`);
    if (report.failures.length) { console.log("FAILURES:"); for (const f of report.failures) console.log(` - [${f.kind}] ${f.id}: ${f.detail}`); }
    console.log(report.passed ? "DINO BENCHMARK: PASSED" : "DINO BENCHMARK: FAILED");
    process.exit(report.passed ? 0 : 1);
  }).catch((e) => { console.error(e); process.exit(1); });
}
