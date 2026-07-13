/**
 * Shared intelligence primitive — canonical Epistemic Status (Epic 4.1).
 *
 * THE hard rule of LawME, in one place: an allegation is never a fact. Every
 * intelligence domain describes "how true is this statement" with the SAME
 * vocabulary. Domains keep their legacy enums for backward compatibility;
 * conversions to/from the canonical model are explicit and tested, and no
 * conversion may promote an allegation into a confirmed fact.
 */

export type EpistemicStatus =
  | "confirmed_fact"          // established/verified
  | "document_derived_fact"   // derived from a document (a fact, with provenance)
  | "client_allegation"       // asserted by our client — NOT a fact
  | "opposing_party_allegation" // asserted by the other side — NOT a fact
  | "disputed_fact"           // contested between parties — NOT established
  | "inference"               // reasoned, not directly asserted
  | "assumption"              // working assumption pending confirmation
  | "unknown";                // not known

/** Statuses that count as an ESTABLISHED fact for gating decisions. */
export const FACT_STATUSES: ReadonlySet<EpistemicStatus> = new Set<EpistemicStatus>([
  "confirmed_fact",
  "document_derived_fact",
]);

/** Statuses that are ALLEGATIONS — never to be treated as established facts. */
export const ALLEGATION_STATUSES: ReadonlySet<EpistemicStatus> = new Set<EpistemicStatus>([
  "client_allegation",
  "opposing_party_allegation",
]);

export function isConfirmedFact(s: EpistemicStatus): boolean {
  return FACT_STATUSES.has(s);
}

export function isAllegation(s: EpistemicStatus): boolean {
  return ALLEGATION_STATUSES.has(s);
}

/** True when the status must NOT be relied on as an established fact. */
export function isUnestablished(s: EpistemicStatus): boolean {
  return !FACT_STATUSES.has(s);
}

/* ------------------------------------------------------------------ */
/* Legacy mappings — explicit, lossless where possible, always tested. */
/* ------------------------------------------------------------------ */

/** Matter domain legacy fact-status values (src/modules/matter). */
export type MatterFactStatusLegacy =
  | "confirmed" | "client_alleged" | "opposing_alleged" | "document_derived" | "disputed" | "unknown";

/** Dino domain legacy context-item-status values (src/modules/dino). */
export type DinoContextStatusLegacy =
  | "confirmed_fact" | "client_allegation" | "opposing_party_allegation"
  | "document_derived_fact" | "inference" | "unknown" | "disputed_fact";

const MATTER_TO_CANONICAL: Record<MatterFactStatusLegacy, EpistemicStatus> = {
  confirmed: "confirmed_fact",
  client_alleged: "client_allegation",
  opposing_alleged: "opposing_party_allegation",
  document_derived: "document_derived_fact",
  disputed: "disputed_fact",
  unknown: "unknown",
};

const CANONICAL_TO_MATTER: Partial<Record<EpistemicStatus, MatterFactStatusLegacy>> = {
  confirmed_fact: "confirmed",
  client_allegation: "client_alleged",
  opposing_party_allegation: "opposing_alleged",
  document_derived_fact: "document_derived",
  disputed_fact: "disputed",
  unknown: "unknown",
  // "inference"/"assumption" have no Matter legacy value — intentionally absent.
};

export function fromMatterFactStatus(s: MatterFactStatusLegacy): EpistemicStatus {
  return MATTER_TO_CANONICAL[s];
}

/** Returns null for canonical values Matter's legacy enum cannot express. */
export function toMatterFactStatus(s: EpistemicStatus): MatterFactStatusLegacy | null {
  return CANONICAL_TO_MATTER[s] ?? null;
}

/** Dino's legacy values already use the canonical names — identity, typed. */
export function fromDinoContextStatus(s: DinoContextStatusLegacy): EpistemicStatus {
  return s;
}
