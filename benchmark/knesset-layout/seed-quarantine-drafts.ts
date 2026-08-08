/**
 * LAW ME benchmark — QUARANTINED AI-suggested draft seeder (operator, LOCAL).
 *
 *   node --experimental-strip-types benchmark/knesset-layout/seed-quarantine-drafts.ts
 *   (DRAFTS_DIR overrides where layout-2 drafts live; default ./drafts)
 *
 * Founder-authorized AI-assisted pass. It pre-fills each ground-truth/<id>.json
 * with the DETERMINISTIC layout-2 draft text/regions as a SUGGESTION, so the
 * human edits instead of typing from scratch. It is deliberately NOT a model
 * re-reading the page images (that would fabricate unreliable text on the hard
 * majority and break benchmark independence); the suggestion source is the
 * layout-2 extractor, clearly labelled.
 *
 * QUARANTINE — these records cannot be frozen and cannot masquerade as reviewed
 * ground truth:
 *   • state = IN_PROGRESS (never a final state)
 *   • annotator = "" (a HUMAN must claim authorship before the page can be ready)
 *   • confirmed_stratum = "" (a HUMAN must confirm the stratum)
 *   • page_alignment / hebrew_fidelity_notes blank (HUMAN must fill)
 *   • every AI-seeded field tagged _ai_suggested / _needs_human_confirmation
 * The freeze gate (annotation-core.freezeIssues) still requires APPROVED/UNRESOLVED
 * + a distinct second reviewer + full validation, so nothing here shortcuts it.
 *
 * Idempotent & non-destructive: it SKIPS any page a human has already touched
 * (annotator set, or state not IN_PROGRESS/UNSTARTED). Re-runnable safely.
 * Writes nothing except ground-truth/<id>.json. No engine run, no freeze,
 * no membership change. published=0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const DRAFTS = process.env.DRAFTS_DIR ?? `${DIR}/drafts`;
const GT = `${DIR}/ground-truth`;
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8")) as {
  entries: { id: string; publication_item_id: string; page_number: number; year?: number; stratum_tentative: string; source_url: string }[];
};
mkdirSync(GT, { recursive: true });
const saveAtomic = (p: string, o: unknown) => { const t = `${p}.tmp`; writeFileSync(t, JSON.stringify(o, null, 2)); renameSync(t, p); };

const C_STRATA = new Set(["old_font", "doubled_text_layer", "image_partial"]);
const COMPLEX = new Set(["complex_modern", "modern_two_column"]);
const COMPLEX_COL = new Set(["two_body_column", "multi_column", "unresolved"]);

interface Draft { reading_order_text?: string; regions?: { role?: string; column?: number }[]; marginal_captions?: string[]; section_boundaries?: string[]; columnType?: string; unresolved?: boolean; error?: string }

function triage(e: (typeof manifest.entries)[number], d: Draft | null): { group: "A" | "B" | "C"; confidence: string; reasons: string[] } {
  const chars = (d?.reading_order_text ?? "").replace(/\s/g, "").length;
  const ct = d?.columnType ?? "no-draft";
  const unresolved = !!d?.unresolved || !!d?.error;
  const reasons: string[] = []; let group: "A" | "B" | "C" | "" = "";
  if (!d || d.error) { reasons.push("no usable layout-2 draft"); group = "C"; }
  if (unresolved) { reasons.push("layout-2 flagged unresolved reading order"); group = "C"; }
  if (C_STRATA.has(e.stratum_tentative)) { reasons.push(`stratum '${e.stratum_tentative}' mandatory review`); group = "C"; }
  if (COMPLEX_COL.has(ct)) { reasons.push(`complex columns (${ct})`); group = group || "C"; }
  if (COMPLEX.has(e.stratum_tentative)) { reasons.push(`complex/multi-column stratum`); group = group || "C"; }
  if (chars < 40 && e.stratum_tentative !== "front_or_index") { reasons.push(`near-empty draft (${chars} chars)`); group = group || "C"; }
  if (!group) {
    if (e.stratum_tentative === "classic_marginal_caption") { reasons.push("verify marginal captions"); group = "B"; }
    else if (e.stratum_tentative === "budget_table") { reasons.push("verify table"); group = "B"; }
    else if (e.stratum_tentative === "front_or_index") { reasons.push("verify index reading order + alignment"); group = "B"; }
    else if (ct === "two_column") { reasons.push("two-column body"); group = "B"; }
  }
  if (!group) { group = "A"; reasons.push("clean single-column"); }
  const confidence = group === "A" ? "AI_DRAFT_HIGH_CONFIDENCE" : group === "B" ? "AI_DRAFT_MEDIUM_CONFIDENCE"
    : (!d || d.error || unresolved || chars < 40) ? "NEEDS_HUMAN_REVIEW" : "AI_DRAFT_LOW_CONFIDENCE";
  return { group, confidence, reasons };
}

let seeded = 0, skipped = 0, noDraft = 0;
for (const e of manifest.entries) {
  const gp = `${GT}/${e.id}.json`;
  if (existsSync(gp)) {
    try {
      const cur = JSON.parse(readFileSync(gp, "utf8"));
      const humanTouched = String(cur.annotator ?? "").trim() || (cur.state && cur.state !== "IN_PROGRESS" && cur.state !== "UNSTARTED");
      if (humanTouched) { skipped += 1; continue; }
    } catch { /* fall through and reseed */ }
  }
  const dp = `${DRAFTS}/${e.id}.json`;
  let d: Draft | null = null;
  if (existsSync(dp)) { try { d = JSON.parse(readFileSync(dp, "utf8")) as Draft; } catch { d = null; } }
  if (!d || !(d.reading_order_text && d.reading_order_text.length)) noDraft += 1;
  const t = triage(e, d);
  const regions = (d?.regions ?? []).map((r, n) => ({ id: `r${n + 1}`, role: r.role === "caption" ? "caption" : "body", column: r.column ?? 0, order: n + 1, desc: "" }));

  const rec = {
    id: e.id,
    source_document_id: e.publication_item_id,
    source_page_number: e.page_number,
    source_url: e.source_url,
    stratum_manifest: e.stratum_tentative,
    stratum_suggested: e.stratum_tentative,      // deterministic hint; human confirms
    confirmed_stratum: "",                         // HUMAN must confirm
    reading_order_text: d?.reading_order_text ?? "",   // SUGGESTION from layout-2
    regions,
    marginal_captions: d?.marginal_captions ?? [],
    section_boundaries: d?.section_boundaries ?? [],
    page_alignment: { printed_page_label: "", gazette_page: "" }, // HUMAN
    hebrew_fidelity_notes: "",                      // HUMAN
    unresolved_reason: "",
    state: "IN_PROGRESS",                           // NEVER final
    annotator: "",                                  // HUMAN must claim authorship
    annotated_at: "",
    reviewed_by: "", reviewed_at: "", review_note: "",
    confidence: "",
    conflict: null,
    revision: 0,
    _ai_suggested: true,
    _seed_engine: "layout-2 (deterministic) — SUGGESTION ONLY; verify every field against the official PDF",
    _needs_human_confirmation: true,
    _fields_ai_seeded: ["reading_order_text", "regions", "marginal_captions", "section_boundaries"],
    _triage_group: t.group,
    _triage_confidence: t.confidence,
    _triage_reasons: t.reasons,
  };
  saveAtomic(gp, rec);
  seeded += 1;
}

process.stdout.write(
  `QUARANTINED seed complete — ${seeded} seeded, ${skipped} skipped (human-touched), ${noDraft} had no usable draft text (blank suggestion → full human transcription).\n` +
  `All seeded pages: state=IN_PROGRESS, annotator="" (blank), confirmed_stratum="" — CANNOT be frozen until a human annotates + a distinct reviewer approves.\n` +
  `Next: open the workspace, edit each page against the PDF, set annotator, then a second reviewer approves. Freeze gate is unchanged.\n`,
);
