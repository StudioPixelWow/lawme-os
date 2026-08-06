# Source Entity Model — platform / publisher / dataset / resource

Design note (no large migration yet). The registry conflated distinct entity
levels; this records the correct model and a **minimal additive mapping** onto
the existing `legalai.legal_sources` table via a code convention, so we avoid a
premature schema change.

## Entity levels

| Level | Definition | Example |
|---|---|---|
| **Platform** | one technical API/portal | data.gov.il (CKAN) |
| **Publisher** | an organization publishing on a platform | משרד המשפטים |
| **Dataset** | a named collection under a publisher | `judgments` |
| **Resource** | a file within a dataset | CSV, PDF |

Counting rule: a **publisher** is NOT an independent legal source unless it has
its own endpoint/database. A **dataset** is NOT an API. A **resource** does not
inherit its dataset's CKAN license if it is hosted externally.

## Additive mapping (current, no migration)

Encoded in `legalai.legal_sources.code`:

- Platform: `data_gov_il` (the Phase-1 source row).
- Publisher: `ckan_org:<org>` — tagged `audit_notes = 'PUBLISHER on data.gov.il
  CKAN (not an independent API/source)'`.
- Dataset: `data_gov_il:<dataset>` — `audit_notes` carries
  `QUAL <verdict> | tier<n> | <category> | <content> | <note>`.
- Resource: not a separate row; captured per-dataset in
  `artifacts/data-gov-legal-dataset-qualification.json`.

Parent relations are implicit in the code prefix (`platform:publisher:dataset`).

## Future migration (only if/when needed)

If resource-level tracking becomes necessary, add additively:
`legalai.source_platforms`, `legalai.source_publishers`,
`legalai.source_datasets(platform_id, publisher_id, license_id, verdict, tier)`,
`legalai.source_resources(dataset_id, format, url, url_type, size, datastore,
accessible)`. Keep `legal_sources` for the audited *source* view; datasets/
resources become children. Not built now — the code-prefix mapping suffices for
the qualification pass.

## Collector implication

One `DataGovCkanCollector` (per-dataset config) serves ALL data.gov.il datasets —
never one collector per resource, never per publisher.
