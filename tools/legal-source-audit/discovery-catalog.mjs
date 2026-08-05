#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — National Legal Source Discovery catalog.
 *
 * A durable, evidence-backed catalog of Israeli legal-information sources found
 * via the data.gov.il CKAN catalog (organization_list / package_search — real
 * API responses, not invented) plus a curated set of high-confidence public
 * institutions. Emits JSON and idempotent UPSERT SQL for the dev registry.
 *
 * Sources enter as CANDIDATES (audit_status=pending, collector_status=
 * audit_required, legal_reuse_status=unknown) UNLESS an explicit CKAN dataset
 * license was observed (then classified OPEN with evidence). No fabricated audit
 * verdicts. No collectors are built.
 *
 * Usage:
 *   node tools/legal-source-audit/discovery-catalog.mjs --json   > catalog.json
 *   node tools/legal-source-audit/discovery-catalog.mjs --sql    > upsert.sql
 */
import { writeFile, mkdir } from "node:fs/promises";

const has = (n) => process.argv.includes(n);
const sqlLit = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

// ---- CKAN organizations on data.gov.il (real; from organization_list) -------
// type: gov=official_government, court, tribunal, regulator, municipality,
// archive. All owner=official, access via CKAN (open data portal).
const CKAN_ORGS = [
  ["airport_authority", "רשות שדות התעופה", "regulator"],
  ["archives", "ארכיון המדינה", "archive"],
  ["bank_israel", "בנק ישראל", "regulator"],
  ["beer-sheva", "עיריית באר שבע", "municipality"],
  ["betihut-drahim", "הרשות הלאומית לבטיחות בדרכים", "regulator"],
  ["central-election-committee", "ועדת הבחירות המרכזית לכנסת", "official_government"],
  ["cio", "מערך הדיגיטל הלאומי", "official_government"],
  ["cma", "רשות שוק ההון, ביטוח וחיסכון", "regulator"],
  ["culture_and_sports", "משרד התרבות והספורט", "official_government"],
  ["eca", "רשות האכיפה והגבייה", "regulator"],
  ["energy_and_water", "משרד האנרגיה", "official_government"],
  ["firefightingcommission", "כבאות והצלה לישראל", "official_government"],
  ["governmentprocurementadministration", "מינהל הרכש הממשלתי", "official_government"],
  ["gov-il", "GOV", "official_government"],
  ["haifa", "עיריית חיפה", "municipality"],
  ["holocaust_survivors_rights", "הרשות לזכויות ניצולי השואה", "official_government"],
  ["ies", "שירות התעסוקה", "official_government"],
  ["interior_affairs", "משרד הפנים", "official_government"],
  ["iplan", "מינהל התכנון", "tribunal"],
  ["israel_mapping_center", "המרכז למיפוי ישראל", "official_government"],
  ["israel_national_cyber_directorate", "מערך הסייבר הלאומי", "regulator"],
  ["israel-police", "משטרת ישראל", "official_government"],
  ["knesset", "הכנסת", "official_government"],
  ["labor", "משרד העבודה", "official_government"],
  ["lamas", "הלשכה המרכזית לסטטיסטיקה", "official_government"],
  ["maaleedumim", "עיריית מעלה אדומים", "municipality"],
  ["meteorological_service", "השירות המטאורולוגי", "official_government"],
  ["ministry-health", "משרד הבריאות", "official_government"],
  ["ministry_of_agriculture", "משרד החקלאות", "official_government"],
  ["ministry_of_exterior", "משרד החוץ", "official_government"],
  ["ministry_of_housing", "משרד הבינוי והשיכון", "official_government"],
  ["ministry_of_immigrant_absorption", "משרד העלייה והקליטה", "official_government"],
  ["ministry_of_internal_security", "המשרד לביטחון הפנים", "official_government"],
  ["ministry_of_justice", "משרד המשפטים", "official_government"],
  ["ministry_of_social_affairs", "משרד הרווחה והביטחון החברתי", "official_government"],
  ["ministry_of_the_environment", "המשרד להגנת הסביבה", "official_government"],
  ["ministry_of_tourism", "משרד התיירות", "official_government"],
  ["ministry_of_transport", "משרד התחבורה והבטיחות בדרכים", "official_government"],
  ["mof", "משרד האוצר", "official_government"],
  ["moital", "משרד הכלכלה והתעשייה", "official_government"],
  ["nativ", "משרד ראש הממשלה, נתיב", "official_government"],
  ["netzivot", "נציבות שירות המדינה", "official_government"],
  ["petah-tikva-municipality", "עיריית פתח תקוה", "municipality"],
  ["pmo", "משרד ראש הממשלה", "official_government"],
  ["population_authority", "רשות האוכלוסין וההגירה", "regulator"],
  ["rabanot", "הרבנות הראשית לישראל", "tribunal"],
  ["rabinical_court", "בתי הדין הרבניים", "tribunal"],
  ["regulatory-authority", "רשות האסדרה", "regulator"],
  ["religion-office", "המשרד לשירותי דת", "official_government"],
  ["rural-education", "המינהל לחינוך התיישבותי", "official_government"],
  ["science-and-technology", "משרד החדשנות, המדע והטכנולוגיה", "official_government"],
  ["socialequality", "המשרד לשוויון חברתי", "official_government"],
  ["social_security", "המוסד לביטוח לאומי", "tribunal"],
  ["taxes-authority", "רשות המסים בישראל", "regulator"],
  ["the_israel_lands_administration", "רשות מקרקעי ישראל", "regulator"],
  ["the_judicial_authority", "הרשות השופטת", "court"],
  ["tikshoret", "משרד התקשורת", "official_government"],
  ["volcaniagri", "מינהל המחקר החקלאי - מרכז וולקני", "academic"],
  ["water_authority", "הרשות הממשלתית למים ולביוב", "regulator"],
];

// ---- Open-licensed legal datasets on data.gov.il (real; from package_search) -
// [name, license_id, org] — license observed via CKAN → OPEN with evidence.
const OPEN_DATASETS = [
  ["judgments", "other-open", "ministry_of_justice"],
  ["magistrate-court-list", "other-open", "the_judicial_authority"],
  ["court-lost", "other-open", "the_judicial_authority"],
  ["ararim", "cc-by", "ministry_of_justice"],
  ["mishmoret", "cc-by", "ministry_of_justice"],
  ["maale", "other-open", "ministry_of_justice"],
  ["molsa-court-assiatance-units", "other-open", "ministry_of_social_affairs"],
  ["regulationdatabase", "other-open", "regulatory-authority"],
  ["my-bills", "other-open", "knesset"],
  ["547", "other-open", "knesset"],
  ["odata", "other-open", "knesset"],
  ["crime_records_data", "other-open", "israel-police"],
  ["releasespeed", "other-open", "taxes-authority"],
];

// ---- Curated high-confidence institutions (public/known) --------------------
// [code, name, base_url, source_type, owner_type]
const CURATED = [
  // Courts / tribunals / gazette / legislation
  ["knesset_legislation", "הכנסת — חקיקה ותיעוד", "https://main.knesset.gov.il/Activity/Legislation", "official_government", "official"],
  ["reshumot_gazette", "רשומות — הפרסום הרשמי", "https://www.gov.il/he/departments/publications/reports/reshumot", "official_publication", "official"],
  ["sharia_courts", "בתי הדין השרעיים", "https://www.gov.il/he/departments/sharia_courts", "tribunal", "official"],
  ["military_courts", "בתי הדין הצבאיים", "https://www.gov.il/he/departments/military_courts", "court", "official"],
  ["labor_courts", "בתי הדין לעבודה", "https://www.gov.il/he/departments/labor_courts", "court", "official"],
  ["privacy_authority", "הרשות להגנת הפרטיות", "https://www.gov.il/he/departments/the_privacy_protection_authority", "regulator", "official"],
  ["patent_office", "רשות הפטנטים", "https://www.gov.il/he/departments/ilpo", "regulator", "official"],
  ["competition_authority2", "רשות התחרות — החלטות", "https://www.gov.il/he/departments/competition_authority", "regulator", "official"],
  ["boi", "בנק ישראל", "https://www.boi.org.il/", "regulator", "official"],
  // Universities / law faculties (institutional repositories)
  ["huji_law", "האוניברסיטה העברית — הפקולטה למשפטים", "https://law.huji.ac.il/", "academic", "academic"],
  ["tau_law", "אוניברסיטת תל אביב — הפקולטה למשפטים", "https://law.tau.ac.il/", "academic", "academic"],
  ["biu_law", "אוניברסיטת בר-אילן — הפקולטה למשפטים", "https://law.biu.ac.il/", "academic", "academic"],
  ["haifa_law", "אוניברסיטת חיפה — הפקולטה למשפטים", "https://law.haifa.ac.il/", "academic", "academic"],
  ["bgu_law", "אוניברסיטת בן-גוריון — משפטים", "https://in.bgu.ac.il/law/", "academic", "academic"],
  ["openu", "האוניברסיטה הפתוחה", "https://www.openu.ac.il/", "academic", "academic"],
  ["runi_law", "אוניברסיטת רייכמן — בית ספר למשפטים", "https://www.runi.ac.il/schools/law/", "academic", "academic"],
  ["colman_law", "המכללה למינהל — בית הספר למשפטים", "https://www.colman.ac.il/", "academic", "academic"],
  ["ono_law", "הקריה האקדמית אונו — משפטים", "https://www.ono.ac.il/", "academic", "academic"],
  ["sapir", "המכללה האקדמית ספיר", "https://www.sapir.ac.il/", "academic", "academic"],
  ["nli", "הספרייה הלאומית", "https://www.nli.org.il/", "archive", "public"],
  // Public/known legal databases (commercial or third-party — expect ASK/BLOCKED)
  ["din_co_il", "Din — מאגר משפטי", "https://www.din.co.il/", "commercial_database", "commercial"],
  ["kolzchut", "כל זכות — מאגר זכויות", "https://www.kolzchut.org.il/", "non_profit", "non_profit"],
  ["psakdin", "פסק דין — פורטל משפטי", "https://www.psakdin.co.il/", "commercial_database", "commercial"],
  ["lawdata", "LawData", "https://www.lawdata.co.il/", "commercial_database", "commercial"],
  ["global_archive_org", "Internet Archive", "https://archive.org/", "archive", "non_profit"],
];

function orgSourceType(t) { return t; }

function build() {
  const rows = [];
  const evidence = [];
  for (const [name, title, type] of CKAN_ORGS) {
    rows.push({
      code: `ckan_org:${name}`, name: title,
      base_url: `https://data.gov.il/organization/${name}`,
      source_type: orgSourceType(type), owner_type: "official", normalized_domain: "data.gov.il",
      access_status: "public", technical_access_status: "open", legal_reuse_status: "unknown",
      audit_status: "pending", collector_status: "audit_required",
      has_api: true, has_json: true, recommended_access_method: "CKAN API (data.gov.il)",
      audit_notes: "CKAN publishing organization (organization_list). Reuse is per-dataset.",
    });
    evidence.push({ code: `ckan_org:${name}`, etype: "api", url: "https://data.gov.il/api/3/action/organization_list", summary: `CKAN org ${name}` });
  }
  for (const [ds, lic, org] of OPEN_DATASETS) {
    const attribution = lic === "cc-by";
    rows.push({
      code: `data_gov_il:${ds}`, name: `data.gov.il — ${ds} (${org})`,
      base_url: `https://data.gov.il/dataset/${ds}`,
      source_type: "open_data", owner_type: "official", normalized_domain: "data.gov.il",
      access_status: "public", technical_access_status: "open", legal_reuse_status: "open_license",
      audit_status: "completed", collector_status: "ready_to_build",
      has_api: true, has_direct_files: true, license_url: `https://data.gov.il/api/3/action/license_show?id=${lic}`,
      legal_clarity_score: attribution ? 90 : 95, access_score: 60, priority_score: 40, audit_confidence: 0.9,
      recommended_access_method: "CKAN API (CSV/PDF)", recommended_collector_type: "api",
      audit_notes: `OPEN: dataset license ${lic}${attribution ? " (attribution required)" : ""}`,
    });
    evidence.push({ code: `data_gov_il:${ds}`, etype: "license", url: `https://data.gov.il/api/3/action/package_show?id=${ds}`, summary: `license ${lic}` });
  }
  for (const [code, name, url, st, owner] of CURATED) {
    rows.push({
      code, name, base_url: url, source_type: st, owner_type: owner,
      normalized_domain: new URL(url).hostname.replace(/^www\./, ""),
      access_status: "unknown", technical_access_status: "unknown", legal_reuse_status: "unknown",
      audit_status: "pending", collector_status: "audit_required",
      audit_notes: "Curated candidate — pending live audit",
    });
  }
  return { rows, evidence };
}

function toSql({ rows, evidence }) {
  const cols = ["code", "name", "base_url", "source_type", "authority_type", "jurisdiction", "normalized_domain",
    "owner_type", "access_status", "technical_access_status", "legal_reuse_status", "audit_status",
    "collector_status", "has_api", "has_json", "has_direct_files", "license_url", "legal_clarity_score",
    "access_score", "priority_score", "audit_confidence", "recommended_access_method",
    "recommended_collector_type", "audit_notes"];
  const lines = ["-- National Legal Source Discovery — candidate registry upsert (idempotent).", ""];
  for (const r of rows) {
    const vals = cols.map((c) => {
      const v = r[c];
      if (c === "authority_type") return sqlLit(r.owner_type === "official" ? "official" : "non_official");
      if (c === "jurisdiction") return sqlLit("IL");
      if (typeof v === "boolean") return v ? "true" : "false";
      if (typeof v === "number") return String(v);
      return v === undefined ? "null" : sqlLit(v);
    });
    lines.push(`insert into legalai.legal_sources (${cols.join(",")}) values (${vals.join(",")}) on conflict (code) do nothing;`);
  }
  return lines.join("\n") + "\n";
}

const cat = build();
if (has("--sql")) { process.stdout.write(toSql(cat)); }
else {
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/national-discovery-catalog.json", JSON.stringify({
    generatedFrom: "data.gov.il CKAN + curated institutions",
    counts: { ckanOrgs: CKAN_ORGS.length, openDatasets: OPEN_DATASETS.length, curated: CURATED.length, total: cat.rows.length },
    rows: cat.rows,
  }, null, 2));
  await writeFile("artifacts/national-discovery-upsert.sql", toSql(cat));
  console.log(`catalog: ${cat.rows.length} sources (${CKAN_ORGS.length} CKAN orgs + ${OPEN_DATASETS.length} open datasets + ${CURATED.length} curated)`);
  console.log("→ artifacts/national-discovery-catalog.json + national-discovery-upsert.sql");
}
