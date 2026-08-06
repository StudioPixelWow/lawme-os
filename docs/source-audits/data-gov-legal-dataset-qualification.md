# data.gov.il — Legal Dataset Qualification Pass — 2026-08-05

Corrects the discovery over-count and qualifies every OPEN candidate on
data.gov.il. Each dataset was checked via the CKAN `package_show` API (real
responses, captured through the authorized browser): publisher, license (+url),
resources (format / size / `datastore_active` / external), and notes. No dataset
is called OPEN on `license_id` alone.

## Corrected counting model (entity levels)

The earlier "115 APIs / 56 OPEN" conflated four levels. Corrected:

| Level | What it is | Count |
|---|---|---|
| **Technical platform** | data.gov.il CKAN (**one** API) | **1** |
| **Publishers** | organizations publishing on CKAN (משרד המשפטים, הרשות השופטת, …) | **58** |
| **Datasets** | legal datasets qualified | **56** |
| **Resources** | files under those datasets (CSV/PDF/XLSX) | **71** (52 accessible) |

→ It is **1 CKAN API**, not 115. A single `DataGovCkanCollector` with per-dataset
config serves all of them; we do NOT create a collector per resource.

## Qualification results

| Verdict | Count |
|---|---|
| VERIFIED_OPEN (other-open = Open-Definition approved, accessible, legal) | **12** |
| OPEN_WITH_OBLIGATIONS (cc-by — attribution required) | **13** |
| REVIEW (external/empty resources or scope unclear) | **7** |
| REJECTED (statistics / directory / data-dictionary / non-legal) | **24** |

Content: **2 datasets contain full documents** (ararim, mishmoret); 15 are
metadata/registry records; the rest are directories, statistics, or reference.

Collector-value tiers: **Tier-1 = 3**, Tier-2 = 15, Tier-3 = 7, rejected/review = 31.
Registry `ready_to_build` corrected from **56 → 18** (Tier-1 + Tier-2 legal-open).

## Why datasets were rejected (examples)

- `crime_records_data`, `releasespeed`, `stat2017/2018`, `noise-duration`,
  `budget2020`, `metrology`, `goverment-domesticdebt` → **statistics**, not legal
  documents.
- `magistrate-court-list`, `court-lost` → **court directories** (lists), not
  decisions (kept as Tier-3 reference, not Tier-1).
- `data-doctionary-business`, `data-dictionary-asset` → **data dictionaries**.
- `547`, `2023` → **no accessible resources**.
- `my-bills`, `odata` → Knesset bills via **external links** → REVIEW (CKAN
  license may not cover the external target).

## License verification (not just `license_id`)

- **cc-by** carries an explicit `license_url` → OPEN_WITH_OBLIGATIONS (attribution).
- **other-open** = CKAN "Other (Open)", `od_conformance = approved` in
  `license_list` (permits commercial use + redistribution) → VERIFIED_OPEN when
  the resource is accessible and the content is legal; otherwise REVIEW.
- Datasets whose resource points to an **external host** do NOT inherit the CKAN
  license → REVIEW.

## Full qualification table

See `artifacts/data-gov-legal-dataset-qualification.csv` /`.json` for all 56 rows
(dataset, publisher, license, formats, size, datastore, external, category,
content, tier, verdict, collector_status, note). Registry rows carry the verdict
in `audit_notes` (`QUAL <verdict> | tier<n> | <category> | <content> | <note>`).

## Registry changes applied (dev)

- 56 `data_gov_il:*` rows reclassified (verdict/tier/category/content in notes;
  `collector_status`: ready_to_build for Tier-1/2, audit_required for Tier-3 +
  REVIEW, `retired` for REJECTED; REJECTED `legal_reuse_status=restricted`).
- 58 `ckan_org:*` rows tagged **PUBLISHER on data.gov.il CKAN (not an
  independent API/source)** to stop double-counting.

## Verification (per Epic §12)

1. Organization ≠ dataset — publishers tagged separately. ✅
2. Dataset ≠ API — reported as 1 CKAN API + 56 datasets. ✅
3. External resource does not inherit CKAN license — those → REVIEW. ✅
4. `other-open` without sufficient evidence not auto-VERIFIED — external/empty → REVIEW. ✅
5. Non-legal datasets rejected (24). ✅
6. Metadata-only/registry datasets marked by `content`. ✅
7. Tier-1 holds only real full-decision/flagship sources (3). ✅
8. Every verdict backed by `package_show` + resource inspection. ✅
