# data.gov.il Tier-1 → Canonical Mapping (Track B)

Field-level crosswalk for the three Tier-1 datasets. One collector
(`DataGovCkanCollector`), configurable by dataset id — never one collector per
dataset. Implementation:
`src/modules/legal-ai-israel/ingestion/mappers/data-gov-tier1.ts`
(`mappingVersion = datagov-tier1-map-1`). Source: the official CKAN
`datastore_search` API (documented, no auth, no bypass).

## content_level is explicit per dataset (Step 7 requirement)

| Dataset | Hebrew | Content | content_level | Court entity |
|---|---|---|---|---|
| `ararim` | החלטות בתי הדין לעררים | full documents (CSV+PDF) | `full_text` when the row carries text, else `metadata_only` | Authority |
| `mishmoret` | החלטות בתי הדין למשמורת | full documents (CSV+PDF) | `full_text` when the row carries text, else `metadata_only` | Authority |
| `judgments` | פסקי דין חופש-מידע | **summary only** | `summary` (never `full_text`) | Court |

A `judgments` row is marked `summary` and carries **no** primaryText — the
dataset provides a תמצית, not the full judgment. The mapper never upgrades a
summary to full_text.

## Row → canonical entities

Each CSV row maps to: **Case + Decision + (Authority|Court) + Party + Topic +
DocumentSource** (DocumentSource only when a PDF link is present), wired with
typed relationships (`inCase`, `decidedBy`/`heardBy`, `backedBy`, `partyIn`,
`aboutTopic`).

Field candidates are matched tolerantly across Hebrew header variants (the CSV
headers differ slightly between datasets):

| Concept | Header candidates | Canonical target |
|---|---|---|
| Case number | `מספר הליך`, `מספר תיק`, `מספר` | `Case.caseNumberRaw`, `Decision.caseNumberRaw`, `external_identifiers[net_hamishpat_case_no]` |
| Court/Authority | `ערכאה`, `בית הדין`, `בית המשפט`, `רשות` | `Authority|Court.name` (+ default per dataset) |
| Decision date | `תאריך החלטה`, `תאריך מתן ההחלטה`, `תאריך` | `Decision.decisionDate` (ISO) |
| Summary | `תמצית`, `תקציר`, `עיקרי ההחלטה` | `Decision.summary` |
| Full text | `נוסח ההחלטה`, `טקסט מלא` (ararim/mishmoret only) | `Decision.primaryText` (immutable) |
| District | `מחוז` | `Case.district`, `source_extras.district` |
| Topic | `נושא`, `תחום` | `Topic.label` (+ `aboutTopic` edge) |
| Parties | `צדדים`, `שמות הצדדים` | `Party.display` (single display; no heuristic person split) |
| PDF link | `קישור`, `קישור למסמך`, `מסמך` | `DocumentSource.url` (+ `backedBy` edge) |
| Costs | `הוצאות` | `Decision.costs` |

## Identity keys (deterministic — Step 11)

- **Case** = `caseIdentity(normalizedCaseNumber, court)`; fallback external
  record id. Case numbers normalized via the Phase-1 parser (`ערר 1234-01-23`
  etc.).
- **Decision** = `decisionIdentity(externalRecordId, court, caseNumber, date)`.
- **DocumentSource** = by canonical URL / content hash.
- **Authority/Court/Topic/Party** = normalized-name identity; **never**
  auto-merged on a person name alone.

## Provenance (every record)

`source_platform = data_gov_il`, `source_publisher = ministry_of_justice`,
`source_dataset = <dataset>`, `source_url`, `raw_record_hash`,
`external_record_id`, `extraction_method = csv_row`, `parser_version`,
`confidence`. Traceable back to the exact CKAN row.

## Quality gates (Step 14)

- Full-text rows are refused (quarantined) if the source license does not permit
  full-text storage (`full_text_not_licensed`).
- Rows containing a publication-restriction notice (`איסור פרסום`, `קטין`,
  `חסוי`, …) are quarantined (`publication_restricted`) — never published.
- Missing case number / parties lowers confidence; below threshold →
  quarantined, not dropped.

## Live resource ids (operator supplies)

The CKAN `resource_id` for each dataset's datastore is provided at run time via
`CKAN_RESOURCE_ARARIM` / `CKAN_RESOURCE_MISHMORET` / `CKAN_RESOURCE_JUDGMENTS`
(not hard-coded — resource ids are environment-specific).
