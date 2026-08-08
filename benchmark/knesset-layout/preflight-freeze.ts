/**
 * LAW ME benchmark — PRE-FLIGHT freeze validator.
 *
 *   preflight-freeze.ts
 *
 * Runs EXACTLY the freeze validations (annotation-core.freezeIssues, the same
 * gate freeze-benchmark.ts uses) but writes NOTHING and freezes NOTHING. It
 * reports whether the benchmark is READY TO FREEZE, and if not, groups the
 * remaining reasons so the team can see what's left without repeatedly
 * attempting a real freeze.
 *
 * Exit codes: 0 = READY TO FREEZE, 1 = NOT READY. BENCH_DIR overrides the dir
 * for tests only.
 */
import {
  loadManifest, loadGroundTruth, freezeIssues, validatePage, hasConflict,
  FINAL_STATES, type ManifestEntry, type GroundTruth,
} from "./annotation-core.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const manifest = loadManifest(DIR);

const groups: Record<string, string[]> = {
  missing_annotation: [],
  incomplete_fields: [],
  invalid_state: [],
  missing_second_review: [],
  reviewer_equals_annotator: [],
  conflicts_unresolved: [],
  schema_errors: [],
  missing_source_artifact: [],
};

let eligible = 0;
for (const e of manifest.entries as ManifestEntry[]) {
  const gt = loadGroundTruth(DIR, e.id);
  const issues = freezeIssues(gt, e);
  if (issues.length === 0) { eligible += 1; continue; }

  if (!gt) { groups.missing_annotation.push(`${e.id} (no file)`); continue; }
  const g = gt as GroundTruth;
  const state = g.state ?? "UNSTARTED";

  if (state === "UNSTARTED" || state === "IN_PROGRESS") groups.missing_annotation.push(`${e.id} (state=${state})`);
  if (state === "NEEDS_CORRECTION") groups.invalid_state.push(`${e.id} (NEEDS_CORRECTION)`);
  if (!(FINAL_STATES as string[]).includes(state) && state !== "UNSTARTED" && state !== "IN_PROGRESS" && state !== "NEEDS_CORRECTION")
    groups.invalid_state.push(`${e.id} (state=${state})`);
  if (hasConflict(g)) groups.conflicts_unresolved.push(`${e.id}`);
  if (!String(g.reviewed_by ?? "").trim() || !String(g.reviewed_at ?? "").trim())
    groups.missing_second_review.push(`${e.id}`);
  if (String(g.reviewed_by ?? "").trim() && String(g.reviewed_by).trim() === String(g.annotator ?? "").trim())
    groups.reviewer_equals_annotator.push(`${e.id}`);

  const v = validatePage(g, e);
  for (const err of v.errors) {
    if (/source_document_id|source_page_number|id mismatch/.test(err)) groups.missing_source_artifact.push(`${e.id}: ${err}`);
    else groups.incomplete_fields.push(`${e.id}: ${err}`);
  }
  // anything freezeIssues flagged that we didn't bucket above → schema_errors
  const bucketed = new Set([...Object.values(groups).flat()]);
  for (const iss of issues) {
    const short = iss.replace(/^bench-\d+:\s*/, `${e.id}: `);
    if (![...bucketed].some((b) => b.includes(short.replace(`${e.id}: `, "")))) {
      if (!groups.schema_errors.includes(short) && !bucketed.has(short)) groups.schema_errors.push(short);
    }
  }
}

const total = manifest.entries.length;
const remaining = total - eligible;
const out: string[] = [];
out.push(`PRE-FLIGHT — benchmark knesset-layout v1`);
out.push(`freeze-eligible: ${eligible}/${total}`);
for (const [k, v] of Object.entries(groups)) {
  const uniq = [...new Set(v)];
  if (!uniq.length) continue;
  out.push(`\n${k} (${uniq.length}):`);
  out.push(uniq.slice(0, 40).map((x) => `  - ${x}`).join("\n"));
  if (uniq.length > 40) out.push(`  … (+${uniq.length - 40} more)`);
}

if (remaining === 0) {
  out.unshift(`READY TO FREEZE ✓  (${total}/${total} eligible)\nRun: node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --freeze --stamp <YYYY-MM-DD>\n`);
  process.stdout.write(out.join("\n") + "\n");
  process.exit(0);
} else {
  out.unshift(`NOT READY — ${remaining}/${total} page(s) still incomplete.\n`);
  process.stdout.write(out.join("\n") + "\n");
  process.exit(1);
}
