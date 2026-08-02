/**
 * Legal search foundation (LEGAL AI ISRAEL — Phase 2).
 *
 * Defines the engine interface, an inspectable ranking model, and an in-memory
 * reference implementation used for tests and for operator-ingested pilots
 * before the Postgres FTS/pgvector path is wired. Every score component is
 * inspectable in debug mode.
 */
import { parseCaseNumber } from "../citation/case-number.ts";

export interface SearchableDoc {
  documentId: string;
  caseNumberNormalized: string | null;
  title: string | null;
  court: string | null;
  courtLevel: string | null;
  proceedingType: string | null;
  judges: readonly string[];
  decisionDate: string | null;      // ISO
  normalizedText: string;
  authorityLevel: number;           // higher = more authority
  isFinal: boolean;
  citationCount: number;
  canonicalPriority: number;        // lower number = higher priority source (1 best)
  isOfficial: boolean;
  topic: string | null;
  statutes: readonly string[];
  documentType: string | null;
  officialSourceUrl: string | null;
  sourceName: string | null;
  publicationStatus: "public" | "restricted" | "unknown";
}

export interface LegalSearchFilters {
  sourceName?: string;
  court?: string;
  courtLevel?: string;
  proceedingType?: string;
  dateFrom?: string;
  dateTo?: string;
  judge?: string;
  topic?: string;
  statute?: string;
  isFinal?: boolean;
  documentType?: string;
  officialOnly?: boolean;
}

export type SortBy = "relevance" | "date" | "authority";

export interface LegalSearchQuery {
  text?: string;
  caseNumber?: string;
  judge?: string;
  statute?: string;
  phrase?: string;
  filters?: LegalSearchFilters;
  sort?: SortBy;
  limit?: number;
  debug?: boolean;
}

export interface RelevanceBreakdown {
  exactCaseNumber: number;
  exactPhrase: number;
  fullText: number;
  trigram: number;
  authority: number;
  finalDecision: number;
  recency: number;
  citation: number;
  canonicalPriority: number;
  officialStatus: number;
  total: number;
}

export interface LegalSearchResult {
  documentId: string;
  caseNumber: string | null;
  title: string | null;
  court: string | null;
  decisionDate: string | null;
  judges: readonly string[];
  snippet: string;
  officialSourceUrl: string | null;
  sourceName: string | null;
  authorityScore: number;
  relevance: number;
  breakdown?: RelevanceBreakdown;
  coverageWarningHe: string | null;
}

export interface LegalSearchResponse {
  total: number;
  results: readonly LegalSearchResult[];
  coverageNoticeHe: string;
}

export interface LegalSearchEngine {
  search(query: LegalSearchQuery): Promise<LegalSearchResponse>;
}

export const COVERAGE_NOTICE_HE =
  "המאגר כולל רק מקורות ציבוריים שנבדקו ואושרו. הוא אינו כולל בהכרח את כלל הפסיקה בישראל.";

function trigrams(s: string): Set<string> {
  const t = new Set<string>();
  const clean = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < clean.length - 2; i++) t.add(clean.slice(i, i + 3));
  return t;
}
function trigramSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = trigrams(a), B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

function recencyScore(iso: string | null): number {
  if (!iso) return 0;
  const y = Number(iso.slice(0, 4));
  if (!Number.isFinite(y)) return 0;
  return Math.max(0, Math.min(1, (y - 1980) / 60)); // 1980→0, 2040→1
}

function passesFilters(d: SearchableDoc, f?: LegalSearchFilters): boolean {
  if (!f) return true;
  if (f.officialOnly && !d.isOfficial) return false;
  if (f.sourceName && d.sourceName !== f.sourceName) return false;
  if (f.court && d.court !== f.court) return false;
  if (f.courtLevel && d.courtLevel !== f.courtLevel) return false;
  if (f.proceedingType && d.proceedingType !== f.proceedingType) return false;
  if (f.judge && !d.judges.includes(f.judge)) return false;
  if (f.topic && d.topic !== f.topic) return false;
  if (f.statute && !d.statutes.includes(f.statute)) return false;
  if (f.documentType && d.documentType !== f.documentType) return false;
  if (typeof f.isFinal === "boolean" && d.isFinal !== f.isFinal) return false;
  if (f.dateFrom && (d.decisionDate ?? "") < f.dateFrom) return false;
  if (f.dateTo && (d.decisionDate ?? "9999") > f.dateTo) return false;
  return true;
}

function score(d: SearchableDoc, q: LegalSearchQuery): RelevanceBreakdown {
  const wantCase = q.caseNumber ? parseCaseNumber(q.caseNumber)?.normalized ?? q.caseNumber : null;
  const exactCaseNumber = wantCase && d.caseNumberNormalized === wantCase ? 100 : 0;

  const phrase = q.phrase ?? "";
  const exactPhrase = phrase && d.normalizedText.includes(phrase) ? 30 : 0;

  const text = q.text ?? "";
  const terms = text.split(/\s+/).filter((t) => t.length > 1);
  const hay = `${d.title ?? ""} ${d.normalizedText}`;
  const hit = terms.filter((t) => hay.includes(t)).length;
  const fullText = terms.length ? (hit / terms.length) * 25 : 0;

  const trigram = text ? trigramSim(text, d.title ?? "") * 10 : 0;

  const authority = (d.authorityLevel / 100) * 15;
  const finalDecision = d.isFinal ? 5 : 0;
  const recency = recencyScore(d.decisionDate) * 5;
  const citation = Math.min(5, Math.log10(1 + d.citationCount) * 3);
  const canonicalPriority = Math.max(0, (8 - d.canonicalPriority)) / 8 * 5;
  const officialStatus = d.isOfficial ? 3 : 0;

  const judgeHit = q.judge && d.judges.some((j) => j.includes(q.judge!)) ? 8 : 0;

  const total =
    exactCaseNumber + exactPhrase + fullText + trigram + authority +
    finalDecision + recency + citation + canonicalPriority + officialStatus + judgeHit;

  return { exactCaseNumber, exactPhrase, fullText, trigram, authority, finalDecision, recency, citation, canonicalPriority, officialStatus, total };
}

export class InMemoryLegalSearchEngine implements LegalSearchEngine {
  private readonly docs: readonly SearchableDoc[];
  constructor(docs: readonly SearchableDoc[]) {
    // Only public documents are ever searchable in the reference engine.
    this.docs = docs.filter((d) => d.publicationStatus === "public");
  }

  async search(query: LegalSearchQuery): Promise<LegalSearchResponse> {
    const filtered = this.docs.filter((d) => passesFilters(d, query.filters));
    const scored = filtered.map((d) => ({ d, b: score(d, query) }));

    const hasQuery = Boolean(query.text || query.caseNumber || query.phrase || query.judge || query.statute);
    let kept = hasQuery ? scored.filter((s) => s.b.total > 0) : scored;

    const sort = query.sort ?? "relevance";
    kept = kept.slice().sort((a, b) => {
      if (sort === "date") return (b.d.decisionDate ?? "").localeCompare(a.d.decisionDate ?? "");
      if (sort === "authority") return b.d.authorityLevel - a.d.authorityLevel || b.b.total - a.b.total;
      return b.b.total - a.b.total;
    });

    const limited = kept.slice(0, query.limit ?? 20);
    const results: LegalSearchResult[] = limited.map(({ d, b }) => ({
      documentId: d.documentId,
      caseNumber: d.caseNumberNormalized,
      title: d.title,
      court: d.court,
      decisionDate: d.decisionDate,
      judges: d.judges,
      snippet: d.normalizedText.slice(0, 200),
      officialSourceUrl: d.officialSourceUrl,
      sourceName: d.sourceName,
      authorityScore: d.authorityLevel,
      relevance: Math.round(b.total * 100) / 100,
      breakdown: query.debug ? b : undefined,
      coverageWarningHe: d.isOfficial ? null : "מקור לא רשמי — לאימות מול המקור הרשמי.",
    }));

    return { total: kept.length, results, coverageNoticeHe: COVERAGE_NOTICE_HE };
  }
}
