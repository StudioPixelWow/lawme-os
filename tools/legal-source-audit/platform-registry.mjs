#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — National Legal Platform Registry.
 *
 * A "platform" is one system exposing MANY sources/datasets/documents (CKAN,
 * OData legislation service, court portal, regulator portal, wiki API, archive,
 * OAI-PMH, ...). This catalog characterizes Israel's core legal-data platforms
 * — the infrastructures future Collectors will draw from.
 *
 * Capabilities and counts are marked VERIFIED (checked this session via the
 * authorized browser) or ESTIMATED (from knowledge / prior audits) with a
 * confidence level. No invented APIs; unverified endpoints are ESTIMATED and
 * flagged as needing audit.
 *
 * Emits JSON + CSV + the platform graph + idempotent registry SQL.
 *   node platform-registry.mjs            → artifacts
 *   node platform-registry.mjs --sql      → registry upsert SQL
 */
import { writeFile, mkdir } from "node:fs/promises";
const has = (n) => process.argv.includes(n);
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

// Component scores 0..100. platform_score = weighted.
// [id,name,url,type,owner,evidence(V/E),publishers,datasets,resources,conf,
//  cAPI,cAutomation,cMetadata,cLicense,cGrowth, apiKind, access, tier, note]
const P = [
  ["data_gov_il","data.gov.il","https://data.gov.il/","CKAN","official","VERIFIED",58,1200,4000,"high",
    95,90,80,70,85,"CKAN REST","open","Tier 1","58 publishers verified; ~1200 datasets (est high); legal subset qualified. THE anchor platform."],
  ["knesset_odata","הכנסת — OData ParliamentInfo","https://knesset.gov.il/OdataV4/ParliamentInfo/","Legislation Portal","official","VERIFIED",1,48,500000,"high",
    90,90,85,60,80,"OData v4","open","Tier 1","48 entity sets verified (KNS_IsraelLaw, KNS_Bill, KNS_DocumentIsraelLaw, committees, sessions). Rich legislation API, no auth."],
  ["kolzchut","כל זכות","https://www.kolzchut.org.il/","Wiki/Reference","non_profit","VERIFIED",1,7347,16033,"high",
    80,85,70,90,70,"MediaWiki API","open","Tier 2","MediaWiki api.php verified: 7,347 articles / 16,033 pages. CC-BY-SA rights reference (not case law)."],
  ["gov_il","gov.il — Government Portal","https://www.gov.il/","Government Portal","official","VERIFIED",90,null,null,"medium",
    20,15,60,40,80,"none (dynamic collectors)","waf_blocked","Tier 2","~40+ ministries/units + dynamic collectors of decisions. Server-side WAF-blocked + ToS interface-only → needs official feed. Huge but access-restricted."],
  ["supreme_court","בית המשפט העליון — פסיקה","https://supremedecisions.court.gov.il/","Court Portal","official","VERIFIED",1,null,300000,"medium",
    15,10,75,80,60,"SearchVerdicts (anti-bot)","waf_blocked","Tier 1","§6 public-domain full judgments; anti-bot blocks server-side. Tier-1 CONTENT, needs official feed. ~300k+ docs (est)."],
  ["net_hamishpat","נט המשפט — חיפוש פסיקה ציבורי","https://www.court.gov.il/","Court System","official","VERIFIED",1,null,2000000,"low",
    10,10,70,80,60,"public search (restricted)","waf_blocked","Tier 1","All-courts public judgments; identity-gated portal + ToS interface-only. Tier-1 content, needs official feed. Millions of docs (est low conf)."],
  ["judgments_org_il","Judgments.org.il","https://judgments.org.il/","Document Repository","commercial","VERIFIED",1,null,500000,"medium",
    55,40,65,20,70,"WordPress wp-json","open_but_ask","Tier 2","3rd-party WP aggregator; wp-json present; ToS = written permission (ASK). Not authoritative."],
  ["isa","רשות ניירות ערך","https://www.isa.gov.il/","Regulatory Portal","official","VERIFIED",1,null,null,"low",
    30,20,50,30,60,"site search","open","Tier 3","Securities enforcement decisions/positions. Reachable; own ToS unverified → REVIEW."],
  // ---- ESTIMATED (knowledge / prior audits; need live audit) ----
  ["rabbinical_courts","בתי הדין הרבניים — פסיקה","https://www.gov.il/he/departments/rbc","Court Portal","official","ESTIMATED",1,null,null,"low",
    20,20,50,50,60,"site search (est)","waf_blocked","Tier 2","Rabbinical court rulings search (gov.il-hosted → WAF). Estimated; needs audit."],
  ["boi","בנק ישראל","https://www.boi.org.il/","Regulatory Portal","official","ESTIMATED",1,null,null,"low",
    35,25,55,40,60,"site + some data (est)","unknown","Tier 3","Directives, positions, publications. Estimated."],
  ["competition_authority","רשות התחרות","https://www.gov.il/he/departments/competition_authority","Regulatory Portal","official","ESTIMATED",1,null,null,"low",
    15,15,50,40,55,"gov.il (est)","waf_blocked","Tier 3","Competition decisions/rulings. gov.il-hosted. Estimated."],
  ["cma","רשות שוק ההון, ביטוח וחיסכון","https://www.gov.il/he/departments/mof_capital_market","Regulatory Portal","official","ESTIMATED",1,null,null,"low",
    15,15,50,40,55,"gov.il (est)","waf_blocked","Tier 3","Insurance/pension circulars + decisions. Estimated."],
  ["privacy_authority","הרשות להגנת הפרטיות","https://www.gov.il/he/departments/the_privacy_protection_authority","Regulatory Portal","official","ESTIMATED",1,null,null,"low",
    15,15,50,40,55,"gov.il (est)","waf_blocked","Tier 3","Privacy enforcement decisions/guidance. Estimated."],
  ["tax_rulings","רשות המסים — החלטות מיסוי","https://www.gov.il/he/departments/israel_tax_authority","Regulatory Portal","official","ESTIMATED",1,null,null,"low",
    25,20,55,45,60,"gov.il + some CKAN (est)","waf_blocked","Tier 2","Tax rulings (החלטות מיסוי) + customs. Partly on CKAN. Estimated."],
  ["ilpo","רשות הפטנטים (ILPO)","https://www.gov.il/he/departments/ilpo","Regulatory Portal","official","ESTIMATED",1,null,null,"medium",
    45,35,60,55,60,"databases + CKAN mirror (est)","unknown","Tier 2","Patents/trademarks/designs registries + decisions; several mirrored on CKAN (verified there). Estimated for the portal itself."],
  ["state_archives","ארכיון המדינה","https://www.archives.gov.il/","Digital Archive","official","ESTIMATED",1,null,null,"low",
    40,30,60,50,50,"catalog/API (est)","unknown","Tier 3","Historical government + legal materials. Digital catalog. Estimated; needs audit."],
  ["nli","הספרייה הלאומית (NLI)","https://www.nli.org.il/","Digital Library/Archive","public","ESTIMATED",1,null,null,"medium",
    60,55,75,60,55,"API + OAI-PMH (est)","open","Tier 2","National Library — API + OAI-PMH + IIIF; historical gazettes/legal texts. Estimated capabilities; needs audit."],
  ["univ_repositories","מאגרים מוסדיים אקדמיים (OAI-PMH)","https://www.openu.ac.il/","Institutional Repository","academic","ESTIMATED",8,null,null,"low",
    50,50,65,50,50,"OAI-PMH (est, per-univ)","open","Tier 3","University repositories/journals (law reviews). Many expose OAI-PMH. Per-institution audit required."],
  ["nevo","נבו","https://www.nevo.co.il/","Legal Database","commercial","VERIFIED",1,null,3000000,"low",
    10,5,80,5,60,"none (robots disallow)","robots_disallowed","Reject","Comprehensive commercial DB; robots disallow + commercial. Do NOT collect. Registered for map completeness only."],
  ["takdin","תקדין","https://www.takdin.co.il/","Legal Database","commercial","VERIFIED",1,null,2000000,"low",
    10,5,80,5,55,"none (login)","authentication_required","Reject","Commercial, login-gated. Do NOT collect."],
  ["reshumot","רשומות — הפרסום הרשמי","https://www.gov.il/he/departments/publications/reports/reshumot","Legislation/Gazette Portal","official","ESTIMATED",1,null,null,"low",
    20,20,55,60,55,"gov.il (est)","waf_blocked","Tier 2","Official gazette (חוקים, תקנות, מינויים). gov.il-hosted. Estimated; needs audit."],
  ["din_co_il","Din — פורטל משפטי","https://www.din.co.il/","Document Repository","commercial","ESTIMATED",1,null,null,"low",
    30,20,50,20,55,"site (est)","unknown","Tier 3","3rd-party legal portal/articles. Estimated; likely ASK."],
];

const WEIGHTS = { api: 0.20, automation: 0.20, metadata: 0.15, license: 0.15, growth: 0.10, scale: 0.20 };
function scaleScore(p) {
  // scale from publishers + datasets (log), estimated-tolerant
  const pub = p.publishers || 1, ds = p.datasets || 0, res = p.resources || 0;
  return Math.min(100, Math.round(Math.log10(pub + 1) * 20 + Math.log10(ds + 1) * 10 + Math.log10(res + 1) * 6));
}
function platformScore(p) {
  const s = WEIGHTS.api * p.cAPI + WEIGHTS.automation * p.cAutomation + WEIGHTS.metadata * p.cMetadata +
    WEIGHTS.license * p.cLicense + WEIGHTS.growth * p.cGrowth + WEIGHTS.scale * scaleScore(p);
  return Math.round(Math.max(0, Math.min(100, s)));
}

const R = P.map(([id, name, url, type, owner, evidence, publishers, datasets, resources, conf,
  cAPI, cAutomation, cMetadata, cLicense, cGrowth, apiKind, access, tier, note]) => {
  const p = { id, name, url, type, owner, evidence, publishers, datasets, resources, conf,
    cAPI, cAutomation, cMetadata, cLicense, cGrowth, apiKind, access, tier, note };
  return { ...p, scaleScore: scaleScore(p), platformScore: platformScore(p) };
});

function stFor(p) {
  return p.type === "CKAN" ? "open_data_portal" : p.type.includes("Court") ? "official_court_system"
    : p.type.includes("Regulat") ? "regulator" : p.type.includes("Legislation") ? "official_publication"
    : p.type.includes("Archive") || p.type.includes("Library") ? "archive"
    : p.type.includes("Repository") ? "document_repository" : p.type.includes("Database") ? "commercial_database"
    : p.owner === "academic" ? "academic" : "official_government";
}
function toSql() {
  const rowsSql = R.map((p) => {
    const note = `PLATFORM ${p.tier} | ${p.type} | ${p.evidence} | api:${p.apiKind} | score:${p.platformScore} | pub~${p.publishers ?? "?"} ds~${p.datasets ?? "?"} (${p.conf} conf) | ${p.note}`;
    return `(${q("platform:" + p.id)},${q(p.name)},${q(p.url)},${q(stFor(p))},${q(p.owner === "official" ? "official" : "non_official")},'IL',${q(new URL(p.url).hostname.replace(/^www\./, ""))},${q(p.owner)},'pending','audit_required',${p.platformScore},${q(note)})`;
  });
  return `-- National Legal Platform Registry — additive upsert (platform: code prefix).
insert into legalai.legal_sources (code,name,base_url,source_type,authority_type,jurisdiction,normalized_domain,owner_type,audit_status,collector_status,priority_score,audit_notes) values
${rowsSql.join(",\n")}
on conflict (code) do update set audit_notes=excluded.audit_notes, priority_score=excluded.priority_score, source_type=excluded.source_type, name=excluded.name;
`;
}

function counts() {
  const tier = (t) => R.filter((p) => p.tier === t).length;
  return {
    platforms: R.length,
    tier1: tier("Tier 1"), tier2: tier("Tier 2"), tier3: tier("Tier 3"), reject: tier("Reject"),
    verified: R.filter((p) => p.evidence === "VERIFIED").length,
    estimated: R.filter((p) => p.evidence === "ESTIMATED").length,
    est_publishers: R.reduce((a, p) => a + (p.publishers || 0), 0),
    est_datasets: R.reduce((a, p) => a + (p.datasets || 0), 0),
    est_resources: R.reduce((a, p) => a + (p.resources || 0), 0),
  };
}

if (has("--sql")) { process.stdout.write(toSql()); }
else {
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/national-platform-registry.json", JSON.stringify({ counts: counts(), platforms: R }, null, 2));
  const head = "id,name,url,type,owner,evidence,publishers,datasets,resources,confidence,api_kind,access,tier,platform_score";
  const csv = [head, ...R.map((p) => [p.id, p.name, p.url, p.type, p.owner, p.evidence, p.publishers ?? "", p.datasets ?? "", p.resources ?? "", p.conf, p.apiKind, p.access, p.tier, p.platformScore].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
  await writeFile("artifacts/national-platform-registry.csv", csv + "\n");
  await writeFile("artifacts/national-platform-registry.sql", toSql());
  console.log(JSON.stringify(counts(), null, 1));
}
