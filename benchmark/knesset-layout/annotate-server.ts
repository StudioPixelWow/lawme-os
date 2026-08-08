/**
 * Phase 1 — local Human Ground Truth Annotation Workspace (operator, LOCAL).
 *
 *   node --experimental-strip-types benchmark/knesset-layout/annotate-server.ts
 *   → open http://localhost:8787
 *
 * Serves the annotation UI, the official PDF pages (from ./pdfs, shown at the
 * exact page), and the layout-2 DRAFT (accelerator only, clearly marked). Saves
 * each ground-truth record incrementally to ./ground-truth/<id>.json on every
 * edit (atomic temp+rename) so work can't be lost. NO candidate OCR/engine output
 * is ever shown. Nothing is scored or frozen here.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync } from "node:fs";
import { extname } from "node:path";

const DIR = "benchmark/knesset-layout";
const GT = `${DIR}/ground-truth`;
const PORT = Number(process.env.PORT ?? 8787);
const manifest = JSON.parse(readFileSync(`${DIR}/manifest-v1.json`, "utf8"));

const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const saveAtomic = (p: string, obj: unknown) => { const tmp = `${p}.tmp`; writeFileSync(tmp, JSON.stringify(obj, null, 2)); renameSync(tmp, p); };

const HTML = String.raw`<!doctype html><html lang="he"><head><meta charset="utf-8"><title>LAW ME — Benchmark Annotation</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--line:#2a2f3a;--fg:#e6e6e6;--mut:#8a94a3;--accent:#4c8dff;--ok:#3ddc84;--warn:#ffb454;--bad:#ff6b6b}
  *{box-sizing:border-box} body{margin:0;font:14px/1.5 -apple-system,Segoe UI,Arial;background:var(--bg);color:var(--fg);height:100vh;overflow:hidden}
  #top{display:flex;align-items:center;gap:12px;padding:8px 14px;background:var(--panel);border-bottom:1px solid var(--line)}
  #top b{font-size:14px} .pill{padding:2px 8px;border-radius:10px;font-size:12px;background:#1c2029;color:var(--mut)}
  #main{display:grid;grid-template-columns:1fr 1fr;height:calc(100vh - 46px)}
  #pdf{border-inline-end:1px solid var(--line)} #pdf iframe{width:100%;height:100%;border:0;background:#333}
  #ann{overflow:auto;padding:14px}
  .row{margin-bottom:12px} label{display:block;font-size:11px;letter-spacing:.06em;color:var(--mut);margin-bottom:4px;text-transform:uppercase}
  textarea,input,select{width:100%;background:#12151c;color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:8px;font:13px/1.5 inherit}
  textarea[dir=rtl]{direction:rtl} .big{min-height:190px}
  .draftbadge{display:inline-block;background:#3a2a10;color:var(--warn);border:1px solid #5a4016;padding:1px 6px;border-radius:6px;font-size:11px;margin-inline-start:8px}
  .states button{padding:6px 10px;border:1px solid var(--line);background:#12151c;color:var(--fg);border-radius:6px;cursor:pointer;margin-inline-end:6px}
  .states button.on-APPROVED{background:#12351f;border-color:#1e5c34;color:var(--ok)}
  .states button.on-NEEDS_CORRECTION{background:#3a2a10;border-color:#5a4016;color:var(--warn)}
  .states button.on-UNRESOLVED{background:#3a1414;border-color:#5c1e1e;color:var(--bad)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .regions .reg{display:grid;grid-template-columns:120px 60px 1fr 28px;gap:6px;margin-bottom:6px}
  .nav button,.btn{padding:6px 10px;border:1px solid var(--line);background:#12151c;color:var(--fg);border-radius:6px;cursor:pointer}
  #dash{padding:10px 14px;background:var(--panel);border-top:1px solid var(--line);font-size:12px;color:var(--mut);position:sticky;bottom:0}
  #dash b{color:var(--fg)} .k{color:var(--accent)} .save-ok{color:var(--ok)} .save-dirty{color:var(--warn)}
  #list{max-height:120px;overflow:auto;border:1px solid var(--line);border-radius:6px;margin-top:6px}
  #list div{padding:3px 8px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between}
  #list div.cur{background:#1c2a44} .st-APPROVED{color:var(--ok)} .st-NEEDS_CORRECTION{color:var(--warn)} .st-UNRESOLVED{color:var(--bad)} .st-{color:var(--mut)}
</style></head><body>
<div id="top">
  <b>LAW ME Benchmark Annotation</b>
  <span class="pill" id="pos"></span><span class="pill" id="strat"></span><span class="pill" id="pub"></span>
  <span style="flex:1"></span>
  <span id="savestate" class="save-ok">saved</span>
  <span class="pill">shortcuts: <span class="k">J/K</span> nav · <span class="k">A/N/U</span> state · <span class="k">Ctrl+S</span> save · <span class="k">R</span> load draft</span>
</div>
<div id="main">
  <div id="pdf"><iframe id="frame"></iframe></div>
  <div id="ann">
    <div class="row"><label>Confirmed stratum</label><select id="confirmed_stratum"></select></div>
    <div class="row"><label>Reading-order text <span class="draftbadge">DRAFT — verify against the PDF; edit freely</span></label>
      <textarea id="reading_order_text" class="big" dir="rtl"></textarea></div>
    <div class="row regions"><label>Regions</label><div id="regions"></div><button class="btn" onclick="addRegion()">+ region</button></div>
    <div class="grid2">
      <div class="row"><label>Marginal captions (one per line)</label><textarea id="marginal_captions" dir="rtl" style="min-height:70px"></textarea></div>
      <div class="row"><label>Section boundaries (comma sep)</label><textarea id="section_boundaries" dir="rtl" style="min-height:70px"></textarea></div>
    </div>
    <div class="grid2">
      <div class="row"><label>Printed page label</label><input id="printed_page_label"></div>
      <div class="row"><label>Gazette page (ספר החוקים)</label><input id="gazette_page"></div>
    </div>
    <div class="row"><label>Hebrew / glyph fidelity notes</label><textarea id="hebrew_fidelity_notes" dir="rtl" style="min-height:50px"></textarea></div>
    <div class="grid2">
      <div class="row"><label>Annotator</label><input id="annotator"></div>
      <div class="row"><label>Reviewed by (2nd reviewer)</label><input id="reviewed_by"></div>
    </div>
    <div class="grid2">
      <div class="row"><label>Confidence</label><select id="confidence"><option value="">—</option><option>high</option><option>medium</option><option>low</option></select></div>
      <div class="row"><label>State</label><div class="states" id="states">
        <button data-s="APPROVED">APPROVED (A)</button><button data-s="NEEDS_CORRECTION">NEEDS_CORRECTION (N)</button><button data-s="UNRESOLVED">UNRESOLVED (U)</button>
      </div></div>
    </div>
    <div class="nav" style="display:flex;gap:8px;margin-top:8px">
      <button onclick="go(-1)">◀ Prev (K)</button><button onclick="save()">Save (Ctrl+S)</button><button onclick="go(1)">Next (J) ▶</button>
      <button class="btn" onclick="loadDraft()">Reset to draft (R)</button>
    </div>
    <div id="list"></div>
  </div>
</div>
<div id="dash"></div>
<script>
const STRATA=["classic_marginal_caption","modern_two_column","complex_modern","old_font","doubled_text_layer","budget_table","image_partial","front_or_index"];
let M=[], i=0, gtCache={}, dirty=false;
const $=id=>document.getElementById(id);
async function boot(){
  M=(await (await fetch('/api/manifest')).json()).entries;
  const sel=$('confirmed_stratum'); sel.innerHTML='<option value="">—</option>'+STRATA.map(s=>'<option>'+s+'</option>').join('');
  $('states').querySelectorAll('button').forEach(b=>b.onclick=()=>setState(b.dataset.s));
  ['confirmed_stratum','reading_order_text','marginal_captions','section_boundaries','printed_page_label','gazette_page','hebrew_fidelity_notes','annotator','reviewed_by','confidence'].forEach(id=>$(id).addEventListener('input',()=>markDirty()));
  await load(0); renderList(); dash();
  setInterval(()=>{ if(dirty) save(); }, 4000); // autosave
}
function markDirty(){dirty=true; $('savestate').textContent='unsaved…'; $('savestate').className='save-dirty';}
function collect(){
  const e=M[i];
  return { id:e.id, confirmed_stratum:$('confirmed_stratum').value, reading_order_text:$('reading_order_text').value,
    regions:[...document.querySelectorAll('#regions .reg')].map(r=>({role:r.querySelector('.r-role').value, column:Number(r.querySelector('.r-col').value)||0, bbox_or_desc:r.querySelector('.r-desc').value})),
    marginal_captions:$('marginal_captions').value.split('\n').map(s=>s.trim()).filter(Boolean),
    section_boundaries:$('section_boundaries').value.split(',').map(s=>s.trim()).filter(Boolean),
    page_alignment:{printed_page_label:$('printed_page_label').value, gazette_page:$('gazette_page').value},
    hebrew_fidelity_notes:$('hebrew_fidelity_notes').value, annotator:$('annotator').value, reviewed_by:$('reviewed_by').value,
    confidence:$('confidence').value, state:(gtCache[e.id]||{}).state||'' };
}
function fill(gt,draft){
  // A real human record exists only if it has a state or non-empty text; otherwise
  // start from the DRAFT (accelerator). The draft is never auto-saved as ground truth.
  const hasGt = gt && (gt.state || (gt.reading_order_text && gt.reading_order_text.length));
  $('confirmed_stratum').value=(hasGt&&gt.confirmed_stratum)||draft.stratum_tentative||'';
  $('reading_order_text').value=hasGt?(gt.reading_order_text||''):(draft.reading_order_text||'');
  $('marginal_captions').value=((hasGt&&gt.marginal_captions)||draft.marginal_captions||[]).join('\n');
  $('section_boundaries').value=((hasGt&&gt.section_boundaries)||draft.section_boundaries||[]).join(', ');
  $('printed_page_label').value=(gt.page_alignment||{}).printed_page_label||'';
  $('gazette_page').value=(gt.page_alignment||{}).gazette_page||'';
  $('hebrew_fidelity_notes').value=gt.hebrew_fidelity_notes||'';
  $('annotator').value=gt.annotator||''; $('reviewed_by').value=gt.reviewed_by||''; $('confidence').value=gt.confidence||'';
  const regs=(gt.regions&&gt.regions.length?gt.regions:(draft.regions||[])); $('regions').innerHTML=''; regs.forEach(addRegion);
  paintState((gt.state)||'');
}
function addRegion(r){ r=r&&r.role?r:{role:'body',column:0,bbox_or_desc:''};
  const div=document.createElement('div'); div.className='reg';
  div.innerHTML='<select class="r-role"><option>body</option><option>caption</option><option>table</option><option>header_footer</option></select>'
    +'<input class="r-col" value="'+(r.column||0)+'">'+'<input class="r-desc" value="'+(r.bbox_or_desc||'').replace(/"/g,'&quot;')+'">'
    +'<button class="btn" onclick="this.parentNode.remove();markDirty()">✕</button>';
  div.querySelector('.r-role').value=r.role||'body';
  div.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',markDirty));
  $('regions').appendChild(div);
}
async function load(n){
  i=Math.max(0,Math.min(M.length-1,n)); const e=M[i];
  $('frame').src='/pdf/'+e.publication_item_id+'#page='+e.page_number+'&zoom=page-fit';
  $('pos').textContent=(i+1)+' / '+M.length+' ('+e.id+')'; $('strat').textContent='tentative: '+e.stratum_tentative;
  $('pub').textContent='pub '+e.publication_item_id+' · p'+e.page_number+' · '+e.year;
  const draft=await (await fetch('/api/draft/'+e.id)).json().catch(()=>({}));
  const gt=await (await fetch('/api/gt/'+e.id)).json().catch(()=>({})); gtCache[e.id]=gt||{};
  fill(gt||{},draft||{}); dirty=false; $('savestate').textContent='saved'; $('savestate').className='save-ok';
  renderList();
}
function loadDraft(){ fetch('/api/draft/'+M[i].id).then(r=>r.json()).then(d=>{ $('reading_order_text').value=d.reading_order_text||''; $('marginal_captions').value=(d.marginal_captions||[]).join('\n'); $('section_boundaries').value=(d.section_boundaries||[]).join(', '); $('regions').innerHTML=''; (d.regions||[]).forEach(addRegion); markDirty(); }); }
function paintState(s){ $('states').querySelectorAll('button').forEach(b=>b.className=b.dataset.s===s?'on-'+s:''); }
function setState(s){ const e=M[i]; gtCache[e.id]=gtCache[e.id]||{}; gtCache[e.id].state=s; paintState(s); markDirty(); save(); }
async function save(){
  const rec=collect(); const e=M[i];
  const draft=await (await fetch('/api/draft/'+e.id)).json().catch(()=>({}));
  rec._draft_used_as_start=true; rec._source_pdf=e.source_url; rec._page_number=e.page_number;
  await fetch('/api/gt/'+e.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rec)});
  gtCache[e.id]=rec; dirty=false; $('savestate').textContent='saved ✓'; $('savestate').className='save-ok'; renderList(); dash();
}
function go(d){ if(dirty) save(); load(i+d); }
function renderList(){
  const el=$('list'); el.innerHTML=M.map((e,n)=>{const st=(gtCache[e.id]||{}).state||''; return '<div class="'+(n===i?'cur':'')+'" onclick="go2('+n+')"><span>'+e.id+' · '+e.stratum_tentative+'</span><span class="st-'+st+'">'+(st||'—')+'</span></div>';}).join('');
  const cur=el.querySelector('.cur'); if(cur) cur.scrollIntoView({block:'nearest'});
}
async function go2(n){ if(dirty) await save(); load(n); }
async function dash(){
  const all=await (await fetch('/api/gt')).json(); const byId={}; all.forEach(g=>byId[g.id]=g);
  const per={}; STRATA.forEach(s=>per[s]={total:0,approved:0,review:0,unres:0,left:0});
  let A=0,N=0,U=0,none=0;
  M.forEach(e=>{ const s=(byId[e.id]||{}).confirmed_stratum||e.stratum_tentative; per[s]=per[s]||{total:0,approved:0,review:0,unres:0,left:0}; per[s].total++;
    const st=(byId[e.id]||{}).state||''; if(st==='APPROVED'){A++;per[s].approved++;} else if(st==='NEEDS_CORRECTION'){N++;per[s].review++;} else if(st==='UNRESOLVED'){U++;per[s].unres++;} else {none++;per[s].left++;} });
  const reviewed=M.filter(e=>((byId[e.id]||{}).reviewed_by||'').trim()).length;
  $('dash').innerHTML='<b>Progress:</b> APPROVED <b class="st-APPROVED">'+A+'</b> · NEEDS_CORRECTION <b class="st-NEEDS_CORRECTION">'+N+'</b> · UNRESOLVED <b class="st-UNRESOLVED">'+U+'</b> · remaining <b>'+none+'</b> · 2nd-reviewed <b>'+reviewed+'/'+M.length+'</b>'
    +' &nbsp;|&nbsp; '+STRATA.map(s=>s.replace(/_/g,' ')+': '+per[s].approved+'/'+per[s].total).join(' · ');
}
document.addEventListener('keydown',ev=>{
  if(ev.target.tagName==='TEXTAREA'||ev.target.tagName==='INPUT'||ev.target.tagName==='SELECT'){ if((ev.ctrlKey||ev.metaKey)&&ev.key==='s'){ev.preventDefault();save();} return; }
  if(ev.key==='j'||ev.key==='J') go(1); else if(ev.key==='k'||ev.key==='K') go(-1);
  else if(ev.key==='a'||ev.key==='A') setState('APPROVED'); else if(ev.key==='n'||ev.key==='N') setState('NEEDS_CORRECTION');
  else if(ev.key==='u'||ev.key==='U') setState('UNRESOLVED'); else if(ev.key==='r'||ev.key==='R') loadDraft();
  else if((ev.ctrlKey||ev.metaKey)&&ev.key==='s'){ev.preventDefault();save();}
});
boot();
</script></body></html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost`);
  const send = (code: number, type: string, body: string | Buffer) => { res.writeHead(code, { "content-type": type }); res.end(body); };
  try {
    if (url.pathname === "/") return send(200, "text/html; charset=utf-8", HTML);
    if (url.pathname === "/api/manifest") return send(200, "application/json", JSON.stringify(manifest));
    if (url.pathname.startsWith("/api/draft/")) { const id = url.pathname.split("/").pop()!; return send(200, "application/json", JSON.stringify(readJson(`${DIR}/drafts/${id}.json`) ?? {})); }
    if (url.pathname === "/api/gt") { const all = readdirSync(GT).filter((f) => existsSync(`${GT}/${f}`) && f.endsWith(".json")).map((f) => readJson(`${GT}/${f}`)).filter(Boolean); return send(200, "application/json", JSON.stringify(all)); }
    if (url.pathname.startsWith("/api/gt/")) {
      const id = url.pathname.split("/").pop()!;
      if (req.method === "POST") { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { saveAtomic(`${GT}/${id}.json`, JSON.parse(b)); send(200, "application/json", '{"ok":true}'); } catch (e) { send(400, "application/json", JSON.stringify({ error: String(e) })); } }); return; }
      return send(200, "application/json", JSON.stringify(readJson(`${GT}/${id}.json`) ?? {}));
    }
    if (url.pathname.startsWith("/pdf/")) { const item = url.pathname.split("/").pop()!; const p = `${DIR}/pdfs/${item}.pdf`; if (!existsSync(p)) return send(404, "text/plain", "pdf not prepared — run prepare-annotation.ts"); return send(200, "application/pdf", readFileSync(p)); }
    return send(404, "text/plain", "not found");
  } catch (e) { send(500, "text/plain", String(e)); }
});
server.listen(PORT, () => process.stdout.write(`Annotation workspace: http://localhost:${PORT}\n(serves ${manifest.entries.length} pages; ground truth saved incrementally to ${GT}/)\n`));
