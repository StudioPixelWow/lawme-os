/**
 * Citation contract for legislation RAG (Step 17).
 *
 * Defines the mandatory citation payload every retrieval result must carry, and
 * the gate that decides whether a chunk may be served to a future RAG answer.
 * A chunk is servable ONLY if it is published, license-allowed, provenance-
 * complete, not quarantined, and the current (or explicitly requested) version.
 * Pure/offline — no answer generation here.
 */

export interface Citation {
  lawTitle: string;
  sectionNumber: string;
  version: string; // version label / number
  sourceUrl: string;
  sourceDocumentId: string; // DocumentSource / version id
  lastVerified: string; // ISO
  chunkId: string;
  sourceSpan: { start: number; end: number };
}

export interface ServableChunk {
  chunkId: string;
  published: boolean;
  licenseAllowed: boolean;
  provenanceComplete: boolean;
  quarantined: boolean;
  isCurrentVersion: boolean;
  citation: Citation | null;
}

export interface GateResult {
  servable: boolean;
  reasons: readonly string[];
}

/** The gate a chunk must pass before it can back a RAG answer. */
export function gateChunkForServing(c: ServableChunk): GateResult {
  const reasons: string[] = [];
  if (!c.published) reasons.push("not_published");
  if (!c.licenseAllowed) reasons.push("license_not_allowed");
  if (!c.provenanceComplete) reasons.push("provenance_incomplete");
  if (c.quarantined) reasons.push("quarantined");
  if (!c.isCurrentVersion) reasons.push("not_current_version");
  if (!c.citation) reasons.push("missing_citation");
  else {
    const cit = c.citation;
    if (!cit.lawTitle || !cit.sectionNumber || !cit.version || !cit.sourceUrl ||
        !cit.sourceDocumentId || !cit.chunkId) reasons.push("incomplete_citation");
  }
  return { servable: reasons.length === 0, reasons };
}

/** True only when every retrieval result carries a complete citation. */
export function allResultsCited(results: readonly ServableChunk[]): boolean {
  return results.every((r) => gateChunkForServing(r).servable);
}
