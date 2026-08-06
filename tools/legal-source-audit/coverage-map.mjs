#!/usr/bin/env node
/**
 * LAW ME — National Legal Knowledge Coverage & Gap Analysis (generator)
 * ---------------------------------------------------------------------
 * PURE SYNTHESIS. No network, no DB writes, no discovery, no audit, no
 * qualification, no collectors. Reads ONLY the artifacts already produced by
 * earlier lawful passes:
 *   - artifacts/national-platform-registry.json  (22 platforms, verified/est.)
 *   - artifacts/data-gov-legal-dataset-qualification.json (56 datasets qualified)
 *   - artifacts/national-discovery-catalog.json   (registered sources)
 *
 * It maps those into a TAXONOMY of Israeli legal knowledge (7 domains), scores
 * coverage per domain, derives gaps / ROI / priority, and emits:
 *   - artifacts/legal-coverage.json
 *   - artifacts/legal-gap-analysis.json
 *
 * Honesty rules encoded here:
 *   - "realized" coverage = what is actually INGESTED (currently 0 everywhere —
 *     no collector has run). "available" coverage = what is lawfully reachable
 *     today. We report BOTH and never conflate them.
 *   - Anything unproven is marked confidence ESTIMATED or UNKNOWN.
 *   - Case-law full documents for core courts are NOT covered (anti-bot); we do
 *     not pretend otherwise.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const ART = join(ROOT, "artifacts");

const readJson = (p) => JSON.parse(readFileSync(join(ART, p), "utf8"));

const platformReg = readJson("national-platform-registry.json");
const qual = readJson("data-gov-legal-dataset-qualification.json");

// ---- helpers -------------------------------------------------------------

const platformById = new Map(platformReg.platforms.map((p) => [p.id, p]));
const qualByCode = new Map(qual.datasets.map((d) => [d.code, d]));

/** count qualified datasets whose category is in the given set */
const qualCountByCategory = (cats) =>
  qual.datasets.filter((d) => cats.includes(d.category)).length;

/** ready-to-build OPEN datasets (VERIFIED_OPEN or OPEN_WITH_OBLIGATIONS) in cats */
const readyOpenByCategory = (cats) =>
  qual.datasets.filter(
    (d) =>
      cats.includes(d.category) &&
      (d.verdict === "VERIFIED_OPEN" || d.verdict === "OPEN_WITH_OBLIGATIONS")
  );

/** full-document open datasets in cats */
const fullDocsByCategory = (cats) =>
  qual.datasets.filter(
    (d) => cats.includes(d.category) && d.content === "full_documents"
  );

// band → score anchor (realized/available bands are qualitative, scores 0..100)
const BAND = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

// ---- the taxonomy + coverage model --------------------------------------
// Every figure below is DERIVED from the two artifacts or explicitly marked
// ESTIMATED / UNKNOWN. `ingested` is 0 across the board (no collector has run).

const DOMAINS = [
  {
    id: "case_law",
    name: "פסיקה — Case Law / Judiciary",
    description:
      "Judgments and decisions of the courts and tribunals: Supreme, District, Magistrate, Labor courts, and specialized tribunals; plus Rabbinical / Sharia / Military courts.",
    subdomains: [
      { key: "supreme", name: "בית המשפט העליון — Supreme Court", available: "NONE", note: "Published-judgments search works in a real browser; server-side anti-bot (403). No lawful bulk route yet → needs an official data feed." },
      { key: "district", name: "בתי המשפט המחוזיים — District courts", available: "NONE", note: "Same net-hamishpat anti-bot posture." },
      { key: "magistrate", name: "בתי משפט השלום — Magistrate courts", available: "NONE", note: "Same; only a court-list metadata dataset exists on CKAN." },
      { key: "labor", name: "בתי הדין לעבודה — Labor courts", available: "LOW", note: "CORE for a labor-law firm. No open full-text feed; decisions reachable only via restricted/commercial DBs today." },
      { key: "tribunals", name: "בתי דין מנהליים — Tribunals (עררים, משמורת)", available: "MEDIUM", note: "2 OPEN full-document sets on data.gov.il (ararim, mishmoret) — the ONLY open full-text case-law we hold." },
      { key: "religious", name: "בתי דין דתיים/צבאיים — Rabbinical/Sharia/Military", available: "LOW", note: "Behind gov.il; estimated, unaudited." },
    ],
    platforms: ["supreme_court", "net_hamishpat", "data_gov_il"],
    // realized = ingested; available = lawfully reachable today
    available: "LOW",
    ingested: 0,
    openFullDocDatasets: fullDocsByCategory(["tribunal_decisions"]).map((d) => d.code),
    openDatasets: readyOpenByCategory(["tribunal_decisions", "court_metadata"]).map((d) => d.code),
    confidence: "VERIFIED",
    legalValue: 5,
    businessValue: 5,
    difficulty: 5,
    gaps: [
      "Core court full-text (Supreme/District/Magistrate/Labor) is UNREACHABLE lawfully by scraping — the single biggest value gap.",
      "Labor-court decisions — the firm's core practice area — have NO open full-text feed.",
      "Only 2 tribunal sets (ararim, mishmoret) provide open full documents; everything else is metadata or blocked.",
      "No official machine-readable court data feed identified — must be pursued institutionally (FOI / data agreement).",
    ],
  },
  {
    id: "legislation",
    name: "חקיקה — Legislation",
    description:
      "Primary laws, bills, secondary legislation (regulations), Knesset committee documents, and the Reshumot official gazette.",
    subdomains: [
      { key: "laws", name: "חוקים — Primary laws", available: "HIGH", note: "Knesset OData KNS_IsraelLaw + KNS_DocumentIsraelLaw — full law texts, open, no auth (VERIFIED)." },
      { key: "bills", name: "הצעות חוק — Bills", available: "HIGH", note: "Knesset OData KNS_Bill (VERIFIED); CKAN my-bills/547 mirror." },
      { key: "regulations", name: "תקנות — Secondary legislation", available: "MEDIUM", note: "Partly via Knesset docs / Reshumot; machine route to Reshumot not yet verified (ESTIMATED)." },
      { key: "committees", name: "ועדות הכנסת — Committee documents", available: "HIGH", note: "Knesset OData committee/session entity sets (VERIFIED)." },
      { key: "gazette", name: "רשומות — Official gazette", available: "LOW", note: "Authoritative legislation feed; machine route ESTIMATED, needs audit." },
    ],
    platforms: ["knesset_odata", "data_gov_il"],
    available: "HIGH",
    ingested: 0,
    openFullDocDatasets: ["knesset:KNS_IsraelLaw", "knesset:KNS_DocumentIsraelLaw", "knesset:KNS_Bill"],
    openDatasets: readyOpenByCategory(["legislation"]).map((d) => d.code),
    confidence: "VERIFIED",
    legalValue: 5,
    businessValue: 4,
    difficulty: 2,
    gaps: [
      "The full open legislation corpus (Knesset OData, 48 entity sets, no auth) is reachable but 0% INGESTED — highest-ROG unrealized asset.",
      "Reshumot gazette machine route unverified — the authoritative publication channel.",
      "Secondary legislation (תקנות) consolidation is partial and needs mapping across Knesset + Reshumot.",
    ],
  },
  {
    id: "registries",
    name: "מרשמים — Registries",
    description:
      "Statutory registers: companies, partnerships, nonprofits (amutot), patents, trademarks, inheritance & endowments.",
    subdomains: [
      { key: "companies", name: "רשם החברות — Companies", available: "HIGH", note: "ica_companies / ica-changes / ica_partnerships (OPEN CKAN)." },
      { key: "nonprofits", name: "רשם העמותות — Nonprofits", available: "HIGH", note: "moj-amutot (OPEN CKAN)." },
      { key: "ip", name: "פטנטים וסימני מסחר — Patents/Trademarks", available: "HIGH", note: "mamtziim_patents / trademarks_nice / simaneymisahr (OPEN CKAN)." },
      { key: "inheritance", name: "ירושה והקדשות — Inheritance/Endowments", available: "HIGH", note: "yerusha / hekdeshot + takanot (OPEN CKAN)." },
    ],
    platforms: ["data_gov_il"],
    available: "HIGH",
    ingested: 0,
    openFullDocDatasets: [],
    openDatasets: readyOpenByCategory(["company_registry", "nonprofit_registry", "patents", "trademarks", "inheritance"]).map((d) => d.code),
    confidence: "VERIFIED",
    legalValue: 3,
    businessValue: 3,
    difficulty: 1,
    gaps: [
      "Registry records are structured data, NOT full legal documents — supports diligence, not primary-law research.",
      "One CKAN collector serves all of these; the gap is realization (0 ingested), not access.",
    ],
  },
  {
    id: "regulatory",
    name: "רגולציה — Regulatory",
    description:
      "Decisions, directives and circulars of the regulators: ISA, Bank of Israel, CMA (Capital Market Authority), Competition Authority, Privacy Authority, Tax rulings, Regulation DB.",
    subdomains: [
      { key: "regdb", name: "מאגר הרגולציה — Regulation DB", available: "MEDIUM", note: "regulationdatabase (OPEN CKAN) — regulation metadata." },
      { key: "securities", name: "רשות ניירות ערך — ISA", available: "LOW", note: "Decisions endpoint unaudited (Tier-3)." },
      { key: "banking", name: "בנק ישראל — Bank of Israel", available: "LOW", note: "Directives; machine route ESTIMATED." },
      { key: "cma", name: "רשות שוק ההון — CMA", available: "LOW", note: "ESTIMATED / unaudited." },
      { key: "tax", name: "החלטות מיסוי — Tax rulings", available: "LOW", note: "Structured rulings; route ESTIMATED." },
    ],
    platforms: ["data_gov_il", "isa", "gov_il"],
    available: "LOW",
    ingested: 0,
    openFullDocDatasets: [],
    openDatasets: readyOpenByCategory(["regulation", "administrative_decisions"]).map((d) => d.code),
    confidence: "ESTIMATED",
    legalValue: 4,
    businessValue: 3,
    difficulty: 4,
    gaps: [
      "Regulator decision endpoints are largely unaudited/estimated — needs per-regulator live audit before any build.",
      "Only regulation metadata (not full directives) is open today.",
    ],
  },
  {
    id: "government",
    name: "מנהלי — Government / Administrative",
    description:
      "Government resolutions, ministry decisions, administrative orders and directives published across gov.il.",
    subdomains: [
      { key: "gov_decisions", name: "החלטות ממשלה — Government resolutions", available: "LOW", note: "gov.il portal is WAF-protected (server-side 403); interface-only ToS." },
      { key: "ministry", name: "החלטות משרדים — Ministry decisions", available: "LOW", note: "~90 units on gov.il; dynamic collectors behind WAF." },
      { key: "admin_orders", name: "צווים מנהליים — Administrative orders", available: "LOW", note: "accessibilityorders / supervisionfiles (partial CKAN)." },
    ],
    platforms: ["gov_il", "data_gov_il"],
    available: "LOW",
    ingested: 0,
    openFullDocDatasets: [],
    openDatasets: readyOpenByCategory(["administrative_decisions"]).map((d) => d.code),
    confidence: "ESTIMATED",
    legalValue: 3,
    businessValue: 3,
    difficulty: 4,
    gaps: [
      "gov.il government-resolutions corpus sits behind a WAF — no lawful bulk route without an official feed / permission.",
      "Administrative decisions are scattered; only fragments are on CKAN.",
    ],
  },
  {
    id: "academic",
    name: "אקדמי/משני — Academic & Secondary",
    description:
      "Law reviews, theses, scholarly commentary, and public legal-reference material (rights guides).",
    subdomains: [
      { key: "reference", name: "מדריכי זכויות — Rights reference", available: "HIGH", note: "Kol Zchut MediaWiki API (VERIFIED): 7,347 articles, CC-BY-SA. Reference, not case law." },
      { key: "law_reviews", name: "כתבי עת משפטיים — Law reviews", available: "UNKNOWN", note: "University OAI-PMH repositories ESTIMATED / unaudited." },
      { key: "theses", name: "עבודות מחקר — Theses", available: "UNKNOWN", note: "Per-institution repositories; not audited." },
    ],
    platforms: ["kolzchut", "nli"],
    available: "MEDIUM",
    ingested: 0,
    openFullDocDatasets: [],
    openDatasets: readyOpenByCategory(["legal_reference"]).map((d) => d.code),
    confidence: "ESTIMATED",
    legalValue: 2,
    businessValue: 3,
    difficulty: 2,
    gaps: [
      "Kol Zchut is open and easy (client-facing rights layer) but is secondary reference, not primary law.",
      "University law-review / thesis repositories are entirely UNAUDITED — coverage unknown.",
    ],
  },
  {
    id: "international",
    name: "בינלאומי/משווה — International & Comparative",
    description:
      "Treaties Israel is party to, foreign and comparative law, and international tribunal rulings.",
    subdomains: [
      { key: "treaties", name: "אמנות — Treaties", available: "UNKNOWN", note: "No open Israeli machine source identified this program." },
      { key: "comparative", name: "משפט משווה — Comparative/foreign law", available: "UNKNOWN", note: "Out of current national scope." },
      { key: "intl_rulings", name: "פסיקה בינלאומית — International rulings", available: "UNKNOWN", note: "Not surveyed." },
    ],
    platforms: [],
    available: "NONE",
    ingested: 0,
    openFullDocDatasets: [],
    openDatasets: [],
    confidence: "UNKNOWN",
    legalValue: 2,
    businessValue: 1,
    difficulty: 3,
    gaps: [
      "No coverage and no discovery yet — lowest priority for an Israeli labor-law firm.",
      "Would require a separate international-sources discovery program.",
    ],
  },
];

// ---- scoring -------------------------------------------------------------
// availableScore: how much of the domain is lawfully reachable today (0..100)
// realizedScore:  how much is actually ingested (0..100) — currently 0 all round
// roiScore:       value delivered per unit of effort to CLOSE the gap
// priority:       value vs difficulty quadrant

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

const availableScoreOf = (d) => {
  // base from band, nudged by how many open full-doc datasets / open datasets exist
  const base = { NONE: 5, LOW: 25, MEDIUM: 55, HIGH: 85 }[d.available];
  const fullDocBonus = Math.min(10, d.openFullDocDatasets.length * 3);
  return clamp(base + fullDocBonus);
};

const scored = DOMAINS.map((d) => {
  const available_score = availableScoreOf(d);
  const realized_score = 0; // nothing ingested yet
  // ROI: (legalValue + businessValue) weighted, divided by difficulty, scaled.
  // Reward domains that are high-value AND reachable-but-unrealized (big, cheap wins).
  const valueSum = d.legalValue + d.businessValue; // 2..10
  const reachability = available_score / 100; // 0..1 — you can only realize what's reachable
  const roi_raw = ((valueSum / 10) * reachability * (6 - d.difficulty)) / 5; // 0..~1.2
  const roi_score = clamp(roi_raw * 100);
  const gap = clamp(available_score - realized_score); // unrealized-but-reachable
  const value_score = clamp((valueSum / 10) * 100);
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    subdomains: d.subdomains,
    platforms: d.platforms.map((pid) => {
      const p = platformById.get(pid);
      return p ? { id: p.id, name: p.name, evidence: p.evidence, tier: p.tier, access: p.access } : { id: pid, name: pid, evidence: "UNKNOWN" };
    }),
    confidence: d.confidence,
    available_band: d.available,
    available_score,
    realized_band: "NONE",
    realized_score,
    unrealized_reachable_gap: gap,
    legal_value: d.legalValue,
    business_value: d.businessValue,
    value_score,
    difficulty: d.difficulty,
    roi_score,
    open_full_doc_datasets: d.openFullDocDatasets,
    open_datasets: d.openDatasets,
    open_dataset_count: d.openDatasets.length,
    gaps: d.gaps,
  };
});

// priority quadrant: high value (>=70) x low difficulty (<=2) = DO FIRST
const quadrantOf = (s) => {
  const hv = s.value_score >= 70;
  const easy = s.difficulty <= 2;
  if (hv && easy) return "DO_FIRST";
  if (hv && !easy) return "STRATEGIC"; // high value, hard — needs institutional route
  if (!hv && easy) return "QUICK_WIN";
  return "DEFER";
};
for (const s of scored) s.priority_quadrant = quadrantOf(s);

// ---- national rollup -----------------------------------------------------
const weightByValue = scored.reduce((a, s) => a + s.value_score, 0);
const nationalAvailable = clamp(
  scored.reduce((a, s) => a + s.available_score * s.value_score, 0) / weightByValue
);
const nationalRealized = 0;

const coverage = {
  generated_for: "LAW ME — National Legal Knowledge Coverage Map",
  method: "pure synthesis of existing artifacts (no network / DB / discovery / audit / collector)",
  sources_used: [
    "artifacts/national-platform-registry.json",
    "artifacts/data-gov-legal-dataset-qualification.json",
    "artifacts/national-discovery-catalog.json",
  ],
  national: {
    available_coverage_score: nationalAvailable,
    realized_coverage_score: nationalRealized,
    note: "AVAILABLE = lawfully reachable today. REALIZED = actually ingested. Realized is 0 because no collector has run — every domain's coverage is currently a plan, not a corpus.",
    domains: scored.length,
    platforms_total: platformReg.counts.platforms,
    open_datasets_ready: qual.datasets.filter((d) => d.collectorStatus === "ready_to_build").length,
    open_full_document_datasets: qual.counts.full_documents,
  },
  domains: scored,
};

// ---- gap analysis --------------------------------------------------------
// Two gap layers: domain-level (narrative) and subdomain-level (granular), each
// ranked by severity = value x (1 - availability). Realized coverage is 0
// everywhere, so severity is driven by value and how unreachable the area is.
const domainById = new Map(DOMAINS.map((d) => [d.id, d]));
const subBandScore = (band) => ({ NONE: 5, LOW: 25, MEDIUM: 55, HIGH: 85, UNKNOWN: 15 })[band] ?? 15;

const gapItems = [];
for (const s of scored) {
  // domain-level narrative gaps
  for (const g of s.gaps) {
    gapItems.push({
      level: "domain",
      domain: s.id,
      domain_name: s.name,
      gap: g,
      value_score: s.value_score,
      difficulty: s.difficulty,
      available_score: s.available_score,
      severity: clamp(s.value_score * (1 - s.available_score / 100)),
      confidence: s.confidence,
    });
  }
  // subdomain-level gaps: anything not already HIGH-available is a coverage hole
  const dom = domainById.get(s.id);
  for (const sub of dom.subdomains) {
    if (sub.available === "HIGH") continue; // adequately reachable — not a gap
    const subAvail = subBandScore(sub.available);
    gapItems.push({
      level: "subdomain",
      domain: s.id,
      domain_name: s.name,
      subdomain: sub.name,
      gap: sub.note,
      available_band: sub.available,
      value_score: s.value_score,
      difficulty: s.difficulty,
      available_score: subAvail,
      severity: clamp(s.value_score * (1 - subAvail / 100)),
      confidence: sub.available === "UNKNOWN" ? "UNKNOWN" : s.confidence,
    });
  }
}
gapItems.sort((a, b) => b.severity - a.severity);

// opportunities: reachable + high value + not yet realized = best ROI moves.
// Domain-level strategic opportunities PLUS concrete per-asset moves (the actual
// VERIFIED-open datasets/platforms that can be ingested first), so the list is
// actionable rather than abstract.
const domainOpps = scored.map((s) => ({
  level: "domain",
  domain: s.id,
  domain_name: s.name,
  roi_score: s.roi_score,
  value_score: s.value_score,
  difficulty: s.difficulty,
  available_score: s.available_score,
  unrealized_reachable_gap: s.unrealized_reachable_gap,
  priority_quadrant: s.priority_quadrant,
  lead_move: leadMoveFor(s.id),
}));

// concrete asset-level opportunities from the qualification pass (VERIFIED open,
// ready_to_build) — the things you can literally point a collector at today.
const assetOpps = qual.datasets
  .filter((d) => d.collectorStatus === "ready_to_build")
  .map((d) => ({
    level: "asset",
    domain: assetDomain(d.category),
    asset: d.code,
    publisher: d.pub,
    license: d.lic,
    verdict: d.verdict,
    content: d.content,
    tier: d.tier,
    // full documents are worth more than registry/metadata rows
    roi_score: clamp((d.content === "full_documents" ? 90 : d.content === "registry_records" ? 55 : 45) - (d.tier - 1) * 5),
    note: d.note,
  }))
  .sort((a, b) => b.roi_score - a.roi_score);

// VERIFIED platform-level opportunities not tied to a single CKAN dataset
const platformOpps = platformReg.platforms
  .filter((p) => p.evidence === "VERIFIED" && p.access === "open")
  .map((p) => ({
    level: "platform",
    domain: platformDomain(p.id),
    asset: p.id,
    name: p.name,
    apiKind: p.apiKind,
    roi_score: clamp(p.platformScore),
    note: p.note,
  }))
  .sort((a, b) => b.roi_score - a.roi_score);

const opportunities = [...domainOpps].sort((a, b) => b.roi_score - a.roi_score);
const opportunities_detailed = {
  by_domain: domainOpps.sort((a, b) => b.roi_score - a.roi_score),
  by_platform: platformOpps,
  by_asset: assetOpps,
};

function assetDomain(cat) {
  if (["tribunal_decisions", "court_metadata"].includes(cat)) return "case_law";
  if (cat === "legislation") return "legislation";
  if (["company_registry", "nonprofit_registry", "patents", "trademarks", "inheritance"].includes(cat)) return "registries";
  if (["regulation", "administrative_decisions"].includes(cat)) return "regulatory";
  if (cat === "legal_reference") return "academic";
  return "other";
}
function platformDomain(id) {
  if (id === "knesset_odata") return "legislation";
  if (id === "kolzchut") return "academic";
  if (id === "data_gov_il") return "registries";
  return "other";
}

function leadMoveFor(id) {
  switch (id) {
    case "legislation":
      return "Build ONE Knesset OData collector (48 entity sets, open, no auth) → full legislation corpus. Highest ROI.";
    case "registries":
      return "Point the existing CKAN adapter at the 18 ready OPEN registry datasets → immediate structured coverage.";
    case "case_law":
      return "Ingest the 2 OPEN tribunal full-doc sets now; pursue an OFFICIAL court data feed (FOI/agreement) for the core courts.";
    case "academic":
      return "Ingest Kol Zchut (CC-BY-SA API) as the client-facing rights-reference layer; audit university OAI-PMH separately.";
    case "regulatory":
      return "Run a per-regulator live audit (ISA/BoI/CMA/Tax) before building — currently estimated only.";
    case "government":
      return "Do NOT scrape gov.il (WAF); pursue an official government-resolutions feed / permission.";
    case "international":
      return "Deprioritize; spin up a dedicated international-sources discovery only if the practice expands.";
    default:
      return "Audit before building.";
  }
}

const gapAnalysis = {
  generated_for: "LAW ME — National Legal Gap Analysis",
  method: coverage.method,
  top_gaps: gapItems,
  opportunities,
  opportunities_detailed,
  roadmap: buildRoadmap(),
};

function buildRoadmap() {
  // Sequenced by ROI and dependency, not by platform.
  return [
    {
      sprint: 1,
      theme: "Legislation — realize the open corpus",
      domain: "legislation",
      rationale: "Highest ROI: VERIFIED open Knesset OData, no auth, one collector, 0% ingested today.",
      moves: [
        "Build the Knesset OData collector (KNS_IsraelLaw, KNS_Bill, KNS_DocumentIsraelLaw, committees).",
        "Persist through the fail-closed pipeline (UNPUBLISHED, dedup, restriction-skip).",
      ],
      unblocks: "Primary-law grounding for every downstream legal-reasoning feature.",
    },
    {
      sprint: 2,
      theme: "Case-law — open tribunals now, official feed next",
      domain: "case_law",
      rationale: "Biggest value gap. Capture what is open immediately; start the institutional path for core courts.",
      moves: [
        "Ingest ararim + mishmoret (2 OPEN full-document tribunal sets).",
        "Open an official-feed / FOI track for Supreme/District/Magistrate/Labor court data (NO scraping of anti-bot systems).",
      ],
      unblocks: "First real judgment corpus; groundwork for labor-court coverage (the firm's core).",
    },
    {
      sprint: 3,
      theme: "Registries — cheap structured breadth",
      domain: "registries",
      rationale: "Lowest difficulty, already OPEN; one CKAN adapter serves all 18 ready datasets.",
      moves: [
        "Configure the CKAN collector for companies / nonprofits / IP / inheritance registries.",
        "Honor cc-by attribution obligations on the flagged datasets.",
      ],
      unblocks: "Diligence & entity-resolution layer.",
    },
    {
      sprint: 4,
      theme: "Reference layer — Kol Zchut",
      domain: "academic",
      rationale: "Open CC-BY-SA API, easy, high client-facing value as a rights-reference layer.",
      moves: ["Ingest Kol Zchut via MediaWiki API with attribution.", "Keep it labelled secondary/reference, never as primary law."],
      unblocks: "Client-facing rights explanations.",
    },
    {
      sprint: 5,
      theme: "Regulatory & Government — audit before build",
      domain: "regulatory",
      rationale: "Estimated only; must be audited per-regulator. gov.il stays WAF-blocked → official feed only.",
      moves: [
        "Per-regulator live audit (ISA/BoI/CMA/Tax/Privacy) from an unblocked network.",
        "Pursue an official government-resolutions feed; do not scrape the WAF.",
      ],
      unblocks: "Regulatory & administrative coverage once lawful routes are confirmed.",
    },
  ];
}

// ---- write ---------------------------------------------------------------
writeFileSync(join(ART, "legal-coverage.json"), JSON.stringify(coverage, null, 2));
writeFileSync(join(ART, "legal-gap-analysis.json"), JSON.stringify(gapAnalysis, null, 2));

// ---- console summary -----------------------------------------------------
console.log("National AVAILABLE coverage:", nationalAvailable, "/100");
console.log("National REALIZED coverage:", nationalRealized, "/100 (nothing ingested yet)");
console.log("");
console.log("Domain".padEnd(28), "avail", "real", "value", "diff", "roi", "quadrant");
for (const s of scored) {
  console.log(
    s.id.padEnd(28),
    String(s.available_score).padStart(5),
    String(s.realized_score).padStart(4),
    String(s.value_score).padStart(5),
    String(s.difficulty).padStart(4),
    String(s.roi_score).padStart(3),
    " " + s.priority_quadrant
  );
}
console.log("");
console.log("Top 5 gaps by severity:");
for (const g of gapItems.slice(0, 5)) console.log("  [" + g.severity + "]", g.domain, "—", g.gap.slice(0, 80));
console.log("");
console.log("Wrote artifacts/legal-coverage.json + artifacts/legal-gap-analysis.json");
