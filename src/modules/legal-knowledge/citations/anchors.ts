/**
 * Citation anchors — exact, verifiable references into extracted documents.
 * An answer may only cite through these utilities; a citation that fails
 * verification is BROKEN, never silently kept.
 */
import { normalizeText } from "../extraction/normalize-text.ts";
import type { ExtractionResult } from "../extraction/types.ts";

export interface CitationAnchor {
  documentId: string;       // corpus/document identifier
  versionHash: string;      // sha256 of the source content the anchor was made against
  anchorKey: string;        // block anchor, e.g. "p:0003"
  pageNumber: number | null;
  charStart: number;        // offsets into the version's normalizedText
  charEnd: number;
  sourceUrl: string | null;
  retrievedAt: string;
  verificationStatus: "verified_against_fixture" | "verified" | "unverified";
}

export interface QuoteMatch {
  matched: boolean;
  /** exact = identical; normalized = matches after normalization */
  matchType: "exact" | "normalized" | "none";
  expected: string;
  found: string | null;
}

/** Create a stable anchor for a block of an extracted document. */
export function createAnchor(args: {
  documentId: string;
  versionHash: string;
  anchorKey: string;
  extraction: ExtractionResult;
  sourceUrl: string | null;
  retrievedAt: string;
  isFixture: boolean;
}): CitationAnchor {
  const block = args.extraction.blocks.find((b) => b.anchorKey === args.anchorKey);
  if (!block) throw new Error(`anchor block not found: ${args.anchorKey}`);
  return {
    documentId: args.documentId,
    versionHash: args.versionHash,
    anchorKey: args.anchorKey,
    pageNumber: block.pageNumber,
    charStart: block.charStart,
    charEnd: block.charEnd,
    sourceUrl: args.sourceUrl,
    retrievedAt: args.retrievedAt,
    verificationStatus: args.isFixture ? "verified_against_fixture" : "unverified",
  };
}

/** Validate that an anchor still resolves inside an extraction result. */
export function validateAnchor(anchor: CitationAnchor, extraction: ExtractionResult): boolean {
  const block = extraction.blocks.find((b) => b.anchorKey === anchor.anchorKey);
  if (!block) return false;
  return block.charStart === anchor.charStart && block.charEnd === anchor.charEnd;
}

/** Extract the exact text an anchor points to. */
export function extractQuote(anchor: CitationAnchor, extraction: ExtractionResult): string | null {
  if (!validateAnchor(anchor, extraction)) return null;
  return extraction.normalizedText.slice(anchor.charStart, anchor.charEnd);
}

/** Verify a quoted string against its anchored source location. */
export function matchQuote(
  quote: string,
  anchor: CitationAnchor,
  extraction: ExtractionResult,
): QuoteMatch {
  const found = extractQuote(anchor, extraction);
  if (found === null) return { matched: false, matchType: "none", expected: quote, found: null };
  if (found.includes(quote)) return { matched: true, matchType: "exact", expected: quote, found };
  const nq = normalizeText(quote);
  const nf = normalizeText(found);
  if (nf.includes(nq)) return { matched: true, matchType: "normalized", expected: quote, found };
  return { matched: false, matchType: "none", expected: quote, found };
}

/** Detect anchors that no longer resolve (re-parse drift, version change). */
export function findBrokenAnchors(
  anchors: CitationAnchor[],
  extraction: ExtractionResult,
  currentVersionHash: string,
): CitationAnchor[] {
  return anchors.filter(
    (a) => a.versionHash !== currentVersionHash || !validateAnchor(a, extraction),
  );
}

/** Hebrew citation display, e.g. `סע"ש 12345-01-20, פסקה p:0003 (אוחזר 2026-07-11)`. */
export function formatCitation(args: {
  displayName: string;        // case number display or document title
  anchor: CitationAnchor;
}): string {
  const page = args.anchor.pageNumber !== null ? `, עמ' ${args.anchor.pageNumber}` : "";
  const date = args.anchor.retrievedAt.slice(0, 10);
  return `${args.displayName}${page}, פסקה ${args.anchor.anchorKey} (אוחזר ${date})`;
}
