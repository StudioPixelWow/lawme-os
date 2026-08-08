/**
 * LAW ME benchmark — annotation CHECKPOINT (safety backup, NOT a freeze).
 *
 *   checkpoint-annotations.ts
 *
 * Validates the current ground-truth files, summarizes progress, and writes a
 * timestamped hash manifest so annotation work can be backed up / diffed at any
 * point. It does NOT freeze, does NOT create FROZEN-v1.json, and marks nothing
 * immutable. Safe to run repeatedly, mid-annotation.
 *
 * Output: checkpoints/ANNOTATION-CHECKPOINT-<stamp>.json with per-file sha256,
 * a combined hash, counts, and validation errors. Provide the stamp with
 * --stamp <ISO> (this environment has no wall clock); if omitted, uses "manual".
 * BENCH_DIR overrides the dir for tests only.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import {
  sha, loadManifest, loadGroundTruth, validatePage, computeCounts, hasConflict,
  type ManifestEntry, type GroundTruth,
} from "./annotation-core.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const stampIdx = process.argv.indexOf("--stamp");
const stamp = (stampIdx >= 0 ? process.argv[stampIdx + 1] : "") || "manual";
const manifest = loadManifest(DIR);

const byId = new Map<string, GroundTruth | null>();
const hashes: Record<string, string> = {};
const validationErrors: Record<string, string[]> = {};
let filePresent = 0;

for (const e of manifest.entries as ManifestEntry[]) {
  const gt = loadGroundTruth(DIR, e.id);
  byId.set(e.id, gt);
  if (gt) {
    filePresent += 1;
    const raw = readFileSync(`${DIR}/ground-truth/${e.id}.json`, "utf8");
    hashes[e.id] = sha(raw);
    const v = validatePage(gt, e);
    if (v.errors.length) validationErrors[e.id] = v.errors;
  }
}

const dash = computeCounts(byId, manifest);
const conflicts = manifest.entries.filter((e) => { const g = byId.get(e.id); return g && hasConflict(g); }).map((e) => e.id);

const checkpoint = {
  kind: "ANNOTATION-CHECKPOINT",
  benchmark: "knesset-layout", version: "v1",
  note: "SAFETY BACKUP — NOT the official freeze. Nothing here is immutable.",
  stamp,
  files_present: filePresent,
  total_pages: manifest.entries.length,
  counts: dash.overall,
  by_stratum: dash.by_stratum,
  conflicts,
  pages_with_validation_errors: Object.keys(validationErrors).length,
  validation_errors: validationErrors,
  ground_truth_sha256: hashes,
  combined_sha256: sha(JSON.stringify(hashes)),
};

const outDir = `${DIR}/checkpoints`;
mkdirSync(outDir, { recursive: true });
const path = `${outDir}/ANNOTATION-CHECKPOINT-${String(stamp).replace(/[:]/g, "")}.json`;
if (existsSync(path)) process.stderr.write(`(overwriting existing checkpoint for stamp ${stamp})\n`);
writeFileSync(path, JSON.stringify(checkpoint, null, 2));

process.stdout.write(
  `checkpoint written: ${path}\n` +
  `files present: ${filePresent}/${manifest.entries.length}\n` +
  `ready_to_freeze: ${dash.overall.ready_to_freeze}  approved: ${dash.overall.approved}  unresolved: ${dash.overall.unresolved}  conflicts: ${conflicts.length}\n` +
  `pages with validation errors: ${Object.keys(validationErrors).length}\n` +
  `combined_sha256: ${checkpoint.combined_sha256}\n` +
  `NOTE: this is a backup, not a freeze.\n`,
);
