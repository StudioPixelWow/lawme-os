/**
 * Legal entity extraction (Slice 3.1.0). PURE + DETERMINISTIC. No AI.
 * Extracts laws, sections, courts, judges, parties, dates and legal concepts
 * from a question via regex + the reviewed employment vocabulary, and resolves
 * the matter TOPIC keys used for search planning and coverage.
 */
import { EMPLOYMENT_LAW_VOCABULARY } from "../legal-knowledge/vocabulary/employment-law.ts";
import { TOPIC_PROCEDURE } from "../legal-knowledge/triad/coverage.ts";
import type { ExtractedEntities } from "./types.ts";

/** Keyword → topic-key map (topic keys align with the case-law legalTopics). */
const TOPIC_KEYWORDS: Record<string, readonly string[]> = {
  pregnancy_dismissal: ["היריון", "הריון", "עובדת בהריון", "עבודת נשים", "בהיריון"],
  severance: ["פיצויי פיטורים", "פיצויי פיטורין", "פיצויים", "פיטורים", "הרעה מוחשית", "סעיף 14"],
  notice_period: ["הודעה מוקדמת", "חלף הודעה"],
  overtime: ["שעות נוספות", "גמול שעות", "שעות עבודה"],
  pension: ["פנסיה", "פנסיוני", "צו הרחבה", "ביטוח פנסיוני"],
  equal_opportunity: ["שוויון", "הפליה", "שוויון הזדמנויות"],
  workplace_harassment: ["הטרדה", "הטרדה מינית"],
  wage_claims: ["הגנת השכר", "הפרשי שכר", "שכר מינימום", "ניכוי משכר"],
  hearing_duty: ["שימוע", "זכות שימוע"],
};

const COURT_PHRASES: readonly string[] = [
  "בית הדין האזורי לעבודה", "בית הדין הארצי לעבודה", "בית הדין לעבודה",
  "בית המשפט העליון", "בג\"ץ", "בית משפט השלום", "בית המשפט המחוזי",
];

const PARTY_TOKENS: readonly string[] = [
  "עובד", "עובדת", "מעסיק", "מעביד", "תובע", "תובעת", "נתבע", "נתבעת", "החברה", "הלקוח", "הלקוחה",
];

function uniq(list: string[]): string[] {
  return [...new Set(list.filter((s) => s.trim().length > 0))];
}

function extractConcepts(text: string): { concepts: string[]; laws: string[] } {
  const concepts: string[] = [];
  const laws: string[] = [];
  for (const e of EMPLOYMENT_LAW_VOCABULARY) {
    const hit = text.includes(e.canonical) || e.variants.some((v) => text.includes(v.term));
    if (hit) {
      concepts.push(e.canonical);
      if (e.statuteRef) laws.push(e.statuteRef);
    }
  }
  return { concepts: uniq(concepts), laws };
}

function extractLaws(text: string, vocabLaws: string[]): string[] {
  const laws = [...vocabLaws];
  const re = /חוק\s+[^,.?!\n;:()]{2,40}/g;
  for (const m of text.matchAll(re)) laws.push(m[0].trim());
  return uniq(laws);
}

function extractSections(text: string): string[] {
  const out: string[] = [];
  const re = /סעיף\s+(\d{1,3}[א-ת]?|[א-ת]{1,3}(?:['׳])?)/g;
  for (const m of text.matchAll(re)) out.push(`סעיף ${m[1]}`);
  return uniq(out);
}

function extractJudges(text: string): string[] {
  const out: string[] = [];
  const re = /(?:כב['׳]?\s*)?השופט(?:ת)?\s+([א-ת'׳"]{2,}(?:\s+[א-ת'׳"]{2,})?)/g;
  for (const m of text.matchAll(re)) out.push(m[1].trim());
  return uniq(out);
}

function extractDates(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b(\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/g)) out.push(m[1]);
  for (const m of text.matchAll(/שנת\s+(\d{4})/g)) out.push(m[0]);
  for (const m of text.matchAll(/\b(19|20)\d{2}\b/g)) out.push(m[0]);
  const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  for (const mo of months) if (text.includes(mo)) out.push(mo);
  return uniq(out);
}

function resolveTopics(text: string, concepts: string[], procedureType?: string | null): string[] {
  const topics = new Set<string>();
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    if (kws.some((k) => text.includes(k))) topics.add(topic);
  }
  // procedure type → its topic (reverse of TOPIC_PROCEDURE)
  if (procedureType) {
    for (const [topic, proc] of Object.entries(TOPIC_PROCEDURE)) {
      if (proc === procedureType) topics.add(topic);
    }
  }
  void concepts;
  return [...topics];
}

export function extractLegalEntities(question: string, procedureType?: string | null): ExtractedEntities {
  const text = question;
  const { concepts, laws: vocabLaws } = extractConcepts(text);
  return {
    laws: extractLaws(text, vocabLaws),
    sections: extractSections(text),
    courts: uniq(COURT_PHRASES.filter((c) => text.includes(c))),
    judges: extractJudges(text),
    parties: uniq(PARTY_TOKENS.filter((p) => text.includes(p))),
    dates: extractDates(text),
    concepts,
    topics: resolveTopics(text, concepts, procedureType),
  };
}
