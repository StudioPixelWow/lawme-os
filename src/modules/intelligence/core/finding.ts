/**
 * Shared intelligence primitive — Finding contract (Epic 4.1).
 * The neutral, cross-domain shape of "something an engine/stage observed".
 * Domains MAY extend this with domain-specific fields (e.g. Matter's `dimension`)
 * but the shared fields mean the same thing everywhere.
 */
import type { Severity } from "./severity.ts";
import type { Provenance } from "./provenance.ts";

export interface Finding {
  id: string;
  /** stable machine code / type, e.g. "deadline:overdue" */
  type: string;
  titleHe: string;
  descriptionHe?: string;
  severity: Severity;
  confidence?: number | null;   // 0..1
  provenance?: Provenance | null;
  /** ids of matter/document/deadline/etc. this finding relates to */
  relatedObjectIds?: string[];
  blocking?: boolean;
  freshness?: { computedAt: string; stale?: boolean } | null;
}
