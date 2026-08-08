/**
 * LAW ME layout benchmark — scaffold + freeze tool.
 *
 *   freeze-benchmark.ts --scaffold
 *     Creates one empty ground-truth/<id>.json per manifest entry (annotator
 *     fills it). Never overwrites an existing (filled) file.
 *
 *   freeze-benchmark.ts --freeze --stamp <ISO-DATE>
 *     Verifies EVERY page is freeze-eligible via the shared annotation-core gate
 *     (final state, second-reviewed by a distinct person, no conflicts, fully
 *     valid), then writes the immutable FROZEN-v1.json (sha-256 of the manifest
 *     + each ground-truth file, counts, per-stratum, reviewer stats).
 *
 * Freeze strictness is defined ONCE, in annotation-core.freezeIssues(). This
 * file never relaxes it. BENCH_DIR overrides the benchmark directory for
 * isolated tests only; production uses the default path.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import {
  sha, loadManifest, loadGroundTruth, freezeIssues, FINAL_STATES,
  effectiveStratum, type ManifestEntry, type GroundTruth,
} from "./annotation-core.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const GT = `${DIR}/ground-truth`;
const manifest = loadManifest(DIR);
const mode = process.argv.includes("--freeze") ? "freeze" : process.argv.includes("--scaffold") ? "scaffold" : "help";

if (mode === "scaffold") {
  mkdirSync(GT, { recursive: true });
  let created = 0;
  for (const e of manifest.entries) {
    const path = `${GT}/${e.id}.json`;
    if (existsSync(path)) continue;
    const tpl: GroundTruth = {
      id: e.id,
      source_document_id: e.publication_item_id,
      source_page_number: e.page_number,
      stratum_manifest: e.stratum_tentative,
      confirmed_stratum: "",
      reading_order_text: "",
      regions: [],
      marginal_captions: [],
      section_boundaries: [],
      page_alignment: { printed_page_label: "", gazette_page: "" },
      hebrew_fidelity_notes: "",
      unresolved_reason: "",
      state: "UNSTARTED",
      annotator: "", annotated_at: "",
      reviewed_by: "", reviewed_at: "", review_note: "",
      conflict: null,
      revision: 0,
    };
    writeFileSync(path, JSON.stringify(tpl, null, 2));
    created += 1;
  }
  process.stdout.write(`scaffolded ${created} empty ground-truth templates (of ${manifest.entries.length})\n`);
} else if (mode === "freeze") {
  const stamp = process.argv[process.argv.indexOf("--stamp") + 1] ?? "";
  if (!stamp || stamp.startsWith("--")) { process.stderr.write("freeze requires --stamp <ISO-DATE>\n"); process.exit(2); }

  const blocking: string[] = [];
  const hashes: Record<string, string> = {};
  const byStratum: Record<string, { total: number; approved: number; unresolved: number }> = {};
  const reviewers = new Map<string, number>();
  let approved = 0, unresolved = 0;

  for (const e of manifest.entries as ManifestEntry[]) {
    const gt = loadGroundTruth(DIR, e.id);
    const issues = freezeIssues(gt, e);
    if (issues.length) { blocking.push(...issues); continue; }
    const g = gt as GroundTruth;
    const s = effectiveStratum(g, e);
    byStratum[s] = byStratum[s] ?? { total: 0, approved: 0, unresolved: 0 };
    byStratum[s].total += 1;
    if (g.state === "APPROVED") { byStratum[s].approved += 1; approved += 1; }
    else { byStratum[s].unresolved += 1; unresolved += 1; }
    const rev = String(g.reviewed_by ?? "").trim();
    reviewers.set(rev, (reviewers.get(rev) ?? 0) + 1);
    hashes[e.id] = sha(readFileSync(`${GT}/${e.id}.json`, "utf8"));
  }

  if (blocking.length) {
    process.stderr.write(`CANNOT FREEZE — ${blocking.length} blocking issue(s) across ${manifest.entries.length} pages:\n${blocking.slice(0, 60).join("\n")}${blocking.length > 60 ? `\n… (+${blocking.length - 60} more)` : ""}\n`);
    process.exit(1);
  }

  const extra = readdirSync(GT).filter((f) => f.endsWith(".json") && !manifest.entries.some((e) => `${e.id}.json` === f));
  const frozen = {
    benchmark: "knesset-layout", version: "v1", frozen_at: stamp, status: "FROZEN — immutable",
    page_count: manifest.entries.length,
    reviewed: manifest.entries.length,
    approved, unresolved,
    by_stratum: byStratum,
    reviewers: Object.fromEntries([...reviewers.entries()].sort()),
    final_states: FINAL_STATES,
    manifest_sha256: sha(readFileSync(`${DIR}/manifest-v1.json`, "utf8")),
    ground_truth_sha256: hashes,
    combined_sha256: sha(JSON.stringify(hashes)),
    note: "Any change to a page or its ground truth requires a NEW version (v2), never editing v1. Scorer (score-benchmark.ts) may run only while this file exists.",
    extra_files_ignored: extra,
  };
  writeFileSync(`${DIR}/FROZEN-v1.json`, JSON.stringify(frozen, null, 2));
  process.stdout.write(
    `FROZEN v1 — ${manifest.entries.length} pages, all second-reviewed.\n` +
    `approved=${approved} unresolved=${unresolved}\n` +
    `combined_sha256: ${frozen.combined_sha256}\n` +
    `by stratum: ${JSON.stringify(byStratum)}\n` +
    `reviewers: ${JSON.stringify(frozen.reviewers)}\n` +
    `STOP: do not run Phase 2 evaluation until this file is committed & approved.\n`,
  );
} else {
  process.stdout.write("usage: --scaffold | --freeze --stamp <ISO-DATE>\n");
}
