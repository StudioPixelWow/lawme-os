# CLDM — Provenance Design

Provenance is the backbone that makes every LawME assertion auditable and
legally defensible. **Provenance is per-assertion, not per-entity**: a single
canonical entity is typically assembled from several sources, so each field
value, each version, and each relationship edge carries its own provenance.

## The provenance block

Carried by every entity version and every edge/assertion:

| Field | Meaning |
|---|---|
| `source_platform` | The technical platform (from the Source/Platform Registry) — e.g. `data_gov_il`, `knesset_odata`, `court_feed`. |
| `source_publisher` | The publishing body — e.g. `ministry_of_justice`, `knesset`. |
| `source_dataset` | The named dataset/collection — e.g. `ararim`, `KNS_IsraelLaw`. |
| `source_resource` | The specific file/endpoint/record within the dataset. |
| `source_url` | The exact retrieval URL (or stable locator). |
| `first_seen` | `tstz` — when LawME first observed this assertion. |
| `last_verified` | `tstz` — when it was last re-checked against the source. |
| `extraction_method` | How it was obtained: `api | file_parse | ocr | manual | ai_extraction`. |
| `parser_version` | Version of the collector/parser that produced it (semver). |
| `confidence` | 0..1 — confidence in the extraction, distinct from source authority. |

Provenance links back to the **existing Source Registry** rows (platform →
publisher → dataset → resource), so licensing and access-status of every fact are
one join away. This is what lets the system answer, per field, "where did this
come from, under what license, and how sure are we?"

## Layered provenance

- **Entity-version provenance** — the source that asserted this version's content.
- **Field-level provenance** (for merged entities) — when survivorship pulls
  different fields from different sources, each surviving field records its own
  origin. Stored as a `field_provenance` map on the version.
- **Edge provenance** — the source that asserted a relationship.
- **Derivation provenance** (AI layer) — the model, prompt version, and exact
  source version an AI artifact was derived from (see `06`).

## License and rights propagation

Every Document Source carries a `license` reference; content entities inherit the
document's license for reuse decisions. **`cc-by` sources propagate an attribution
obligation** that the presentation layer must honor. Restriction-flagged
documents (paywalled, permission-required, robots-disallowed) are recorded but
**never promoted to published/authoritative content** — fail-closed, matching the
existing persist pipeline.

## Verification lineage

`verification_status` transitions are themselves provenance events:
`unverified → machine_verified → human_verified` (or `→ disputed`). Each
transition records who/what/when. A legal claim surfaced to a user must be
traceable to at least one `human_verified` or authoritative-source-backed
assertion — the model makes that traceability structural, not optional.

## Reproducibility

Because content and Document Sources are immutable and content-hashed
(`content_sha256`), and every derived/resolved assertion points at the exact
source version, any downstream result (a search hit, an AI summary, a citation
graph) can be reproduced from its provenance chain. Re-running a parser produces a
new `parser_version` assertion rather than overwriting history.
