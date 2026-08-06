# Knesset OData → Canonical Mapping (Track A)

Field-level crosswalk for the first legislation collector. Every mapped field
lands in a **canonical** field or in `source_extras` — never a new canonical
column without an explicit model change. Implementation:
`src/modules/legal-ai-israel/ingestion/mappers/knesset.ts`
(`mappingVersion = knesset-map-1`). Source: the official Knesset OData
ParliamentInfo API (verified open, no auth). Legislation carries no §6
copyright.

Entity sets qualified for V1 (the minimum needed for laws + bills + their
documents, subjects, and initiators — the other ~43 sets are intentionally NOT
imported):

`KNS_IsraelLaw`, `KNS_Bill`, `KNS_DocumentBill`, `KNS_Subject`,
`KNS_BillInitiator` (+ `KNS_LawBinding` as relationship edges only).

## Qualification notes (per the Step-5 checklist)

- **Primary keys:** `LawID`, `BillID`, `DocumentBillID`, `SubjectID`,
  `PersonID`. Used as `external_record_id` + `external_identifiers`.
- **Pagination:** OData `$top` / `$skip`; the collector advances `$skip` and
  moves to the next entity set when a page returns `< $top` rows.
- **Update timestamps:** `LastUpdatedDate` → drives incremental sync + update
  detection (also stored in `source_extras`).
- **Relations:** `KNS_DocumentBill.BillID` → Bill; `KNS_BillInitiator.BillID` →
  Bill; `KNS_LawBinding` → Law/Bill edges. Emitted as typed relationships.
- **Deleted/retired:** OData has no tombstone flag; retirement is detected by
  absence on re-sync (handled at the incremental layer, not fabricated per row).
- **Text fields:** law/bill names are inline; full law/bill TEXT is a linked
  file (`KNS_DocumentBill.FilePath`) → `content_level = metadata_only` until the
  file is fetched. **Never assume full_text from a metadata row.**
- **Rate limits / encoding:** honest UA, one retry on 5xx only, 403/429 terminal
  (no bypass); UTF-8, NFC-normalized downstream.
- **Null behavior:** empty strings coerced to null; a law with no title maps with
  `title = null` and reduced confidence — never a fabricated title.

## KNS_IsraelLaw → Law

| Source field | Canonical field | Transform | Req/Opt | Fallback | Confidence |
|---|---|---|---|---|---|
| `LawID` | `external_identifiers[knesset_law_id]` + `external_record_id` | as-is | required | — | 1.0 |
| `Name` | `fields.title` | trim/null | required | null → conf 0.6 | 0.95 |
| `LawTypeDesc` | `fields.lawType` | trim | optional | null | — |
| `LawValidity` | `fields.status` | trim | optional | `"unknown"` | — |
| `KnessetNum` | `fields.knessetNumber` | trim | optional | null | — |
| `PublicationDate` | `fields.enactmentDate` | ISO date | optional | null | — |
| `LastUpdatedDate` | `source_extras.lastUpdatedDate` | — | optional | — | — |
| — | `canonical_id` | `lawIdentity()` = `Law:knesset_law_id:<LawID>` | — | title+date hash | — |

content_level: `metadata_only`. primaryText: none.

## KNS_Bill → Bill

| Source field | Canonical field | Transform | Req/Opt |
|---|---|---|---|
| `BillID` | `external_identifiers[knesset_bill_id]` + `external_record_id` | as-is | required |
| `Name` | `fields.title` | trim | required |
| `SubTypeDesc` | `fields.billType` | trim | optional |
| `KnessetNum` | `fields.knessetNumber` | trim | optional |
| `StatusDesc` | `fields.status` | trim | optional (`"unknown"`) |
| `PublicationDate` | `fields.publicationDate` | ISO date | optional |
| `StatusID`,`LastUpdatedDate` | `source_extras.*` | — | optional |

canonical_id: `Bill:knesset_bill_id:<BillID>` (fallback: number+knesset+session hash).

## KNS_DocumentBill → DocumentSource (+ edge to Bill)

| Source field | Canonical field | Transform | Req/Opt |
|---|---|---|---|
| `DocumentBillID` | `external_identifiers[knesset_documentbill_id]` + `external_record_id` | as-is | required |
| `FilePath` | `fields.fileUrl` + `source_url` | as-is | required |
| `GroupTypeDesc`/`ApplicationDesc` | `fields.title`/`fields.format` | trim | optional |
| `BillID` | relationship `documentOf → Bill` | — | optional |

content_level: `metadata_only` (a linked file, not inline text).

## KNS_Subject → Topic

| `SubjectID` → `external_identifiers[knesset_subject_id]`; `Name` →
`fields.label`; `canonical_id` = `topicIdentity(Name)`; taxonomy =
`knesset_subject`. |

## KNS_BillInitiator → Party (reference to Person)

| `PersonID` → `external_identifiers[knesset_person_id]`; `BillID` → relationship
`initiatorOf → Bill`; `fields.role = "initiator"`; `fields.isInitiator`,
`fields.ordinal`. **No auto-merge on person name** — the Party references a
person by Knesset PersonID only. |

## KNS_LawBinding → relationships only

Maps to `Law`/`Bill` edges (no standalone entity). Wired as typed relationships
when the binding rows are ingested (deferred until needed for the graph).
