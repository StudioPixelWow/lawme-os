/**
 * Hybrid provider-seam tests — the model provider is disabled by default, the
 * router never silently falls back, and untrusted output is re-validated so an
 * established status or an invented date can never survive. No DB, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { DeterministicIntakeProvider } from "../providers/deterministic-provider.ts";
import { ModelIntakeProvider } from "../providers/model-provider.ts";
import { IntakeProviderRouter, validateSuggestions } from "../providers/router.ts";
import type { ProviderSuggestions } from "../providers/types.ts";
import { runIntakePipeline } from "../pipeline.ts";

const NOW = "2026-07-16T09:00:00+03:00";
const ORG = "00000000-0000-4000-8000-0000000000aa";
const STORY = "הלקוחה פוטרה. יש להגיש תוך 30 יום.";

test("model provider is disabled by default and refuses to run", async () => {
  const p = new ModelIntakeProvider();
  assert.equal(p.enabled, false);
  assert.equal(p.makesNetworkCalls, false);
  await assert.rejects(() => p.extract({ story: STORY, pasted: "", atISO: NOW }), /model_provider_disabled/);
});

test("router deterministic mode uses the deterministic provider", async () => {
  const r = new IntakeProviderRouter("deterministic");
  assert.equal(r.provider().id, new DeterministicIntakeProvider().id);
  const out = await r.extract({ story: STORY, pasted: "", atISO: NOW });
  assert.ok(out.suggestions.facts.length >= 1);
  assert.equal(out.mode, "deterministic");
});

test("model_assisted with a disabled model provider THROWS — never silent fallback", () => {
  const r = new IntakeProviderRouter("model_assisted");
  assert.throws(() => r.provider(), /misconfigured|model_assisted/);
});

test("production_disabled refuses to extract", () => {
  const r = new IntakeProviderRouter("production_disabled");
  assert.throws(() => r.provider(), /disabled/);
});

test("validation drops an untrusted illegal (confirmed) fact status", () => {
  const raw: ProviderSuggestions = {
    contacts: [],
    deadlines: [],
    mentionedDocuments: [],
    facts: [
      {
        id: "f1",
        value: { factKey: "x", statementHe: "טענה", suggestedStatus: "confirmed" as never, speakerHe: "לקוח", supportingItemIds: [], conflictingItemIds: [] },
        extractionStatus: "extracted",
        confidence: { score: 0.5, band: "moderate", reasonHe: "" },
        span: { source: "story", start: 0, end: 4, quoteHe: STORY.slice(0, 4) },
        provenance: { method: "lexical_rule", ruleId: "x", extractedAt: NOW },
        needsConfirmation: true,
        missingInformation: false,
        requiresHumanReview: false,
      },
    ],
    providerId: "test-model",
    trusted: false,
  };
  const { suggestions, violations } = validateSuggestions(raw, { story: STORY, pasted: "", atISO: NOW });
  assert.equal(suggestions.facts.length, 0);
  assert.ok(violations.some((v) => v.kind === "illegal_status"));
});

test("validation nulls an untrusted invented date on an ambiguous deadline", () => {
  const raw: ProviderSuggestions = {
    contacts: [],
    facts: [],
    mentionedDocuments: [],
    deadlines: [
      {
        id: "d1",
        value: {
          labelHe: "מועד יחסי",
          kind: "unknown_ambiguous",
          dueAt: "2026-08-01T00:00:00+03:00", // invented
          timezone: "Asia/Jerusalem",
          sourceType: "estimated",
          deadlineConfidence: "unknown",
          basisHe: null,
          strict: false,
          ambiguityWarningHe: null,
        },
        extractionStatus: "extracted",
        confidence: { score: 0.4, band: "low", reasonHe: "" },
        span: { source: "story", start: 0, end: 4, quoteHe: STORY.slice(0, 4) },
        provenance: { method: "pattern", ruleId: "x", extractedAt: NOW },
        needsConfirmation: true,
        missingInformation: true,
        requiresHumanReview: true,
      },
    ],
    providerId: "test-model",
    trusted: false,
  };
  const { suggestions, violations } = validateSuggestions(raw, { story: STORY, pasted: "", atISO: NOW });
  assert.equal(suggestions.deadlines[0].value.dueAt, null);
  assert.ok(violations.some((v) => v.kind === "invented_date"));
});

test("validation drops an untrusted item whose span does not match the text", () => {
  const raw: ProviderSuggestions = {
    facts: [],
    deadlines: [],
    mentionedDocuments: [],
    contacts: [
      {
        id: "c1",
        value: { displayNameHe: "רוני", kind: "person", suggestedRole: "client", duplicatePossibility: false },
        extractionStatus: "extracted",
        confidence: { score: 0.5, band: "moderate", reasonHe: "" },
        span: { source: "story", start: 0, end: 5, quoteHe: "לא-קיים-בטקסט" },
        provenance: { method: "pattern", ruleId: "x", extractedAt: NOW },
        needsConfirmation: true,
        missingInformation: false,
        requiresHumanReview: false,
      },
    ],
    providerId: "test-model",
    trusted: false,
  };
  const { suggestions, violations } = validateSuggestions(raw, { story: STORY, pasted: "", atISO: NOW });
  assert.equal(suggestions.contacts.length, 0);
  assert.ok(violations.some((v) => v.kind === "span_mismatch"));
});

test("pipeline defaults to deterministic mode and still meets the safety spine", async () => {
  const d = await runIntakePipeline({ organizationId: ORG, createdBy: null, storyHe: STORY }, { nowISO: NOW });
  assert.ok(d.provenance.some((p) => p.ruleOrEngine.includes("deterministic-intake")));
  for (const f of d.facts) assert.notEqual(f.value.suggestedStatus, "confirmed");
});
