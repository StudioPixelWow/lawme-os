/**
 * Real ingestion batch — Basic Laws of Israel (Open-Official Ingestion Phase 1).
 *
 * PUBLIC-RECORD METADATA ONLY. Titles are the canonical official names; the
 * enactment years and the one full date (Human Dignity and Liberty, 17.3.1992)
 * were confirmed against authoritative sources. NO statutory full text is held
 * here (metadata + link only). Nothing is invented: where a precise publication
 * date / Reshumot number is not confirmed, the field is left null (never
 * guessed). The enactment year rides on `version` as a real sourced signal.
 *
 * Source of the identity list: government/legislative references (see the
 * ingestion record). Instrument numbers (Sefer HaChukkim refs) are left null
 * until confirmed per-instrument by an operator against the official gazette.
 */
import type { RawAcquiredItem } from "../../types.ts";

interface BasicLawSeed {
  titleHe: string;
  year: string;
  fullDate?: string; // ISO, only where confirmed
}

const BASIC_LAWS: readonly BasicLawSeed[] = [
  { titleHe: "חוק יסוד: הכנסת", year: "1958" },
  { titleHe: "חוק יסוד: מקרקעי ישראל", year: "1960" },
  { titleHe: "חוק יסוד: נשיא המדינה", year: "1964" },
  { titleHe: "חוק יסוד: הממשלה", year: "1968" },
  { titleHe: "חוק יסוד: משק המדינה", year: "1975" },
  { titleHe: "חוק יסוד: הצבא", year: "1976" },
  { titleHe: "חוק יסוד: ירושלים בירת ישראל", year: "1980" },
  { titleHe: "חוק יסוד: השפיטה", year: "1984" },
  { titleHe: "חוק יסוד: מבקר המדינה", year: "1988" },
  { titleHe: "חוק יסוד: כבוד האדם וחירותו", year: "1992", fullDate: "1992-03-17" },
  { titleHe: "חוק יסוד: חופש העיסוק", year: "1994" },
  { titleHe: "חוק יסוד: משאל עם", year: "2014" },
  { titleHe: "חוק יסוד: ישראל – מדינת הלאום של העם היהודי", year: "2018" },
  { titleHe: "חוק יסוד: תקציב המדינה לשנים 2017 ו-2018 (הוראות מיוחדות)(הוראת שעה)", year: "2017" },
];

/** The Basic Laws as adapter input for the National Legislation Database. */
export const BASIC_LAWS_ITEMS: readonly RawAcquiredItem[] = BASIC_LAWS.map((b) => ({
  sourceUrl: null, // adapter falls back to the National Legislation DB home URL
  issuingBody: "הכנסת",
  instrumentNumber: null, // Sefer HaChukkim ref not yet confirmed per-instrument
  titleHe: b.titleHe,
  publicationDate: b.fullDate ?? null,
  decisionDate: null,
  effectiveDate: null,
  version: b.year, // enactment year — a real sourced signal, not a guessed date
  fullText: null, // metadata only; no statutory text held
  tenantId: null,
}));

/** A deliberately malformed item to PROVE quarantine (never silently dropped). */
export const MALFORMED_ITEMS: readonly RawAcquiredItem[] = [
  {
    sourceUrl: "not-a-valid-url", // fails URL validation
    issuingBody: "הכנסת",
    instrumentNumber: null,
    titleHe: "רשומה פגומה לבדיקה",
    publicationDate: "17/03/1992", // wrong date format → quarantine
    decisionDate: null,
    effectiveDate: null,
    version: "9999",
    fullText: null,
    tenantId: null,
  },
];
