# National Legal Source Discovery — 2026-08-05

Discovery-only program (no collectors built). Sources registered in the dev
registry (`legalai.legal_sources`, project udispadsbxqicmawqcuk). Every source is
real: government bodies + datasets come from the **data.gov.il CKAN API**
(`organization_list`, `package_search` — actual responses); curated institutions
are known public bodies pending live audit. No fabricated verdicts.

## Progress vs targets

| Target | Goal | Now | Status |
|---|---|---|---|
| Sources registered | ≥ 300 | **155** | 52% — in progress |
| Sources fully audited | ≥ 100 | **60** | 60% — in progress |
| OPEN candidates | ≥ 50 | **56** | ✅ met |
| Sources with API / Feed / Open Data | ≥ 25 | **115** | ✅ met |
| Collector candidates (OPEN) | ≥ 10 | **56** | ✅ met |

Verdict split: **56 OPEN**, 4 ASK, 8 BLOCKED, 2 REVIEW, 85 candidates (pending
live audit). Owner: 135 official, 11 academic, 6 commercial, 3 non-profit/public.

The two partial targets (300 registered, 100 audited) need the **live audit run
from an unblocked network** (this container's egress is blocked — control probes
to example.com return 403). The registry-driven audit + discovery-expansion
(sitemaps/links/robots) surface the remaining sources; run from the operator
machine. See "How to complete" below.

## 1. Top sources (by readiness)

56 OPEN data.gov.il legal datasets (open-licensed, CKAN API) lead the list, then
the audited ASK court sources, then 85 audited-pending institutional candidates.
Full ranked data: `artifacts/national-discovery-catalog.json` + registry.

## 2. Top 50 OPEN candidates (all evidence-backed via CKAN license)

56 open-licensed legal datasets on data.gov.il — licenses `other-open`
(Open-Definition approved) and `cc-by` (attribution). Highlights:

`judgments` (מאגר פסקי דין, משרד המשפטים) · `halicim_bateydin` (הליכי בתי דין) ·
`yerusha` / `hekdeshot` (ירושה, הקדשות) · `mamtziim_patents` / `trademarks_nice` /
`simaneymisahr` (פטנטים, סימני מסחר) · `ica_companies` / `ica-changes` /
`ica_partnerships` (רשם החברות) · `moj-amutot` (עמותות) · `regulationdatabase`
(מאגר רגולציה, רשות האסדרה) · `my-bills` / `547` / `odata` (הכנסת — הצעות חוק) ·
`bakashot_cpc` · `mashkonot` · `membership-in-liquidation` · `accessibilityorders` ·
`supervisionfiles` · `takanot_hayerusha-batei_hadin_hasharaim`/`-hadruzim` ·
`crime_records_data` · `magistrate-court-list` · `court-lost`, and more.
(cc-by datasets carry an attribution obligation.)

## 3. Top 25 APIs

All 115 API sources are the **data.gov.il CKAN API** (`/api/3/action/*`). The 59
publishing organizations + 56 datasets are each reachable via CKAN
`organization_show` / `package_show`. This is the single richest programmatic
legal-data surface found.

## 4. Top CKAN / Open-Data portals

`data.gov.il` (CKAN) — the national open-data portal; 61 organizations, thousands
of datasets, per-dataset licensing. This is the anchor portal. (OpenDataSoft /
Socrata: none found in Israel this run.)

## 5. Top 25 RSS sources

_Pending live audit_ — RSS/Atom discovery runs during the per-source audit
(gov.il/court/university sites), which requires the unblocked-network audit run.
Not yet populated; will not be fabricated.

## 6. Top 25 Government sources

38 official-government + 17 regulators + 6 tribunals, incl.: משרד המשפטים,
הרשות השופטת, הכנסת, רשות המסים, רשות שוק ההון (CMA), בנק ישראל, רשות התחרות,
רשות ניירות ערך, רשות האסדרה, רשות האכיפה והגבייה, משטרת ישראל, הרשות להגנת
הפרטיות, רשות הפטנטים, המוסד לביטוח לאומי, בתי הדין הרבניים/השרעיים/הצבאיים.

## 7. Top 25 Academic sources

11 law faculties / institutions: האוניברסיטה העברית, תל אביב, בר-אילן, חיפה,
בן-גוריון, האוניברסיטה הפתוחה, רייכמן, המכללה למינהל, אונו, ספיר, הספרייה הלאומית.
(Repository/journal endpoints to be surfaced during their live audit.)

## 8. Top 25 PDF repositories

_Pending live audit_ — PDF-bearing sources are flagged during audit (sitemap +
document sampling). data.gov.il datasets already expose PDF resources (e.g.
`judgments`). Full list needs the audit run.

## 9. Top legal archives

ארכיון המדינה (State Archives — CKAN + site), הספרייה הלאומית, Internet Archive.

## 10. Collector candidates (OPEN only — do NOT build yet)

The 56 OPEN data.gov.il datasets are the collector-ready set (one CKAN adapter
serves all). Lead candidate: `data.gov.il:judgments`. Per the Epic's stop
condition, collectors are deferred until 300 registered / 100 audited are met.

## How to complete the targets (operator-run)

The container cannot reach the internet (egress blocked), so the remaining
discovery + audit must run from your network:

```bash
# 1) audit all pending registry candidates (fills the 100-audited target,
#    and discovery-expansion surfaces new sources toward 300)
npm run legal:sources:audit -- --all        # (registry-driven; see runner)
```

Then paste the results and I'll write them into dev via MCP, exactly as done for
the first two audit rounds.

## Evidence

CKAN: `data.gov.il/api/3/action/organization_list`,
`.../package_search?q=<legal terms>`, `.../package_show?id=<dataset>`,
`.../license_list`. Catalog + upsert SQL: `artifacts/national-discovery-catalog.json`,
`artifacts/national-discovery-upsert.sql`.
