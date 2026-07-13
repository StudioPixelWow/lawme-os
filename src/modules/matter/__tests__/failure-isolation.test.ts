import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMatter } from "../intelligence.ts";
import { COMPONENT_ENGINES } from "../engines/index.ts";
import type { MatterEngine, EngineAssessment } from "../types.ts";
import { readyMatter } from "./fixtures.ts";

/** An engine that always throws — for deterministic failure injection. */
const throwingEngine: MatterEngine = {
  name: "matter-throwing-test",
  version: "test-0.0.0",
  assess(): EngineAssessment {
    throw new Error("boom — simulated engine failure");
  },
};

/** An engine that returns a structurally invalid assessment. */
const invalidEngine: MatterEngine = {
  name: "matter-invalid-test",
  version: "test-0.0.0",
  // @ts-expect-error deliberately invalid output for the isolation test
  assess() {
    return { engine: "matter-invalid-test" }; // missing findings/actions/status
  },
};

test("a throwing engine does not crash the whole assessment", () => {
  const m = readyMatter();
  // include the throwing engine alongside the real ones
  const state = assessMatter(m, { engines: [...COMPONENT_ENGINES, throwingEngine] });
  assert.ok(state); // did not throw
  assert.equal(state.degraded.hasFailures, true);
  assert.equal(state.degraded.executionComplete, false);
  assert.ok(state.degraded.failedEngines.some((f) => f.engine === "matter-throwing-test" && f.category === "threw"));
});

test("an invalid-output engine is caught as a degraded assessment", () => {
  const m = readyMatter();
  const state = assessMatter(m, { engines: [...COMPONENT_ENGINES, invalidEngine] });
  assert.ok(state.degraded.failedEngines.some((f) => f.engine === "matter-invalid-test" && f.category === "invalid_output"));
});

test("a failed engine is represented as a non-healthy, human-review assessment", () => {
  const m = readyMatter();
  const state = assessMatter(m, { engines: [...COMPONENT_ENGINES, throwingEngine] });
  const failed = state.engines.find((a) => a.engine === "matter-throwing-test")!;
  assert.ok(failed);
  assert.notEqual(failed.status, "healthy");
  assert.equal(failed.status, "unknown");
  assert.equal(failed.requiresHumanReview, true);
  assert.equal(failed.data.failed, true);
});

/** A stub engine that always reports perfect health — to isolate the guard. */
const healthyStub: MatterEngine = {
  name: "matter-healthy-stub",
  version: "test-0.0.0",
  assess(): EngineAssessment {
    return {
      engine: "matter-healthy-stub", engineVersion: "test-0.0.0",
      status: "healthy", score: 1, findings: [], actions: [],
      data: {}, confidence: 1, requiresHumanReview: false,
    };
  },
};

test("a failure NEVER appears healthy even when every surviving engine is healthy", () => {
  // baseline: only a healthy stub → overall healthy
  const baseline = assessMatter(readyMatter(), { engines: [healthyStub] });
  assert.equal(baseline.overallStatus, "healthy");
  assert.equal(baseline.requiresHumanReview, false);

  // inject a failure alongside the healthy stub → must NOT be healthy
  const degraded = assessMatter(readyMatter(), { engines: [healthyStub, throwingEngine] });
  assert.notEqual(degraded.overallStatus, "healthy");
  assert.equal(degraded.requiresHumanReview, true);
  assert.equal(degraded.degraded.hasFailures, true);
});

test("injecting a failure into the full engine set never yields a healthy matter", () => {
  const degraded = assessMatter(readyMatter(), { engines: [...COMPONENT_ENGINES, throwingEngine] });
  assert.notEqual(degraded.overallStatus, "healthy");
  assert.equal(degraded.requiresHumanReview, true);
});

test("no raw exception message/stack leaks into the assessment output", () => {
  const state = assessMatter(readyMatter(), { engines: [throwingEngine] });
  const serialized = JSON.stringify(state);
  assert.equal(serialized.includes("boom"), false, "raw error text must not leak");
  assert.equal(serialized.includes("Error"), false, "raw Error must not leak");
});

test("failure isolation is deterministic", () => {
  const a = assessMatter(readyMatter(), { engines: [...COMPONENT_ENGINES, throwingEngine] });
  const b = assessMatter(readyMatter(), { engines: [...COMPONENT_ENGINES, throwingEngine] });
  assert.deepEqual(a, b);
});
