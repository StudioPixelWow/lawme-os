# LawME — Source Scoring Model

Standardized 0–100 scoring for every source in the Legal Source Registry.
The score is an **operational planning tool** — it ranks integration work;
it never substitutes for the trust model's authority rules.

## Dimensions (8) and weights

| # | Dimension | Weight | What 100 means |
|---|---|---|---|
| 1 | Legal authority | 25% | Primary official source with binding authority |
| 2 | Coverage | 15% | Deep history, broad domains, complete documents |
| 3 | Freshness | 10% | Real-time or same-day publication |
| 4 | Technical accessibility | 15% | Official API / open feed, structured data |
| 5 | Metadata quality | 10% | Case no., date, court, judge, parties, citations, outcome all structured |
| 6 | Reliability | 10% | Official publisher, stable IDs, original documents, consistent updates |
| 7 | Licensing & legal usability | 10% | Open license, public reuse allowed |
| 8 | LawME strategic value | 5% | Directly powers research/drafting/monitoring/citation-verification/matter intelligence |

**Total = Σ(dimension × weight).** Round to integer.

### 1. Legal authority (0–100)
- 90–100: Primary official source, binding (Supreme Court DB, Reshumot, National Legislation DB)
- 70–89: Primary official, persuasive or sub-binding (lower-court publications, regulator directives)
- 40–69: Official derivative or licensed authoritative aggregation
- 20–39: Secondary explanation from a reputable publisher (Kol Zchut, academic)
- 0–19: Community/discovery content

### 2. Coverage (0–100)
Score = mean of four sub-scales (each 0–100): historical depth (100 =
pre-statehood/complete archive), domain breadth, court/authority breadth,
document completeness (full text vs abstracts).

### 3. Freshness (0–100)
Real-time 100 · daily 85 · weekly 70 · monthly 50 · irregular 30 · stale/
frozen 10. Verified `last_observed_update` caps this score: a claim of
"daily" with a 2022 last update scores as stale.

### 4. Technical accessibility (0–100)
Official documented API 100 · open feed/bulk download 85 · undocumented
but stable JSON backend 70 · structured HTML 55 · search-only interface
40 · PDF-only 25 · OCR-required scans 10. Subtract 15 if geo/WAF-blocked
from cloud environments (e.g. Knesset OData HTTP 474), subtract 10 for
CAPTCHA.

### 5. Metadata quality (0–100)
+12.5 per structured field family present: case number · date · court ·
judge · parties · citations · law references · outcome.

### 6. Reliability (0–100)
Official publisher +30 · stable identifiers +20 · original documents (not
retyped) +20 · integrity verification possible (hashes/ETags/versioning)
+15 · update consistency +15.

### 7. Licensing & legal usability (0–100)
Open license (CC/‏"אחר (פתוח)") 100 · public-domain content (judgment/
statute text) with open access 85 · free-to-view, reuse unstated 50 ·
permission required 25 · restricted/contractual 10 · unknown 30 (capped —
unknown is never rewarded).

### 8. LawME strategic value (0–100)
Rate contribution to the eight product uses: research, drafting,
monitoring, citation verification, matter intelligence, client intake,
practice packs, regulatory alerts. 12.5 points per use it materially
powers.

## Priority labels (assigned from score + gates)

| Label | Rule |
|---|---|
| **P0 — Critical foundation** | Score ≥ 70 AND authority ≥ 70 AND no licensing blocker; OR an infrastructure gateway that other P0 sources depend on (e.g. data.gov.il CKAN) |
| **P1 — High value** | Score ≥ 55, no licensing blocker |
| **P2 — Useful enrichment** | Score ≥ 40 |
| **P3 — Optional** | Score < 40, no risk flags |
| **Restricted — Do not connect** | Terms prohibit programmatic use, or privacy/provenance risk (e.g. anonymous mirrors with paid-takedown churn) |
| **License needed** | Valuable but permission-gated (commercial DBs, academic journals with no-commercial-use clauses) |
| **Research only** | Business-intelligence value only (competitor products, ToS-banned platforms like SSRN scraping) |

**Gates override score.** A 90-point source with unresolved licensing is
"License needed", not P0. `rag_permission: unknown` caps a source at P1
until terms are clarified.

## Current calibration (2026-07-11)
The registry's 23 P0 / 37 P1 assignments were made with this model by the
research agents; the registry's `reliability_score` and `authority_score`
columns carry dimensions 6 and 1 respectively. Full re-scoring across all
8 dimensions happens when a source enters integration planning (POC plan,
Phase 19) — scoring 134 sources in full detail before choosing a POC
domain would be wasted precision.

## Re-scoring triggers
Source structure change · license change · 2 consecutive failed freshness
checks · new API published · integration incident. Every re-score updates
`last_reviewed` in the registry.
