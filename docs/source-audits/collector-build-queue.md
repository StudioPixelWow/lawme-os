# Collector Build Queue — 2026-08-05

Only sources that reached **OPEN** enter the queue. Do NOT build yet — this is the
prioritized queue after the Terms & License review (run b1e5c0de).

## 1. data.gov.il:judgments — OPEN

- **Priority:** 45 · **License:** other-open (Open-Definition-approved)
- **Access method:** CKAN API — `GET /api/3/action/package_show?id=judgments` → CSV + PDF resources
- **Estimated documents:** 1 dataset, 2021 freedom-of-information judgments (bounded; not the full corpus)
- **Collector type:** api (CKAN) · **Parser type:** CSV rows + PDF text layer
- **Rate limits:** polite (≤1–2 req/s); dataset is small — single fetch + refresh on `metadata_modified`
- **License obligations:** none asserted (other-open); reuse + commercial + redistribution permitted
- **Attribution:** not required (recommended: cite משרד המשפטים / data.gov.il)
- **Storage restrictions:** none · **Dedup:** case_number + decision_date; sha256 of resource
- **Definition of Done:** CKAN adapter passes audit gate, dedup verified, fail-closed on API error, sample rows reviewed against schema (case number, parties, district, summary, costs).

## Not yet in queue

- **ASK** (need action before build): judgments.org.il (written permission),
  court.gov.il / supremedecisions / unicourt (official data feed — do not scrape).
- **REVIEW** (need more info): data.gov.il domain (per-dataset), isa.gov.il (fetch ToS).
- **BLOCKED** (do not use): gov.il-hosted departments (WAF), nevo (robots), takdin (login).
