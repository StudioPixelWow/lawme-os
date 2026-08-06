#!/usr/bin/env node
/**
 * Reprocess real live-extracted amendment text through the NEW pipeline
 * (normalize → amendment-parser-v2) and emit idempotent SQL for the parsed
 * operations. Prints per-text normalization + parse metrics. Ground-truth
 * validation of Track A on the messiest real PDFs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizePdfText } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-normalize.ts";
import { parseAmendmentsV2, AMENDMENT_PARSER_VERSION } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-parser-v2.ts";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "_reprocess-sample.json"), "utf8"));
const q = (s: unknown): string => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const opTuples: string[] = [];
const report: Record<string, unknown>[] = [];

for (const s of data.samples) {
  const norm = normalizePdfText(s.text, { trace: true });
  const ops = parseAmendmentsV2(norm.normalizedText);
  const parsed = ops.filter((o) => o.status === "parsed").length;
  const needs = ops.filter((o) => o.status === "needs_review").length;
  const amb = ops.filter((o) => o.status === "ambiguous").length;
  const uns = ops.filter((o) => o.status === "unsupported").length;
  report.push({
    pubId: s.pubId, ops: ops.length, parsed, needs, ambiguous: amb, unsupported: uns,
    normalizationRules: norm.rulesApplied.length, normWarnings: norm.warnings.length,
    types: ops.map((o) => `${o.operationType}${o.targetSection ? `:${o.targetSection}` : ""}[${o.status}]`),
  });
  for (const op of ops) {
    if (op.status === "unsupported") continue;
    opTuples.push(`(${[
      q(`knesset:publication:${s.pubId}`), q(`knesset:${s.lawId}`), q(op.targetSection),
      q(op.operationType), q(op.status), op.confidence.toFixed(2), q(op.evidence),
      String(op.sourceSpan.start), String(op.sourceSpan.end), q(AMENDMENT_PARSER_VERSION),
    ].join(",")})`);
  }
}

const sql = [
  "insert into legalai.amendment_operations (publication_canonical_id,target_law_id,target_section,operation_type,status,confidence,evidence,source_span_start,source_span_end,parser_version) values",
  opTuples.join(",\n"),
  "on conflict (publication_canonical_id,source_span_start,operation_type) do nothing;",
].join("\n");

process.stdout.write(sql + "\n");
process.stderr.write(JSON.stringify(report, null, 2) + "\n");
