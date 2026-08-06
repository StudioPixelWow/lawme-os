#!/usr/bin/env node
/**
 * Builds a self-contained, RTL, Hebrew-first HTML dashboard from the coverage +
 * gap JSON. No network, no external assets — all CSS/JS/data inlined.
 * Output: artifacts/legal-coverage-dashboard.html
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, "..", "..", "artifacts");
const cov = JSON.parse(readFileSync(join(ART, "legal-coverage.json"), "utf8"));
const gap = JSON.parse(readFileSync(join(ART, "legal-gap-analysis.json"), "utf8"));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bandColor = (score) => (score >= 80 ? "#1a7f45" : score >= 50 ? "#b8860b" : score >= 25 ? "#c2611a" : "#a12b2b");
const quadBadge = (q) => ({ DO_FIRST: "#1a7f45", QUICK_WIN: "#2a7fb8", STRATEGIC: "#b8860b", DEFER: "#777" }[q] || "#777");

const domainRows = cov.domains
  .slice()
  .sort((a, b) => b.roi_score - a.roi_score)
  .map(
    (d) => `
    <tr>
      <td class="name">${esc(d.name)}</td>
      <td><div class="bar"><span style="width:${d.available_score}%;background:${bandColor(d.available_score)}"></span></div><small>${d.available_score}</small></td>
      <td class="real">0</td>
      <td>${d.legal_value}</td><td>${d.business_value}</td><td>${d.difficulty}</td>
      <td class="roi">${d.roi_score}</td>
      <td><span class="conf ${d.confidence}">${d.confidence}</span></td>
      <td><span class="quad" style="background:${quadBadge(d.priority_quadrant)}">${d.priority_quadrant.replace("_", " ")}</span></td>
    </tr>`
  )
  .join("");

const gapRows = gap.top_gaps
  .slice(0, 20)
  .map(
    (g, i) => `<tr><td>${i + 1}</td><td><span class="sev" style="background:${bandColor(100 - g.severity)}">${g.severity}</span></td><td>${esc(g.domain)}</td><td>${esc(g.subdomain || g.gap)}</td></tr>`
  )
  .join("");

const oppRows = gap.opportunities_detailed.by_domain
  .map(
    (o, i) => `<tr><td>${i + 1}</td><td class="roi">${o.roi_score}</td><td>${esc(o.domain_name)}</td><td><span class="quad" style="background:${quadBadge(o.priority_quadrant)}">${o.priority_quadrant.replace("_", " ")}</span></td><td>${esc(o.lead_move)}</td></tr>`
  )
  .join("");

const assetRows = gap.opportunities_detailed.by_asset
  .slice(0, 12)
  .map((a) => `<tr><td class="roi">${a.roi_score}</td><td><code>${esc(a.asset)}</code></td><td>${esc(a.domain)}</td><td>${esc(a.content)}</td><td>${esc(a.license)}</td></tr>`)
  .join("");

const roadmapCards = gap.roadmap
  .map(
    (r) => `
    <div class="card">
      <div class="sprint">Sprint ${r.sprint}</div>
      <h3>${esc(r.theme)}</h3>
      <p class="why">${esc(r.rationale)}</p>
      <ul>${r.moves.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <p class="unblocks">↳ ${esc(r.unblocks)}</p>
    </div>`
  )
  .join("");

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>מפת כיסוי ידע משפטי לאומי — LAW ME</title>
<style>
  :root { --ink:#1a1f2b; --muted:#5b6472; --line:#e4e7ec; --bg:#f7f8fa; --card:#fff; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Segoe UI',Arial,'Noto Sans Hebrew',sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
  header { background:linear-gradient(135deg,#12233f,#1f3a5f); color:#fff; padding:28px 32px; }
  header h1 { margin:0 0 6px; font-size:24px; }
  header p { margin:0; opacity:.85; font-size:14px; }
  .wrap { max-width:1100px; margin:0 auto; padding:24px 32px 60px; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin:24px 0; }
  .kpi { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
  .kpi .n { font-size:30px; font-weight:700; }
  .kpi .l { font-size:12px; color:var(--muted); }
  .note { background:#fff8e6; border:1px solid #f0dca0; border-radius:10px; padding:12px 16px; font-size:13px; margin:16px 0; }
  section { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px 22px; margin:20px 0; }
  h2 { font-size:18px; margin:0 0 14px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { text-align:right; padding:8px 10px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:12px; }
  td.name { font-weight:600; }
  td.roi { font-weight:700; }
  td.real { color:#a12b2b; font-weight:600; }
  .bar { display:inline-block; width:120px; height:9px; background:#eef0f3; border-radius:5px; overflow:hidden; vertical-align:middle; margin-left:6px; }
  .bar span { display:block; height:100%; }
  .conf { font-size:11px; padding:2px 7px; border-radius:20px; color:#fff; }
  .conf.VERIFIED { background:#1a7f45; } .conf.ESTIMATED { background:#b8860b; } .conf.UNKNOWN { background:#888; }
  .quad { font-size:11px; padding:2px 8px; border-radius:20px; color:#fff; white-space:nowrap; }
  .sev { display:inline-block; min-width:30px; text-align:center; color:#fff; padding:2px 7px; border-radius:6px; font-weight:700; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; }
  .card { border:1px solid var(--line); border-radius:10px; padding:14px 16px; background:#fcfcfd; }
  .card .sprint { font-size:11px; color:#2a7fb8; font-weight:700; letter-spacing:.04em; }
  .card h3 { margin:4px 0 8px; font-size:15px; }
  .card .why { font-size:12.5px; color:var(--muted); margin:0 0 8px; }
  .card ul { margin:0; padding-right:18px; font-size:12.5px; }
  .card .unblocks { font-size:12px; color:#1a7f45; margin:8px 0 0; }
  code { background:#eef0f3; padding:1px 5px; border-radius:4px; font-size:12px; }
  footer { color:var(--muted); font-size:12px; text-align:center; padding:20px; }
</style>
</head>
<body>
<header>
  <h1>מפת כיסוי ידע משפטי לאומי — National Legal Knowledge Coverage Map</h1>
  <p>LAW ME · ${esc(cov.generated_for)} · סינתזה בלבד (ללא רשת / מסד / איסוף)</p>
</header>
<div class="wrap">

  <div class="kpis">
    <div class="kpi"><div class="n" style="color:${bandColor(cov.national.available_coverage_score)}">${cov.national.available_coverage_score}</div><div class="l">כיסוי זמין (משוקלל) / 100</div></div>
    <div class="kpi"><div class="n" style="color:#a12b2b">0</div><div class="l">כיסוי ממומש (נאסף בפועל)</div></div>
    <div class="kpi"><div class="n">${cov.domains.length}</div><div class="l">תחומי ידע</div></div>
    <div class="kpi"><div class="n">${cov.national.open_full_document_datasets}</div><div class="l">מאגרי מסמכים-מלאים פתוחים</div></div>
  </div>

  <div class="note"><strong>זמין ≠ ברשותנו.</strong> "כיסוי זמין" = מה שניתן להגיע אליו כדין היום. "כיסוי ממומש" = מה שנאסף בפועל — כרגע 0 בכל תחום, כי טרם הופעל אף Collector. כל מספר שאינו מסומן "ממומש" הוא מפת פוטנציאל, לא קורפוס קיים.</div>

  <section>
    <h2>מפת כיסוי לפי תחום (Coverage Map)</h2>
    <table>
      <thead><tr><th>תחום</th><th>זמין</th><th>ממומש</th><th>ערך משפטי</th><th>ערך עסקי</th><th>קושי</th><th>ROI</th><th>ודאות</th><th>עדיפות</th></tr></thead>
      <tbody>${domainRows}</tbody>
    </table>
  </section>

  <section>
    <h2>מטריצת ROI (ערך × קושי)</h2>
    <table>
      <thead><tr><th></th><th>קל (קושי ≤2)</th><th>קשה (קושי ≥4)</th></tr></thead>
      <tbody>
        <tr><td class="name">ערך גבוה</td><td><span class="quad" style="background:#1a7f45">חקיקה — DO FIRST</span> · <span class="quad" style="background:#2a7fb8">מרשמים — QUICK WIN</span></td><td><span class="quad" style="background:#b8860b">פסיקה — STRATEGIC</span> · <span class="quad" style="background:#b8860b">רגולציה — STRATEGIC</span></td></tr>
        <tr><td class="name">ערך נמוך</td><td><span class="quad" style="background:#2a7fb8">אקדמי — QUICK WIN</span></td><td><span class="quad" style="background:#777">מנהלי / בינלאומי — DEFER</span></td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2>20 הפערים החמורים ביותר (Top Gaps)</h2>
    <table>
      <thead><tr><th>#</th><th>חומרה</th><th>תחום</th><th>פער</th></tr></thead>
      <tbody>${gapRows}</tbody>
    </table>
  </section>

  <section>
    <h2>הזדמנויות אסטרטגיות (Opportunities)</h2>
    <table>
      <thead><tr><th>#</th><th>ROI</th><th>תחום</th><th>עדיפות</th><th>מהלך מוביל</th></tr></thead>
      <tbody>${oppRows}</tbody>
    </table>
    <h3 style="font-size:14px;margin:18px 0 8px;">נכסים פתוחים מוכנים לאיסוף (Collector-ready assets)</h3>
    <table>
      <thead><tr><th>ROI</th><th>Dataset</th><th>תחום</th><th>תוכן</th><th>רישיון</th></tr></thead>
      <tbody>${assetRows}</tbody>
    </table>
  </section>

  <section>
    <h2>מפת דרכים לפי כיסוי (Roadmap)</h2>
    <div class="cards">${roadmapCards}</div>
  </section>

  <section style="background:#0f2038;color:#fff;">
    <h2 style="color:#fff;">ההמלצה האסטרטגית הבאה</h2>
    <p style="font-size:15px;margin:0;">בנה תחילה את <strong>Collector החקיקה של הכנסת (Knesset OData)</strong> — 48 ישויות, פתוח, ללא הזדהות, וכרגע 0% ממומש. זהו ה-ROI הגבוה ביותר על הלוח והוא פותח את כל שכבות ההיגיון המשפטי שמעליו. במקביל: לכוד את 2 מאגרי הטריבונלים הפתוחים, ופתח מסלול מוסדי (בקשת מידע / הסכם נתונים) לפסיקת הערכאות הליבתיות — מה שגריפה חוקית לעולם לא תשיג.</p>
  </section>

  <footer>נוצר ע"י tools/legal-source-audit/coverage-dashboard.mjs · מקורות: legal-coverage.json, legal-gap-analysis.json · ${new Date().getUTCFullYear()}</footer>
</div>
</body>
</html>`;

writeFileSync(join(ART, "legal-coverage-dashboard.html"), html);
console.log("Wrote artifacts/legal-coverage-dashboard.html (" + html.length + " bytes)");
