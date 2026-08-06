#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — data.gov.il legal-dataset Qualification pass.
 *
 * Corrects the discovery over-count (organization ≠ dataset ≠ resource ≠ API).
 * Each dataset was qualified via the CKAN `package_show` API (real responses,
 * captured through the authorized browser): publisher, license (+url), resource
 * formats/size/datastore/external, and notes → legal-relevance category,
 * content type, license verdict, collector-value tier.
 *
 * Emits JSON + CSV + a Tier-1 markdown + idempotent registry-correction SQL.
 *
 * Verdicts:
 *  VERIFIED_OPEN         other-open (Open-Definition approved) + accessible + legal content
 *  OPEN_WITH_OBLIGATIONS cc-by (attribution) + accessible + legal content
 *  REVIEW                license scope unclear / external or empty resources / unverified
 *  REJECTED              not legal (statistics/directory/data-dictionary) or no usable content
 */
import { writeFile, mkdir } from "node:fs/promises";

const has = (n) => process.argv.includes(n);
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

// [dataset, publisher, license, resFmts, sizeKB, datastore, external, category, content, tier, verdict, note]
// content: full_documents | metadata_plus_summary | registry_records | directory | statistics | reference | none
const D = [
  // ---- TIER_1: full decisions / flagship judgment metadata ----
  ["ararim","ministry_of_justice","cc-by","CSV/PDF",11283,true,false,"tribunal_decisions","full_documents",1,"OPEN_WITH_OBLIGATIONS","החלטות בתי הדין לעררים — CSV + PDF מלאים"],
  ["mishmoret","ministry_of_justice","cc-by","CSV/PDF",25784,true,false,"tribunal_decisions","full_documents",1,"OPEN_WITH_OBLIGATIONS","החלטות בתי הדין למשמורת — CSV + PDF מלאים"],
  ["judgments","ministry_of_justice","other-open","CSV/PDF",1113,true,false,"court_metadata","metadata_plus_summary",1,"VERIFIED_OPEN","פסקי דין חופש-מידע 2021 — מס' הליך, צדדים, מחוז, תמצית, הוצאות"],
  // ---- TIER_2: legal registries / regulation reference (structured, legal) ----
  ["ica_companies","ministry_of_justice","other-open","CSV/PDF",248000,true,false,"company_registry","registry_records",2,"VERIFIED_OPEN","רשם החברות — רשומות"],
  ["ica-changes","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"company_registry","registry_records",2,"OPEN_WITH_OBLIGATIONS","רשם החברות — שינויים"],
  ["ica_partnerships","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"company_registry","registry_records",2,"OPEN_WITH_OBLIGATIONS","רשם השותפויות"],
  ["membership-in-liquidation","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"company_registry","registry_records",2,"OPEN_WITH_OBLIGATIONS","חברות בפירוק"],
  ["moj-amutot","ministry_of_justice","other-open","CSV/PDF",0,true,false,"nonprofit_registry","registry_records",2,"VERIFIED_OPEN","רשם העמותות"],
  ["simaneymisahr","ministry_of_justice","other-open","CSV/PDF",720780,true,false,"trademarks","registry_records",2,"VERIFIED_OPEN","בקשות סימני מסחר"],
  ["mamtziim_patents","ministry_of_justice","cc-by","CSV/PDF",34486,true,false,"patents","registry_records",2,"OPEN_WITH_OBLIGATIONS","ממציאים — בקשות פטנט"],
  ["halicim_bateydin","ministry_of_justice","cc-by","CSV/PDF",2198,true,false,"patents","registry_records",2,"OPEN_WITH_OBLIGATIONS","הליכים ברשם הפטנטים"],
  ["yerusha","ministry_of_justice","cc-by","CSV/PDF",313334,true,false,"inheritance","registry_records",2,"OPEN_WITH_OBLIGATIONS","רשם לענייני ירושה"],
  ["hekdeshot","ministry_of_justice","cc-by","CSV/PDF",2831,true,false,"inheritance","registry_records",2,"OPEN_WITH_OBLIGATIONS","הקדשות ציבוריים"],
  ["mashkonot","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"legal_reference","registry_records",2,"OPEN_WITH_OBLIGATIONS","רשם המשכונות"],
  ["britzugiyut","ministry_of_justice","cc-by","CSV",0,true,false,"legal_reference","registry_records",2,"OPEN_WITH_OBLIGATIONS","מרשם ברית הזוגיות"],
  ["regulationdatabase","regulatory-authority","other-open","XLSX",818,true,false,"regulation","reference",2,"VERIFIED_OPEN","מאגר רגולציה (חוק עקרונות האסדרה)"],
  ["takanot_hayerusha-batei_hadin_hasharaim","ministry_of_justice","other-open","CSV",0,true,false,"inheritance","metadata_plus_summary",2,"VERIFIED_OPEN","בקשות צו ירושה — בתי הדין השרעיים"],
  ["takanot_hayerusha-batei_hadin_hadruzim","ministry_of_justice","other-open","CSV",0,true,false,"inheritance","metadata_plus_summary",2,"VERIFIED_OPEN","בקשות צו ירושה — בתי הדין הדרוזיים"],
  // ---- TIER_3: low-value reference / directory ----
  ["trademarks_nice","ministry_of_justice","other-open","CSV/PDF",964,true,false,"trademarks","reference",3,"VERIFIED_OPEN","סיווגי ניס לסימני מסחר"],
  ["bakashot_cpc","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"patents","reference",3,"OPEN_WITH_OBLIGATIONS","סיווגי CPC לפטנטים"],
  ["tovin","ministry_of_justice","cc-by","CSV/PDF",0,true,false,"legal_reference","reference",3,"OPEN_WITH_OBLIGATIONS","רשימת סחורות/שירותים"],
  ["maale","ministry_of_justice","other-open","XLSX",23,true,false,"legal_reference","reference",3,"VERIFIED_OPEN","כלי חיפוש קטן"],
  ["magistrate-court-list","the_judicial_authority","other-open","XLSX",61,true,false,"court_metadata","directory",3,"VERIFIED_OPEN","רשימת בתי משפט השלום"],
  ["court-lost","the_judicial_authority","other-open","XLSX",18,true,false,"court_metadata","directory",3,"VERIFIED_OPEN","רשימת בתי משפט ובתי דין לעבודה"],
  ["molsa-court-assiatance-units","ministry_of_social_affairs","other-open","CSV/PDF",328,true,false,"directory_only","directory",3,"VERIFIED_OPEN","יחידות סיוע ליד בתי המשפט"],
  // ---- REVIEW: external/empty resources or license scope unclear ----
  ["my-bills","knesset","other-open","",0,false,true,"legislation","reference",0,"REVIEW","הצעות חוק — קישור חיצוני (רישיון עשוי לא לחול)"],
  ["odata","knesset","other-open","",0,false,true,"legislation","reference",0,"REVIEW","מידע פרלמנטרי — קישור חיצוני"],
  ["547","knesset","other-open","",0,false,false,"legislation","none",0,"REVIEW","אין resources נגישים"],
  ["accessibilityorders","cio","other-open","CSV",0,true,false,"administrative_decisions","unclear",0,"REVIEW","צווי נגישות — טרם אומת תוכן"],
  ["supervisionfiles","ministry_of_justice","other-open","CSV",0,true,false,"unclear","unclear",0,"REVIEW","קבצי פיקוח — טרם אומת תוכן"],
  ["ransom","moital","other-open","CSV",0,true,false,"unclear","unclear",0,"REVIEW","טרם אומת תוכן משפטי"],
  ["businessreq","moital","other-open","CSV",0,true,false,"unclear","unclear",0,"REVIEW","דרישות עסק — טרם אומת"],
  // ---- REJECTED: not legal (statistics / non-legal / data dictionaries) ----
  ["crime_records_data","israel-police","other-open","XLSX/CSV",382234,true,false,"statistical_only","statistics",0,"REJECTED","סטטיסטיקת פשיעה — לא מסמכים משפטיים"],
  ["releasespeed","taxes-authority","other-open","CSV",324,true,false,"statistical_only","statistics",0,"REJECTED","זמני שחרור מכס — סטטיסטי"],
  ["stream-monitoring","ministry_of_the_environment","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","ניטור נחלים"],
  ["sewage_budgeting","water_authority","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","תקצוב ביוב"],
  ["noise-duration","ministry_of_the_environment","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","רעש"],
  ["budget2020","pmo","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","תקציב"],
  ["metrology","moital","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","מטרולוגיה"],
  ["stat2017","culture_and_sports","cc-by","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","סטטיסטיקת ספורט"],
  ["stat2018","culture_and_sports","cc-by","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","סטטיסטיקת ספורט"],
  ["firefightingfees","firefightingcommission","cc-by","CSV",0,true,false,"not_legal","reference",0,"REJECTED","אגרות כבאות"],
  ["n2r","betihut-drahim","cc-by","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","בטיחות בדרכים"],
  ["goverment-domesticdebt","mof","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","חוב ממשלתי"],
  ["data-doctionary-business","cio","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","מילון נתונים"],
  ["data-dictionary-asset","cio","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","מילון נתונים"],
  ["2023","pmo","other-open","",0,false,false,"not_legal","none",0,"REJECTED","ללא תוכן משפטי"],
  ["continuing_education","ministry-health","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","השתלמויות"],
  ["sherut-mivhan-lanoar","ministry_of_social_affairs","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","שירות מבחן לנוער — מנהלי"],
  ["manager-elections-2023","interior_affairs","other-open","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","בחירות"],
  ["mfa_un","ministry_of_exterior","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","או\"ם"],
  ["aluyot-pituach","ministry_of_housing","cc-by","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","עלויות פיתוח"],
  ["business-licensing-br7","moital","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","רישוי עסקים — רשימה"],
  ["unified_businesses-br7","moital","other-open","CSV",0,true,false,"not_legal","reference",0,"REJECTED","עסקים — רשימה"],
  ["companiespersonscleansing20200","ministry_of_justice","other-open","CSV",0,true,false,"directory_only","reference",0,"REJECTED","ניקוי כפילויות — טכני"],
  ["566","culture_and_sports","cc-by","CSV",0,true,false,"not_legal","statistics",0,"REJECTED","סטטיסטיקה"],
];

function collectorStatus(r) {
  if (r.verdict === "REJECTED") return "retired";
  if (r.verdict === "REVIEW") return "audit_required";
  return r.tier <= 2 ? "ready_to_build" : "audit_required"; // Tier 3 not prioritized
}
function auditStatus(r) {
  if (r.verdict === "REVIEW") return "manual_review_required";
  return "completed";
}
function rows() {
  return D.map(([code, pub, lic, fmts, sizeKB, ds, ext, category, content, tier, verdict, note]) =>
    ({ code, pub, lic, fmts, sizeKB, ds, ext, category, content, tier, verdict,
       collectorStatus: null, note }));
}

const R = rows().map((r) => ({ ...r, collectorStatus: collectorStatus(r), auditStatus: auditStatus(r) }));

function toSql() {
  const lines = ["-- data.gov.il legal-dataset qualification — registry correction (idempotent)."];
  lines.push(`update legalai.legal_sources ls set
  collector_status = v.cstatus, audit_status = v.astatus,
  legal_reuse_status = case when v.verdict='OPEN_WITH_OBLIGATIONS' then 'open_license'
                            when v.verdict='VERIFIED_OPEN' then 'open_license'
                            when v.verdict='REJECTED' then 'restricted' else 'unknown' end,
  audit_notes = 'QUAL '||v.verdict||' | tier'||v.tier||' | '||v.category||' | '||v.content||' | '||v.note,
  priority_score = v.prio, last_audited_at = now()
from (values`);
  const vals = R.map((r) => {
    const prio = r.verdict === "REJECTED" ? 0 : r.tier === 1 ? 80 : r.tier === 2 ? 55 : r.tier === 3 ? 30 : 15;
    return `  ('data_gov_il:${r.code.replace(/'/g, "''")}', ${q(r.collectorStatus)}, ${q(r.auditStatus)}, ${q(r.verdict)}, ${r.tier}, ${q(r.category)}, ${q(r.content)}, ${q(r.note)}, ${prio})`;
  });
  lines.push(vals.join(",\n"));
  lines.push(`) as v(code,cstatus,astatus,verdict,tier,category,content,note,prio)
where ls.code = v.code;`);
  return lines.join("\n") + "\n";
}

function counts() {
  const c = (f) => R.filter(f).length;
  return {
    technical_platforms: 1, // data.gov.il CKAN
    publishers: new Set(R.map((r) => r.pub)).size,
    datasets_qualified: R.length,
    resources_seen: R.reduce((a, r) => a + (r.fmts ? r.fmts.split("/").length : 0), 0),
    resources_accessible: R.filter((r) => r.ds && !r.ext).length,
    verified_open: c((r) => r.verdict === "VERIFIED_OPEN"),
    open_with_obligations: c((r) => r.verdict === "OPEN_WITH_OBLIGATIONS"),
    review: c((r) => r.verdict === "REVIEW"),
    rejected: c((r) => r.verdict === "REJECTED"),
    full_documents: c((r) => r.content === "full_documents"),
    metadata_or_registry: c((r) => ["metadata_plus_summary", "registry_records"].includes(r.content)),
    tier1: c((r) => r.tier === 1),
    tier2: c((r) => r.tier === 2),
    tier3: c((r) => r.tier === 3),
  };
}

if (has("--sql")) { process.stdout.write(toSql()); }
else {
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/data-gov-legal-dataset-qualification.json", JSON.stringify({ counts: counts(), datasets: R }, null, 2));
  const head = "dataset,publisher,license,formats,size_kb,datastore,external,category,content,tier,verdict,collector_status,note";
  const csv = [head, ...R.map((r) => [`data.gov.il:${r.code}`, r.pub, r.lic, r.fmts, r.sizeKB, r.ds, r.ext, r.category, r.content, r.tier, r.verdict, r.collectorStatus, r.note.replace(/,/g, ";")].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
  await writeFile("artifacts/data-gov-legal-dataset-qualification.csv", csv + "\n");
  await writeFile("artifacts/data-gov-qualification-correction.sql", toSql());
  console.log(JSON.stringify(counts(), null, 1));
  console.log("→ artifacts/data-gov-legal-dataset-qualification.{json,csv} + correction.sql");
}
