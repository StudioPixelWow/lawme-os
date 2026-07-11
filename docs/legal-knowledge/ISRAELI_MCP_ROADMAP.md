# LawME — Israeli MCP Roadmap

**Order approved by the founder (Epic 0). Only #1 is connected. #2–#5 are
NOT connected in this epic** — each requires its own npm-pack security
review + founder approval, per the enable procedure in
docs/skills/MCP_REGISTRY.md.

## 1. Kol Zchut — ✅ CONNECTED (2026-07-11)
- Package `@skills-il/kolzchut-mcp@1.0.1` (pinned) · maintainer: skills-il
  org · MIT · repo: skills-il/mcps · stdio · no credentials.
- Tools (6, all read-only): search_rights, get_article,
  get_article_sections, get_article_section, list_category_members,
  list_categories. Data: rights articles (Hebrew), MediaWiki JSON.
- Legal value: rights discovery, client-friendly explanations, intake.
- Risks: api.php blocks datacenter IPs (validated via browser; confirm
  first local use); content is tier-5 (never sole authority).
- Status: security-reviewed, protocol-verified, live-data validated —
  docs/legal-knowledge/KOL_ZCHUT_MCP_VALIDATION.md.

## 2. Knesset — NEXT (pending review + approval)
- Candidate package: `knesset` MCP (creator: zohar, per Skills-IL
  directory); exact npm name to confirm at review time.
- Source repo: to verify at review. Underlying API: Knesset OData
  (ParliamentInfo.svc — KNS_Bill, KNS_Law, KNS_Committee… confirmed to
  exist; **HTTP 474 geo/WAF from non-IL clouds**, works from IL egress).
- Tools expected: bill/law/committee/MK queries. Auth: none (public).
- Legal value: HIGH — legislation tracking, bill monitoring, committee
  protocols = the legislative-change detection feed.
- Risks: community package (full code review required); geo-block means
  it may only work from the founder's machine; OData quirks.
- POC test: fetch one bill's status + one law record; confirm Hebrew,
  latency, read-only. Go/No-Go: clean code review AND live IL-egress
  test AND read-only annotations.

## 3. DataGov Israel — (pending)
- Candidates: `datagov-israel` (aviveldan) / `data-gov-il` (DavidOsher) —
  pick after side-by-side code review. Underlying API: data.gov.il CKAN
  (verified live from this environment, no auth).
- Legal value: companies/amutot registries (entity resolution), FOI
  datasets, procurement. The CKAN REST API is simple — a thin MCP; if
  neither package passes review, LawME can call CKAN directly.
- Go/No-Go: code review; prefer the package with pinned deps + tests.

## 4. CBS / Israeli Statistics — (pending)
- Candidates: `israel-statistics` (reuvenaor) / `israeli-cbs` (amirrosi).
  Underlying: api.cbs.gov.il (price indices, series).
- Legal value: מדד linkage calculations (damages, contracts, rent),
  statistical evidence. Auth: none.
- Risks: CBS API was unreachable from this cloud (robots/403) — needs
  IL-egress verification; community packages.
- Go/No-Go: code review + one live index query (מדד המחירים לצרכן).

## 5. Israeli Budget — (pending, lowest priority)
- Candidates: `il-budget` (david-aftergut) / `budgetkey` (OpenBudget).
  Underlying: BudgetKey API (docs verified; /api/query read-only SQL).
- Legal value: public-sector/tender matters, entity enrichment. Niche.
- Go/No-Go: code review + relevance re-check at POC time — connect only
  when a matter type actually needs it.

## Standing rules for every future connection
1. npm-pack the pinned version; read every file + dependency tree.
2. Findings recorded in docs/skills/SECURITY_REVIEW.md.
3. Founder approval in chat — per server, never batch.
4. Add to `.mcp.json` version-pinned; one safe public read; record
   structure + latency in a validation doc like Kol Zchut's.
5. MCP output remains untrusted data (trust model); no MCP ever holds
   secrets or write access to LawME systems.
