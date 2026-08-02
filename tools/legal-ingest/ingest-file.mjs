#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — offline file ingestion CLI.
 * Ingests an operator-provided PUBLIC file (no remote collector, no network).
 * TXT/HTML text is read directly; for PDF/DOCX pass an extracted text layer via
 * --text <file> (extraction backends are wired in the parser package).
 *
 * Usage:
 *   node tools/legal-ingest/ingest-file.mjs --source supreme_court --file ./judgment.txt --affirm-public
 *   node tools/legal-ingest/ingest-file.mjs --source supreme_court --file ./j.pdf --text ./j.txt --affirm-public --source-url https://...
 */
import { readFile } from "node:fs/promises";
import { ingestFile } from "../../src/modules/legal-ai-israel/ingest/pipeline.ts";

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const has = (name) => process.argv.includes(name);

async function main() {
  const source = arg("--source");
  const file = arg("--file");
  if (!source || !file) { console.error("usage: --source <code> --file <path> [--text <path>] --affirm-public [--source-url <url>]"); process.exit(1); }
  if (!has("--affirm-public")) { console.error("refusing: pass --affirm-public to affirm the file is public and lawfully obtained."); process.exit(3); }

  const bytes = new Uint8Array(await readFile(file));
  const textPath = arg("--text");
  const extractedText = textPath
    ? await readFile(textPath, "utf8")
    : new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  const report = ingestFile({
    sourceCode: source,
    filename: file.split("/").pop() ?? "document",
    bytes,
    extractedText,
    sourceUrl: arg("--source-url") ?? null,
    operatorAffirmsPublicAndLawful: true,
    sourceAccessApproved: has("--source-approved"),
    parserConfidence: Number(arg("--confidence") ?? "0.8"),
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.status === "unpublished_gate_failed") {
    console.log("\nGATE FAILED:", report.gate.failedGates.join(", "));
  }
  console.log("\nDocument is UNPUBLISHED pending review. Publishing is a separate admin action.");
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
