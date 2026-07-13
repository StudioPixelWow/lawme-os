/**
 * Shared intelligence primitive — Provenance (Epic 4.1).
 * One contract for "where did this come from". Consumers populate only the
 * fields relevant to them (safe optionality). Replaces Dino's ContextProvenance
 * and Matter's bare `source: string`.
 */

export type ProvenanceOrigin =
  | "user_supplied"
  | "document"
  | "lawme_record"
  | "legal_knowledge"
  | "synthetic_fixture"
  | "derived"
  | "external";

export type VerificationState = "verified" | "unverified" | "disputed" | "not_applicable";

export interface Provenance {
  origin: ProvenanceOrigin;
  /** human/loggable reference: record id, fixture id, "user message", etc. */
  reference: string;
  sourceType?: string;          // e.g. "statute", "judgment", "email", "testimony"
  sourceId?: string | null;
  documentId?: string | null;
  matterId?: string | null;
  userId?: string | null;
  recordedAt?: string | null;   // ISO
  verification?: VerificationState;
  confidence?: number | null;   // 0..1, optional
  extractionMethod?: string | null;
  /** Only where the source permits linking (public/primary law). */
  sourceUrl?: string | null;
  version?: string | null;
  reviewer?: string | null;
}

/** Build a minimal provenance from a legacy free-text source string. */
export function provenanceFromSource(
  source: string,
  origin: ProvenanceOrigin = "lawme_record",
): Provenance {
  return { origin, reference: source };
}

/** Dino ContextProvenance legacy shape (for the migration mapping). */
export interface DinoContextProvenanceLegacy {
  origin: "user_supplied" | "synthetic_fixture" | "lawme_record" | "derived";
  reference: string;
  recordedAt: string;
}

export function fromDinoContextProvenance(p: DinoContextProvenanceLegacy): Provenance {
  return { origin: p.origin, reference: p.reference, recordedAt: p.recordedAt };
}
