/**
 * Matter Score + Narrative benchmark (Epic 4.2).
 * Deterministic. Runs the scenario fixtures and asserts the hard product
 * targets. Exits non-zero on any violation (used by `npm run matter:benchmark`).
 */
import { buildMatterProfile, type MatterProfileOptions } from "../profile.ts";
import { fullBriefingHe } from "../narrative/narrative-engine.ts";
import { COMPONENT_ENGINES } from "../engines/index.ts";
import type { Matter, MatterEngine, EngineAssessment } from "../types.ts";
import { readyMatter, earlyBlockedMatter } from "../__tests__/fixtures.ts";
import { hearingSoonMissingAffidavit, clientSilence, missingLegalCoverage, conflictingFacts } from "../__tests__/score-fixtures.ts";

function failEngine(name: string): MatterEngine[] {
  const t: MatterEngine = { name, version: "bench", assess(): EngineAssessment { throw new Error("simulated failure"); } };
  return COMPONENT_ENGINES.map((e) => (e.name === name ? t : e));
}

interface Case {
  id: string;
  matter: Matter;
  opts?: MatterProfileOptions;
  expectFailedEngine?: boolean;
  expectBlockingDeadline?: boolean;   // narrative must surface it
  expectSpecialistLegal?: boolean;    // legal must route to specialist_review
  disputedFactField?: string;         // must never be asserted as confirmed
}

const CASES: Case[] = [
  { id: "A-healthy", matter: readyMatter() },
  { id: "B-hearing-missing-affidavit", matter: hearingSoonMissingAffidavit(), expectBlockingDeadline: true },
  { id: "C-client-silence", matter: clientSilence() },
  { id: "D-engine-failure", matter: readyMatter(), opts: { assess: { engines: failEngine("matter-risk") } }, expectFailedEngine: true },
  { id: "E-missing-legal", matter: missingLegalCoverage(), expectSpecialistLegal: true },
  { id: "F-finance-unavailable", matter: readyMatter(), opts: { assess: { engines: failEngine("matter-financial") } }, expectFailedEngine: true },
  { id: "G-multiple-blockers", matter: earlyBlockedMatter(), expectBlockingDeadline: true },
  { id: "H-conflicting-facts", matter: conflictingFacts(), disputedFactField: "employer_knowledge" },
];

const HEALTHY_POSTURES = new Set(["on_track"]);
const CONFIRM_WORDS = ["אושר", "מאומת", "הוכח"];

let unsupported = 0, allegationAsFact = 0, falseHealthy = 0, untraceable = 0;
let deadlineDenom = 0, deadlineHit = 0, specialistDenom = 0, specialistHit = 0;
const rows: string[] = [];

for (const c of CASES) {
  const p = buildMatterProfile(c.matter, c.opts);
  const n = p.narrative;
  const text = fullBriefingHe(n);

  // traceability + unsupported
  for (const s of n.sentenceEvidenceMap) {
    const refs = s.findingCodes.length + s.blockerCodes.length + s.actionIds.length + s.assessmentIds.length;
    if (refs === 0) { unsupported++; untraceable++; }
  }

  // false-healthy: failed engine must never be on_track/healthy
  if (c.expectFailedEngine && HEALTHY_POSTURES.has(p.score.summary.posture)) falseHealthy++;

  // blocking deadline surfaced
  if (c.expectBlockingDeadline) {
    deadlineDenom++;
    const surfaced = /מועד|דיון/.test(text) || n.deadlineStatusHe !== null
      || n.urgentItemsHe.some((u) => /מועד|דיון/.test(u));
    if (surfaced) deadlineHit++;
  }

  // specialist routing when legal insufficient
  if (c.expectSpecialistLegal) {
    specialistDenom++;
    const legal = p.score.dimensions.find((d) => d.id === "legal")!;
    if (legal.reviewRoute?.primaryTarget === "specialist_review") specialistHit++;
  }

  // allegation/disputed fact must never be asserted as confirmed
  if (c.disputedFactField) {
    const re = new RegExp(`${c.disputedFactField}[^.]*(${CONFIRM_WORDS.join("|")})`);
    if (re.test(text)) allegationAsFact++;
  }

  rows.push(`${c.id.padEnd(30)} posture=${p.score.summary.posture.padEnd(16)} sentences=${n.sentenceEvidenceMap.length}`);
}

const traceability = 1 - untraceable / Math.max(1, CASES.reduce((s, c) => s + buildMatterProfile(c.matter, c.opts).narrative.sentenceEvidenceMap.length, 0));
const deadlineRate = deadlineDenom ? deadlineHit / deadlineDenom : 1;
const specialistRate = specialistDenom ? specialistHit / specialistDenom : 1;

console.log(rows.join("\n"));
console.log("\n--- Matter Score/Narrative benchmark ---");
console.log(JSON.stringify({
  cases: CASES.length,
  unsupportedStatements: unsupported,
  allegationsAsFact: allegationAsFact,
  falseHealthyOnFailure: falseHealthy,
  sentenceTraceability: Math.round(traceability * 1000) / 1000,
  blockingDeadlineSurfacedRate: Math.round(deadlineRate * 1000) / 1000,
  specialistRoutingRate: Math.round(specialistRate * 1000) / 1000,
}, null, 2));

const violations: string[] = [];
if (unsupported !== 0) violations.push(`unsupported statements: ${unsupported} (target 0)`);
if (allegationAsFact !== 0) violations.push(`allegations as fact: ${allegationAsFact} (target 0)`);
if (falseHealthy !== 0) violations.push(`false-healthy on failure: ${falseHealthy} (target 0)`);
if (traceability < 1) violations.push(`sentence traceability ${traceability} (target 1.0)`);
if (deadlineRate < 1) violations.push(`blocking deadline surfaced ${deadlineRate} (target 1.0)`);
if (specialistRate < 1) violations.push(`specialist routing ${specialistRate} (target 1.0)`);

if (violations.length) {
  console.log("\nMATTER SCORE/NARRATIVE BENCHMARK: FAILED");
  for (const v of violations) console.log("  - " + v);
  process.exit(1);
}
console.log("\nMATTER SCORE/NARRATIVE BENCHMARK: PASSED");
