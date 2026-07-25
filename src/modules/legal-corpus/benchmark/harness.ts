/**
 * Verified-citation benchmark harness (P1-S1 Phase 14) — INFRASTRUCTURE ONLY.
 *
 * This ships the gate logic (G1–G9) and a runner. It ships NO legal gold data
 * — gold records are authored from the approved verified source + editorial
 * review once a reuse basis exists. Here the harness is exercised only with
 * SYNTHETIC cases proving that it *enforces* the gates (a fabricated citation
 * fails G1, a whole-doc pinpoint fails G4, non-determinism fails G8, etc.).
 *
 * Prime directive: every gate is a HARD 100%. Any gate < 100% ⇒ release blocked.
 * Length and citation count are never scored.
 */

export type GateId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8" | "G9";

export interface EmittedCitation {
  citationId: string;
  sourceId: string;
  titleHe: string;
  year: number | null;
  section: string | null;
  subsection: string | null;
  versionId: string;
  effectiveStatus: string; // "in_force" | "future_effective" | ...
  link: string | null;
  pinpointResolvable: boolean; // true only for a genuine deep anchor
  supportsProposition: string; // claim id it is attached to
  licenseCompliant: boolean;
  fromCorpus: boolean; // false ⇒ fabricated (not present in verified corpus)
}

export interface GoldCitation {
  sourceId: string;
  titleHe: string;
  year: number | null;
  section: string | null;
  subsection: string | null;
  versionId: string;
  effectiveStatus: string;
  link: string | null;
  pinpointExpected: boolean; // whether a resolvable pinpoint must exist
  supportsProposition: string;
}

export interface GoldRecord {
  expectedStatus: string;
  expectedCitations: GoldCitation[];
  forbiddenSourceIds: string[];
  expectedCoverageLevel: "substantial" | "partial" | "insufficient";
}

export interface BenchmarkCase {
  caseId: string;
  doctrineId: string;
  questionHe: string;
  contextKind: "general" | "matter";
  asOfISO: string;
  gold: GoldRecord;
}

export interface ActualAnswer {
  status: string;
  citations: EmittedCitation[];
  coverageLevel: "substantial" | "partial" | "insufficient";
}

export interface GateResult {
  gate: GateId;
  passed: boolean;
  detail: string;
}

export interface CaseEvaluation {
  caseId: string;
  gates: GateResult[];
  passed: boolean;
}

function match(a: GoldCitation, c: EmittedCitation): boolean {
  return a.sourceId === c.sourceId && a.supportsProposition === c.supportsProposition;
}

/** Evaluate one case's actual answer against its gold record across G1–G9. */
export function evaluateCase(
  bcase: BenchmarkCase,
  actual: ActualAnswer,
  rerun: ActualAnswer,
): CaseEvaluation {
  const gold = bcase.gold;
  const gates: GateResult[] = [];

  // G1 — zero fabricated citations (every emitted citation is from the corpus
  // and not in the forbidden set).
  const fabricated = actual.citations.filter(
    (c) => !c.fromCorpus || gold.forbiddenSourceIds.includes(c.sourceId),
  );
  gates.push({ gate: "G1", passed: fabricated.length === 0, detail: `${fabricated.length} fabricated/forbidden` });

  // G2 — exact identity/title/year/section/subsection for every expected citation.
  let idOk = true;
  for (const g of gold.expectedCitations) {
    const c = actual.citations.find((x) => match(g, x));
    if (!c || c.titleHe !== g.titleHe || c.year !== g.year || c.section !== g.section || c.subsection !== g.subsection) {
      idOk = false;
      break;
    }
  }
  gates.push({ gate: "G2", passed: idOk, detail: idOk ? "exact" : "identity mismatch" });

  // G3 — permitted links present for expected citations that require them.
  let linkOk = true;
  for (const g of gold.expectedCitations) {
    if (g.link !== null) {
      const c = actual.citations.find((x) => match(g, x));
      if (!c || c.link !== g.link) { linkOk = false; break; }
    }
  }
  gates.push({ gate: "G3", passed: linkOk, detail: linkOk ? "ok" : "link mismatch" });

  // G4 — pinpoint honesty: where a pinpoint is expected it must be resolvable;
  // where not expected, no citation may claim a resolvable whole-doc pinpoint.
  let pinOk = true;
  for (const g of gold.expectedCitations) {
    const c = actual.citations.find((x) => match(g, x));
    if (!c) continue;
    if (g.pinpointExpected && !c.pinpointResolvable) { pinOk = false; break; }
    if (!g.pinpointExpected && c.pinpointResolvable && c.link !== null && !c.link.includes("#") && !c.link.includes("?")) {
      pinOk = false; break; // whole-doc link claimed as pinpoint
    }
  }
  gates.push({ gate: "G4", passed: pinOk, detail: pinOk ? "honest" : "pinpoint dishonest" });

  // G5 — version/currentness accuracy.
  let verOk = true;
  for (const g of gold.expectedCitations) {
    const c = actual.citations.find((x) => match(g, x));
    if (!c || c.versionId !== g.versionId || c.effectiveStatus !== g.effectiveStatus) { verOk = false; break; }
  }
  gates.push({ gate: "G5", passed: verOk, detail: verOk ? "current" : "version/currentness mismatch" });

  // G6 — claim-to-citation relevance: every emitted citation attaches to a
  // proposition that some expected citation also supports (no topical-only).
  const expectedProps = new Set(gold.expectedCitations.map((g) => g.supportsProposition));
  const irrelevant = actual.citations.filter((c) => !expectedProps.has(c.supportsProposition));
  gates.push({ gate: "G6", passed: irrelevant.length === 0, detail: `${irrelevant.length} topical-only` });

  // G7 — license-compliant rendering.
  const licenseViolations = actual.citations.filter((c) => !c.licenseCompliant);
  gates.push({ gate: "G7", passed: licenseViolations.length === 0, detail: `${licenseViolations.length} license violations` });

  // G8 — deterministic reproduction (citation set identical on re-run).
  const det = JSON.stringify(actual) === JSON.stringify(rerun);
  gates.push({ gate: "G8", passed: det, detail: det ? "deterministic" : "non-deterministic" });

  // G9 — negative cases: when gold expects no supporting citations, actual
  // must not assert any corpus-supported authority (correct refusal).
  let negOk = true;
  if (gold.expectedCitations.length === 0) {
    negOk = actual.citations.length === 0;
  }
  gates.push({ gate: "G9", passed: negOk, detail: negOk ? "honest refusal" : "asserted authority under pressure" });

  const passed = gates.every((g) => g.passed);
  return { caseId: bcase.caseId, gates, passed };
}

export interface BenchmarkReport {
  total: number;
  passedCases: number;
  releaseBlocked: boolean;
  gateFailures: Record<GateId, number>;
  failingCaseIds: string[];
}

/** Runs the suite. `runner` returns the actual answer; called twice per case
 *  to check determinism. ANY gate failure blocks the release. */
export async function runBenchmark(
  cases: BenchmarkCase[],
  runner: (c: BenchmarkCase) => Promise<ActualAnswer>,
): Promise<BenchmarkReport> {
  const gateFailures: Record<GateId, number> = {
    G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, G6: 0, G7: 0, G8: 0, G9: 0,
  };
  const failingCaseIds: string[] = [];
  let passedCases = 0;
  for (const c of cases) {
    const a = await runner(c);
    const b = await runner(c);
    const evalResult = evaluateCase(c, a, b);
    if (evalResult.passed) {
      passedCases += 1;
    } else {
      failingCaseIds.push(c.caseId);
      for (const g of evalResult.gates) {
        if (!g.passed) gateFailures[g.gate] += 1;
      }
    }
  }
  return {
    total: cases.length,
    passedCases,
    releaseBlocked: failingCaseIds.length > 0,
    gateFailures,
    failingCaseIds,
  };
}
