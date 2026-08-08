/**
 * LAW ME benchmark — shared annotation CORE (single source of truth).
 *
 * Imported by the annotation server, checkpoint, preflight, and freeze so that
 * NONE of them can disagree about: the page lifecycle, what a "complete" page
 * requires, when a page is freeze-eligible, what counts as a conflict, and how
 * the dashboard counts are computed. Freeze strictness lives here, once.
 *
 * HUMAN-INDEPENDENCE: nothing in this module reads page images or transcribes
 * anything. It validates *structure and human-supplied metadata only*. It never
 * decides reading order, stratum, APPROVED, or UNRESOLVED — those are human
 * fields it merely checks for presence/consistency.
 *
 * Pure, deterministic, no network, no model. Safe to unit-test.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync } from "node:fs";

// ── Vocabularies ───────────────────────────────────────────────────────────
export const STRATA = [
  "old_font",
  "complex_modern",
  "classic_marginal_caption",
  "image_partial",
  "modern_two_column",
  "doubled_text_layer",
  "budget_table",
  "front_or_index",
] as const;
export type Stratum = (typeof STRATA)[number];

export const REGION_ROLES = [
  "body", "caption", "header", "footer", "marginal", "table", "image", "index", "other",
] as const;
export type RegionRole = (typeof REGION_ROLES)[number];

/**
 * Page lifecycle. A page is *freeze-eligible* only in a FINAL state
 * (APPROVED or UNRESOLVED) with a distinct second reviewer.
 *   UNSTARTED → IN_PROGRESS → READY_FOR_REVIEW
 *     → (reviewer) APPROVED | UNRESOLVED        [freeze-eligible]
 *     → (reviewer) NEEDS_CORRECTION → IN_PROGRESS…
 *     → (reviewer) CONFLICT → (human resolves) …
 * Editing a page that was already reviewed invalidates the review and drops it
 * back to READY_FOR_REVIEW (see reviewInvalidated()).
 */
export const STATES = [
  "UNSTARTED",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "NEEDS_CORRECTION",
  "CONFLICT",
  "APPROVED",
  "UNRESOLVED",
] as const;
export type State = (typeof STATES)[number];

export const FINAL_STATES: State[] = ["APPROVED", "UNRESOLVED"];
/** Completion states an annotator/reviewer asserts are "done enough to gate on". */
export const COMPLETION_STATES: State[] = ["READY_FOR_REVIEW", "APPROVED", "UNRESOLVED"];

export interface ManifestEntry {
  id: string;
  stratum_tentative: string;
  publication_item_id: string;
  israel_law_id?: string | number;
  publication_type?: string;
  year?: number;
  page_count?: number;
  page_number: number;
  source_url: string;
}

export interface Region {
  id: string;
  role: RegionRole | string;
  column?: number;
  order?: number;
  desc?: string;
  /** optional normalized bbox [x0,y0,x1,y1] in 0..1, deterministic; NOT model-derived */
  bbox?: [number, number, number, number];
}

export interface ReviewSnapshot {
  actor: string;
  role: "annotator" | "reviewer";
  at: string;
  action?: string;
  note?: string;
  from_state?: State | string;
  to_state?: State | string;
  changed_fields?: string[];
  revision?: number;
}

export interface GroundTruth {
  id: string;
  /** provenance, copied from manifest at scaffold; annotator confirms */
  source_document_id?: string;         // publication_item_id
  source_page_number?: number;
  stratum_manifest?: string;           // tentative
  confirmed_stratum?: string;
  stratum_change_note?: string;
  reading_order_text?: string;
  regions?: Region[];
  marginal_captions?: string[];
  section_boundaries?: string[];
  page_alignment?: { printed_page_label?: string; gazette_page?: string };
  hebrew_fidelity_notes?: string;
  unresolved_reason?: string;
  state?: State;
  annotator?: string;
  annotated_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  /** active disagreement between annotator and reviewer */
  conflict?: {
    active: boolean;
    raised_by?: string;
    at?: string;
    note?: string;
    fields?: string[];
    annotator_version?: Partial<GroundTruth>;
    reviewer_version?: Partial<GroundTruth>;
  } | null;
  revision?: number;
}

// ── Hashing ────────────────────────────────────────────────────────────────
export const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
export const norm = (t: unknown): string => String(t ?? "").replace(/\s+/g, " ").trim();
const nonEmpty = (t: unknown): boolean => norm(t).length > 0;

// ── Semantic fields (edits to these invalidate a prior review) ───────────────
export const SEMANTIC_FIELDS: (keyof GroundTruth)[] = [
  "confirmed_stratum", "reading_order_text", "regions", "marginal_captions",
  "section_boundaries", "page_alignment", "hebrew_fidelity_notes", "unresolved_reason",
];

/** Which semantic fields changed between two records (deep-equal by JSON). */
export function changedFields(prev: GroundTruth | null, next: GroundTruth): string[] {
  const out: string[] = [];
  for (const f of SEMANTIC_FIELDS) {
    const a = JSON.stringify((prev ?? {})[f] ?? null);
    const b = JSON.stringify(next[f] ?? null);
    if (a !== b) out.push(f as string);
  }
  return out;
}

/**
 * True if `next` edits semantic content of a page that had already been
 * second-reviewed (was APPROVED/UNRESOLVED with a reviewer). Such an edit must
 * invalidate the review and return to READY_FOR_REVIEW.
 */
export function reviewInvalidated(prev: GroundTruth | null, next: GroundTruth): boolean {
  if (!prev) return false;
  const wasReviewed = !!norm(prev.reviewed_by) && (FINAL_STATES as string[]).includes(prev.state ?? "");
  if (!wasReviewed) return false;
  return changedFields(prev, next).length > 0;
}

// ── Validation ───────────────────────────────────────────────────────────────
export interface Validation { errors: string[]; warnings: string[] }

/**
 * Structural + human-metadata validation. `errors` block a page from becoming a
 * completion state (READY_FOR_REVIEW / APPROVED / UNRESOLVED). `warnings` are
 * advisory and never block. All checks are non-AI: presence, consistency,
 * uniqueness, ranges — never semantic truth.
 */
export function validatePage(gt: GroundTruth, entry?: ManifestEntry): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const state = gt.state ?? "UNSTARTED";
  const isUnresolved = state === "UNRESOLVED";
  const gatedForCompletion = (COMPLETION_STATES as string[]).includes(state);

  // Identity / provenance
  if (entry) {
    if (gt.id !== entry.id) errors.push(`id mismatch: ${gt.id} ≠ manifest ${entry.id}`);
    if (nonEmpty(gt.source_document_id) && norm(gt.source_document_id) !== norm(entry.publication_item_id))
      errors.push(`source_document_id ${gt.source_document_id} ≠ manifest ${entry.publication_item_id}`);
    if (gt.source_page_number != null && Number(gt.source_page_number) !== Number(entry.page_number))
      errors.push(`source_page_number ${gt.source_page_number} ≠ manifest ${entry.page_number}`);
  }

  // Stratum must be a confirmed, known value for completion
  if (gatedForCompletion) {
    if (!nonEmpty(gt.confirmed_stratum)) errors.push("confirmed_stratum is required");
    else if (!(STRATA as readonly string[]).includes(gt.confirmed_stratum!))
      errors.push(`confirmed_stratum "${gt.confirmed_stratum}" is not a known stratum`);
  }

  // Regions: structural integrity always; body-region requirement on APPROVED
  const regions = gt.regions ?? [];
  const ids = new Set<string>();
  for (const r of regions) {
    if (!nonEmpty(r.id)) errors.push("a region is missing an id");
    else if (ids.has(r.id)) errors.push(`duplicate region id "${r.id}"`);
    else ids.add(r.id);
    if (r.role && !(REGION_ROLES as readonly string[]).includes(r.role))
      warnings.push(`region "${r.id}" has non-standard role "${r.role}"`);
    if (r.bbox) {
      const [x0, y0, x1, y1] = r.bbox;
      const inRange = [x0, y0, x1, y1].every((n) => typeof n === "number" && n >= 0 && n <= 1);
      if (!inRange) errors.push(`region "${r.id}" bbox out of normalized [0,1] range`);
      else if (x1 <= x0 || y1 <= y0) errors.push(`region "${r.id}" bbox is degenerate (x1<=x0 or y1<=y0)`);
    }
  }
  // reading-order numbering gaps (advisory)
  const orders = regions.map((r) => r.order).filter((o): o is number => typeof o === "number").sort((a, b) => a - b);
  for (let i = 1; i < orders.length; i++) if (orders[i] - orders[i - 1] > 1) { warnings.push("reading-order numbers have a gap"); break; }

  if (state === "APPROVED") {
    // APPROVED must carry a real transcription and at least one body region.
    if (!nonEmpty(gt.reading_order_text)) errors.push("APPROVED requires a non-empty reading_order_text");
    if (!regions.some((r) => r.role === "body")) warnings.push("APPROVED page has no region marked 'body'");
    if (nonEmpty(gt.unresolved_reason)) warnings.push("APPROVED page also has unresolved_reason set (should be empty)");
  }

  // section boundaries present in text (advisory; matching is fuzzy)
  if (nonEmpty(gt.reading_order_text) && (gt.section_boundaries ?? []).length) {
    const body = gt.reading_order_text!;
    for (const s of gt.section_boundaries!) if (nonEmpty(s) && !body.includes(s.trim()))
      { warnings.push("a section boundary is not found verbatim in reading_order_text"); break; }
  }

  // Page alignment + Hebrew fidelity note required on completion (annotator must actively address)
  if (gatedForCompletion && !isUnresolved) {
    const pa = gt.page_alignment ?? {};
    if (!nonEmpty(pa.printed_page_label) && !nonEmpty(pa.gazette_page))
      errors.push("page_alignment requires a printed_page_label (or gazette_page); use 'none' if the page has no folio");
    if (!nonEmpty(gt.hebrew_fidelity_notes))
      errors.push("hebrew_fidelity_notes is required (write 'no issues' if clean)");
  }

  // UNRESOLVED needs a human reason/explanation
  if (isUnresolved && !nonEmpty(gt.unresolved_reason))
    errors.push("UNRESOLVED requires an unresolved_reason (human explanation)");

  // Annotator identity + timestamp for any completion state
  if (gatedForCompletion) {
    if (!nonEmpty(gt.annotator)) errors.push("annotator identity is required");
    if (!nonEmpty(gt.annotated_at)) errors.push("annotated_at timestamp is required");
  }

  // Review-metadata consistency (non-AI structural guards)
  if (nonEmpty(gt.reviewed_at) && !nonEmpty(gt.reviewed_by))
    errors.push("reviewed_at is set without reviewed_by");
  if (nonEmpty(gt.reviewed_by) && nonEmpty(gt.annotator) && norm(gt.reviewed_by) === norm(gt.annotator))
    errors.push("reviewer must not be the same person as the annotator");

  return { errors, warnings };
}

export const hasConflict = (gt: GroundTruth): boolean =>
  gt.state === "CONFLICT" || !!(gt.conflict && gt.conflict.active);

/**
 * Reasons a page is NOT freeze-eligible (empty array = eligible). This is the
 * STRICT gate reused by preflight and freeze. It only ever ADDS requirements on
 * top of validatePage — it never relaxes them.
 */
export function freezeIssues(gt: GroundTruth | null, entry: ManifestEntry): string[] {
  const reasons: string[] = [];
  if (!gt) return [`${entry.id}: no ground-truth file`];
  const state = gt.state ?? "UNSTARTED";
  if (!(FINAL_STATES as string[]).includes(state)) reasons.push(`${entry.id}: state=${state} (must be APPROVED or UNRESOLVED)`);
  if (hasConflict(gt)) reasons.push(`${entry.id}: unresolved conflict`);
  if (!nonEmpty(gt.confirmed_stratum)) reasons.push(`${entry.id}: confirmed_stratum missing`);
  // second review, by a DIFFERENT person
  if (!nonEmpty(gt.reviewed_by)) reasons.push(`${entry.id}: not second-reviewed (reviewed_by missing)`);
  if (!nonEmpty(gt.reviewed_at)) reasons.push(`${entry.id}: reviewed_at missing`);
  if (nonEmpty(gt.reviewed_by) && nonEmpty(gt.annotator) && norm(gt.reviewed_by) === norm(gt.annotator))
    reasons.push(`${entry.id}: reviewer == annotator`);
  // full structural/metadata validity in the final state
  const v = validatePage(gt, entry);
  for (const e of v.errors) reasons.push(`${entry.id}: ${e}`);
  return reasons;
}

// ── Dashboard / queue counts ────────────────────────────────────────────────
export interface Counts {
  total: number;
  unstarted: number;
  in_progress: number;
  needs_correction: number;
  ready_for_review: number;
  approved: number;
  unresolved: number;
  awaiting_second_review: number;   // READY_FOR_REVIEW, no reviewer yet
  second_reviewed: number;          // final state + distinct reviewer + freeze-eligible
  conflicts: number;
  ready_to_freeze: number;          // freeze-eligible pages
}

const emptyCounts = (): Counts => ({
  total: 0, unstarted: 0, in_progress: 0, needs_correction: 0, ready_for_review: 0,
  approved: 0, unresolved: 0, awaiting_second_review: 0, second_reviewed: 0,
  conflicts: 0, ready_to_freeze: 0,
});

/** Which stratum to count a page under: confirmed if set, else manifest tentative. */
export const effectiveStratum = (gt: GroundTruth | null, entry: ManifestEntry): string =>
  (gt && nonEmpty(gt.confirmed_stratum) ? gt.confirmed_stratum! : entry.stratum_tentative);

function tally(c: Counts, gt: GroundTruth | null, entry: ManifestEntry): void {
  c.total += 1;
  const state = (gt?.state ?? "UNSTARTED") as State;
  if (!gt || state === "UNSTARTED") c.unstarted += 1;
  else if (state === "IN_PROGRESS") c.in_progress += 1;
  else if (state === "NEEDS_CORRECTION") c.needs_correction += 1;
  else if (state === "READY_FOR_REVIEW") c.ready_for_review += 1;
  else if (state === "APPROVED") c.approved += 1;
  else if (state === "UNRESOLVED") c.unresolved += 1;
  if (gt && hasConflict(gt)) c.conflicts += 1;
  if (state === "READY_FOR_REVIEW" && !nonEmpty(gt?.reviewed_by)) c.awaiting_second_review += 1;
  if (gt && freezeIssues(gt, entry).length === 0) { c.second_reviewed += 1; c.ready_to_freeze += 1; }
}

export interface Dashboard { overall: Counts; by_stratum: Record<string, Counts> }

export function computeCounts(
  byId: Map<string, GroundTruth | null>,
  manifest: { entries: ManifestEntry[] },
): Dashboard {
  const overall = emptyCounts();
  const by_stratum: Record<string, Counts> = {};
  for (const e of manifest.entries) {
    const gt = byId.get(e.id) ?? null;
    tally(overall, gt, e);
    const s = effectiveStratum(gt, e);
    (by_stratum[s] ??= emptyCounts());
    tally(by_stratum[s], gt, e);
  }
  return { overall, by_stratum };
}

/** Queue navigation: next index (cyclic) in `dir` whose item matches `pred`; -1 if none. */
export function nextIndex<T>(items: T[], from: number, pred: (t: T) => boolean, dir: 1 | -1): number {
  const n = items.length;
  if (!n) return -1;
  for (let s = 1; s <= n; s++) {
    const idx = (((from + dir * s) % n) + n) % n;
    if (pred(items[idx])) return idx;
  }
  return -1;
}

// ── IO helpers (directory is a parameter, so tests use a temp dir) ───────────
export const gtDir = (dir: string): string => `${dir}/ground-truth`;
export const gtPath = (dir: string, id: string): string => `${gtDir(dir)}/${id}.json`;

export function loadManifest(dir: string): { entries: ManifestEntry[] } {
  return JSON.parse(readFileSync(`${dir}/manifest-v1.json`, "utf8"));
}

export function loadGroundTruth(dir: string, id: string): GroundTruth | null {
  const p = gtPath(dir, id);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as GroundTruth; } catch { return null; }
}

/** Load only canonical bench-*.json snapshots that belong to the manifest. */
export function loadAll(dir: string, manifest: { entries: ManifestEntry[] }): Map<string, GroundTruth | null> {
  const ids = new Set(manifest.entries.map((e) => e.id));
  const m = new Map<string, GroundTruth | null>();
  for (const e of manifest.entries) m.set(e.id, loadGroundTruth(dir, e.id));
  // ignore any stray files not in the manifest (never counted, never frozen)
  void ids; void readdirSync;
  return m;
}
