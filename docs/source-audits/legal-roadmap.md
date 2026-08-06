# National Legal Knowledge Roadmap — 2026-08-06

Sequenced **by coverage and ROI, not by platform.** The ordering follows the gap
analysis: realize the cheap high-value corpus first, capture the small open
case-law foothold, then unlock the blocked high-value domains through lawful
institutional routes. Pure synthesis — this roadmap builds nothing; it sequences
what earlier lawful passes proved reachable. Source of record:
`artifacts/legal-gap-analysis.json` (`roadmap`).

Two standing constraints apply to every sprint: collectors persist through the
**fail-closed pipeline** (documents land UNPUBLISHED / `ingested_unverified`,
with dedup and restriction-skip), and **no anti-bot or WAF system is ever
scraped** — blocked domains are pursued only via official feeds or permission.

## Sprint 1 — Legislation: realize the open corpus

**Why first:** highest ROI on the board (68). The Knesset OData ParliamentInfo
API is VERIFIED open, no authentication, and today sits at **0% realized** — the
largest gap between "reachable" and "held".

- Build the Knesset OData collector: `KNS_IsraelLaw`, `KNS_Bill`,
  `KNS_DocumentIsraelLaw`, committee and session entity sets.
- Persist through the fail-closed pipeline.

**Unblocks:** primary-law grounding for every downstream legal-reasoning
feature. This is the foundation the rest of the product reasons on top of.

## Sprint 2 — Case Law: open tribunals now, official feed next

**Why second:** the biggest *value* gap. We cannot close it by scraping, but we
can capture the open foothold immediately and start the long-lead institutional
track in parallel.

- Ingest `ararim` + `mishmoret` — the only two open full-document tribunal sets.
- Open an **official-feed / FOI track** for Supreme, District, Magistrate, and —
  most important for this firm — **Labor** court data. No scraping of net-
  hamishpat's anti-bot systems.

**Unblocks:** the first real judgment corpus, and the groundwork for labor-court
coverage, the firm's core practice.

## Sprint 3 — Registries: cheap structured breadth

**Why third:** lowest difficulty (1), already open, and one CKAN adapter serves
all 18 ready datasets.

- Configure the CKAN collector for companies (`ica_companies`, `ica-changes`,
  `ica_partnerships`), nonprofits (`moj-amutot`), IP (`mamtziim_patents`,
  `trademarks_nice`, `simaneymisahr`), and inheritance (`yerusha`, `hekdeshot`).
- Honor `cc-by` attribution on the flagged datasets.

**Unblocks:** a diligence and entity-resolution layer.

## Sprint 4 — Reference layer: Kol Zchut

**Why fourth:** open CC-BY-SA API, low difficulty, high client-facing value as a
rights-reference layer — but strictly secondary, never presented as primary law.

- Ingest Kol Zchut via the MediaWiki API with attribution.
- Label it as reference throughout.

**Unblocks:** client-facing rights explanations.

## Sprint 5 — Regulatory & Government: audit before build

**Why last of the active work:** these are estimated or WAF-blocked. They must
be made lawful *before* they can be built.

- Per-regulator live audit (ISA / Bank of Israel / CMA / Tax / Privacy) from an
  unblocked network.
- Pursue an official government-resolutions feed; **do not** scrape the gov.il
  WAF.

**Unblocks:** regulatory and administrative coverage once lawful routes are
confirmed.

## Deferred

**International & Comparative** — no open Israeli machine source identified and
lowest value for the firm's practice. Spin up a dedicated international-sources
discovery program only if the practice expands.

## Coverage trajectory

If executed in order, realized coverage moves from 0 to meaningful in the two
highest-leverage domains first:

| After sprint | Realized gains |
|---|---|
| 1 | Legislation corpus (primary laws, bills, committee docs) — the reasoning foundation. |
| 2 | First open judgment corpus (2 tribunal sets) + official court-feed track opened. |
| 3 | Full registry breadth (companies, nonprofits, IP, inheritance). |
| 4 | Client-facing rights-reference layer (Kol Zchut). |
| 5 | Regulatory/government coverage — *only* where a lawful route is confirmed. |

The single most important line on this roadmap: **Sprint 1 (Knesset OData
legislation) is the highest-ROI move available and unblocks everything
downstream.**
