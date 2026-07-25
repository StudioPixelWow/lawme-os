/**
 * Source ranking (Slice 3.1.0). PURE + DETERMINISTIC. No AI.
 * Multi-signal scoring: authority, binding force, official source, verification,
 * exact-section match, recency, citation frequency and lexical relevance.
 */
import type { CanonicalSource, RankedSource, RankSignals, AuthorityLevel } from "./types.ts";

const AUTHORITY_WEIGHT: Record<AuthorityLevel, number> = {
  legislation: 1.0, supreme: 0.9, national_labor: 0.75, regional: 0.5, guidance: 0.4, secondary: 0.3, unknown: 0.1,
};

const WEIGHTS: RankSignals = {
  authority: 0.22, binding: 0.14, official: 0.12, verification: 0.14,
  sectionMatch: 0.08, recency: 0.08, citationFrequency: 0.07, relevance: 0.15,
};

function yearOf(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const y = Number(dateISO.slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
}

function recencyScore(dateISO: string | null): number {
  const y = yearOf(dateISO);
  if (y === null) return 0.3;         // undated (e.g. statute) → neutral-low
  if (y >= 2020) return 1;
  if (y >= 2010) return 0.7;
  if (y >= 2000) return 0.5;
  return 0.3;
}

function officialScore(s: CanonicalSource): number {
  if (s.url && (s.url.includes("knesset.gov.il") || s.url.includes("court.gov.il") || s.url.includes("gov.il"))) return 1;
  if (s.publisherHe) return 0.7;
  if (s.url) return 0.6;
  return 0.2;
}

function verificationScore(s: CanonicalSource): number {
  return s.verification === "verified" ? 1 : s.verification === "to_verify" ? 0.4 : 0.2;
}

function bindingScore(s: CanonicalSource): number {
  return s.bindingClass === "binding" ? 1 : s.bindingClass === "persuasive" ? 0.6 : 0.3;
}

function sectionScore(s: CanonicalSource): number {
  if (!s.sectionHe) return 0;
  return s.matchedTerms.some((t) => t.includes("סעיף")) ? 1 : 0.5;
}

export function signalsFor(s: CanonicalSource): RankSignals {
  return {
    authority: AUTHORITY_WEIGHT[s.authorityLevel],
    binding: bindingScore(s),
    official: officialScore(s),
    verification: verificationScore(s),
    sectionMatch: sectionScore(s),
    recency: recencyScore(s.dateISO),
    citationFrequency: Math.min(1, s.citationFrequency / 5),
    relevance: Math.min(1, s.matchedTerms.length / 3),
  };
}

function weighted(sig: RankSignals): number {
  return (
    sig.authority * WEIGHTS.authority + sig.binding * WEIGHTS.binding + sig.official * WEIGHTS.official +
    sig.verification * WEIGHTS.verification + sig.sectionMatch * WEIGHTS.sectionMatch + sig.recency * WEIGHTS.recency +
    sig.citationFrequency * WEIGHTS.citationFrequency + sig.relevance * WEIGHTS.relevance
  );
}

export function rankSources(sources: readonly CanonicalSource[]): RankedSource[] {
  const scored = sources.map((s) => {
    const signals = signalsFor(s);
    return { s, signals, score: Math.round(weighted(signals) * 1000) / 1000 };
  });
  scored.sort((a, b) => b.score - a.score || a.s.recordId.localeCompare(b.s.recordId));
  return scored.map((x, i) => ({
    rank: i + 1,
    recordId: x.s.recordId,
    sourceKind: x.s.sourceKind,
    citationHe: x.s.citationHe,
    score: x.score,
    signals: x.signals,
  }));
}
