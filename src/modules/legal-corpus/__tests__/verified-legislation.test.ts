/**
 * P1-S1 verified-legislation — answer scenarios + G1–G9 benchmark.
 * Real verified seed (D-NOTICE + D-MINWAGE). Deterministic; no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVerifiedLegislationAnswer } from "../answer.ts";
import { verifiedCorpus } from "../store.ts";
import { runBenchmark } from "../benchmark/harness.ts";
import { P1S1_CASES, answerToActual } from "../benchmark/p1s1-cases.ts";
import { createVerifiedLegislationAdapter } from "../canonical.ts";

const NOW = "2026-07-25T09:00:00+03:00";

test("D-NOTICE: answered with verified §1 citation and legislation badge", () => {
  const a = buildVerifiedLegislationAnswer({ question: "האם מעסיק חייב למסור הודעה בכתב על תנאי העבודה?", contextKind: "general", asOfISO: NOW });
  assert.equal(a.status, "answered");
  assert.equal(a.badgeTextHe, "מבוסס חקיקה מאומתת");
  assert.equal(a.citations.length, 1);
  assert.equal(a.citations[0].sourceId, "vlc-notice-2002");
  assert.equal(a.citations[0].sectionHe, "סעיף 1");
  assert.equal(a.citations[0].year, 2002);
  assert.equal(a.citations[0].verifiedBadgeHe, "מאומת");
  assert.ok(a.citations[0].link && a.citations[0].link.includes("kolzchut"));
  assert.equal(a.claims[0].kind, "established_law");
  assert.ok(a.reproKey && a.reproKey.includes("vlc-2026-07-25-p1s1"));
});

test("D-NOTICE citation is honest about the pinpoint (section, not a deep anchor)", () => {
  const a = buildVerifiedLegislationAnswer({ question: "חובת הודעה על תנאי העבודה", contextKind: "general", asOfISO: NOW });
  assert.equal(a.citations[0].pinpointResolvable, false);
  assert.ok(a.citations[0].pinpointStatementHe && a.citations[0].pinpointStatementHe.includes("הקישור"));
  assert.equal(a.citations[0].officialBadge, false); // link is a verified secondary page, not the gazette
});

test("D-MINWAGE current: answered with entitlement §2 + verified current rate", () => {
  const a = buildVerifiedLegislationAnswer({ question: "מהו שכר המינימום החל כיום?", contextKind: "general", asOfISO: NOW });
  assert.equal(a.status, "answered");
  assert.ok(a.bottomLineHe.includes("6,443.85"));
  assert.ok(a.bottomLineHe.includes("35.40"));
  const ids = a.citations.map((c) => c.sourceId).sort();
  assert.deepEqual(ids, ["vlc-minwage-1987", "vlc-minwage-rate"]);
});

test("D-MINWAGE historical (before 1.4.2026): rate not applied — honest insufficient", () => {
  const a = buildVerifiedLegislationAnswer({ question: "מה היה שכר המינימום במרץ 2026?", contextKind: "general", asOfISO: "2026-03-15T09:00:00+03:00" });
  assert.equal(a.status, "insufficient_coverage");
  assert.ok(!a.bottomLineHe.includes("6,443.85")); // never asserts the current rate for a past date
  assert.equal(a.citations.length, 1); // entitlement only
  assert.equal(a.citations[0].sourceId, "vlc-minwage-1987");
});

test("D-MINWAGE stale (past re-verify due date): current rate fails closed", () => {
  const a = buildVerifiedLegislationAnswer({ question: "מהו שכר המינימום העדכני?", contextKind: "general", asOfISO: "2026-12-01T09:00:00+03:00" });
  assert.equal(a.status, "insufficient_coverage");
  assert.ok(!a.citations.some((c) => c.sourceId === "vlc-minwage-rate"));
});

test("matter question without facts → needs_facts (no fabricated application)", () => {
  const a = buildVerifiedLegislationAnswer({ question: "האם ההודעה על תנאי העבודה בתיק נמסרה כדין?", contextKind: "matter", factsPresent: false, asOfISO: NOW });
  assert.equal(a.status, "needs_facts");
  assert.equal(a.citations.length, 0);
});

test("out-of-scope doctrine is declined honestly, no citation", () => {
  const a = buildVerifiedLegislationAnswer({ question: "האם מגיעים פיצויי פיטורים?", contextKind: "general", asOfISO: NOW });
  assert.equal(a.status, "out_of_scope");
  assert.equal(a.citations.length, 0);
  assert.equal(a.badge, null);
});

test("copy + Word export blocks are produced for answered questions", () => {
  const a = buildVerifiedLegislationAnswer({ question: "מהו שכר המינימום החל כיום?", contextKind: "general", asOfISO: NOW });
  assert.ok(a.citations[0].copyableForm.length > 0);
  assert.ok(a.wordExportBlock && a.wordExportBlock.includes("מקורות משפטיים מאומתים"));
});

test("determinism: identical output on repeat", () => {
  const req = { question: "מהו שכר המינימום החל כיום?", contextKind: "general" as const, asOfISO: NOW };
  assert.equal(JSON.stringify(buildVerifiedLegislationAnswer(req)), JSON.stringify(buildVerifiedLegislationAnswer(req)));
});

test("coverage is never 'complete'", () => {
  const c = verifiedCorpus.coverage("D-MINWAGE", NOW);
  assert.notEqual(c.coverageLevel as string, "complete");
  assert.equal(c.coverageLevel, "substantial");
});

test("verified-legislation research adapter emits verified CanonicalSources for covered doctrines", async () => {
  const adapter = createVerifiedLegislationAdapter();
  const res = await adapter.search({
    id: "p", sourceId: "verified-legislation", sourceKind: "legislation",
    queryTerms: ["שכר מינימום"], topics: [], sections: [], refIds: [],
    filters: { authorityPreference: "binding_first", courtLevels: [], dateFromISO: null, dateToISO: null, onlyVerified: true },
    rationaleHe: "",
  });
  assert.ok(res.sources.length >= 1);
  assert.ok(res.sources.every((s) => s.verification === "verified" && s.usableForClaim));
});

test("RELEASE GATE — verified-citation benchmark passes G1–G9 at 100%", async () => {
  const report = await runBenchmark(P1S1_CASES, async (c) => answerToActual((c as unknown as { req: Parameters<typeof answerToActual>[0] }).req));
  assert.ok(report.total >= 30, `expected >= 30 cases, got ${report.total}`);
  assert.equal(report.passedCases, report.total);
  assert.equal(report.releaseBlocked, false);
  for (const g of Object.keys(report.gateFailures) as (keyof typeof report.gateFailures)[]) {
    assert.equal(report.gateFailures[g], 0, `${g} had ${report.gateFailures[g]} failures`);
  }
});
