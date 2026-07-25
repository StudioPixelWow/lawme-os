/**
 * Legal-domain classification (Slice 3.1.0). PURE + DETERMINISTIC. No AI.
 * Keyword classification against the reviewed employment vocabulary; other legal
 * domains are recognized only to mark them OUT OF SCOPE for the current corpus.
 */
import { EMPLOYMENT_LAW_VOCABULARY } from "../legal-knowledge/vocabulary/employment-law.ts";
import type { LegalDomainClassification } from "./types.ts";

/** Employment surface: every canonical term + its variants + core anchors. */
const EMPLOYMENT_TERMS: readonly string[] = (() => {
  const set = new Set<string>();
  for (const e of EMPLOYMENT_LAW_VOCABULARY) {
    set.add(e.canonical);
    for (const v of e.variants) set.add(v.term);
  }
  for (const t of ["עבודה", "עובד", "עובדת", "מעסיק", "מעביד", "פיטורים", "פיטורין", "התפטרות", "שכר", "העסקה", "מקום העבודה"]) set.add(t);
  return [...set];
})();

/** Anchors that signal a DIFFERENT legal domain (out of the employment corpus). */
const OTHER_DOMAIN_ANCHORS: readonly string[] = [
  "ירושה", "צוואה", "עיזבון", "פלילי", "כתב אישום", "גירושין", "מזונות", "משמורת",
  "מקרקעין", "נדל\"ן", "דמי שכירות", "מס הכנסה", "מע\"מ", "פטנט", "זכויות יוצרים", "סימן מסחר", "פשיטת רגל", "חדלות פירעון",
];

function countMatches(text: string, terms: readonly string[]): string[] {
  const found: string[] = [];
  for (const t of terms) if (text.includes(t)) found.push(t);
  return found;
}

export function classifyLegalDomain(question: string, hint?: string | null): LegalDomainClassification {
  const text = question;
  const employmentHits = countMatches(text, EMPLOYMENT_TERMS);
  const otherHits = countMatches(text, OTHER_DOMAIN_ANCHORS);
  const hintLabor = hint === "labor" || hint === "employment";

  // A matter's labor hint disambiguates borderline questions, but an explicit
  // other-domain anchor (ירושה / פלילי / מקרקעין …) always wins over the hint.
  if (employmentHits.length > 0 || (hintLabor && otherHits.length === 0)) {
    const base = employmentHits.length >= 3 ? 0.95 : employmentHits.length === 2 ? 0.85 : employmentHits.length === 1 ? 0.7 : 0.6;
    const confidence = otherHits.length > 0 ? Math.max(0.5, base - 0.15) : base;
    return {
      domain: "labor",
      labelHe: "דיני עבודה",
      confidence,
      matchedTerms: [...new Set(employmentHits)],
      inScope: true,
      reasonHe: employmentHits.length ? "זוהו מונחי דיני עבודה בשאלה" : "סווג לפי הקשר התיק",
    };
  }

  return {
    domain: "unknown",
    labelHe: otherHits.length ? "תחום מחוץ לכיסוי הקורפוס" : "תחום לא זוהה",
    confidence: otherHits.length ? 0.6 : 0.3,
    matchedTerms: [...new Set(otherHits)],
    inScope: false,
    reasonHe: otherHits.length
      ? "השאלה נוגעת לתחום שאינו דיני עבודה — הקורפוס הנוכחי אינו מכסה אותו"
      : "לא זוהו מונחים משפטיים מזוהים בשאלה",
  };
}
