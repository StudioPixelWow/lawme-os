import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPLOYMENT_PROCEDURE_GRAPH, EMPLOYMENT_PROCEDURES } from "../catalog.ts";
import { validateProcedure, orderedStages, nextStages, allSources, findProcedure } from "../graph.ts";

test("catalog has 11 connected employment procedures", () => {
  assert.equal(EMPLOYMENT_PROCEDURES.length, 11);
  assert.ok(EMPLOYMENT_PROCEDURES.every((p) => p.stages.length >= 3));
});

test("every procedure validates: connected graph, reachable stages", () => {
  for (const p of EMPLOYMENT_PROCEDURES) {
    const v = validateProcedure(p);
    assert.ok(v.ok, `${p.id}: ${v.errors.join("; ")}`);
    assert.equal(v.warnings.filter((w) => w.includes("unreachable")).length, 0, `${p.id} has unreachable stages`);
  }
});

test("INTEGRITY: no stage marks best-practice as mandatory law", () => {
  for (const p of EMPLOYMENT_PROCEDURES) {
    const v = validateProcedure(p);
    assert.equal(v.errors.filter((e) => e.includes("best practice cannot be law")).length, 0, `${p.id} conflates practice with law`);
  }
});

test("pregnancy procedure: fully connected root→appeal, links to women's employment law", () => {
  const p = findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, "pregnancy_dismissal")!;
  assert.ok(p);
  const stages = orderedStages(p);
  assert.equal(stages[0].kind, "intake");
  assert.equal(stages[stages.length - 1].kind, "appeal");
  // governing legislation includes the real women's-employment statute permalink
  assert.ok(p.governingLegislation.some((s) => s.canonicalUrl?.includes("laws/2001135")));
  // assessment stage cites section 9 as mandatory law
  const assess = p.stages.find((s) => s.kind === "assessment")!;
  assert.ok(assess.sources.some((s) => s.authority === "mandatory_law" && s.citationHe.includes("סעיף 9")));
});

test("pregnancy procedure: critical facts required at fact-confirmation", () => {
  const p = findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, "pregnancy_dismissal")!;
  const fc = p.stages.find((s) => s.kind === "fact_confirmation")!;
  for (const f of ["employment_duration", "employer_knowledge", "permit_status"]) {
    assert.ok(fc.requiredFacts.includes(f), `missing required fact ${f}`);
  }
});

test("pregnancy procedure: mandatory evidence carries authoritative provenance", () => {
  const p = findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, "pregnancy_dismissal")!;
  const fc = p.stages.find((s) => s.kind === "fact_confirmation")!;
  const mandatory = fc.evidence.filter((e) => e.mandatory);
  assert.ok(mandatory.length >= 1);
  for (const e of mandatory) assert.ok(e.sources.length > 0, `evidence ${e.id} lacks provenance`);
});

test("nextStages exposes alternative (interim relief) branch", () => {
  const p = findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, "pregnancy_dismissal")!;
  const filing = p.stages.find((s) => s.kind === "filing")!;
  const nexts = nextStages(p, filing.id);
  assert.ok(nexts.some((n) => n.kind === "alternative"), "expected an alternative branch from filing");
});

test("every procedure links to at least one governing source", () => {
  for (const p of EMPLOYMENT_PROCEDURES) {
    assert.ok(allSources(p).length >= 1, `${p.id} has no sources`);
  }
});

test("actions requiring external effect always need human approval (POC safety)", () => {
  for (const p of EMPLOYMENT_PROCEDURES) {
    for (const s of p.stages) {
      for (const a of s.actions) {
        if (["file", "serve", "request_relief", "appeal", "enforce"].includes(a.kind)) {
          assert.ok(a.requiresHumanApproval, `${p.id}/${a.id} external action without human approval`);
        }
      }
    }
  }
});
