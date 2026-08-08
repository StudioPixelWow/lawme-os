/**
 * LAW ME benchmark — annotation TRIAGE (deterministic, non-AI, read-only).
 *
 *   node --experimental-strip-types benchmark/knesset-layout/triage-annotation.ts
 *   (DRAFTS_DIR overrides where the layout-2 drafts live; default ./drafts)
 *
 * Purpose: minimize HUMAN annotation effort WITHOUT touching ground truth and
 * WITHOUT any model reading page images. It reads ONLY the existing layout-2
 * DRAFT signals (column type, unresolved flag, text length, region/section
 * counts) + the manifest, and sorts the 108 pages into the founder's review
 * groups so a human can skim the safe ones and focus on the rest:
 *
 *   Group A — high confidence  (AI_DRAFT_HIGH_CONFIDENCE)
 *   Group B — medium           (AI_DRAFT_MEDIUM_CONFIDENCE)
 *   Group C — mandatory human review (AI_DRAFT_LOW_CONFIDENCE | NEEDS_HUMAN_REVIEW)
 *
 * It writes a triage REPORT only (triage/…). It never writes ground-truth, never
 * runs an extractor/OCR engine, never tunes layout-2, never freezes. Every
 * semantic field still requires a human annotator + a distinct human reviewer.
 * The confidence here is a WORKLOAD hint, NOT a quality verdict — layout-2's own
 * proxy is known to over-report, which is exactly why a human still checks each.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { loadManifest, type ManifestEntry } from "./annotation-core.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const DRAFTS = process.env.DRAFTS_DIR ?? `${DIR}/drafts`;
const manifest = loadManifest(DIR);

const C_STRATA = new Set(["old_font", "doubled_text_layer", "image_partial"]);
const COMPLEX_STRATA = new Set(["complex_modern", "modern_two_column"]);
const COMPLEX_COLTYPE = new Set(["two_body_column", "multi_column", "unresolved"]);

type Conf = "AI_DRAFT_HIGH_CONFIDENCE" | "AI_DRAFT_MEDIUM_CONFIDENCE" | "AI_DRAFT_LOW_CONFIDENCE" | "NEEDS_HUMAN_REVIEW";
interface Draft { reading_order_text?: string; regions?: unknown[]; marginal_captions?: unknown[]; section_boundaries?: unknown[]; columnType?: string; unresolved?: boolean; error?: string }
interface Row {
  id: string; publication_item_id: string; page_number: number; year?: number; source_url: string;
  stratum_tentative: string; columnType: string; unresolved: boolean; text_chars: number;
  n_regions: number; n_captions: number; n_sections: number;
  group: "A" | "B" | "C"; confidence: Conf; reasons: string[];
}

function loadDraft(id: string): Draft | null {
  const p = `${DRAFTS}/${id}.json`;
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as Draft; } catch { return null; }
}

function classify(e: ManifestEntry, d: Draft | null): Row {
  const text = (d?.reading_order_text ?? "");
  const text_chars = text.replace(/\s/g, "").length;
  const columnType = d?.columnType ?? (d ? "unknown" : "no-draft");
  const unresolved = !!d?.unresolved || !!d?.error;
  const reasons: string[] = [];
  let group: "A" | "B" | "C" | "" = "";

  // ── Mandatory Group C signals ──
  if (!d) { reasons.push("no layout-2 draft present"); group = "C"; }
  if (d?.error) { reasons.push(`draft extraction error: ${d.error}`); group = "C"; }
  if (unresolved) { reasons.push("layout-2 flagged the page unresolved (ambiguous reading order)"); group = "C"; }
  if (C_STRATA.has(e.stratum_tentative)) { reasons.push(`stratum '${e.stratum_tentative}' is mandatory human review (old font / doubled layer / image-partial)`); group = "C"; }
  if (COMPLEX_COLTYPE.has(columnType)) { reasons.push(`complex/multi-column layout (columnType='${columnType}')`); group = group || "C"; }
  if (COMPLEX_STRATA.has(e.stratum_tentative)) { reasons.push(`multi-column / complex-modern stratum ('${e.stratum_tentative}')`); group = group || "C"; }
  if (text_chars < 40 && e.stratum_tentative !== "front_or_index") { reasons.push(`near-empty draft (${text_chars} chars) — likely image/partial or unextractable`); group = group || "C"; }

  // ── Group B (minor issues) ──
  if (!group) {
    if (e.stratum_tentative === "classic_marginal_caption") { reasons.push("marginal captions must be verified & separated from body"); group = "B"; }
    else if (e.stratum_tentative === "budget_table") { reasons.push("budget/table structure to verify"); group = "B"; }
    else if (e.stratum_tentative === "front_or_index") { reasons.push("front-matter/index: reading order + page alignment need a check"); group = "B"; }
    else if (columnType === "two_column") { reasons.push("two-column body layout"); group = "B"; }
    else if ((d?.section_boundaries?.length ?? 0) === 0 && /\d{1,3}\s*\./.test(text)) { reasons.push("possible section numbers not captured as boundaries"); group = "B"; }
  }

  // ── Group A (clean) ──
  if (!group) { group = "A"; reasons.push("single-column, resolved, non-trivial text, no complexity flags"); }

  const confidence: Conf = group === "A" ? "AI_DRAFT_HIGH_CONFIDENCE"
    : group === "B" ? "AI_DRAFT_MEDIUM_CONFIDENCE"
    : (!d || d.error || unresolved || text_chars < 40) ? "NEEDS_HUMAN_REVIEW" : "AI_DRAFT_LOW_CONFIDENCE";

  return {
    id: e.id, publication_item_id: e.publication_item_id, page_number: e.page_number, year: e.year, source_url: e.source_url,
    stratum_tentative: e.stratum_tentative, columnType, unresolved, text_chars,
    n_regions: d?.regions?.length ?? 0, n_captions: d?.marginal_captions?.length ?? 0, n_sections: d?.section_boundaries?.length ?? 0,
    group, confidence, reasons,
  };
}

const rows = manifest.entries.map((e) => classify(e, loadDraft(e.id)));
const draftsPresent = rows.filter((r) => r.text_chars > 0 || r.n_regions > 0).length;
const g = (x: "A" | "B" | "C") => rows.filter((r) => r.group === x);
const A = g("A"), B = g("B"), C = g("C");
const needsHuman = rows.filter((r) => r.confidence === "NEEDS_HUMAN_REVIEW");
const unresolvedN = rows.filter((r) => r.unresolved).length;

// effort estimate (per-page minutes): A skim, B check, C full human work
const EFFORT = { A: 1, B: 4, C: 9 } as const;
const minutesBC = B.length * EFFORT.B + C.length * EFFORT.C;

const byStratum: Record<string, { total: number; A: number; B: number; C: number }> = {};
for (const r of rows) { (byStratum[r.stratum_tentative] ??= { total: 0, A: 0, B: 0, C: 0 }); byStratum[r.stratum_tentative].total++; byStratum[r.stratum_tentative][r.group]++; }

const REQUIRED_HUMAN_FIELDS = [
  "confirmed_stratum (human-confirmed)", "reading_order_text (verified against PDF)",
  "regions (body/caption/… verified)", "marginal_captions", "section_boundaries",
  "page_alignment.printed_page_label", "hebrew_fidelity_notes", "annotator + annotated_at",
  "state = APPROVED|UNRESOLVED (reviewer-set)", "reviewed_by ≠ annotator + reviewed_at (second review)",
];

const report = {
  kind: "ANNOTATION-TRIAGE",
  note: "Deterministic workload triage from layout-2 DRAFT signals only. NOT ground truth, NOT a quality verdict. Every page still needs a human annotator + a distinct human reviewer. No FROZEN, no engine run, no membership change. published=0.",
  total: rows.length,
  layout2_drafts_present: draftsPresent,
  human_annotated: 0,
  confidence_counts: {
    AI_DRAFT_HIGH_CONFIDENCE: A.length,
    AI_DRAFT_MEDIUM_CONFIDENCE: B.length,
    AI_DRAFT_LOW_CONFIDENCE: C.filter((r) => r.confidence === "AI_DRAFT_LOW_CONFIDENCE").length,
    NEEDS_HUMAN_REVIEW: needsHuman.length,
  },
  groups: { A: A.length, B: B.length, C: C.length },
  unresolved_count: unresolvedN,
  conflicts: 0,
  estimated_minutes_for_B_and_C_only: minutesBC,
  estimated_hours_for_B_and_C_only: +(minutesBC / 60).toFixed(1),
  by_stratum: byStratum,
  required_human_fields_before_freeze: REQUIRED_HUMAN_FIELDS,
  freeze_gate_requires_human_action: true,
  group_A: A.map((r) => r.id),
  group_B: B.map((r) => ({ id: r.id, stratum: r.stratum_tentative, columnType: r.columnType, chars: r.text_chars, reasons: r.reasons })),
  group_C: C.map((r) => ({ id: r.id, stratum: r.stratum_tentative, columnType: r.columnType, chars: r.text_chars, confidence: r.confidence, reasons: r.reasons })),
};

mkdirSync(`${DIR}/triage`, { recursive: true });
writeFileSync(`${DIR}/triage/triage-report.json`, JSON.stringify(report, null, 2));

// human-readable Group B + C markdown (what the founder reviews)
const mdRow = (r: Row) => `| ${r.id} | ${r.stratum_tentative} | ${r.columnType} | ${r.text_chars} | ${r.reasons.join("; ")} |`;
const md = [
  `# LAW ME — Benchmark Annotation Triage (Groups B & C)`,
  ``,
  `Deterministic workload triage from layout-2 draft signals. NOT ground truth. Every page still needs a human annotator + a distinct human reviewer. Group A (${A.length}) is omitted here — those are safe to skim in the workspace.`,
  ``,
  `## Group B — medium confidence (${B.length}) — minor issues, quick checks`,
  ``,
  `| page | stratum | columns | draft chars | why |`,
  `|---|---|---|---|---|`,
  ...B.map(mdRow),
  ``,
  `## Group C — mandatory human review (${C.length})`,
  ``,
  `| page | stratum | columns | draft chars | why |`,
  `|---|---|---|---|---|`,
  ...C.map(mdRow),
  ``,
  `## Estimated focused effort (B + C only): ~${minutesBC} min (~${(minutesBC / 60).toFixed(1)} h) at ${EFFORT.B} min/B and ${EFFORT.C} min/C.`,
].join("\n");
writeFileSync(`${DIR}/triage/GROUP_B_C.md`, md);

process.stdout.write(
  `TRIAGE (deterministic, no ground truth written)\n` +
  `total ${rows.length} · layout-2 drafts present ${draftsPresent}/${rows.length} · human-annotated 0/${rows.length}\n` +
  `HIGH(A) ${A.length} · MEDIUM(B) ${B.length} · LOW+NEEDS_REVIEW(C) ${C.length}  (of which NEEDS_HUMAN_REVIEW ${needsHuman.length})\n` +
  `unresolved ${unresolvedN} · conflicts 0\n` +
  `by stratum: ${JSON.stringify(byStratum)}\n` +
  `focused effort for B+C only: ~${minutesBC} min (~${(minutesBC / 60).toFixed(1)} h)\n` +
  `freeze gate still requires human action: YES\n` +
  `report → ${DIR}/triage/triage-report.json · ${DIR}/triage/GROUP_B_C.md\n`,
);
