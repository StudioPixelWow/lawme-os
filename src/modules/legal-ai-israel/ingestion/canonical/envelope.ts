/**
 * Canonical Envelope + CanonicalRecord (LEGAL AI ISRAEL — First Production Slice).
 *
 * The source-agnostic shape every ingested entity carries, per the Canonical
 * Legal Data Model (docs/architecture/canonical-legal-data-model). This is the
 * V1 subset only: the entity types the two first tracks (Knesset OData, and
 * data.gov.il Tier-1: ararim / mishmoret / judgments) actually produce.
 *
 * Design rules enforced here:
 *  - Four content layers are kept SEPARATE and never merged: primary text
 *    (immutable), extracted metadata (as-read), normalized fields (canonical),
 *    and AI derivations (not produced in this slice — the slot exists, stays
 *    null). AI output is never written into a primary-source field.
 *  - Source-specific data lives ONLY in `sourceExtras`; it never becomes a
 *    canonical field without an explicit model change.
 *  - content_level is explicit and never assumed: a summary is never labelled
 *    full_text.
 *
 * node --test conventions: union types (no enums), relative `.ts` imports,
 * `import type`, no TS parameter properties.
 */

/** The V1 canonical entity subset (only what the first two tracks produce). */
export type CanonicalEntityType =
  | "DocumentSource"
  | "DocumentVersion"
  | "Law"
  | "Section"
  | "Bill"
  | "GovernmentDocument"
  | "Decision"
  | "Case"
  | "Court"
  | "Authority"
  | "Party"
  | "Citation"
  | "Topic";

/** How complete the retrieved content is. Explicit, never inferred as full. */
export type ContentLevel = "full_text" | "summary" | "metadata_only";

/** The ingestion status machine (Step 14). */
export type VersionStatus =
  | "raw"
  | "mapped"
  | "validated"
  | "persisted"
  | "indexed"
  | "published"
  | "quarantined"
  | "failed";

/** How the value was obtained. */
export type ExtractionMethod =
  | "api"
  | "file_parse"
  | "csv_row"
  | "html_text_layer"
  | "manual"
  | "ai_extraction";

/** A namespaced external identifier tuple. */
export interface ExternalIdentifier {
  scheme: string; // e.g. "knesset_law_id", "ckan:ararim", "net_hamishpat_case_no"
  value: string;
  confidence: number; // 0..1
}

/** The provenance + identity + versioning envelope carried by every record. */
export interface CanonicalEnvelope {
  canonicalId: string; // deterministic, system-scoped identity key (see identity.ts)
  entityType: CanonicalEntityType;
  externalIdentifiers: readonly ExternalIdentifier[];
  // provenance (per-assertion, links back to the Source Registry)
  sourcePlatform: string; // e.g. "knesset_odata", "data_gov_il"
  sourcePublisher: string | null; // e.g. "knesset", "ministry_of_justice"
  sourceDataset: string | null; // e.g. "KNS_IsraelLaw", "ararim"
  sourceResource: string | null; // e.g. the specific entity set / resource id
  sourceUrl: string;
  firstSeenAt: string; // ISO
  lastVerifiedAt: string; // ISO
  extractionMethod: ExtractionMethod;
  parserVersion: string;
  mappingVersion: string;
  confidence: number; // 0..1
  contentHash: string; // hash of the primary content / canonical payload
  rawRecordHash: string; // hash of the raw source record (traceability)
  externalRecordId: string; // the source's own record id
  versionStatus: VersionStatus;
  contentLevel: ContentLevel;
}

/** Immutable primary text (kept apart from metadata + derivations). */
export interface PrimaryText {
  raw: string;
  contentHash: string;
  language: string; // "he" | "ar" | "en" | ...
}

/** A typed, directional relationship emitted alongside a record. */
export interface CanonicalRelationship {
  type: string; // e.g. "inCase", "underLaw", "issuedBy", "hasParty", "aboutTopic"
  fromCanonicalId: string;
  toCanonicalId: string | null; // null = dangling (retained, resolved later)
  toExternalRef: string | null; // the raw reference when the target is unresolved
  confidence: number;
}

/**
 * A single canonical record produced by a mapper. Layers are separate:
 *  - `fields`         → normalized canonical fields (the entity's data)
 *  - `primaryText`    → immutable original text (null for metadata-only records)
 *  - `extractedMetadata` → raw metadata as read from the source (untouched)
 *  - `sourceExtras`   → source-specific fields with no canonical home
 *  - `aiDerivations`  → NOT populated in this slice (stays null; separate layer)
 */
export interface CanonicalRecord {
  envelope: CanonicalEnvelope;
  entityType: CanonicalEntityType;
  fields: Record<string, unknown>;
  primaryText: PrimaryText | null;
  extractedMetadata: Record<string, unknown>;
  sourceExtras: Record<string, unknown>;
  relationships: readonly CanonicalRelationship[];
  aiDerivations: null; // reserved; AI layer is never written here
  deleted: boolean; // source tombstone → mark, never hard-delete
}

/** Records this slice treats as carrying immutable primary text. */
export const PRIMARY_TEXT_ENTITY_TYPES: readonly CanonicalEntityType[] = [
  "Section",
  "Decision",
  "GovernmentDocument",
  "DocumentSource",
];
