# National Legal Gap Analysis — 2026-08-06

Ranked gaps and opportunities derived from the coverage map. Pure synthesis (no
network / DB / discovery / audit / collector). Source of record:
`artifacts/legal-gap-analysis.json`. Severity = domain/subdomain value ×
(1 − availability); ROI = value delivered per unit of effort to *close* the gap.

## Headline

The gap map has a clear shape: **the highest-value domain (case law) is the
least reachable, and the most reachable domain (legislation) is almost entirely
unrealized.** The strategic move is therefore not "collect more" — it is
**realize the open legislation corpus now**, capture the small open case-law
foothold, and open an institutional track for the court data that scraping can
never lawfully reach.

## Top 20 gaps (by severity)

| # | Sev | Domain | Level | Gap |
|---:|---:|---|---|---|
| 1 | 95 | Case Law | subdomain | **Supreme Court** — search works in a browser but server-side is anti-bot (403); no lawful bulk route. |
| 2 | 95 | Case Law | subdomain | **District courts** — same net-hamishpat anti-bot posture. |
| 3 | 95 | Case Law | subdomain | **Magistrate courts** — same; only a court-list metadata dataset on CKAN. |
| 4 | 75 | Case Law | subdomain | **Labor courts** — the firm's core practice area, no open full-text feed. |
| 5 | 75 | Case Law | subdomain | **Rabbinical/Sharia/Military courts** — behind gov.il, unaudited. |
| 6 | 69 | Case Law | domain | Core court full-text is unreachable lawfully by scraping — the single biggest value gap. |
| 7 | 69 | Case Law | domain | Labor-court decisions have no open full-text feed. |
| 8 | 69 | Case Law | domain | Only 2 tribunal sets (ararim, mishmoret) give open full documents. |
| 9 | 69 | Case Law | domain | No official machine-readable court data feed identified — pursue via FOI / agreement. |
| 10 | 68 | Legislation | subdomain | **Reshumot gazette** — authoritative feed; machine route unverified, needs audit. |
| 11 | 53 | Regulatory | domain | Regulator decision endpoints largely unaudited — need per-regulator audit before build. |
| 12 | 53 | Regulatory | domain | Only regulation *metadata* is open today, not full directives. |
| 13 | 53 | Regulatory | subdomain | **ISA** decisions endpoint unaudited (Tier-3). |
| 14 | 53 | Regulatory | subdomain | **Bank of Israel** directives — machine route estimated. |
| 15 | 53 | Regulatory | subdomain | **CMA** (רשות שוק ההון) — estimated / unaudited. |
| 16 | 53 | Regulatory | subdomain | **Tax rulings** (החלטות מיסוי) — structured rulings, route estimated. |
| 17 | 45 | Case Law | subdomain | **Tribunals** — the 2 open sets are the *only* open full-text case law we hold. |
| 18 | 45 | Government | domain | gov.il resolutions corpus behind a WAF — no lawful bulk route without a feed/permission. |
| 19 | 45 | Government | domain | Administrative decisions scattered; only fragments on CKAN. |
| 20 | 45 | Government | subdomain | **Government resolutions** — gov.il WAF-protected (403), interface-only ToS. |

The top nine gaps are all case-law. That is the story of the map: a labor-law
firm's most valuable domain is the one the open ecosystem serves worst.

## Top 20 opportunities (by ROI)

Opportunities come in three layers — strategic (which domain to move on),
platform (which verified API to build against), and asset (which specific open
dataset to point a collector at first).

### Strategic (domain-level)

| # | ROI | Domain | Quadrant | Lead move |
|---:|---:|---|---|---|
| 1 | 68 | **Legislation** | DO FIRST | Build ONE Knesset OData collector (48 entity sets, open, no auth) → full legislation corpus. |
| 2 | 51 | **Registries** | QUICK WIN | Point the existing CKAN adapter at the 18 ready open datasets → immediate structured coverage. |
| 3 | 22 | Academic | QUICK WIN | Ingest Kol Zchut (CC-BY-SA) as the client-facing rights-reference layer; audit university OAI-PMH separately. |
| 4 | 7 | Regulatory | STRATEGIC | Per-regulator live audit (ISA/BoI/CMA/Tax) before building. |
| 5 | 6 | Case Law | STRATEGIC | Ingest the 2 open tribunal sets now; open an official court-feed track for the core courts. |
| 6 | 6 | Government | DEFER | Do not scrape gov.il (WAF); pursue an official resolutions feed. |
| 7 | 1 | International | DEFER | Deprioritize until the practice expands. |

### Platform (verified, open APIs)

| # | Score | Platform | API |
|---:|---:|---|---|
| 8 | 86 | data.gov.il | CKAN REST |
| 9 | 78 | Kol Zchut | MediaWiki API |
| 10 | 77 | Knesset OData | OData v4 |

### Asset (specific open datasets — collector-ready today)

| # | ROI | Dataset | Domain | Content | License |
|---:|---:|---|---|---|---|
| 11 | 90 | `ararim` | Case Law | full documents | cc-by |
| 12 | 90 | `mishmoret` | Case Law | full documents | cc-by |
| 13 | 50 | `ica_companies` | Registries | registry records | other-open |
| 14 | 50 | `ica-changes` | Registries | registry records | cc-by |
| 15 | 50 | `ica_partnerships` | Registries | registry records | cc-by |
| 16 | 50 | `moj-amutot` | Registries | registry records | other-open |
| 17 | 50 | `mamtziim_patents` | Registries | registry records | cc-by |
| 18 | 50 | `simaneymisahr` | Registries | registry records | other-open |
| 19 | 50 | `yerusha` / `hekdeshot` | Registries | registry records | cc-by |
| 20 | 45 | `judgments` | Case Law | metadata + summary | other-open |

`cc-by` datasets carry an attribution obligation the collector must honor.

## ROI matrix (value × difficulty)

```
             EASY  (diff ≤2)            HARD (diff ≥4)
HIGH   │  Legislation  ← DO FIRST   │  Case Law     ← STRATEGIC (institutional
value  │  Registries   ← QUICK WIN  │  Regulatory      route required)
       │                            │
LOW    │  Academic     ← QUICK WIN  │  Government    ← DEFER
value  │                            │  International ← DEFER
```

- **DO FIRST** — Legislation: high value, low difficulty, verified open, 0%
  realized. The unambiguous first build.
- **QUICK WINS** — Registries and the Kol Zchut reference layer: cheap, open,
  realize immediately alongside legislation.
- **STRATEGIC** — Case Law and Regulatory: high value but blocked or unaudited;
  progress needs an institutional feed or a live audit, not more scraping.
- **DEFER** — Government (WAF) and International (no source yet).

## Priority matrix (what to do, in order)

1. **Realize legislation** — the biggest reachable-but-unrealized asset.
2. **Capture open case law** — the 2 tribunal sets, immediately.
3. **Sweep registries** — one CKAN adapter, 18 datasets.
4. **Add the reference layer** — Kol Zchut.
5. **Audit regulators; pursue the official court feed** — unlock the STRATEGIC
   quadrant lawfully.

Full sequencing with dependencies is in `legal-roadmap.md`.
