#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — Supreme Court PILOT (operator-run).
 *
 * Runs on the operator's network. Discovers Supreme Court judgments in a small
 * date window (public SearchVerdicts, no login/CAPTCHA), downloads up to N as
 * HTML, and runs each through the ingestion pipeline (normalize → segment →
 * extract citations/statutes → quality gates). DRY-RUN: nothing is written to
 * the database; originals are saved under ./pilot-out/ so you can inspect them.
 *
 * Polite: 1 request / 4s. Hard cap 100 documents (Phase-3 pilot rule).
 *
 * Usage:
 *   node tools/legal-ingest/pilot-supreme-court.mjs --days 7 --limit 20
 *   node tools/legal-ingest/pilot-supreme-court.mjs --from 2026-07-01 --to 2026-07-08 --limit 30
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createSupremeCourtDiscoveryCollector } from "../../src/modules/legal-ai-israel/collector/adapters/supreme-court.ts";
import { ingestFile } from "../../src/modules/legal-ai-israel/ingest/pipeline.ts";
import { extractCitations } from "../../src/modules/legal-ai-israel/citation/extract.ts";
import { parseCaseNumber } from "../../src/modules/legal-ai-israel/citation/case-number.ts";

function arg(n, d) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; }
const HARD_CAP = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ");

function windowISO() {
  const from = arg("--from", null), to = arg("--to", null);
  if (from && to) return [`${from}T00:00:00.000Z`, `${to}T23:59:59.000Z`];
  // default: last N days ending today (dates passed explicitly so no Date.now surprises)
  const days = Number(arg("--days", "7"));
  const now = new Date();
  const end = now.toISOString();
  const start = new Date(now.getTime() - days * 86400000).toISOString();
  return [start, end];
}

async function main() {
  const limit = Math.min(Number(arg("--limit", "20")), HARD_CAP);
  const [fromISO, toISO] = windowISO();
  const collector = createSupremeCourtDiscoveryCollector();

  console.log(`== Supreme Court pilot ==`);
  console.log(`window: ${fromISO} .. ${toISO} | limit: ${limit}`);
  const audit = await collector.audit();
  console.log(`audit: ${audit.decision} (${audit.notesHe})`);
  if (audit.decision === "NO_GO") { console.log("NO_GO — stopping."); return; }

  await sleep(4000);
  const batch = await collector.discover(`${fromISO}|${toISO}`);
  console.log(`discovered judgments in window: ${batch.items.length} (${batch.windowLabel})`);
  if (batch.items.length === 0) { console.log("no judgments in this window — try a wider --days."); return; }

  await mkdir("pilot-out", { recursive: true });
  const targets = batch.items.slice(0, limit);
  let downloaded = 0, parsed = 0, gatePass = 0, totalCitations = 0;
  const sampleCases = [];

  for (const item of targets) {
    await sleep(4000); // polite pacing
    try {
      const doc = await collector.download(item);
      downloaded += 1;
      const html = new TextDecoder("utf-8", { fatal: false }).decode(doc.bytes);
      const text = stripHtml(html);
      await writeFile(`pilot-out/${doc.sha256.slice(0, 16)}.html`, html);

      const report = ingestFile({
        sourceCode: "supreme_court", filename: `${doc.sha256.slice(0, 16)}.html`, bytes: doc.bytes,
        extractedText: text, sourceUrl: doc.sourceUrl,
        operatorAffirmsPublicAndLawful: true, sourceAccessApproved: true, parserConfidence: 0.8,
      });
      parsed += 1;
      if (report.gate.publishable || report.status === "unpublished_pending_review") gatePass += 1;
      totalCitations += report.citationCount;
      // try to surface a case number from the document text
      const cites = extractCitations(text);
      const first = cites.find((c) => parseCaseNumber(c.raw));
      if (first && sampleCases.length < 8) sampleCases.push(first.normalized.normalized);
      console.log(`  ✓ ${doc.sha256.slice(0, 12)} | sections=${report.sectionCount} citations=${report.citationCount} statutes=${report.statuteCount} status=${report.status}`);
    } catch (e) {
      console.log(`  ✗ download/parse failed: ${String(e.message ?? e)}`);
    }
  }

  console.log(`\n== summary (DRY-RUN, nothing written to DB) ==`);
  console.log(`downloaded: ${downloaded} | parsed: ${parsed} | passed-gates: ${gatePass}`);
  console.log(`total case-citations extracted: ${totalCitations}`);
  console.log(`sample cited case numbers: ${sampleCases.join(", ") || "(none surfaced)"}`);
  console.log(`originals saved under ./pilot-out/`);
  console.log(`\nIf this looks right, tell Claude and he'll wire the persistence step`);
  console.log(`(write these into the legalai.* tables + storage) as a separate action.`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
