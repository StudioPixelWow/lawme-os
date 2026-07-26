/**
 * Maximum-Lawful Corpus Acquisition — canonical contracts (Acquisition Slice 1).
 *
 * This module adds the *acquisition program* on top of the verified-corpus
 * foundation. It classifies real sources, resolves the highest LAWFUL
 * acquisition mode for each (never bypassing auth/paywalls/TPMs/rate-limits),
 * and records canonical provenance for every ingested item.
 *
 * HARD BOUNDARY (encoded, not aspirational):
 *  - No bypass of authentication, paywalls, access controls, rate limits,
 *    technical protection measures, restricted APIs, or sealed systems.
 *  - No copy of restricted third-party FULL TEXT without a recorded license.
 *  - Full text of Israeli legislation & judicial decisions is lawful from
 *    OFFICIAL sources on the documented basis of Copyright Act 2007 §6
 *    (no copyright in statutes, regulations, Knesset Protocols, judgments).
 *  - This file contains NO legal text and fabricates nothing. It is schema +
 *    policy only; content arrives through gated adapters + editorial checks.
 *
 * node --test conventions: union types (no enums), `import type`, relative
 * `.ts` extensions, no TS parameter properties.
 */

// ---------------------------------------------------------------------------
// Source classification (founder taxonomy)
// ---------------------------------------------------------------------------

export type SourceClassification =
  | "OPEN_OFFICIAL_FULL_TEXT" // official gazette / legislation DB / official judgments (§6)
  | "LICENSED_FULL_TEXT"      // commercial provider, license HELD
  | "FIRM_OWNED_FULL_TEXT"    // tenant's own documents
  | "PUBLIC_METADATA"         // metadata lawfully public; full text not open
  | "LINK_ONLY"               // deep-linkable; no local full-text copy
  | "DISCOVERY_ONLY"          // may aid discovery; never authority for a conclusion
  | "REQUIRES_LICENSE"        // commercial full text, license NOT yet held
  | "BLOCKED";                // cannot be acquired lawfully by any mode now

// ---------------------------------------------------------------------------
// Acquisition mode ladder (highest → lowest)
// ---------------------------------------------------------------------------

export type AcquisitionMode =
  | "FULL_TEXT"
  | "STRUCTURED_METADATA"
  | "METADATA_AND_LINK"
  | "DISCOVERY_ONLY"
  | "BLOCKED";

/** Ladder rank: 1 = fullest. Lower number = more content acquired. */
export const ACQUISITION_RANK: Record<AcquisitionMode, number> = {
  FULL_TEXT: 1,
  STRUCTURED_METADATA: 2,
  METADATA_AND_LINK: 3,
  DISCOVERY_ONLY: 4,
  BLOCKED: 5,
};

// ---------------------------------------------------------------------------
// Workstreams (run in parallel; classification, not sequence)
// ---------------------------------------------------------------------------

export type WorkstreamId =
  | "A_national_legislation"
  | "B_secondary_legislation"
  | "C_historical_amendments"
  | "D_supreme_court"
  | "E_labour_court"
  | "F_district_admin"
  | "G_magistrates_tribunals"
  | "H_regulatory_guidance"
  | "I_legislative_history"
  | "J_licensed_providers"
  | "K_firm_owned"
  | "L_public_secondary"   // Kol-Zchut, professional commentary, public articles/FAQs
  | "M_academic";          // university / academic legal publications (open access)

// ---------------------------------------------------------------------------
// Authority tier (breadth must not erase source distinctions)
// ---------------------------------------------------------------------------

export type AuthorityTier =
  | "binding_primary"    // statutes, binding precedent
  | "persuasive_primary" // lower-court / persuasive judgments
  | "official_regulatory"
  | "licensed_editorial"
  | "academic"           // university / academic legal publications
  | "professional_commentary"
  | "secondary_explanation"
  | "discovery_material"
  | "firm_internal";

export type Currentness = "current" | "historical" | "superseded" | "unknown";
export type OfficialStatus = "official" | "secondary" | "unofficial";

// ---------------------------------------------------------------------------
// A registered source (metadata ABOUT a source — never its content)
// ---------------------------------------------------------------------------

export interface RegisteredSource {
  sourceKey: string;            // stable internal handle
  displayNameHe: string;
  sourceOwner: string;          // e.g. "Knesset", "בתי המשפט", "Nevo Ltd."
  homeUrl: string | null;
  workstream: WorkstreamId;
  classification: SourceClassification;
  authorityTier: AuthorityTier;
  officialStatus: OfficialStatus;
  /** Documented lawful basis for full text, or null if none yet. */
  reuseBasisRef: string | null; // e.g. "Copyright Act 2007 §6"
  /** True only when a written license/permission is on file (Gate-A). */
  licenseOnFile: boolean;
  /** External approval (credentials / payment / new license) needed to go full text. */
  requiresExternalApproval: boolean;
  notesHe: string | null;
}

// ---------------------------------------------------------------------------
// Canonical acquired-item record (the founder's required field set)
// ---------------------------------------------------------------------------

export interface CanonicalSourceRecord {
  recordId: string;
  sourceKey: string;            // -> RegisteredSource.sourceKey
  sourceOwner: string;
  sourceUrl: string | null;
  acquisitionMode: AcquisitionMode;
  authorityTier: AuthorityTier;
  issuingBody: string | null;   // court / legislative body / regulator
  instrumentNumber: string | null; // case no. or instrument no.
  titleHe: string | null;
  publicationDate: string | null; // ISO; null = unknown (never guessed)
  decisionDate: string | null;
  effectiveDate: string | null;
  validFrom: string | null;     // historical validity range
  validTo: string | null;
  version: string | null;
  amendmentOf: string | null;   // recordId this amends, or null
  currentness: Currentness;
  officialStatus: OfficialStatus;
  fullTextAvailable: boolean;
  licenseRef: string | null;    // -> license policy / basis
  sourceHash: string | null;    // sha256 of acquired bytes, or null if none held
  ingestedAt: string;           // ISO
  lastCheckedAt: string;        // ISO
  tenantId: string | null;      // firm ownership where applicable; null = shared
  /** Retrieval is never verification. New records enter unverified; promotion
   *  to "verified" requires the editorial release gates (never automatic). */
  verificationStatus: "ingested_unverified" | "discovery_only" | "verified";
}

// ---------------------------------------------------------------------------
// Acquisition adapter contract (interface only — no live retrieval here)
// ---------------------------------------------------------------------------

/** Inputs an adapter is ALLOWED to structure. An adapter never invents these;
 *  it only shapes items that were lawfully provided/fetched by an operator. */
export interface RawAcquiredItem {
  sourceUrl: string | null;
  issuingBody: string | null;
  instrumentNumber: string | null;
  titleHe: string | null;
  publicationDate: string | null;
  decisionDate: string | null;
  effectiveDate: string | null;
  version: string | null;
  /** The full text bytes, ONLY when the mode/classification permit holding it. */
  fullText: string | null;
  tenantId: string | null;
}

export interface AcquisitionContext {
  nowISO: string;
  /** Blockers actually encountered (auth wall, paywall, TPM, rate-limit). */
  blockers: readonly AcquisitionBlocker[];
}

export type AcquisitionBlocker =
  | "authentication_required"
  | "paywall"
  | "access_control"
  | "rate_limited"
  | "technical_protection_measure"
  | "restricted_api"
  | "sealed_or_confidential";

export interface AcquisitionAdapter {
  id: string;
  source: RegisteredSource;
  /** Resolve items into canonical records at the highest LAWFUL mode.
   *  Fail-closed: refuses full text unless classification + basis permit. */
  acquire(
    items: readonly RawAcquiredItem[],
    ctx: AcquisitionContext,
  ): Promise<readonly CanonicalSourceRecord[]>;
}
