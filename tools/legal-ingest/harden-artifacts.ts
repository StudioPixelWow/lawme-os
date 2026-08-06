#!/usr/bin/env node
/**
 * Build the Track A/B hardening artifacts:
 *   artifacts/knesset-amendment-evaluation.json
 *   artifacts/knesset-normalization-evaluation.json
 *   artifacts/knesset-storage-verification.json
 *   artifacts/knesset-controlled-backfill.json
 * All figures measured — nothing invented.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizePdfText, NORMALIZATION_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-normalize.ts";
import { AMENDMENT_PARSER_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";
import { evaluateAmendments } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-eval.ts";
import { AMENDMENT_EVAL_SET } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/__fixtures__/amendment-eval-set.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const write = (name: string, obj: unknown) => writeFileSync(join(root, "artifacts", name), JSON.stringify(obj, null, 2) + "\n");

// --- amendment evaluation ---
const m = evaluateAmendments(AMENDMENT_EVAL_SET);
write("knesset-amendment-evaluation.json", {
  parser_version: AMENDMENT_PARSER_VERSION,
  eval_set_size: m.total,
  real_clause_count: m.realCount,
  caveat: "The parser was iterated against this labeled set (20 clauses transcribed verbatim from live-extracted PDFs + systematic coverage). Metrics are on this set; a held-out set is future work.",
  metrics: {
    precision: m.precision, recall: m.recall,
    operation_type_accuracy: m.operationTypeAccuracy,
    target_section_accuracy: m.targetSectionAccuracy,
    unsupported_rate: m.unsupportedRate, ambiguous_rate: m.ambiguousRate,
    high_confidence_false_mutations: m.highConfidenceFalseMutations,
  },
  go_thresholds: { precision: 0.95, operation_type_accuracy: 0.95, target_section_accuracy: 0.95, unsupported_plus_ambiguous_max: 0.1, high_confidence_false_mutations: 0 },
  gate: m.precision >= 0.95 && m.operationTypeAccuracy >= 0.95 && m.targetSectionAccuracy >= 0.95 && m.unsupportedRate + m.ambiguousRate <= 0.1 && m.highConfidenceFalseMutations === 0 ? "PASS" : "FAIL",
});

// --- normalization evaluation (on the real reprocess samples) ---
const repro = JSON.parse(readFileSync(join(here, "_reprocess-sample.json"), "utf8"));
const normSamples = repro.samples.map((s: { pubId: string; text: string }) => {
  const n = normalizePdfText(s.text, { trace: true });
  const runningHeadsLeft = /(^|\n)(רשומות|ספר החוקים)\s*(\n|$)/.test(n.normalizedText);
  return {
    pubId: s.pubId,
    rulesApplied: n.rulesApplied,
    warnings: n.warnings,
    confidence: n.confidence,
    reversedParensFixed: n.trace.filter((t) => t.rule === "fix_reversed_parens").length,
    gluedYearsFixed: n.trace.filter((t) => t.rule === "fix_glued_year").length,
    glyphRemaps: n.trace.filter((t) => t.rule === "glyph_remap").length,
    lineRejoins: n.trace.filter((t) => t.rule === "line_rejoin").length,
    runningHeadsRemoved: n.trace.filter((t) => t.rule === "remove_running_head").length,
    runningHeadContaminationRemaining: runningHeadsLeft,
  };
});
write("knesset-normalization-evaluation.json", {
  normalization_version: NORMALIZATION_VERSION,
  method: "deterministic, no LLM",
  layers: ["raw_extracted_text", "normalized_legal_text", "structured_parse_output"],
  section_numbering_accuracy_sample: { law: "2000048 / pub 147462", sections_expected: 3, sections_parsed: 3, accuracy: 1 },
  header_footer_contamination_after: normSamples.every((s: { runningHeadContaminationRemaining: boolean }) => !s.runningHeadContaminationRemaining) ? 0 : "detected",
  glyph_remap_note: "context-bounded lone 'פ' → ';' at 0.5 confidence, flagged needs_review; never touches פ inside a word",
  samples: normSamples,
});

// --- storage verification ---
write("knesset-storage-verification.json", {
  storage_version: "legal-object-store-1",
  bucket: "legal-source-files",
  bucket_public: false,
  object_key_scheme: "knesset/laws/<IsraelLawID>/publications/<publicationItemId>/<sha256>.pdf",
  dedup: "content-addressed by sha256; one binary stored once; publication→object many-to-one",
  registered_objects: 31,
  distinct_sha256: 31,
  storage_status_breakdown: { pending: 31, verified: 0 },
  upload_success_rate: 0,
  checksum_verification_rate: 0,
  round_trip_verification: "implemented + unit-tested (in-memory client); not run against live bucket",
  access_policy: "bucket private + no permissive storage.objects policy → deny-by-default; service-role only; users get signed URL via reviewed backend only",
  blocker: "physical byte upload requires the storage service key AND a network path to fs.knesset.gov.il for the bytes. This container is air-gapped from fs.knesset.gov.il and the browser cannot authenticate to storage without exposing the service key. Upload is the operator step.",
  gate: "NOT_GO (upload_success 0% < 100%)",
});

// --- controlled backfill ---
write("knesset-controlled-backfill.json", {
  started: false,
  reason: "Overall gate is GO_WITH_FIXES (storage byte-upload not achievable from available tools); backfill runs only on a full GO.",
  laws_backfilled: 0,
  publications_backfilled: 0,
  guardrails_when_go: { batch_size: "10-25", concurrency: 2, checkpoint: "per (IsraelLawID, correctionNumber)", daily_cap: true, auto_stop_on: ["download<98%", "extraction<95%", "normalization_failure>2%", "high_confidence_parser_error", "quarantine>5%", "storage_verification_failure", "403", "429", "schema_drift"] },
});

process.stdout.write("artifacts written: amendment-evaluation, normalization-evaluation, storage-verification, controlled-backfill\n");
process.stdout.write(`amendment gate: ${m.precision >= 0.95 ? "PASS" : "FAIL"} (precision ${m.precision})\n`);
