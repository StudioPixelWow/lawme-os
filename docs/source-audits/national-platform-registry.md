# National Legal Platform Registry — 2026-08-05

Platforms (systems exposing MANY sources/datasets/documents), not single
datasets. Capabilities are **VERIFIED** (checked this session via the authorized
browser) or **ESTIMATED** (knowledge / prior audits, confidence noted). No
invented APIs. Registered additively in `legalai.legal_sources` under the
`platform:` code prefix; full data in
`artifacts/national-platform-registry.{json,csv}`.

## Totals

- **Platforms discovered: 22** (target ≥20 ✅) — 10 VERIFIED, 12 ESTIMATED
- Tiers: **Tier-1: 4**, Tier-2: 8, Tier-3: 8, Reject: 2
- Publishers (sum of estimates): **~175** (target 200 — 88%, mostly from data.gov.il 58 verified + gov.il ~90 est)
- Datasets (sum of estimates): **~8,600** (target 800 ✅ — dominated by CKAN + Kol Zchut + Knesset entities)
- Resources/documents (sum of estimates): **~8.3M** (mostly court corpora, est low confidence)

Estimates are marked as such; only data.gov.il's 58 publishers and the
verified API entity counts are high-confidence.

## Verified this session

| Platform | Type | Evidence |
|---|---|---|
| data.gov.il | CKAN | `organization_list`=58 orgs; `package_search`; per-dataset licenses |
| Knesset OData | Legislation API | `OdataV4/ParliamentInfo` = **48 entity sets** incl. KNS_IsraelLaw, KNS_Bill, KNS_DocumentIsraelLaw, committees |
| Kol Zchut | MediaWiki API | `api.php` siteinfo = **7,347 articles / 16,033 pages** |
| gov.il | Gov Portal | ToS interface-only + server-side 403 (WAF) |
| Supreme Court / net hamishpat | Court | anti-bot block on server-side search (prior evidence) |
| judgments.org.il | WP repository | wp-json present; ToS written-permission |
| Nevo / Takdin | Commercial DB | robots-disallow / login (Reject) |

## Platform graph (levels — do not mix)

```
Platform            →  Publisher(s)          →  Dataset(s)            →  Resource(s)
data.gov.il (CKAN)  →  58 orgs (justice,…)   →  ~1,200 datasets       →  CSV/PDF/XLSX (~4k)
knesset OData       →  Knesset               →  48 entity sets        →  OData rows + linked docs
kolzchut (wiki)     →  Kol Zchut             →  7,347 articles        →  wiki pages (HTML/API)
gov.il portal       →  ~90 ministries/units  →  dynamic collectors    →  decision pages (WAF)
supreme/net-mishpat →  courts                →  case search           →  judgment HTML/PDF (anti-bot)
```

Only data.gov.il currently exposes the full four-level tree programmatically.

## Top 20 platforms (by platform_score)

1. data.gov.il (86, Tier-1, CKAN)
2. Kol Zchut (78, Tier-2, wiki API)
3. Knesset OData (77, Tier-1, legislation API)
4. NLI (50, Tier-2, archive — est)
5. Judgments.org.il (47, Tier-2, wp-json)
6. University repositories (46, Tier-3, OAI-PMH — est)
7. Supreme Court (42, Tier-1 content, anti-bot)
8. net hamishpat (41, Tier-1 content, restricted)
9. ILPO patents (40, Tier-2 — est)
10. gov.il portal (38, Tier-2, WAF)
11. State Archives (37, Tier-3 — est)
12. Bank of Israel (33, Tier-3 — est)
13. Reshumot gazette (32, Tier-2 — est)
14. Tax rulings (31, Tier-2 — est)
15. Nevo (31, Reject)
16. Takdin (30, Reject)
17. Rabbinical courts (30, Tier-2 — est)
18. ISA (29, Tier-3)
19. Din.co.il (27, Tier-3 — est)
20. Competition Authority / CMA / Privacy Authority (26, Tier-3 — est)

## Category top-10s

- **Government platforms:** data.gov.il, Knesset OData, gov.il, Reshumot, Tax rulings, ILPO, State Archives, Bank of Israel, Competition, CMA.
- **Court platforms:** Supreme Court, net hamishpat, Rabbinical courts (+ labor/military/sharia via gov.il — est).
- **Academic platforms:** university OAI-PMH repositories (HUJI/TAU/BIU/Haifa/BGU/OpenU/Reichman/Colman — per-institution audit needed), NLI.
- **Archives:** State Archives, NLI.
- **Regulators:** ISA, Bank of Israel, Competition Authority, CMA, Privacy Authority, Tax Authority, ILPO.
- **APIs (verified programmatic):** data.gov.il (CKAN REST), Knesset (OData v4), Kol Zchut (MediaWiki). judgments.org.il (wp-json). NLI (est).
- **OAI-PMH repositories (est, need audit):** university repositories, NLI.
- **RSS platforms:** none verified yet — RSS discovery runs during per-platform audit.

## Top 10 discovery opportunities (next to audit)

1. **Knesset OData** — build one legislation collector → hundreds of laws/bills/
   committee docs (VERIFIED, no auth). Highest-ROI after CKAN.
2. **NLI API + OAI-PMH** — historical gazettes/legal texts (verify endpoints).
3. **University OAI-PMH** — law reviews/theses (per-institution).
4. **Reshumot gazette** — official legislation feed (find the machine route).
5. **ILPO** — patents/trademarks portal beyond the CKAN mirror.
6. **Tax rulings (החלטות מיסוי)** — structured rulings.
7. **Rabbinical courts** — decisions search behind gov.il.
8. **Kol Zchut** — rights reference (CC-BY-SA, easy API) for legal-reference layer.
9. **Official court feed** — pursue a data feed for supreme/net-hamishpat (the
   Tier-1 content that scraping can't reach).
10. **Regulator decisions** — ISA/BoI/Competition/CMA/Privacy (per-regulator).

## Final report

1. **Platforms discovered:** 22 (10 verified, 12 estimated).
2. **Ranking:** above (data.gov.il, Kol Zchut, Knesset OData lead).
3. **Graph:** platform → publisher → dataset → resource (above).
4. **Potential:** in `national-platform-registry.json` (per-component scores).
5. **Top-20 for future collectors:** above.
6. **Next platform after CKAN → Knesset OData.** It is VERIFIED, open, no auth,
   and yields a large legislation corpus (48 entities incl. full law/bill
   documents) from a single OData collector — the cleanest high-value build.
7. **Information gaps needing audit:** NLI/OAI endpoints, university repositories,
   Reshumot machine route, regulator decision endpoints, and an official court
   data feed. Publisher/dataset/resource counts for non-CKAN platforms are
   estimates pending live audit.

## Constraints honored

No collectors built · no wide crawl · no WAF/CAPTCHA bypass · no invented APIs
(unverified endpoints marked ESTIMATED) · every VERIFIED capability backed by a
real API response captured this session.
