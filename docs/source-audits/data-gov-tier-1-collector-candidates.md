# data.gov.il — Tier-1 Collector Candidates — 2026-08-05

Only datasets with **real, full legal documents or flagship judgment metadata**,
an accessible resource, and a verified open license. Do NOT build yet (Epic stop
condition). One `DataGovCkanCollector` will serve all via per-dataset config.

Only **3** datasets qualify for Tier-1 — padding to 10 would be dishonest; the
other legally-relevant datasets are registries/reference (Tier-2/3).

## 1. `data.gov.il:ararim` — החלטות בתי הדין לעררים (appeals tribunal decisions)
- Publisher: משרד המשפטים · License: **cc-by** (attribution) → OPEN_WITH_OBLIGATIONS
- Resources: CSV + PDF (~11 MB), `datastore_active` · Content: **full decisions**
- Category: tribunal_decisions · Access: CKAN, on-platform (no external)
- Collector: CKAN adapter → CSV index rows + PDF document per decision
- DoD: dedup by case/decision id + sha256(PDF); attribution recorded; sample reviewed.

## 2. `data.gov.il:mishmoret` — החלטות בתי הדין למשמורת (custody tribunal decisions)
- Publisher: משרד המשפטים · License: **cc-by** (attribution) → OPEN_WITH_OBLIGATIONS
- Resources: CSV + PDF (~25 MB), `datastore_active` · Content: **full decisions**
- Category: tribunal_decisions · Collector: CKAN CSV + PDF per decision
- DoD: as above.

## 3. `data.gov.il:judgments` — מאגר פסקי דין (FOI 2021, ministry of justice)
- License: **other-open** (Open-Definition approved) → VERIFIED_OPEN
- Resources: CSV + PDF (~1.1 MB), `datastore_active`
- Content: **metadata + summary** (case number, parties, district, decision
  summary, costs) — not full text, but structured, clean, case-linked.
- Category: court_metadata · Collector: CKAN CSV rows.
- DoD: dedup by case number + decision date; map fields to schema.

## Not Tier-1 (why)
- Registries (companies/trademarks/patents/inheritance/trusts — `ica_companies`,
  `simaneymisahr`, `yerusha`, `hekdeshot`, …) → **Tier-2**: structured legal
  records, not decisions.
- Court lists (`magistrate-court-list`, `court-lost`) → **Tier-3 directory**.
- Statistics / non-legal (crime, customs, sport, budget) → **REJECTED**.
- Knesset bills (`my-bills`, `odata`) → **REVIEW** (external links).

## Shared collector design (when the Epic advances)
`DataGovCkanCollector` — one adapter, config per dataset:
`{ datasetId, csvResourceId, docResourceId?, idField, licenseObligations }`.
Access via CKAN `package_show` / `datastore_search` (already validated). No
per-resource collectors; no bulk crawl.
