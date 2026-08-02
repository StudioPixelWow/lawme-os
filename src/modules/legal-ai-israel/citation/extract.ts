/**
 * Case-citation extraction from Hebrew legal text (LEGAL AI ISRAEL — Phase 2).
 *
 * Finds case citations in running text (multiple per sentence, with/without
 * party names or year, Hebrew ״ or ASCII " quotes, and citations split across a
 * line break) and normalizes each via the case-number parser. Deterministic; no
 * LLM. Never invents a citation — only what the text literally contains.
 */
import { PROCEEDING_TYPES, parseCaseNumber } from "./case-number.ts";
import type { NormalizedCaseNumber } from "./case-number.ts";

export interface CitationMatch {
  raw: string;                 // the literal matched text
  normalized: NormalizedCaseNumber;
  startOffset: number;
  endOffset: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// For each proceeding type build a variant that accepts ASCII " or gershayim ״
// and ASCII ' or geresh ׳ at the punctuation positions.
function typeVariant(canonicalHe: string): string {
  return escapeRe(canonicalHe)
    .replace(/"/g, "[\"״]")
    .replace(/'/g, "['׳]");
}

// Longest canonical first so "עע\"מ" is tried before "ע\"ע" etc.
const TYPE_ALT = [...PROCEEDING_TYPES]
  .map((p) => p.canonicalHe)
  .sort((a, b) => b.length - a.length)
  .map(typeVariant)
  .join("|");

// number forms: modern serial-month-year OR classic serial/year.
const NUMBER = "(?:\\d{1,6}\\s*-\\s*\\d{1,2}\\s*-\\s*\\d{2,4}|\\d{1,6}\\s*/\\s*\\d{2,4})";

// Up to 3 whitespace chars (incl. a single newline) between type and number so a
// citation split across a line break is still captured.
const CITATION_RE = new RegExp(`(?:${TYPE_ALT})\\s{0,3}${NUMBER}`, "g");

/** Extract all case citations from text with positions and normalization. */
export function extractCitations(text: string): CitationMatch[] {
  if (!text) return [];
  const out: CitationMatch[] = [];
  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(text)) !== null) {
    const raw = m[0];
    // collapse internal whitespace (incl. a line break) before parsing
    const cleaned = raw.replace(/\s+/g, " ").trim();
    const normalized = parseCaseNumber(cleaned);
    if (normalized && normalized.format !== "unknown" && normalized.proceedingCode !== null) {
      out.push({ raw, normalized, startOffset: m.index, endOffset: m.index + raw.length });
    }
  }
  return out;
}

/** Distinct normalized citation strings found in the text. */
export function distinctCitations(text: string): string[] {
  const seen = new Set<string>();
  for (const c of extractCitations(text)) seen.add(c.normalized.normalized);
  return [...seen];
}

// ---- Resolver against local documents (no third-party lookups) ------------

export interface LocalDocRef {
  documentId: string;
  caseNumberNormalized: string;
}

export type ResolutionStatus = "resolved" | "unresolved";

export interface ResolvedCitation {
  citation: CitationMatch;
  citedDocumentId: string | null;
  resolutionStatus: ResolutionStatus;
  resolutionScore: number; // 100 exact normalized match, else 0
}

/** Resolve extracted citations to local documents by exact normalized match. */
export function resolveCitations(
  citations: readonly CitationMatch[],
  localDocs: readonly LocalDocRef[],
): ResolvedCitation[] {
  const byNorm = new Map<string, string>();
  for (const d of localDocs) byNorm.set(d.caseNumberNormalized, d.documentId);
  return citations.map((c) => {
    const hit = byNorm.get(c.normalized.normalized) ?? null;
    return {
      citation: c,
      citedDocumentId: hit,
      resolutionStatus: hit ? "resolved" : "unresolved",
      resolutionScore: hit ? 100 : 0,
    };
  });
}
