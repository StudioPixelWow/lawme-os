# Knesset Legislation → Canonical Mapping (full-text track)

Target mapping for when consolidated law text becomes available (via the
legislation-web collector — OData has none). Reuses the CLDM entities.

| Source (legislation web) | Canonical | Notes |
|---|---|---|
| Law page (main.knesset.gov.il, LawID) | `Law` (existing) + `DocumentSource` | LawID from `KNS_IsraelLawName` is the key |
| Consolidated full text (HTML/PDF) | `DocumentVersion` (canonical_entity_versions) + `primary_text` | content_level `full_text`; hash + fetched_at |
| Parsed סעיף | `Section` (canonical_entities, entity_type=Section) | fields: sectionNumber, heading, headingPath, ordinal, sourceSpan, valid_from/to |
| Section text | `legal_chunks` | chunk-by-section, FTS + (deferred) embedding |
| KNS_IsraelLawClassificiation | `Topic` + `aboutTopic` edge | subjects |
| KNS_IsraelLawLawCorrections | `Amendment` relationship (amends Law/Section) | only with explicit evidence |
| KNS_IsraelLawBinding / KNS_LawBinding | Law/Section version bindings | version chain |

Rules: map to canonical fields or `source_extras`; content_level `full_text`
only when real text is held; a document from a specific web system does not
inherit OData's reuse basis (record `license_evidence_*`); amendment/reference
edges require explicit evidence (never semantic similarity alone).
