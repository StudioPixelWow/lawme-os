/**
 * Phase 1 — local Human Ground Truth Annotation Workspace v2 (operator, LOCAL).
 *
 *   node --experimental-strip-types benchmark/knesset-layout/annotate-server.ts
 *   → open http://localhost:8787
 *
 * A production-quality HUMAN review tool for the 108 benchmark pages. It shows
 * the official PDF page beside an editable annotation, accelerated by a clearly
 * marked layout-2 DRAFT (never a candidate OCR/engine, never auto-accepted). It
 * enforces an explicit page lifecycle, required-field validation, a distinct
 * second reviewer, a disagreement workflow, append-only history, and atomic
 * saves. All validation/state/counts come from ./annotation-core.ts so the
 * server, checkpoint, preflight, and freeze can never disagree.
 *
 * HUMAN-INDEPENDENCE: the model does not transcribe pages, choose reading order,
 * decide stratum, or decide APPROVED/UNRESOLVED. Every final field is human-set.
 * The draft is a suggestion only.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, appendFileSync } from "node:fs";
import {
  validatePage, computeCounts, changedFields, reviewInvalidated, hasConflict,
  loadManifest, loadGroundTruth, loadAll, STRATA, REGION_ROLES, STATES,
  type GroundTruth, type ManifestEntry, type State,
} from "./annotation-core.ts";

const DIR = process.env.BENCH_DIR ?? "benchmark/knesset-layout";
const GT = `${DIR}/ground-truth`;
const HIST = `${GT}/history`;
const PORT = Number(process.env.PORT ?? 8787);
const manifest = loadManifest(DIR);
const entryOf = new Map<string, ManifestEntry>(manifest.entries.map((e) => [e.id, e]));

const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const saveAtomic = (p: string, obj: unknown) => { mkdirSync(GT, { recursive: true }); const tmp = `${p}.tmp`; writeFileSync(tmp, JSON.stringify(obj, null, 2)); renameSync(tmp, p); };
const now = () => new Date().toISOString();

// History dir is created lazily on first write, so an idle workspace leaves the
// ground-truth directory untouched.
function appendHistory(id: string, ev: Record<string, unknown>): void {
  mkdirSync(HIST, { recursive: true });
  appendFileSync(`${HIST}/${id}.jsonl`, JSON.stringify({ ...ev, at: ev.at ?? now() }) + "\n");
}
function readHistory(id: string): unknown[] {
  const p = `${HIST}/${id}.jsonl`;
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
}

/** Backfill immutable provenance from the manifest so the record is self-describing. */
function withProvenance(rec: GroundTruth, e: ManifestEntry): GroundTruth {
  return {
    ...rec,
    id: e.id,
    source_document_id: e.publication_item_id,
    source_page_number: e.page_number,
    stratum_manifest: e.stratum_tentative,
  };
}

/** Annotator save. Persists content always; clamps completion states that fail validation. */
function handleSave(id: string, incoming: GroundTruth): { code: number; body: unknown } {
  const e = entryOf.get(id);
  if (!e) return { code: 404, body: { error: "unknown benchmark id" } };
  const prev = loadGroundTruth(DIR, id);
  const rec = withProvenance({ ...(prev ?? {}), ...incoming }, e);
  const changed = changedFields(prev, rec);

  // Review invalidation: editing a reviewed page drops it back to READY_FOR_REVIEW.
  if (reviewInvalidated(prev, rec)) {
    appendHistory(id, { revision: (prev?.revision ?? 0), actor: rec.annotator ?? "unknown", role: "annotator", action: "REVIEW_INVALIDATED", from_state: prev?.state, to_state: "READY_FOR_REVIEW", changed_fields: changed, prior_reviewed_by: prev?.reviewed_by, prior_reviewed_at: prev?.reviewed_at });
    rec.reviewed_by = ""; rec.reviewed_at = ""; rec.review_note = "";
    rec.state = "READY_FOR_REVIEW";
  }

  // Determine requested state.
  let requested: State = (incoming.state as State) ?? rec.state ?? "IN_PROGRESS";
  if (!STATES.includes(requested)) requested = "IN_PROGRESS";
  // A reviewer-only final state cannot be set through the annotator save path.
  if (requested === "APPROVED" || requested === "UNRESOLVED" || requested === "CONFLICT") requested = "READY_FOR_REVIEW";
  if (changed.length && requested !== "READY_FOR_REVIEW") requested = "IN_PROGRESS";

  rec.state = requested;
  if (!rec.annotated_at || changed.length) rec.annotated_at = now();

  const v = validatePage(rec, e);
  // Clamp: cannot become READY_FOR_REVIEW while required fields are missing.
  let clamped = false;
  if (requested === "READY_FOR_REVIEW" && v.errors.length) { rec.state = "IN_PROGRESS"; clamped = true; }

  rec.revision = (prev?.revision ?? 0) + 1;
  appendHistory(id, { revision: rec.revision, actor: rec.annotator ?? "unknown", role: "annotator", action: clamped ? "SAVE_INCOMPLETE" : "SAVE", from_state: prev?.state ?? "UNSTARTED", to_state: rec.state, changed_fields: changed });
  saveAtomic(`${GT}/${id}.json`, rec);
  return { code: 200, body: { ok: !clamped, clamped, review_invalidated: reviewInvalidated(prev, rec), errors: v.errors, warnings: v.warnings, record: rec } };
}

/** Reviewer action. Enforces reviewer≠annotator and only the reviewer sets final states. */
function handleReview(id: string, body: { action: string; reviewer?: string; note?: string; correction?: Partial<GroundTruth> }): { code: number; body: unknown } {
  const e = entryOf.get(id);
  if (!e) return { code: 404, body: { error: "unknown benchmark id" } };
  const prev = loadGroundTruth(DIR, id);
  if (!prev) return { code: 409, body: { error: "nothing to review yet" } };
  const reviewer = String(body.reviewer ?? "").trim();
  if (!reviewer) return { code: 422, body: { error: "reviewer identity is required" } };
  if (reviewer === String(prev.annotator ?? "").trim()) return { code: 422, body: { error: "reviewer must not be the same person as the annotator" } };

  const corrected = withProvenance({ ...prev, ...(body.correction ?? {}) }, e);
  const action = body.action;
  const note = String(body.note ?? "").trim();
  const rec: GroundTruth = corrected;

  if (action === "APPROVE") {
    rec.state = "APPROVED";
    rec.reviewed_by = reviewer; rec.reviewed_at = now(); rec.review_note = note; rec.conflict = null;
    const v = validatePage(rec, e);
    if (v.errors.length) return { code: 422, body: { error: "cannot APPROVE — validation errors", errors: v.errors } };
  } else if (action === "UNRESOLVED") {
    rec.state = "UNRESOLVED";
    rec.reviewed_by = reviewer; rec.reviewed_at = now(); rec.review_note = note; rec.conflict = null;
    const v = validatePage(rec, e);
    if (v.errors.length) return { code: 422, body: { error: "cannot mark UNRESOLVED — validation errors", errors: v.errors } };
  } else if (action === "RETURN") {
    if (!note) return { code: 422, body: { error: "RETURN requires a review note" } };
    rec.state = "NEEDS_CORRECTION"; rec.reviewed_by = ""; rec.reviewed_at = ""; rec.review_note = note;
  } else if (action === "CONFLICT") {
    if (!note) return { code: 422, body: { error: "FLAG DISAGREEMENT requires a note" } };
    rec.state = "CONFLICT"; rec.reviewed_by = ""; rec.reviewed_at = "";
    rec.conflict = {
      active: true, raised_by: reviewer, at: now(), note,
      fields: changedFields(prev, corrected),
      annotator_version: pickSemantic(prev),
      reviewer_version: pickSemantic(corrected),
    };
  } else {
    return { code: 400, body: { error: `unknown review action "${action}"` } };
  }

  rec.revision = (prev.revision ?? 0) + 1;
  appendHistory(id, { revision: rec.revision, actor: reviewer, role: "reviewer", action, from_state: prev.state, to_state: rec.state, note, changed_fields: changedFields(prev, corrected) });
  saveAtomic(`${GT}/${id}.json`, rec);
  return { code: 200, body: { ok: true, record: rec } };
}

/** Explicit human conflict resolution. Clears the conflict; page must be re-reviewed. */
function handleResolve(id: string, body: { actor?: string; decision?: string; note?: string; chosen?: Partial<GroundTruth> }): { code: number; body: unknown } {
  const e = entryOf.get(id);
  if (!e) return { code: 404, body: { error: "unknown benchmark id" } };
  const prev = loadGroundTruth(DIR, id);
  if (!prev || !hasConflict(prev)) return { code: 409, body: { error: "no active conflict" } };
  const actor = String(body.actor ?? "").trim();
  if (!actor) return { code: 422, body: { error: "resolver identity is required" } };
  const rec = withProvenance({ ...prev, ...(body.chosen ?? {}) }, e);
  rec.conflict = { ...prev.conflict!, active: false };
  rec.state = "READY_FOR_REVIEW"; rec.reviewed_by = ""; rec.reviewed_at = "";
  rec.revision = (prev.revision ?? 0) + 1;
  appendHistory(id, { revision: rec.revision, actor, role: "annotator", action: "RESOLVE_CONFLICT", decision: body.decision ?? "manual", note: body.note ?? "", from_state: prev.state, to_state: rec.state });
  saveAtomic(`${GT}/${id}.json`, rec);
  return { code: 200, body: { ok: true, record: rec } };
}

function pickSemantic(g: GroundTruth): Partial<GroundTruth> {
  const { confirmed_stratum, reading_order_text, regions, marginal_captions, section_boundaries, page_alignment, hebrew_fidelity_notes, unresolved_reason } = g;
  return { confirmed_stratum, reading_order_text, regions, marginal_captions, section_boundaries, page_alignment, hebrew_fidelity_notes, unresolved_reason };
}

const HTML = String.raw`<!doctype html><html lang="he"><head><meta charset="utf-8"><title>LAW ME — Benchmark Annotation v2</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--line:#2a2f3a;--fg:#e6e6e6;--mut:#8a94a3;--accent:#4c8dff;--ok:#3ddc84;--warn:#ffb454;--bad:#ff6b6b;--conf:#c77dff}
  *{box-sizing:border-box} body{margin:0;font:13px/1.5 -apple-system,Segoe UI,Arial;background:var(--bg);color:var(--fg);height:100vh;overflow:hidden}
  #top{display:flex;align-items:center;gap:10px;padding:6px 12px;background:var(--panel);border-bottom:1px solid var(--line);flex-wrap:wrap}
  #top b{font-size:14px} .pill{padding:2px 8px;border-radius:10px;font-size:11px;background:#1c2029;color:var(--mut)}
  .pill.mode-ANNOTATE{background:#12233f;color:var(--accent)} .pill.mode-REVIEW{background:#2a1f3a;color:var(--conf)}
  #main{display:grid;grid-template-columns:1fr 1fr;height:calc(100vh - 250px)}
  #pdfwrap{border-inline-end:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
  #pdftools{display:flex;gap:6px;padding:4px 8px;background:#12151c;border-bottom:1px solid var(--line);flex-wrap:wrap;align-items:center}
  #pdfview{flex:1;overflow:auto;background:#333;min-height:0} #frame{width:100%;height:100%;border:0;background:#333;transition:filter .1s}
  #ann{overflow:auto;padding:12px}
  .row{margin-bottom:10px} label{display:block;font-size:10px;letter-spacing:.05em;color:var(--mut);margin-bottom:3px;text-transform:uppercase}
  textarea,input,select{width:100%;background:#12151c;color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:7px;font:13px/1.5 inherit}
  textarea[dir=rtl]{direction:rtl} .big{min-height:150px}
  .draftbadge{display:inline-block;background:#3a2a10;color:var(--warn);border:1px solid #5a4016;padding:1px 6px;border-radius:6px;font-size:10px;margin-inline-start:8px}
  button{padding:5px 9px;border:1px solid var(--line);background:#12151c;color:var(--fg);border-radius:6px;cursor:pointer;font-size:12px}
  button:hover{border-color:var(--accent)} .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px} .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .regions .reg{display:grid;grid-template-columns:40px 110px 44px 1fr 26px;gap:5px;margin-bottom:5px;align-items:center}
  .stbadge{font-weight:700;padding:2px 8px;border-radius:6px;font-size:12px}
  .st-UNSTARTED,.st-{background:#1c2029;color:var(--mut)} .st-IN_PROGRESS{background:#12233f;color:var(--accent)}
  .st-READY_FOR_REVIEW{background:#3a3410;color:#ffe08a} .st-NEEDS_CORRECTION{background:#3a2a10;color:var(--warn)}
  .st-APPROVED{background:#12351f;color:var(--ok)} .st-UNRESOLVED{background:#3a1414;color:var(--bad)} .st-CONFLICT{background:#2a1f3a;color:var(--conf)}
  #valpanel{padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:12px}
  #valpanel.ok{background:#0f2417;border:1px solid #1e5c34} #valpanel.err{background:#2a1414;border:1px solid #5c1e1e}
  #valpanel ul{margin:4px 0 0;padding-inline-start:18px} .err-item{color:var(--bad)} .warn-item{color:var(--warn)}
  #bottom{height:204px;border-top:1px solid var(--line);background:var(--panel);display:grid;grid-template-columns:1.3fr 1fr;overflow:hidden}
  #dash{padding:8px 12px;overflow:auto;border-inline-end:1px solid var(--line)}
  .bar{height:8px;background:#1c2029;border-radius:4px;overflow:hidden;display:flex;margin-top:2px}
  .bar i{display:block;height:100%} .b-app{background:var(--ok)} .b-unr{background:var(--bad)} .b-rev{background:#ffe08a} .b-prog{background:var(--accent)} .b-conf{background:var(--conf)}
  table{border-collapse:collapse;width:100%;font-size:11px} td,th{padding:2px 6px;text-align:start;border-bottom:1px solid var(--line)} th{color:var(--mut);font-weight:600}
  #side{padding:8px 12px;overflow:auto} #list{max-height:120px;overflow:auto;border:1px solid var(--line);border-radius:6px}
  #list div{padding:2px 8px;cursor:pointer;display:flex;justify-content:space-between;gap:6px} #list div.cur{background:#1c2a44}
  .k{color:var(--accent);font-weight:600} .queue button,.filt button{margin:2px 3px 0 0}
  .diff ins{background:#12351f;color:var(--ok);text-decoration:none} .diff del{background:#2a1414;color:var(--bad)}
  .save-ok{color:var(--ok)} .save-dirty{color:var(--warn)} #recover{display:none;background:#3a3410;color:#ffe08a;padding:4px 8px;border-radius:6px}
  #reviewbox{display:none;border:1px solid var(--conf);border-radius:6px;padding:8px;margin-bottom:8px;background:#1a1526}
  #conflictbox{display:none;border:1px solid var(--conf);border-radius:6px;padding:8px;margin-bottom:8px;background:#1a1526}
  .muted{color:var(--mut)} .legend{font-size:11px;color:var(--mut)}
</style></head><body>
<div id="top">
  <b>LAW ME Benchmark Annotation</b>
  <span class="pill" id="pos"></span>
  <span class="stbadge st-" id="statebadge">—</span>
  <span class="pill" id="stratp"></span><span class="pill" id="pub"></span>
  <span class="pill mode-ANNOTATE" id="modep">ANNOTATE</span>
  <span style="flex:1"></span>
  <span id="savestate" class="save-ok">saved</span><span class="muted" id="savedat"></span>
  <button onclick="toggleLegend()">⌨ shortcuts</button>
</div>
<div id="legend" class="legend" style="display:none;padding:6px 12px;background:#12151c;border-bottom:1px solid var(--line)">
  <span class="k">J/K</span> next/prev · <span class="k">Shift+J/K</span> next/prev awaiting review · <span class="k">A</span> ready/approve · <span class="k">N</span> needs-correction/return · <span class="k">U</span> unresolved · <span class="k">R</span> toggle review mode · <span class="k">S</span> save · <span class="k">Ctrl/Cmd+Enter</span> save & next · <span class="k">G</span> go to page · <span class="k">F</span> fit page/width · <span class="k">D</span> draft↔human diff · <span class="k">1–9</span> pick stratum · <span class="k">Ctrl/Cmd+S</span> save (in fields)
</div>
<div id="main">
  <div id="pdfwrap">
    <div id="pdftools">
      <button onclick="fit('page')">fit page (F)</button><button onclick="fit('width')">fit width</button>
      <button onclick="zoom(-1)">−</button><button onclick="zoom(1)">+</button>
      <button onclick="rotate()">⟳ rotate</button><button onclick="invert()">◐ invert</button>
      <span class="muted" id="pdfnote">official PDF — the sole authority</span>
    </div>
    <div id="pdfview"><iframe id="frame"></iframe></div>
  </div>
  <div id="ann">
    <div id="recover">Unsaved autosave recovered from a previous crash. <button onclick="applyRecover()">restore</button> <button onclick="dismissRecover()">discard</button></div>
    <div id="valpanel" class="ok">validation: —</div>

    <div id="reviewbox">
      <b class="muted">SECOND REVIEWER MODE</b> — you see the annotator's result + the draft. You are proposing a review, not editing as the annotator.
      <div class="grid2" style="margin-top:6px"><div class="row"><label>Reviewer (must differ from annotator)</label><input id="reviewer"></div>
      <div class="row"><label>Review note (required for return/disagreement)</label><input id="review_note"></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button onclick="review('APPROVE')" style="border-color:#1e5c34">APPROVE (A)</button>
      <button onclick="review('RETURN')" style="border-color:#5a4016">RETURN FOR CORRECTION (N)</button>
      <button onclick="review('UNRESOLVED')" style="border-color:#5c1e1e">MARK UNRESOLVED (U)</button>
      <button onclick="review('CONFLICT')" style="border-color:var(--conf)">FLAG DISAGREEMENT</button></div>
      <div class="muted" style="margin-top:4px">annotator: <span id="annname">—</span> · changed vs annotator: <span id="revchanged">none</span></div>
    </div>

    <div id="conflictbox">
      <b style="color:var(--conf)">CONFLICT</b> — <span id="confnote"></span>
      <table style="margin-top:6px"><tr><th>field</th><th>annotator</th><th>reviewer</th></tr><tbody id="conftbody"></tbody></table>
      <div class="grid3" style="margin-top:6px"><button onclick="resolve('annotator')">keep annotator</button><button onclick="resolve('reviewer')">keep reviewer</button><button onclick="resolve('manual')">keep current edits</button></div>
      <div class="muted">resolving clears the conflict and returns the page to READY_FOR_REVIEW for a fresh second review.</div>
    </div>

    <div class="grid2">
      <div class="row"><label>Confirmed stratum <span class="muted" id="stratsug"></span></label><select id="confirmed_stratum"></select></div>
      <div class="row"><label>Stratum change note (if changed)</label><input id="stratum_change_note"></div>
    </div>
    <div class="row"><label>Reading-order text <span class="draftbadge">DRAFT — verify against the PDF; edit freely, never auto-accepted</span>
      <button style="float:inline-end" onclick="toggleDiff()">draft↔human diff (D)</button></label>
      <textarea id="reading_order_text" class="big" dir="rtl"></textarea>
      <div id="diffview" class="diff" style="display:none;border:1px solid var(--line);border-radius:6px;padding:8px;margin-top:6px;direction:rtl"></div>
    </div>
    <div class="row regions"><label>Regions (role · column · reading-order # · description) — reading order top→bottom</label>
      <div id="regions"></div><button onclick="addRegion()">+ region</button></div>
    <div class="grid2">
      <div class="row"><label>Marginal captions (one per line)</label><textarea id="marginal_captions" dir="rtl" style="min-height:60px"></textarea></div>
      <div class="row"><label>Section boundaries (comma sep, in reading order)</label><textarea id="section_boundaries" dir="rtl" style="min-height:60px"></textarea></div>
    </div>
    <div class="grid2">
      <div class="row"><label>Printed page label (folio; 'none' if absent)</label><input id="printed_page_label"></div>
      <div class="row"><label>Gazette page (ספר החוקים)</label><input id="gazette_page"></div>
    </div>
    <div class="row"><label>Hebrew / glyph fidelity notes (write 'no issues' if clean)</label><textarea id="hebrew_fidelity_notes" dir="rtl" style="min-height:46px"></textarea></div>
    <div class="row" id="unresolvedrow" style="display:none"><label>Unresolved reason (required for UNRESOLVED)</label><textarea id="unresolved_reason" dir="rtl" style="min-height:46px"></textarea></div>
    <div class="grid3">
      <div class="row"><label>Annotator</label><input id="annotator"></div>
      <div class="row"><label>Reviewed by (set by reviewer)</label><input id="reviewed_by" readonly></div>
      <div class="row"><label>Confidence</label><select id="confidence"><option value="">—</option><option>high</option><option>medium</option><option>low</option></select></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      <button onclick="go(-1)">◀ Prev (K)</button>
      <button onclick="annState('READY_FOR_REVIEW')" style="border-color:#5a4016">Mark READY_FOR_REVIEW (A)</button>
      <button onclick="annState('UNRESOLVED_PROPOSE')">Propose UNRESOLVED (U)</button>
      <button onclick="save()">Save (Ctrl+S)</button>
      <button onclick="loadDraft()">Reset to draft (R-menu)</button>
      <button onclick="saveNext()">Save & next (⌘⏎)</button>
      <button onclick="go(1)">Next (J) ▶</button>
      <button onclick="showHistory()">history</button>
    </div>
    <div id="historybox" class="muted" style="display:none;margin-top:8px;border:1px solid var(--line);border-radius:6px;padding:8px;max-height:140px;overflow:auto"></div>
  </div>
</div>
<div id="bottom">
  <div id="dash"><b>Dashboard</b> <span class="muted">(live)</span><div id="dashbody"></div></div>
  <div id="side">
    <div class="queue"><b>Queues:</b>
      <button onclick="jumpQueue('unannotated')">unannotated</button><button onclick="jumpQueue('needs')">needs correction</button>
      <button onclick="jumpQueue('awaiting')">awaiting review</button><button onclick="jumpQueue('conflict')">conflict</button>
      <button onclick="jumpQueue('unresolved')">unresolved</button><button onclick="jumpQueue('stratum')">same stratum</button>
    </div>
    <div class="filt" style="margin-top:4px"><b>Filter:</b>
      <select id="fstate" onchange="renderList()"><option value="">all states</option></select>
      <select id="fstrat" onchange="renderList()"><option value="">all strata</option></select>
      <input id="fjump" placeholder="jump: bench-012 or p=364" style="width:150px;display:inline-block" onkeydown="if(event.key==='Enter')doJump()">
    </div>
    <div id="list" style="margin-top:6px"></div>
  </div>
</div>
<script>
const STRATA=${JSON.stringify(STRATA)}, ROLES=${JSON.stringify(REGION_ROLES)}, STATES=${JSON.stringify(STATES)};
let M=[], i=0, gtCache={}, dirty=false, mode='ANNOTATE', showDiff=false, fitMode='page', zoomLvl=0, rot=0, inv=false, annSnapshot=null, valTimer=null;
const $=id=>document.getElementById(id);
const FIELDS=['confirmed_stratum','stratum_change_note','reading_order_text','marginal_captions','section_boundaries','printed_page_label','gazette_page','hebrew_fidelity_notes','unresolved_reason','annotator','confidence'];
async function boot(){
  M=(await (await fetch('/api/manifest')).json()).entries;
  $('confirmed_stratum').innerHTML='<option value="">—</option>'+STRATA.map(s=>'<option>'+s+'</option>').join('');
  $('fstate').innerHTML='<option value="">all states</option>'+STATES.map(s=>'<option>'+s+'</option>').join('');
  $('fstrat').innerHTML='<option value="">all strata</option>'+STRATA.map(s=>'<option>'+s+'</option>').join('');
  FIELDS.forEach(id=>$(id).addEventListener('input',()=>{markDirty();scheduleValidate();}));
  await load(0); await dash();
  setInterval(()=>{ if(dirty) save(); }, 4000);
  window.addEventListener('beforeunload',e=>{ if(dirty){e.preventDefault();e.returnValue='';} });
}
function markDirty(){dirty=true; $('savestate').textContent='unsaved…'; $('savestate').className='save-dirty'; try{localStorage.setItem('lawme-buf-'+M[i].id, JSON.stringify(collect()));}catch(_){}}
function collect(){
  const e=M[i];
  return { id:e.id, confirmed_stratum:$('confirmed_stratum').value, stratum_change_note:$('stratum_change_note').value,
    reading_order_text:$('reading_order_text').value,
    regions:[...document.querySelectorAll('#regions .reg')].map((r,n)=>({id:r.querySelector('.r-id').value||('r'+(n+1)),role:r.querySelector('.r-role').value,column:Number(r.querySelector('.r-col').value)||0,order:n+1,desc:r.querySelector('.r-desc').value})),
    marginal_captions:$('marginal_captions').value.split('\n').map(s=>s.trim()).filter(Boolean),
    section_boundaries:$('section_boundaries').value.split(',').map(s=>s.trim()).filter(Boolean),
    page_alignment:{printed_page_label:$('printed_page_label').value.trim(),gazette_page:$('gazette_page').value.trim()},
    hebrew_fidelity_notes:$('hebrew_fidelity_notes').value, unresolved_reason:$('unresolved_reason').value,
    annotator:$('annotator').value.trim(), confidence:$('confidence').value };
}
function fill(gt,draft){
  const hasGt=gt&&(gt.state&&gt.state!=='UNSTARTED')||(gt&&gt.reading_order_text&&gt.reading_order_text.length);
  $('confirmed_stratum').value=(hasGt&&gt.confirmed_stratum)||'';
  $('stratum_change_note').value=gt.stratum_change_note||'';
  $('reading_order_text').value=hasGt?(gt.reading_order_text||''):(draft.reading_order_text||'');
  $('marginal_captions').value=((hasGt&&gt.marginal_captions)||draft.marginal_captions||[]).join('\n');
  $('section_boundaries').value=((hasGt&&gt.section_boundaries)||draft.section_boundaries||[]).join(', ');
  $('printed_page_label').value=(gt.page_alignment||{}).printed_page_label||'';
  $('gazette_page').value=(gt.page_alignment||{}).gazette_page||'';
  $('hebrew_fidelity_notes').value=gt.hebrew_fidelity_notes||'';
  $('unresolved_reason').value=gt.unresolved_reason||'';
  $('annotator').value=gt.annotator||''; $('reviewed_by').value=gt.reviewed_by||''; $('confidence').value=gt.confidence||'';
  const regs=(gt.regions&&gt.regions.length?gt.regions:(hasGt?[]:(draft.regions||[]))); $('regions').innerHTML=''; regs.forEach(addRegion);
  paintState(gt.state||'UNSTARTED');
  $('unresolvedrow').style.display=(gt.state==='UNRESOLVED'||gt.unresolved_reason)?'block':'none';
  $('stratsug').textContent='manifest suggests: '+(draft.stratum_tentative||M[i].stratum_tentative||'—');
  renderConflict(gt); renderReviewBox(gt);
}
function addRegion(r){ r=r&&r.role?r:{id:'',role:'body',column:0,desc:''};
  const div=document.createElement('div'); div.className='reg';
  div.innerHTML='<input class="r-id" placeholder="id" value="'+(r.id||'').replace(/"/g,'&quot;')+'">'
   +'<select class="r-role">'+ROLES.map(x=>'<option>'+x+'</option>').join('')+'</select>'
   +'<input class="r-col" value="'+(r.column||0)+'" title="column">'
   +'<input class="r-desc" placeholder="description / location" value="'+(r.desc||r.bbox_or_desc||'').replace(/"/g,'&quot;')+'">'
   +'<button onclick="this.parentNode.remove();markDirty();scheduleValidate()">✕</button>';
  div.querySelector('.r-role').value=r.role||'body';
  div.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',()=>{markDirty();scheduleValidate();}));
  $('regions').appendChild(div);
}
function applyFrame(){ const e=M[i]; const z=fitMode==='page'?'page-fit':(fitMode==='width'?'page-width':(100+zoomLvl*15));
  $('frame').src='/pdf/'+e.publication_item_id+'#page='+e.page_number+'&zoom='+z;
  $('frame').style.transform='rotate('+rot+'deg)'; $('frame').style.filter=inv?'invert(1) hue-rotate(180deg)':'none'; }
function fit(m){fitMode=m;zoomLvl=0;applyFrame();} function zoom(d){fitMode='custom';zoomLvl=Math.max(-4,Math.min(12,zoomLvl+d));applyFrame();}
function rotate(){rot=(rot+90)%360;applyFrame();} function invert(){inv=!inv;applyFrame();}
async function load(n){
  i=Math.max(0,Math.min(M.length-1,n)); const e=M[i];
  applyFrame();
  $('pos').textContent=(i+1)+' / '+M.length+' ('+e.id+')'; $('stratp').textContent='tentative: '+e.stratum_tentative;
  $('pub').textContent='pub '+e.publication_item_id+' · p'+e.page_number+' · '+(e.year||'');
  const draft=await (await fetch('/api/draft/'+e.id)).json().catch(()=>({}));
  const gt=await (await fetch('/api/gt/'+e.id)).json().catch(()=>({})); gtCache[e.id]=gt||{};
  annSnapshot=JSON.parse(JSON.stringify(gt||{}));
  fill(gt||{},draft||{}); dirty=false; $('savestate').textContent='saved'; $('savestate').className='save-ok';
  $('savedat').textContent=gt&&gt.annotated_at?(' · '+new Date(gt.annotated_at).toLocaleString()):'';
  if(showDiff) renderDiff(draft); checkRecover(); renderList(); scheduleValidate();
}
function loadDraft(){ if(!confirm('Replace current text/regions with the layout-2 DRAFT? (your edits will be overwritten)'))return;
  fetch('/api/draft/'+M[i].id).then(r=>r.json()).then(d=>{ $('reading_order_text').value=d.reading_order_text||''; $('marginal_captions').value=(d.marginal_captions||[]).join('\n'); $('section_boundaries').value=(d.section_boundaries||[]).join(', '); $('regions').innerHTML=''; (d.regions||[]).forEach(addRegion); markDirty();scheduleValidate(); }); }
function paintState(s){ $('statebadge').className='stbadge st-'+s; $('statebadge').textContent=s; }
function scheduleValidate(){ clearTimeout(valTimer); valTimer=setTimeout(validateNow,300); }
async function validateNow(){
  const rec=collect(); const r=await (await fetch('/api/validate/'+M[i].id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rec)})).json();
  const p=$('valpanel'); const errs=r.errors||[],warns=r.warnings||[];
  if(!errs.length&&!warns.length){p.className='ok';p.innerHTML='validation: ✓ no issues';return;}
  p.className=errs.length?'err':'ok';
  p.innerHTML='validation: '+errs.length+' error(s), '+warns.length+' warning(s)<ul>'
    +errs.map(e=>'<li class="err-item">'+esc(e)+'</li>').join('')+warns.map(w=>'<li class="warn-item">'+esc(w)+'</li>').join('')+'</ul>';
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
async function annState(which){
  if(which==='UNRESOLVED_PROPOSE'){ $('unresolvedrow').style.display='block'; if(!$('unresolved_reason').value){alert('Enter an unresolved reason, then press U again.');$('unresolved_reason').focus();return;}
    const rec=collect(); rec.state='READY_FOR_REVIEW'; rec.proposed_resolution='UNRESOLVED'; await postSave(rec); return; }
  const rec=collect(); rec.state='READY_FOR_REVIEW'; rec.proposed_resolution='APPROVED'; await postSave(rec);
}
async function save(){ const rec=collect(); rec.state=(gtCache[M[i].id]||{}).state||'IN_PROGRESS'; if(rec.state==='UNSTARTED')rec.state='IN_PROGRESS'; await postSave(rec); }
async function postSave(rec){
  const e=M[i]; const r=await (await fetch('/api/gt/'+e.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rec)})).json();
  gtCache[e.id]=r.record||rec; paintState((r.record||rec).state);
  dirty=false; try{localStorage.removeItem('lawme-buf-'+e.id);}catch(_){}
  $('savestate').textContent=r.clamped?'saved (not yet complete)':'saved ✓'; $('savestate').className=r.clamped?'save-dirty':'save-ok';
  if(r.review_invalidated) toast('second review was invalidated by this edit — page returned to READY_FOR_REVIEW');
  if(r.clamped) toast('cannot mark READY_FOR_REVIEW: '+(r.errors||[]).slice(0,3).join('; '));
  validateNow(); renderList(); dash();
}
function toast(m){ $('savestate').textContent=m; }
async function saveNext(){ await save(); go(1); }
function go(d){ if(dirty) save(); load(i+d); }
async function go2(n){ if(dirty) await save(); load(n); }
// Review mode
function toggleReview(){ mode=mode==='ANNOTATE'?'REVIEW':'ANNOTATE'; $('modep').textContent=mode; $('modep').className='pill mode-'+mode;
  $('reviewbox').style.display=mode==='REVIEW'?'block':'none'; renderReviewBox(gtCache[M[i].id]||{}); }
function renderReviewBox(gt){ if(mode!=='REVIEW')return; $('annname').textContent=gt.annotator||'—';
  const cur=collect(); const ch=[]; ['confirmed_stratum','reading_order_text','section_boundaries','marginal_captions','hebrew_fidelity_notes','unresolved_reason'].forEach(f=>{ if(JSON.stringify((annSnapshot||{})[f]??null)!==JSON.stringify(cur[f]??null))ch.push(f);}); $('revchanged').textContent=ch.length?ch.join(', '):'none'; }
async function review(action){
  const reviewer=$('reviewer').value.trim(); if(!reviewer){alert('Enter reviewer identity (must differ from annotator).');$('reviewer').focus();return;}
  const correction=collect(); const body={action,reviewer,note:$('review_note').value.trim(),correction};
  const res=await fetch('/api/review/'+M[i].id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const r=await res.json(); if(!res.ok){alert('Review rejected: '+(r.error||'')+(r.errors?'\n- '+r.errors.join('\n- '):''));return;}
  gtCache[M[i].id]=r.record; toast('review saved: '+action); load(i);
}
function renderConflict(gt){ const box=$('conflictbox'); if(!gt||!gt.conflict||!gt.conflict.active){box.style.display='none';return;}
  box.style.display='block'; $('confnote').textContent=(gt.conflict.note||'')+' (raised by '+(gt.conflict.raised_by||'?')+')';
  const av=gt.conflict.annotator_version||{},rv=gt.conflict.reviewer_version||{}; const fields=gt.conflict.fields&&gt.conflict.fields.length?gt.conflict.fields:Object.keys({...av,...rv});
  $('conftbody').innerHTML=fields.map(f=>'<tr><td>'+f+'</td><td dir="rtl">'+esc(JSON.stringify(av[f])).slice(0,120)+'</td><td dir="rtl">'+esc(JSON.stringify(rv[f])).slice(0,120)+'</td></tr>').join(''); }
async function resolve(which){ const gt=gtCache[M[i].id]||{}; const c=gt.conflict||{}; let chosen={};
  if(which==='annotator')chosen=c.annotator_version||{}; else if(which==='reviewer')chosen=c.reviewer_version||{}; else chosen=collect();
  const actor=$('annotator').value.trim()||prompt('Your name (resolver):')||''; if(!actor)return;
  const r=await (await fetch('/api/resolve/'+M[i].id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({actor,decision:which,chosen})})).json();
  gtCache[M[i].id]=r.record; toast('conflict resolved ('+which+') → READY_FOR_REVIEW'); load(i); }
// Diff
function toggleDiff(){ showDiff=!showDiff; $('diffview').style.display=showDiff?'block':'none'; if(showDiff)fetch('/api/draft/'+M[i].id).then(r=>r.json()).then(renderDiff); }
function renderDiff(draft){ const a=(draft.reading_order_text||'').split('\n'),b=$('reading_order_text').value.split('\n');
  $('diffview').innerHTML=lineDiff(a,b)||'<span class="muted">draft and human text are identical</span>'; }
function lineDiff(a,b){ const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let x=n-1;x>=0;x--)for(let y=m-1;y>=0;y--)dp[x][y]=a[x]===b[y]?dp[x+1][y+1]+1:Math.max(dp[x+1][y],dp[x][y+1]);
  let x=0,y=0,out=''; while(x<n&&y<m){ if(a[x]===b[y]){out+=esc(a[x])+'<br>';x++;y++;} else if(dp[x+1][y]>=dp[x][y+1]){out+='<del>'+esc(a[x])+'</del><br>';x++;} else {out+='<ins>'+esc(b[y])+'</ins><br>';y++;} }
  while(x<n){out+='<del>'+esc(a[x++])+'</del><br>';} while(y<m){out+='<ins>'+esc(b[y++])+'</ins><br>';} return out; }
// Queues / list / dashboard
function stateOf(id){return (gtCache[id]||{}).state||'UNSTARTED';}
function findFrom(pred,dir){ for(let s=1;s<=M.length;s++){ const n=(i+dir*s+M.length*10)%M.length; if(pred(M[n]))return n;} return -1;}
function jumpQueue(kind){ const cur=M[i]; let pred;
  if(kind==='unannotated')pred=e=>['UNSTARTED','IN_PROGRESS'].includes(stateOf(e.id));
  else if(kind==='needs')pred=e=>stateOf(e.id)==='NEEDS_CORRECTION';
  else if(kind==='awaiting')pred=e=>stateOf(e.id)==='READY_FOR_REVIEW'&&!((gtCache[e.id]||{}).reviewed_by||'').trim();
  else if(kind==='conflict')pred=e=>stateOf(e.id)==='CONFLICT';
  else if(kind==='unresolved')pred=e=>stateOf(e.id)==='UNRESOLVED';
  else if(kind==='stratum'){const s=(gtCache[cur.id]||{}).confirmed_stratum||cur.stratum_tentative;pred=e=>((gtCache[e.id]||{}).confirmed_stratum||e.stratum_tentative)===s;}
  const n=findFrom(pred,1); if(n<0)toast('none found for queue: '+kind); else go2(n); }
function doJump(){ const v=$('fjump').value.trim(); if(!v)return; let n=-1;
  if(/^p=/.test(v)){const pg=Number(v.slice(2));n=M.findIndex(e=>Number(e.page_number)===pg);}
  else n=M.findIndex(e=>e.id===v||e.id==='bench-'+v.padStart(3,'0'));
  if(n<0)toast('not found: '+v); else go2(n); }
function renderList(){ const fs=$('fstate').value,fst=$('fstrat').value; const el=$('list');
  el.innerHTML=M.map((e,n)=>{const g=gtCache[e.id]||{};const st=g.state||'UNSTARTED';const strat=g.confirmed_stratum||e.stratum_tentative;
    if(fs&&st!==fs)return'';if(fst&&strat!==fst)return'';
    const rv=(g.reviewed_by||'').trim()?' ✓2':''; const cf=g.conflict&&g.conflict.active?' ⚠':'';
    return '<div class="'+(n===i?'cur':'')+'" onclick="go2('+n+')"><span>'+e.id+' · '+strat+'</span><span class="st-'+st+'">'+st.replace(/_/g,' ').toLowerCase()+rv+cf+'</span></div>';}).join('');
  const cur=el.querySelector('.cur'); if(cur)cur.scrollIntoView({block:'nearest'}); }
async function dash(){ const d=await (await fetch('/api/dashboard')).json(); const o=d.overall;
  const barrow=c=>{const w=x=>c.total?(100*x/c.total).toFixed(1)+'%':'0';return '<div class="bar"><i class="b-app" style="width:'+w(c.approved)+'"></i><i class="b-unr" style="width:'+w(c.unresolved)+'"></i><i class="b-rev" style="width:'+w(c.ready_for_review)+'"></i><i class="b-prog" style="width:'+w(c.in_progress)+'"></i><i class="b-conf" style="width:'+w(c.conflicts)+'"></i></div>';};
  let h='<table><tr><th>overall</th><th>n</th></tr>'
   +[['total',o.total],['unstarted',o.unstarted],['in progress',o.in_progress],['needs correction',o.needs_correction],['ready for review',o.ready_for_review],['approved',o.approved],['unresolved',o.unresolved],['awaiting 2nd review',o.awaiting_second_review],['2nd-reviewed',o.second_reviewed],['conflicts',o.conflicts],['<b>ready to freeze</b>','<b>'+o.ready_to_freeze+'/'+o.total+'</b>']].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</table>'+barrow(o);
  h+='<table style="margin-top:6px"><tr><th>stratum</th><th>annot</th><th>rev</th><th>app</th><th>unr</th><th>conf</th></tr>';
  Object.keys(d.by_stratum).sort().forEach(s=>{const c=d.by_stratum[s];const annot=c.total-c.unstarted;h+='<tr><td>'+s.replace(/_/g,' ')+'</td><td>'+annot+'/'+c.total+'</td><td>'+c.second_reviewed+'/'+c.total+'</td><td>'+c.approved+'</td><td>'+c.unresolved+'</td><td>'+c.conflicts+'</td></tr>';});
  h+='</table>'; $('dashbody').innerHTML=h; }
async function showHistory(){ const box=$('historybox'); box.style.display=box.style.display==='none'?'block':'none'; if(box.style.display==='none')return;
  const h=await (await fetch('/api/history/'+M[i].id)).json();
  box.innerHTML=h.length?h.map(e=>'<div>rev'+ (e.revision||'?')+' · '+(e.role||'')+' '+(e.actor||'')+' · <b>'+(e.action||'')+'</b> '+(e.from_state||'')+'→'+(e.to_state||'')+(e.changed_fields&&e.changed_fields.length?' ['+e.changed_fields.join(',')+']':'')+' · '+(e.at||'').slice(0,19)+'</div>').join(''):'<span class="muted">no history yet</span>'; }
// crash recovery
function checkRecover(){ try{const b=localStorage.getItem('lawme-buf-'+M[i].id); if(b){const buf=JSON.parse(b); if(JSON.stringify(buf.reading_order_text)!==JSON.stringify($('reading_order_text').value)){$('recover').style.display='block';window._recoverBuf=buf;return;}}}catch(_){}; $('recover').style.display='none'; }
function applyRecover(){ const b=window._recoverBuf; if(!b)return; $('reading_order_text').value=b.reading_order_text||''; $('marginal_captions').value=(b.marginal_captions||[]).join('\n'); $('section_boundaries').value=(b.section_boundaries||[]).join(', '); if(b.annotator)$('annotator').value=b.annotator; markDirty();scheduleValidate(); $('recover').style.display='none'; }
function dismissRecover(){ try{localStorage.removeItem('lawme-buf-'+M[i].id);}catch(_){}; $('recover').style.display='none'; }
function toggleLegend(){ const l=$('legend'); l.style.display=l.style.display==='none'?'block':'none'; }
// keyboard
document.addEventListener('keydown',ev=>{
  const typing=['TEXTAREA','INPUT','SELECT'].includes(ev.target.tagName);
  if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();saveNext();return;}
  if((ev.ctrlKey||ev.metaKey)&&(ev.key==='s'||ev.key==='S')){ev.preventDefault();save();return;}
  if(typing)return;
  if(ev.shiftKey&&(ev.key==='J')){const n=findFrom(e=>stateOf(e.id)==='READY_FOR_REVIEW'&&!((gtCache[e.id]||{}).reviewed_by||'').trim(),1);if(n>=0)go2(n);return;}
  if(ev.shiftKey&&(ev.key==='K')){const n=findFrom(e=>stateOf(e.id)==='READY_FOR_REVIEW'&&!((gtCache[e.id]||{}).reviewed_by||'').trim(),-1);if(n>=0)go2(n);return;}
  if(ev.key==='j'||ev.key==='J')go(1); else if(ev.key==='k'||ev.key==='K')go(-1);
  else if(ev.key==='a'||ev.key==='A'){mode==='REVIEW'?review('APPROVE'):annState('READY_FOR_REVIEW');}
  else if(ev.key==='n'||ev.key==='N'){mode==='REVIEW'?review('RETURN'):annState('READY_FOR_REVIEW');}
  else if(ev.key==='u'||ev.key==='U'){mode==='REVIEW'?review('UNRESOLVED'):annState('UNRESOLVED_PROPOSE');}
  else if(ev.key==='r'||ev.key==='R')toggleReview();
  else if(ev.key==='s'||ev.key==='S')save();
  else if(ev.key==='g'||ev.key==='G'){$('fjump').focus();}
  else if(ev.key==='f'||ev.key==='F')fit(fitMode==='page'?'width':'page');
  else if(ev.key==='d'||ev.key==='D')toggleDiff();
  else if(/^[1-9]$/.test(ev.key)){const s=STRATA[Number(ev.key)-1];if(s){$('confirmed_stratum').value=s;markDirty();scheduleValidate();}}
});
boot();
</script></body></html>`;

function body(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b)); });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost`);
  const send = (code: number, type: string, b: string | Buffer) => { res.writeHead(code, { "content-type": type }); res.end(b); };
  const json = (code: number, o: unknown) => send(code, "application/json", JSON.stringify(o));
  try {
    if (url.pathname === "/") return send(200, "text/html; charset=utf-8", HTML);
    if (url.pathname === "/api/manifest") return json(200, manifest);
    if (url.pathname === "/api/dashboard") return json(200, computeCounts(loadAll(DIR, manifest), manifest));
    if (url.pathname.startsWith("/api/draft/")) { const id = url.pathname.split("/").pop()!; return json(200, readJson(`${DIR}/drafts/${id}.json`) ?? {}); }
    if (url.pathname.startsWith("/api/history/")) { const id = url.pathname.split("/").pop()!; return json(200, readHistory(id)); }
    if (url.pathname === "/api/gt") { const all = manifest.entries.map((e) => loadGroundTruth(DIR, e.id)).filter(Boolean); return json(200, all); }
    if (url.pathname.startsWith("/api/validate/")) { const id = url.pathname.split("/").pop()!; const rec = JSON.parse((await body(req)) || "{}"); const e = entryOf.get(id); return json(200, validatePage(rec, e)); }
    if (url.pathname.startsWith("/api/review/")) { const id = url.pathname.split("/").pop()!; const r = handleReview(id, JSON.parse((await body(req)) || "{}")); return json(r.code, r.body); }
    if (url.pathname.startsWith("/api/resolve/")) { const id = url.pathname.split("/").pop()!; const r = handleResolve(id, JSON.parse((await body(req)) || "{}")); return json(r.code, r.body); }
    if (url.pathname.startsWith("/api/gt/")) {
      const id = url.pathname.split("/").pop()!;
      if (req.method === "POST") { const r = handleSave(id, JSON.parse((await body(req)) || "{}")); return json(r.code, r.body); }
      return json(200, loadGroundTruth(DIR, id) ?? {});
    }
    if (url.pathname.startsWith("/pdf/")) { const item = url.pathname.split("/").pop()!; const p = `${DIR}/pdfs/${item}.pdf`; if (!existsSync(p)) return send(404, "text/plain", "pdf not prepared — run prepare-annotation.ts"); return send(200, "application/pdf", readFileSync(p)); }
    return send(404, "text/plain", "not found");
  } catch (e) { send(500, "text/plain", String(e)); }
});
if (!process.env.NO_LISTEN) {
  server.listen(PORT, () => process.stdout.write(
    `Annotation workspace v2: http://localhost:${PORT}\n` +
    `${manifest.entries.length} pages · ground truth → ${GT}/ · history → ${HIST}/\n` +
    `HUMAN review only — the layout-2 draft is a suggestion, never auto-accepted. published=0.\n`,
  ));
}

// Exported for deterministic tests (import with NO_LISTEN=1). These are the exact
// code paths the HTTP routes use; the server is a thin wrapper over them.
export { handleSave, handleReview, handleResolve, server };
