/**
 * MatterIntelligence deriver — pure, deterministic unit tests (Slice 2.1.0).
 * Reuses the Slice 2.0.0 fixtures (which are `MatterSource` shaped) plus an
 * inline dormant case. Reference "now" is fixed (2026-07-25).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatterIntelligence, MATTER_INTELLIGENCE_VERSION } from "../derive.ts";
import type { MatterSource } from "../source.ts";
import {
  workspaceFixtureInput, workspaceEmptyFixtureInput, FIXTURE_NOW_ISO,
} from "../../workspace/fixtures.ts";

test("identity, stage and procedure labels are resolved", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  assert.equal(m.meta.version, MATTER_INTELLIGENCE_VERSION);
  assert.equal(m.meta.generatedAtISO, FIXTURE_NOW_ISO);
  assert.equal(m.identity.procedureType, "pregnancy_dismissal");
  assert.equal(m.identity.procedureLabelHe, "פיטורי עובדת בהיריון");
  assert.equal(m.stage.currentStageId, "assessment");
  assert.equal(m.stage.stageLabelHe, "הערכה");
  assert.equal(m.client.present, true);
  assert.equal(m.client.nameHe, "דנה כהן");
  assert.equal(m.responsibleLawyer.present, true);
});

test("counts are derived across every collection", () => {
  const c = buildMatterIntelligence(workspaceFixtureInput()).counts;
  assert.equal(c.facts, 5);
  assert.equal(c.establishedFacts, 2);
  assert.equal(c.allegedFacts, 2);
  assert.equal(c.disputedFacts, 1);
  assert.equal(c.participants, 4);
  assert.equal(c.documents, 3);
  assert.equal(c.approvedDocuments, 1);
  assert.equal(c.evidence, 3);
  assert.equal(c.mandatoryEvidence, 2);
  assert.equal(c.collectedMandatoryEvidence, 1);
  assert.equal(c.missingMandatoryEvidence, 1);
  assert.equal(c.deadlines, 3);
  assert.equal(c.overdueDeadlines, 1);
  assert.equal(c.upcomingDeadlines, 1);
  assert.equal(c.unscheduledDeadlines, 1);
  assert.equal(c.timelineEvents, 4);
});

test("facts carry an epistemic label; an allegation is never established", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  const byId = new Map(m.facts.map((f) => [f.id, f]));
  assert.equal(byId.get("f1")?.established, true);   // document_derived
  assert.equal(byId.get("f2")?.established, true);   // confirmed
  assert.equal(byId.get("f3")?.epistemic, "alleged");
  assert.equal(byId.get("f3")?.established, false);
  assert.equal(byId.get("f5")?.epistemic, "disputed");
});

test("deadlines are bucketed with signed day deltas; nearest is most-overdue", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  const byId = new Map(m.deadlines.map((d) => [d.id, d]));
  assert.equal(byId.get("dl1")?.bucket, "upcoming");
  assert.equal(byId.get("dl1")?.daysRemaining, 5);
  assert.equal(byId.get("dl2")?.bucket, "overdue");
  assert.equal(byId.get("dl2")?.daysRemaining, -3);
  assert.equal(byId.get("dl3")?.bucket, "unscheduled");
  assert.equal(byId.get("dl3")?.daysRemaining, null);
  assert.equal(m.timing.nearestDeadlineDays, -3); // dl2, the overdue one
});

test("relationships summarize the participant graph and fact sourcing", () => {
  const r = buildMatterIntelligence(workspaceFixtureInput()).relationships;
  assert.deepEqual(r.participantRoleCounts, { client: 1, opposing_party: 1, witness: 1, counsel: 1 });
  assert.equal(r.hasClient, true);
  assert.equal(r.hasOpposingParty, true);
  assert.equal(r.factsWithSource, 4);       // f5 has no source
  assert.equal(r.factsWithoutSource, 1);
});

test("timing: age, recent activity, timeline density", () => {
  const t = buildMatterIntelligence(workspaceFixtureInput()).timing;
  assert.equal(t.ageDays, 9);               // opened 07-16 → now 07-25
  assert.equal(t.lastActivityISO, "2026-07-19T11:20:00+03:00");
  assert.equal(t.daysSinceLastActivity, 6);
  assert.equal(t.recentActivity, true);
  assert.equal(t.dormant, false);
});

test("completeness flags + weighted score", () => {
  const comp = buildMatterIntelligence(workspaceFixtureInput()).completeness;
  assert.equal(comp.hasClient, true);
  assert.equal(comp.hasEstablishedFacts, true);
  assert.equal(comp.missingMandatoryEvidence, true);
  assert.equal(comp.score, 100);            // every dimension present
});

test("outstanding issues + known unknowns are derived without AI", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  const codes = m.outstandingIssues.map((i) => i.code);
  assert.ok(codes.includes("OVERDUE_DEADLINE"));            // dl2 non-strict overdue
  assert.ok(codes.includes("UNSCHEDULED_STRICT_DEADLINE")); // dl3 strict, no date
  assert.ok(codes.includes("MISSING_MANDATORY_EVIDENCE"));
  assert.ok(codes.includes("UNRESOLVED_DISPUTED_FACTS"));
  assert.ok(!codes.includes("MISSING_CLIENT"));
  const kuCodes = m.knownUnknowns.map((k) => k.code);
  assert.ok(kuCodes.includes("MISSING_MANDATORY_EVIDENCE"));
  assert.ok(m.knownUnknowns.find((k) => k.code === "UNSCHEDULED_STRICT_DEADLINE")?.blocking);
});

test("health, risk, priority and attention scoring", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  assert.equal(m.scores.risk, "high");       // overdue (soft) + imminent strict + missing mandatory
  assert.equal(m.health.status, "at_risk");
  assert.equal(m.scores.priority, "high");
  assert.equal(m.scores.completeness, 100);
  assert.equal(m.scores.attention, 80);      // 20+25+15+15+5
});

test("empty matter: honest known-unknowns, critical health, no fabricated values", () => {
  const m = buildMatterIntelligence(workspaceEmptyFixtureInput());
  assert.equal(m.client.present, false);
  assert.equal(m.client.nameHe, null);
  assert.equal(m.responsibleLawyer.present, false);
  assert.equal(m.counts.facts, 0);
  assert.equal(m.counts.timelineEvents, 1); // bootstrap event still seeds the feed
  assert.equal(m.completeness.score, 0);
  const codes = m.outstandingIssues.map((i) => i.code);
  assert.ok(codes.includes("MISSING_CLIENT"));
  assert.ok(codes.includes("NO_FACTS"));
  assert.equal(m.scores.risk, "critical");   // missing client
  assert.equal(m.health.status, "critical");
  assert.equal(m.scores.priority, "urgent");
  assert.ok(m.knownUnknowns.find((k) => k.code === "MISSING_CLIENT")?.blocking);
});

test("dormant detection: a quiet, complete, long-idle matter reads dormant", () => {
  const dormant: MatterSource = {
    nowISO: "2026-07-25T09:00:00+03:00",
    header: {
      id: "m1", slug: "s1", titleHe: "תיק שקט", fileNoHe: null, forumHe: null, legalDomain: "labor",
      procedureType: "severance_claim", topic: "severance_claim", currentStageId: "intake",
      status: "open", openedAtISO: "2026-05-01T09:00:00+03:00", confidentiality: null,
    },
    clientNameHe: "לקוח",
    responsibleLawyerHe: "עו״ד",
    facts: [{ id: "f", factKey: "k", statementHe: "s", status: "confirmed", sourceHe: "src" }],
    participants: [{ id: "p", role: "client", nameHe: "לקוח", kind: "person", contactId: "c", idNumberHe: null, responsiveness: null, archived: false }],
    documents: [{ id: "d", titleHe: "t", documentType: "other", evidenceType: "document", approvalState: "approved", dateISO: null, createdAtISO: "2026-05-01T09:00:00+03:00" }],
    evidence: [{ id: "e", labelHe: "l", evidenceType: "document", mandatory: true, status: "collected" }],
    deadlines: [{ id: "dl", labelHe: "l", dueAtISO: "2026-09-01T09:00:00+03:00", strict: false, basisHe: null, source: "user_supplied", confidence: "estimated" }],
    activity: [{ id: "a", occurredAtISO: "2026-05-20T09:00:00+03:00", kind: "matter_bootstrapped", descriptionHe: "נוצר", actorHe: null }],
  };
  const m = buildMatterIntelligence(dormant);
  assert.equal(m.timing.dormant, true);
  assert.equal(m.scores.risk, "moderate");
  assert.equal(m.health.status, "dormant");
});

test("the model is deeply immutable and deterministic", () => {
  const m = buildMatterIntelligence(workspaceFixtureInput());
  assert.ok(Object.isFrozen(m));
  assert.ok(Object.isFrozen(m.counts));
  assert.ok(Object.isFrozen(m.facts));
  assert.ok(Object.isFrozen(m.facts[0]));
  assert.throws(() => {
    (m.counts as { facts: number }).facts = 999;
  });
  const again = buildMatterIntelligence(workspaceFixtureInput());
  assert.equal(JSON.stringify(m), JSON.stringify(again));
});
