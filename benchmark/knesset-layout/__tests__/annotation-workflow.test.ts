/**
 * Deterministic tests for the v2 annotation workspace + freeze pipeline.
 * Uses SYNTHETIC fixture pages only — never the real 108 benchmark annotations.
 * Covers: validation, state transitions, reviewer≠annotator, review
 * invalidation, conflict, unresolved-reason/approved-transcription rules,
 * counts + confirmed-stratum, queue navigation, checkpoint, preflight, and
 * freeze (refuses incomplete / accepts a complete synthetic fixture).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validatePage, freezeIssues, changedFields, reviewInvalidated, hasConflict,
  computeCounts, nextIndex, type GroundTruth, type ManifestEntry,
} from "../annotation-core.ts";

const HERE = new URL(".", import.meta.url).pathname;
const TOOL = (n: string) => join(HERE, "..", n);

function synthManifest(n = 3): { entries: ManifestEntry[] } {
  return {
    entries: Array.from({ length: n }, (_, k) => ({
      id: `bench-${String(k + 1).padStart(3, "0")}`,
      stratum_tentative: "old_font",
      publication_item_id: `9${k}`,
      page_number: k + 1,
      year: 1950 + k,
      source_url: `https://example/${k}`,
    })),
  };
}

/** A structurally complete annotator record, ready for review. */
function completeAnnotation(id: string, e: ManifestEntry, annotator = "alice"): GroundTruth {
  return {
    id,
    source_document_id: e.publication_item_id,
    source_page_number: e.page_number,
    confirmed_stratum: "old_font",
    reading_order_text: "סעיף 1 שלום עולם זהו טקסט לבדיקה",
    regions: [{ id: "r1", role: "body", column: 0, order: 1, desc: "body" }],
    marginal_captions: [],
    section_boundaries: ["1"],
    page_alignment: { printed_page_label: "364", gazette_page: "100" },
    hebrew_fidelity_notes: "no issues",
    annotator,
    annotated_at: "2026-08-08T10:00:00.000Z",
    state: "READY_FOR_REVIEW",
  };
}

function setupDir(n = 3): { dir: string; manifest: { entries: ManifestEntry[] } } {
  const dir = mkdtempSync(join(tmpdir(), "bench-"));
  const manifest = synthManifest(n);
  writeFileSync(join(dir, "manifest-v1.json"), JSON.stringify(manifest, null, 2));
  mkdirSync(join(dir, "ground-truth"), { recursive: true });
  return { dir, manifest };
}
const writeGt = (dir: string, gt: GroundTruth) => writeFileSync(join(dir, "ground-truth", `${gt.id}.json`), JSON.stringify(gt, null, 2));
const runTool = (name: string, dir: string, args: string[] = []) => {
  try {
    const out = execFileSync("node", ["--experimental-strip-types", TOOL(name), ...args], { env: { ...process.env, BENCH_DIR: dir }, encoding: "utf8" });
    return { code: 0, out };
  } catch (e: any) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};

// ── validation (pure) ────────────────────────────────────────────────────────
test("validatePage: UNSTARTED empty page is not gated (no errors)", () => {
  const v = validatePage({ id: "bench-001", state: "UNSTARTED" });
  assert.equal(v.errors.length, 0);
});
test("validatePage: APPROVED requires a non-empty transcription", () => {
  const v = validatePage({ id: "bench-001", state: "APPROVED", reading_order_text: "" });
  assert.ok(v.errors.some((e) => /non-empty reading_order_text/.test(e)));
});
test("validatePage: duplicate region ids is an error", () => {
  const v = validatePage({ id: "x", state: "IN_PROGRESS", regions: [{ id: "r1", role: "body" }, { id: "r1", role: "caption" }] });
  assert.ok(v.errors.some((e) => /duplicate region id/.test(e)));
});
test("validatePage: bbox out of [0,1] and degenerate bbox are errors", () => {
  assert.ok(validatePage({ id: "x", regions: [{ id: "r1", role: "body", bbox: [0, 0, 2, 1] }] }).errors.some((e) => /out of normalized/.test(e)));
  assert.ok(validatePage({ id: "x", regions: [{ id: "r1", role: "body", bbox: [0.5, 0.5, 0.5, 0.6] }] }).errors.some((e) => /degenerate/.test(e)));
});
test("validatePage: reviewer==annotator and reviewed_at without reviewed_by are errors", () => {
  const v = validatePage({ id: "x", annotator: "a", reviewed_by: "a", reviewed_at: "t" });
  assert.ok(v.errors.some((e) => /reviewer must not be the same/.test(e)));
  const v2 = validatePage({ id: "x", reviewed_at: "t", reviewed_by: "" });
  assert.ok(v2.errors.some((e) => /reviewed_at is set without reviewed_by/.test(e)));
});
test("validatePage: UNRESOLVED requires a reason", () => {
  assert.ok(validatePage({ id: "x", state: "UNRESOLVED", annotator: "a", annotated_at: "t" }).errors.some((e) => /unresolved_reason/.test(e)));
  const ok = validatePage({ id: "x", state: "UNRESOLVED", annotator: "a", annotated_at: "t", confirmed_stratum: "old_font", unresolved_reason: "page is a torn scan" });
  assert.equal(ok.errors.length, 0);
});

// ── change detection / review invalidation (pure) ────────────────────────────
test("reviewInvalidated: semantic edit to a reviewed page invalidates; name-only edit does not", () => {
  const prev: GroundTruth = { id: "x", state: "APPROVED", reviewed_by: "bob", reading_order_text: "aaa", annotator: "alice" };
  assert.equal(reviewInvalidated(prev, { ...prev, reading_order_text: "bbb" }), true);
  assert.equal(reviewInvalidated(prev, { ...prev, annotator: "alice2" }), false);
  assert.deepEqual(changedFields(prev, { ...prev, confirmed_stratum: "complex_modern" }), ["confirmed_stratum"]);
});

// ── freeze eligibility (pure) ────────────────────────────────────────────────
test("freezeIssues: complete APPROVED+distinct reviewer is eligible; gaps are flagged", () => {
  const e = synthManifest(1).entries[0];
  const good: GroundTruth = { ...completeAnnotation(e.id, e), state: "APPROVED", reviewed_by: "bob", reviewed_at: "2026-08-08T11:00:00Z" };
  assert.deepEqual(freezeIssues(good, e), []);
  assert.ok(freezeIssues({ ...good, reviewed_by: "" }, e).some((r) => /not second-reviewed/.test(r)));
  assert.ok(freezeIssues({ ...good, reviewed_by: "alice" }, e).some((r) => /reviewer == annotator/.test(r)));
  assert.ok(freezeIssues({ ...good, state: "CONFLICT", conflict: { active: true } }, e).some((r) => /conflict/.test(r)));
  assert.ok(freezeIssues(null, e).some((r) => /no ground-truth file/.test(r)));
});

// ── counts + confirmed stratum + queues (pure) ───────────────────────────────
test("computeCounts: tallies states and uses confirmed stratum over tentative", () => {
  const manifest = synthManifest(3);
  const byId = new Map<string, GroundTruth | null>();
  const e0 = manifest.entries[0], e1 = manifest.entries[1];
  byId.set(e0.id, { ...completeAnnotation(e0.id, e0), state: "APPROVED", confirmed_stratum: "complex_modern", reviewed_by: "bob", reviewed_at: "t" });
  byId.set(e1.id, { id: e1.id, state: "IN_PROGRESS" });
  byId.set(manifest.entries[2].id, null);
  const d = computeCounts(byId, manifest);
  assert.equal(d.overall.total, 3);
  assert.equal(d.overall.approved, 1);
  assert.equal(d.overall.in_progress, 1);
  assert.equal(d.overall.unstarted, 1);
  assert.equal(d.overall.ready_to_freeze, 1);
  // confirmed stratum moved the approved page into complex_modern, not old_font
  assert.equal(d.by_stratum["complex_modern"].approved, 1);
  assert.equal((d.by_stratum["old_font"] ?? { approved: 0 }).approved, 0);
});
test("nextIndex: cyclic queue navigation finds the next matching item", () => {
  const xs = [{ s: "a" }, { s: "b" }, { s: "a" }, { s: "c" }];
  assert.equal(nextIndex(xs, 0, (x) => x.s === "a", 1), 2);
  assert.equal(nextIndex(xs, 0, (x) => x.s === "c", 1), 3);
  assert.equal(nextIndex(xs, 0, (x) => x.s === "z", 1), -1);
  assert.equal(nextIndex(xs, 3, (x) => x.s === "a", 1), 0); // wraps
});

// ── server handlers (save/atomic/state/review/conflict) ──────────────────────
test("server handlers: save/load, state transitions, reviewer≠annotator, review invalidation, conflict", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bench-srv-"));
  const manifest = synthManifest(2);
  writeFileSync(join(dir, "manifest-v1.json"), JSON.stringify(manifest, null, 2));
  mkdirSync(join(dir, "ground-truth"), { recursive: true });
  process.env.BENCH_DIR = dir; process.env.NO_LISTEN = "1";
  const { handleSave, handleReview, server } = await import("../annotate-server.ts");
  server.close();
  const e0 = manifest.entries[0];

  // incomplete READY_FOR_REVIEW is clamped to IN_PROGRESS
  let r = handleSave(e0.id, { id: e0.id, annotator: "alice", reading_order_text: "", state: "READY_FOR_REVIEW" } as GroundTruth);
  assert.equal((r.body as any).ok, false);
  assert.equal((r.body as any).record.state, "IN_PROGRESS");
  assert.ok(existsSync(join(dir, "ground-truth", `${e0.id}.json`)));
  assert.equal(readdirSync(join(dir, "ground-truth")).filter((f) => f.endsWith(".tmp")).length, 0, "no .tmp left behind (atomic)");

  // complete → READY_FOR_REVIEW accepted
  r = handleSave(e0.id, completeAnnotation(e0.id, e0));
  assert.equal((r.body as any).ok, true);
  assert.equal((r.body as any).record.state, "READY_FOR_REVIEW");

  // reviewer == annotator rejected
  r = handleReview(e0.id, { action: "APPROVE", reviewer: "alice" });
  assert.equal(r.code, 422);

  // distinct reviewer approves
  r = handleReview(e0.id, { action: "APPROVE", reviewer: "bob", note: "looks right" });
  assert.equal(r.code, 200);
  assert.equal((r.body as any).record.state, "APPROVED");
  assert.equal((r.body as any).record.reviewed_by, "bob");

  // annotator edits an approved page → review invalidated, back to READY_FOR_REVIEW
  r = handleSave(e0.id, { ...completeAnnotation(e0.id, e0), reading_order_text: "סעיף 1 טקסט שונה לגמרי" });
  assert.equal((r.body as any).review_invalidated, true);
  assert.equal((r.body as any).record.state, "READY_FOR_REVIEW");
  assert.equal((r.body as any).record.reviewed_by, "");

  // reviewer flags a disagreement → CONFLICT, not freeze-eligible
  r = handleReview(e0.id, { action: "CONFLICT", reviewer: "bob", note: "reading order wrong in col 2", correction: { reading_order_text: "reviewer version" } });
  assert.equal((r.body as any).record.state, "CONFLICT");
  assert.equal(hasConflict((r.body as any).record), true);
  assert.ok(freezeIssues((r.body as any).record, e0).length > 0);

  // history was recorded append-only
  assert.ok(existsSync(join(dir, "ground-truth", "history", `${e0.id}.jsonl`)));
  const hist = readFileSync(join(dir, "ground-truth", "history", `${e0.id}.jsonl`), "utf8").trim().split("\n");
  assert.ok(hist.length >= 4);
  delete process.env.NO_LISTEN;
});

// ── CLI: checkpoint / preflight / freeze via child processes ─────────────────
test("checkpoint writes a backup (no FROZEN) and preflight/freeze refuse an incomplete set", () => {
  const { dir } = setupDir(2);
  // one complete, one missing
  const e = synthManifest(2).entries[0];
  writeGt(dir, { ...completeAnnotation(e.id, e), state: "APPROVED", reviewed_by: "bob", reviewed_at: "2026-08-08T11:00:00Z" });

  const cp = runTool("checkpoint-annotations.ts", dir, ["--stamp", "2026-08-08T10:00:00Z"]);
  assert.equal(cp.code, 0);
  assert.match(cp.out, /checkpoint written/);
  assert.ok(existsSync(join(dir, "checkpoints")));
  assert.ok(!existsSync(join(dir, "FROZEN-v1.json")), "checkpoint must not freeze");

  const pf = runTool("preflight-freeze.ts", dir);
  assert.equal(pf.code, 1);
  assert.match(pf.out, /NOT READY/);
  assert.match(pf.out, /missing_annotation/);

  const fz = runTool("freeze-benchmark.ts", dir, ["--freeze", "--stamp", "2026-08-08"]);
  assert.equal(fz.code, 1);
  assert.match(fz.out, /CANNOT FREEZE/);
  assert.ok(!existsSync(join(dir, "FROZEN-v1.json")));
});

test("freeze ACCEPTS a fully complete synthetic fixture and writes FROZEN-v1.json", () => {
  const { dir, manifest } = setupDir(3);
  for (const e of manifest.entries) {
    const st = e.page_number === 3 ? "UNRESOLVED" : "APPROVED";
    const base = completeAnnotation(e.id, e);
    writeGt(dir, {
      ...base,
      state: st as any,
      unresolved_reason: st === "UNRESOLVED" ? "page is a blank verso / torn scan" : "",
      reading_order_text: st === "UNRESOLVED" ? "" : base.reading_order_text,
      reviewed_by: "bob", reviewed_at: "2026-08-08T11:00:00Z",
    });
  }
  const pf = runTool("preflight-freeze.ts", dir);
  assert.equal(pf.code, 0, pf.out);
  assert.match(pf.out, /READY TO FREEZE/);

  const fz = runTool("freeze-benchmark.ts", dir, ["--freeze", "--stamp", "2026-08-08"]);
  assert.equal(fz.code, 0, fz.out);
  assert.match(fz.out, /FROZEN v1/);
  const frozen = JSON.parse(readFileSync(join(dir, "FROZEN-v1.json"), "utf8"));
  assert.equal(frozen.page_count, 3);
  assert.equal(frozen.approved, 2);
  assert.equal(frozen.unresolved, 1);
  assert.ok(frozen.combined_sha256 && frozen.combined_sha256.length === 64);
  assert.ok(frozen.ground_truth_sha256["bench-001"]);
});

test("scaffold creates one template per manifest entry and never freezes", () => {
  const { dir, manifest } = setupDir(3);
  const sc = runTool("freeze-benchmark.ts", dir, ["--scaffold"]);
  assert.equal(sc.code, 0);
  for (const e of manifest.entries) assert.ok(existsSync(join(dir, "ground-truth", `${e.id}.json`)));
  assert.ok(!existsSync(join(dir, "FROZEN-v1.json")));
});
