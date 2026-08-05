#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — Supreme Court BROWSER pilot (operator-run, approved).
 *
 * The site's search API is anti-bot protected against server-side calls, so we
 * do the ONLY lawful automated thing: drive a REAL browser through the PUBLIC
 * search, exactly as a person would — no login, no CAPTCHA solving, no stealth/
 * evasion, honest automation, polite pacing. It reads the public download links
 * the page renders and opens each judgment's HTML via genuine navigation, then
 * runs it through the ingestion pipeline. DRY-RUN: nothing is written to the DB.
 *
 * Uses your system Google Chrome via playwright-core (already a dependency).
 *
 * Usage:
 *   node tools/legal-ingest/pilot-supreme-browser.mjs --text ערעור --limit 10
 *   node tools/legal-ingest/pilot-supreme-browser.mjs --text חוזה --limit 20 --headless
 *
 * If it prints an anti-bot block, STOP — we do not evade it. Tell Claude and
 * we'll pivot to an official data-feed request.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parseVerdictRefs } from "../../src/modules/legal-ai-israel/collector/adapters/supreme-court.ts";
import { buildIngestArtifacts } from "../../src/modules/legal-ai-israel/ingest/pipeline.ts";
import { extractCitations } from "../../src/modules/legal-ai-israel/citation/extract.ts";
import { parseCaseNumber } from "../../src/modules/legal-ai-israel/citation/case-number.ts";
import { persistJudgment } from "../../src/modules/legal-ai-israel/persist/persist.ts";

const BASE = "https://supremedecisions.court.gov.il";
function arg(n, d) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; }
const has = (n) => process.argv.includes(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ");
const isBlock = (h) => /חסימת\s*בקשה|לא\s*מורשית/.test(h);

const HE_MONTHS = { "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6, "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12 };
const pad = (n) => String(n).padStart(2, "0");

/** Best-effort metadata from the judgment text. Unknown stays null — never invented. */
function deriveMetadata(text) {
  // Case number: first citation whose case-number fully parses.
  let caseNumberRaw = null, caseNumberNormalized = null, proceedingType = null;
  for (const c of extractCitations(text)) {
    if (c.normalized && c.normalized.proceedingCode) {
      caseNumberRaw = c.raw.replace(/\s+/g, " ").trim();
      caseNumberNormalized = c.normalized.normalized;
      proceedingType = c.normalized.proceedingTypeCanonical;
      break;
    }
  }
  // Document type: פסק-דין vs החלטה (default: null if neither clearly present).
  const documentType = /פסק[\s-]*דין/.test(text) ? "פסק-דין" : (/\bהחלטה\b/.test(text) ? "החלטה" : "unknown");
  // Parties: first "X נ' Y" on an early line.
  let partiesDisplay = null;
  const pm = text.match(/([^\n]{2,120}?)\s+נ['׳]\s+([^\n]{2,120})/);
  if (pm) partiesDisplay = `${pm[1].trim()} נ' ${pm[2].trim()}`.slice(0, 240);
  // Decision date: Hebrew "05 אוגוסט 2026" or numeric d.m.yyyy.
  let decisionDate = null;
  const hm = text.match(/(\d{1,2})\s+([א-ת]+)\s+(\d{4})/);
  if (hm && HE_MONTHS[hm[2]]) decisionDate = `${hm[3]}-${pad(HE_MONTHS[hm[2]])}-${pad(Number(hm[1]))}`;
  if (!decisionDate) {
    const nm = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (nm) decisionDate = `${nm[3]}-${pad(Number(nm[2]))}-${pad(Number(nm[1]))}`;
  }
  return {
    caseNumberRaw, caseNumberNormalized, courtName: "בית המשפט העליון", courtLevel: "supreme",
    proceedingType, decisionDate, documentType, title: null, partiesDisplay, publicationRestrictions: [],
  };
}

async function getChromium() {
  for (const m of ["playwright", "playwright-core"]) {
    try { const pw = await import(m); return pw.chromium ?? pw.default?.chromium; } catch { /* next */ }
  }
  throw new Error("Playwright not found. `playwright-core` is a dependency; ensure Google Chrome is installed.");
}

async function launch(chromium) {
  // Prefer the operator's real Google Chrome (most genuine). Fall back to a
  // Playwright-managed Chromium if Chrome channel isn't available.
  try { return await chromium.launch({ channel: "chrome", headless: has("--headless") }); }
  catch { return await chromium.launch({ headless: has("--headless") }); }
}

async function main() {
  const text = arg("--text", "ערעור");
  const limit = Math.min(Number(arg("--limit", "10")), 100);
  const persist = has("--persist");
  let store = null;
  if (persist) {
    // Lazy import: only pull in @supabase/supabase-js + env when actually writing.
    const { createSupabaseLegalaiStore } = await import("../../src/modules/legal-ai-israel/persist/supabase-store.ts");
    store = createSupabaseLegalaiStore();
    console.log("PERSIST MODE: writing to legalai.* (service-role, dev). Ensure creds point at DEV only.");
  }
  const chromium = await getChromium();
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ locale: "he-IL" });
  const page = await ctx.newPage();

  console.log("== Supreme Court BROWSER pilot ==");
  console.log(`search text: "${text}" | limit: ${limit}`);
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sleep(2500);
    if (isBlock(await page.content())) { console.log("BLOCKED at load — anti-bot. Not evading. Stop."); return; }

    // Fill the public free-text box and run the search, like a person.
    await page.getByPlaceholder("הכל").first().fill(text);
    await sleep(1200);
    await page.getByRole("button", { name: "חיפוש" }).first().click();

    // Wait for the results (download links) to render.
    await page.waitForSelector('a[href*="Home/Download"]', { timeout: 30000 }).catch(() => {});
    await sleep(2000);
    const resultsHtml = await page.content();
    if (isBlock(resultsHtml)) { console.log("BLOCKED at results — anti-bot. Not evading. Stop."); return; }

    const refs = parseVerdictRefs(resultsHtml);
    console.log(`judgments found on results page: ${refs.length}`);
    if (refs.length === 0) { console.log("no judgments parsed — widen the search text."); return; }

    await mkdir("pilot-out", { recursive: true });
    const targets = refs.slice(0, limit);
    let downloaded = 0, parsed = 0, gatePass = 0, totalCitations = 0;
    let saved = 0, dupSkipped = 0, restricted = 0;
    const sampleCases = [];

    for (const ref of targets) {
      await sleep(4000); // polite pacing
      const url = `${BASE}/Home/Download?path=${encodeURIComponent(ref.path)}&fileName=${ref.fileName}&type=2`;
      try {
        // Genuine navigation to the public HTML judgment (browser session).
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        const html = await page.content();
        if (isBlock(html)) { console.log("  ✗ blocked on document fetch — stopping (no evasion)."); break; }
        const text2 = stripHtml(html);
        const bytes = new TextEncoder().encode(html);
        const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
        await writeFile(`pilot-out/${sha.slice(0, 16)}.html`, html);
        downloaded += 1;

        const artifacts = buildIngestArtifacts({
          sourceCode: "supreme_court", filename: `${sha.slice(0, 16)}.html`, bytes,
          extractedText: text2, sourceUrl: url,
          operatorAffirmsPublicAndLawful: true, sourceAccessApproved: true, parserConfidence: 0.8,
        });
        const report = artifacts.report;
        parsed += 1;
        if (report.status.startsWith("unpublished")) gatePass += report.gate.publishable ? 1 : 0;
        totalCitations += report.citationCount;
        const cites = extractCitations(text2);
        const first = cites.find((c) => parseCaseNumber(c.raw));
        if (first && sampleCases.length < 8) sampleCases.push(first.normalized.normalized);

        let persistNote = "";
        if (persist && store) {
          const res = await persistJudgment(store, {
            sourceCode: "supreme_court", sourceUrl: url, mimeType: "text/html",
            bytes, artifacts, metadata: deriveMetadata(text2),
          });
          if (res.reason === "new") { saved += 1; persistNote = ` → SAVED ${String(res.documentId).slice(0, 8)}`; }
          else if (res.reason === "duplicate") { dupSkipped += 1; persistNote = " → dup (skip)"; }
          else { restricted += 1; persistNote = " → RESTRICTED (not stored)"; }
        }
        console.log(`  ✓ ${sha.slice(0, 12)} | sections=${report.sectionCount} citations=${report.citationCount} statutes=${report.statuteCount} status=${report.status}${persistNote}`);
      } catch (e) {
        console.log(`  ✗ failed: ${String(e.message ?? e)}`);
      }
    }

    if (persist) {
      console.log(`\n== summary (PERSISTED to legalai.*, dev) ==`);
      console.log(`downloaded: ${downloaded} | parsed: ${parsed} | gate-clean: ${gatePass}`);
      console.log(`SAVED (new): ${saved} | duplicates skipped: ${dupSkipped} | restricted (refused): ${restricted}`);
      console.log(`total case-citations extracted: ${totalCitations}`);
      console.log(`sample cited case numbers: ${sampleCases.join(", ") || "(none)"}`);
      console.log(`documents are UNPUBLISHED (status ingested_unverified). Publishing is a separate admin action.`);
    } else {
      console.log(`\n== summary (DRY-RUN, nothing written to DB) ==`);
      console.log(`downloaded: ${downloaded} | parsed: ${parsed} | gate-clean: ${gatePass}`);
      console.log(`total case-citations extracted: ${totalCitations}`);
      console.log(`sample cited case numbers: ${sampleCases.join(", ") || "(none)"}`);
      console.log(`originals saved under ./pilot-out/`);
      console.log(`\nRe-run with --persist to write into legalai.* + Storage (dev, service-role).`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
