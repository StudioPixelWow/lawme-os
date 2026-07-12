/**
 * Deterministic Dino orchestration tests (Epic 3A, Phases 29/33).
 * No network, no DB credentials, no paid providers — in-memory only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRepositories } from "../../legal-knowledge/repositories/index.ts";
import { seedThroughRepositories } from "../../legal-knowledge/seed/seed-fixtures.ts";
import { runDinoPipeline } from "../orchestrator.ts";
import { SCENARIOS } from "./scenarios.ts";
import { verifyCitations } from "../citations/citation-verifier.ts";
import { classifyIntent } from "../classification/intent-classifier.ts";
import { ProviderRouter, MockModelProvider, DeterministicProvider } from "../providers/providers.ts";
import { MANDATORY_DRAFT_LABEL_HE } from "../drafting/controlled-drafting-engine.ts";

async function seededRepos() {
  const repos = createRepositories();
  await seedThroughRepositories(repos);
  return repos;
}

/* ---------- scenarios A–G ---------- */

for (const sc of SCENARIOS) {
  test(`scenario ${sc.id}: ${sc.labelHe}`, async () => {
    const repos = await seededRepos();
    const r = await runDinoPipeline(repos, sc.request, { mode: "deterministic_test", matterFixture: sc.fixture });
    assert.equal(r.outcome, sc.expected.outcome, `outcome for ${sc.id}: got ${r.outcome}`);

    if (sc.expected.domainMatch === false) {
      assert.notEqual(r.artifacts.questionClassification?.domain, "employment");
    }
    if (sc.expected.requiresClarification) {
      assert.ok((r.artifacts.clarification?.clarificationQuestions.filter((q) => q.critical).length ?? 0) > 0);
      // never invents facts
      assert.ok(r.artifacts.clarification?.prohibitedAssumptions.length);
    }
    if (sc.expected.minIssues) {
      assert.ok((r.artifacts.issueGraph?.issues.length ?? 0) >= sc.expected.minIssues);
    }
    if (sc.expected.outcome === "completed") {
      // completed runs carry a full artifact chain + human-review route
      assert.ok(r.artifacts.confidence, "confidence report present");
      assert.ok(r.artifacts.review, "review route present");
      assert.ok(r.artifacts.review!.mandatoryBeforeAction);
      assert.equal(r.artifacts.draft?.mandatoryLabelHe, MANDATORY_DRAFT_LABEL_HE);
      // no unsafe claim drafted
      const drafted = new Set((r.artifacts.draft?.paragraphs ?? []).flatMap((p) => p.claimIds));
      const unsafe = (r.artifacts.claims?.claims ?? []).filter((c) => !c.safeToState).map((c) => c.claimId);
      assert.ok(unsafe.every((id) => !drafted.has(id)), "no unsafe claim in draft");
    }
  });
}

/* ---------- Scenario F: broken citation blocks the claim ---------- */

test("scenario F: a broken citation blocks its claim (deterministic injection)", async () => {
  const repos = await seededRepos();
  const orgCtx = { organizationId: null, actorProfileId: null, correlationId: "test-F" };
  // minimal ledger with one corrupted quote (won't match the stored source)
  const ledger = {
    items: [{
      evidenceId: "ev-broken", issueId: "issue-x", claimSupportedHe: null,
      documentId: "does-not-exist", versionId: "no-version", titleHe: "מקור מזויף",
      sourceAuthorityClass: "legislation", quote: "טקסט שלא קיים במאגר כלל",
      pageNumber: null, anchorKey: "p:9999", charStart: 0, charEnd: 24,
      canonicalUrl: null, retrievedAt: new Date(0).toISOString(),
      verificationStatus: "unverified", supportDirectness: "direct" as const, supportStrength: 0.9,
      limitationsHe: [], contradictionStatus: "none" as const, permissionStatus: "synthetic_fixture",
      supportingOrOpposing: "supporting" as const, temporalClass: "unknown" as const,
    }],
    byIssue: { "issue-x": ["ev-broken"] }, byAuthority: {}, invalidAnchorCount: 0,
    assemblerVersion: "test",
  };
  const claimPlan = {
    claims: [{
      claimId: "claim-broken", issueId: "issue-x", propositionHe: "טענה על מקור מזויף",
      claimType: "statutory_text" as const, requiredEvidenceHe: "-", supportingEvidenceIds: ["ev-broken"],
      opposingEvidenceIds: [], factualDependencies: [], confidence: 0.9, safeToState: true,
      unsafeReasonsHe: [], wordingConstraintsHe: [], citationRequired: true, requiresHumanReview: true,
    }],
    safeCount: 1, unsafeCount: 0, plannerVersion: "test",
  };
  const report = await verifyCitations(repos, ledger, claimPlan, orgCtx);
  assert.ok(report.checks[0].blocksClaim, "broken citation must block");
  assert.ok(report.blockedClaimIds.includes("claim-broken"));
  assert.ok(["broken_anchor", "quote_mismatch"].includes(report.checks[0].status));
});

/* ---------- provider independence ---------- */

test("provider router refuses network providers", () => {
  const networkProvider = {
    name: "fake-live", version: "1", capabilities: new Set<never>(),
    makesNetworkCalls: true, execute: async () => ({ ok: false, output: null, provider: "fake-live", providerVersion: "1", validated: false }),
  };
  assert.throws(() => new ProviderRouter([networkProvider as never]), /REFUSED/);
});

test("mock + deterministic providers make no network calls", () => {
  const router = new ProviderRouter([new DeterministicProvider(), new MockModelProvider()]);
  assert.ok(!router.route("classification").makesNetworkCalls);
});

/* ---------- intent classification (deterministic first) ---------- */

test("intent classifier: legal question vs unsupported action", () => {
  const q = classifyIntent({ question: "מה זכויות עובדת שפוטרה בהיריון?" });
  assert.ok(["legal_question", "legal_research"].includes(q.primaryIntent));
  const bad = classifyIntent({ question: "תגיש תביעה לבית המשפט במקומי" });
  assert.ok(bad.prohibitedPipeline.length > 0);
});

/* ---------- no chain-of-thought is stored ---------- */

test("no stage stores raw model reasoning — only structured artifacts", async () => {
  const repos = await seededRepos();
  const r = await runDinoPipeline(repos, SCENARIOS[0].request, { mode: "deterministic_test", matterFixture: SCENARIOS[0].fixture });
  for (const s of r.stages) {
    // audit summaries are short safe strings, never reasoning transcripts
    assert.ok(s.audit.inputSummaryHe.length < 200);
    assert.ok(s.audit.outputSummaryHe.length < 200);
    assert.equal(typeof s.provenance.provider, "string");
  }
  // artifacts are typed structures, never a "reasoning" free-text blob
  assert.ok(!("chainOfThought" in (r.artifacts as Record<string, unknown>)));
  assert.ok(!("reasoning" in (r.artifacts as Record<string, unknown>)));
});

/* ---------- warnings never swallowed ---------- */

test("warnings propagate to the run result", async () => {
  const repos = await seededRepos();
  const r = await runDinoPipeline(repos, SCENARIOS[0].request, { mode: "deterministic_test", matterFixture: SCENARIOS[0].fixture });
  const stageWarnings = r.stages.flatMap((s) => s.warnings);
  assert.deepEqual(r.warnings, stageWarnings);
});
