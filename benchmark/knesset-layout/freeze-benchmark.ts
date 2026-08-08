/**
 * LAW ME layout benchmark — scaffold + freeze tool.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --scaffold
 *     Creates one empty ground-truth/<id>.json per manifest entry (for the human
 *     annotator to fill). Never overwrites an existing (filled) file.
 *
 *   node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --freeze --stamp <ISO-DATE>
 *     Verifies every ground-truth file is present and non-empty, then writes the
 *     immutable FROZEN-v1.json = sha-256 of the manifest + each ground-truth file.
 *     After freeze, the benchmark must not change; new pages go into a new version.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const DIR = "benchmark/knesset-layout";
const GT = `${DIR}/ground-truth`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as { entries: { id: string; stratum_tentative: string; publication_item_id: string; page_number: number; source_url: string }[] };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const mode = process.argv.includes("--freeze") ? "freeze" : process.argv.includes("--scaffold") ? "scaffold" : "help";

if (mode === "scaffold") {
  mkdirSync(GT, { recursive: true });
  let created = 0;
  for (const e of manifest.entries) {
    const path = `${GT}/${e.id}.json`;
    if (existsSync(path)) continue;
    const tpl = {
      id: e.id,
      _source_pdf: e.source_url,
      _page_number: e.page_number,
      confirmed_stratum: "",
      reading_order_text: "",
      regions: [],
      marginal_captions: [],
      section_boundaries: [],
      page_alignment: { printed_page_label: "", gazette_page: "" },
      hebrew_fidelity_notes: "",
      annotator: "", reviewed_by: "", confidence: "",
    };
    writeFileSync(path, JSON.stringify(tpl, null, 2));
    created += 1;
  }
  process.stdout.write(`scaffolded ${created} empty ground-truth templates (of ${manifest.entries.length})\n`);
} else if (mode === "freeze") {
  const stamp = process.argv[process.argv.indexOf("--stamp") + 1] ?? "";
  if (!stamp || stamp.startsWith("--")) { process.stderr.write("freeze requires --stamp <ISO-DATE>\n"); process.exit(2); }
  const missing: string[] = [];
  const hashes: Record<string, string> = {};
  const byStratum: Record<string, { total: number; approved: number; unresolved: number }> = {};
  for (const e of manifest.entries) {
    const path = `${GT}/${e.id}.json`;
    if (!existsSync(path)) { missing.push(`${e.id} (no file)`); continue; }
    const gt = JSON.parse(readFileSync(path, "utf8"));
    const okState = gt.state === "APPROVED" || gt.state === "UNRESOLVED"; // NEEDS_CORRECTION/blank block freeze
    // UNRESOLVED needs no transcription (genuinely undeterminable ground truth); APPROVED does.
    const okText = gt.state === "UNRESOLVED" || (typeof gt.reading_order_text === "string" && gt.reading_order_text.length > 0);
    if (!gt.confirmed_stratum || !String(gt.reviewed_by ?? "").trim() || !okState || !okText) { missing.push(`${e.id} (state=${gt.state ?? "none"} reviewed=${!!String(gt.reviewed_by ?? "").trim()})`); continue; }
    const s = gt.confirmed_stratum as string;
    byStratum[s] = byStratum[s] ?? { total: 0, approved: 0, unresolved: 0 };
    byStratum[s].total += 1; if (gt.state === "APPROVED") byStratum[s].approved += 1; else byStratum[s].unresolved += 1;
    hashes[e.id] = sha(JSON.stringify(gt));
  }
  if (missing.length) { process.stderr.write(`CANNOT FREEZE — ${missing.length}/${manifest.entries.length} not yet reviewed/approved:\n${missing.slice(0, 40).join("\n")}${missing.length > 40 ? "\n…" : ""}\n`); process.exit(1); }
  const extra = readdirSync(GT).filter((f) => f.endsWith(".json") && !manifest.entries.some((e) => `${e.id}.json` === f));
  const frozen = {
    benchmark: "knesset-layout", version: "v1", frozen_at: stamp, status: "FROZEN — immutable",
    page_count: manifest.entries.length,
    reviewed: manifest.entries.length,
    by_stratum: byStratum,
    manifest_sha256: sha(readFileSync(`${DIR}/manifest-v1.json`, "utf8")),
    ground_truth_sha256: hashes,
    combined_sha256: sha(JSON.stringify(hashes)),
    note: "Any change to a page or its ground truth requires a NEW version (v2), never editing v1.",
    extra_files_ignored: extra,
  };
  writeFileSync(`${DIR}/FROZEN-v1.json`, JSON.stringify(frozen, null, 2));
  process.stdout.write(`FROZEN v1 — ${manifest.entries.length} pages, all reviewed.\ncombined_sha256: ${frozen.combined_sha256}\nby stratum: ${JSON.stringify(byStratum)}\nSTOP: do not run Phase 2 evaluation until this file is committed & approved.\n`);
} else {
  process.stdout.write("usage: --scaffold | --freeze --stamp <ISO-DATE>\n");
}
