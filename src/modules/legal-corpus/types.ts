/**
 * Verified Legal Corpus — canonical domain contracts (P1-S1 foundation).
 *
 * Implements the P1-S0 corpus contract
 * (docs/product/dino/corpus/MINIMUM_VERIFIED_CORPUS_STANDARD.md, Part 6).
 *
 * SCOPE OF THIS FILE: type contracts only. It contains NO legal text, NO
 * statute titles, NO sections, NO dates — those live in the verified corpus
 * store and arrive only through the approved source + editorial verification
 * once a written reuse basis exists. Until then, the guarded adapter refuses
 * to acquire (see adapter.ts) — retrieval is never verification.
 *
 * Node `node --test` type-stripping conventions: union types (no enums),
 * `import type` where needed, relative `.ts` import extensions elsewhere.
 */

// ---------------------------------------------------------------------------
// Shared unions
// ---------------------------------------------------------------------------

export type SourceType =
  | "statute"
  | "regulation"
  | "rate_instrument"
  | "administrative"
  | "judgment"; // case-law compat only; no case-law ingestion in this slice

export type OfficialStatus = "official" | "secondary" | "unofficial";

export type AuthorityStrength =
  | "binding"
  | "persuasive"
  | "interpretive"
  | "non_authoritative";

export type VerificationStatus = "verified" | "discovery_only";

export type CourtHierarchy =
  | "supreme"
  | "national_labour"
  | "district_labour"
  | "regional_labour"
  | "other"; // case-law compat only

export type InForceState = "in_force" | "not_in_force" | "future_effective";

export type TreatmentStatus =
  | "good"
  | "overruled"
  | "superseded"
  | "limited"
  | "distinguished"
  | "criticized"
  | "conflicting"
  | "unknown";

/** Who may set a treatment. Negative treatment is NEVER `deterministic`. */
export type TreatmentSource = "provider_supplied" | "editorially_verified";

export type PermittedUse = "display" | "excerpt" | "export" | "redistribute";

export type PinpointAnchorType =
  | "section"
  | "subsection"
  | "clause"
  | "paragraph";

export type DoctrineId = "D-NOTICE" | "D-MINWAGE"; // P1-S1 scope only

export type CoverageLevel = "substantial" | "partial" | "insufficient";
// Note: "complete" is intentionally NOT a member — coverage is never complete.

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface LegalSource {
  sourceId: string;
  sourceType: SourceType;
  provider: string;
  providerSourceId: string | null;
  officialStatus: OfficialStatus;
  jurisdiction: string; // e.g. "IL" (+ forum for case law)
  authorityStrength: AuthorityStrength;
  bindingStatus: string | null;
  courtHierarchy: CourtHierarchy | null; // null for legislation
  provenance: string;
  licensePolicyRef: string; // -> LegalLicensePolicy.policyId
  corpusVersion: string;
}

export interface LegalSourceVersion {
  versionId: string;
  sourceId: string;
  versionLabel: string;
  effectiveDate: string | null; // ISO; null = unknown (never guessed)
  commencementDate: string | null;
  publicationDate: string | null;
  supersededByVersionId: string | null;
  supersededFromDate: string | null;
  sourceTextHash: string;
  permalink: string | null;
  directLink: string | null;
  ingestionTimestamp: string;
  lastVerifiedTimestamp: string | null;
  verificationStatus: VerificationStatus;
}

export interface LegalProvision {
  provisionId: string;
  versionId: string;
  path: string; // e.g. "§2(a)" — an identity path, not a URL
  heading: string | null;
  text: string;
  textHash: string;
  inForce: InForceState;
  pinpointRef: string | null; // -> LegalPinpoint.pinpointId
}

export interface LegalPinpoint {
  pinpointId: string;
  provisionOrParagraph: string;
  anchorType: PinpointAnchorType;
  resolvableAnchor: string | null; // a real deep-anchor URL, or null
  pinpointStatus: "verified" | "none";
  /** Honest statement rendered when no verified pinpoint exists. */
  pinpointStatementHe: string | null;
}

export interface LegalAmendment {
  amendmentId: string;
  sourceId: string;
  amendingInstrument: string | null; // e.g. Reshumot ref
  amendmentDate: string | null;
  effectiveDate: string | null;
  affectedProvisions: string[];
  natureOfChange: "added" | "modified" | "repealed";
  verificationStatus: VerificationStatus;
}

export interface LegalCitation {
  citationId: string;
  targetRef: string; // provision/judgment id
  displayFormHe: string;
  copyableForm: string;
  authorityLabelHe: string; // מחייב / מנחה
  verificationLabelHe: string; // מאומת / טעון אימות
  officialBadge: boolean;
  link: string | null;
  pinpointRef: string | null;
  licenseDisplayConstraintsRef: string; // -> LegalLicensePolicy.policyId
}

export interface LegalAuthorityRelationship {
  relationshipId: string;
  fromRef: string;
  toRef: string;
  relationType:
    | "applies"
    | "interprets"
    | "follows"
    | "distinguishes"
    | "overrules"
    | "limits"
    | "conflicts_with";
  evidenceRef: string | null;
  verificationStatus: VerificationStatus;
  source: TreatmentSource;
}

export interface LegalTreatment {
  treatmentId: string;
  targetRef: string;
  status: TreatmentStatus;
  asOfDate: string | null;
  source: TreatmentSource; // never "deterministic" for negative treatment
  evidenceRef: string | null;
}

export interface LegalLicensePolicy {
  policyId: string;
  provider: string;
  ingestionAllowed: boolean;
  displayAllowed: boolean;
  maxExcerptChars: number | null; // null = no explicit limit stated
  redistributionAllowed: boolean;
  exportToWorkProductAllowed: boolean;
  attributionRequired: boolean;
  attributionTextHe: string | null;
  retentionObligations: string | null;
  territory: string | null;
  termsRef: string | null;
  verifiedInWriting: boolean; // the Gate-A flag
}

export type VerificationOutcome =
  | "verified"
  | "rejected"
  | "expired_reverification"
  | "superseded";

export interface VerificationCheckedFields {
  title: boolean;
  enactmentIdentity: boolean;
  sectionIdentity: boolean;
  effectiveDate: boolean;
  amendmentStatus: boolean;
  permalink: boolean;
  sourceTextHash: boolean;
  sourceVersion: boolean;
  licensePolicy: boolean;
}

export interface LegalVerificationRecord {
  verificationId: string;
  versionId: string;
  verifier: string; // editor / pipeline identity — never "auto because official"
  method: string;
  checkedFields: VerificationCheckedFields;
  result: VerificationOutcome;
  timestamp: string;
  reVerifyDueDate: string | null;
  notes: string | null;
}

export interface DoctrineCoverageRecord {
  doctrineId: DoctrineId;
  requiredProvisions: string[];
  presentVerifiedProvisions: string[];
  requiredAuthorities: string[]; // case law — empty in this slice
  presentVerifiedAuthorities: string[];
  coverageLevel: CoverageLevel;
  gaps: string[];
  permittedClaimHe: string;
  lastReviewed: string | null;
}

/** Metadata identifying a reproducible corpus state. */
export interface CorpusVersion {
  corpusVersion: string;
  createdAt: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Adapter / acquisition contracts (interface only — no retrieval here)
// ---------------------------------------------------------------------------

export type InstrumentKind = "statute" | "principal_regulation" | "rate_instrument";

/** Identity of an allowlisted instrument — NO title/text (those need the
 *  approved source + editorial verification). */
export interface InstrumentRef {
  doctrineId: DoctrineId;
  instrumentKind: InstrumentKind;
  internalKey: string; // stable internal handle, not a legal title
}

/** A reuse basis MUST be present and confirmed before any acquisition. */
export interface ReuseBasis {
  kind: "counsel_confirmation" | "provider_license" | "open_data_license";
  reference: string; // pointer to the written record (not the contract text)
  confirmedInWriting: boolean;
  scope: PermittedUse[];
  allowlist: InstrumentRef[];
}

/** Result of a retrieval. ALWAYS discovery_only — retrieval is not
 *  verification. Verification is a separate editorial step. */
export interface AcquisitionRecord {
  instrument: InstrumentRef;
  provider: string;
  retrievedAt: string;
  rawTextHash: string;
  provenance: string;
  verificationStatus: "discovery_only";
}

export interface LegislationSourceAdapter {
  id: string;
  allowlist: InstrumentRef[];
  /** Refuses (fail-closed) unless a confirmed reuse basis authorizes the ref. */
  acquire(ref: InstrumentRef): Promise<AcquisitionRecord>;
}
