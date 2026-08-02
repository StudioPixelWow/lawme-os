/**
 * MOCK fixture corpus (LEGAL AI ISRAEL — Phase 2).
 *
 * Synthetic documents CLEARLY marked as MOCK. No invented real case number is
 * presented as genuine (every case number uses an implausible 21xx year and the
 * title is prefixed [MOCK]). No commercial-database content. Used to demonstrate
 * ingestion, parsing, indexing, search, citation graph and quality review.
 */
import type { SearchableDoc } from "../search/engine.ts";

export interface MockDoc extends SearchableDoc {
  isMock: true;
  rawText: string;
  restrictionMarker: boolean;
  malformed: boolean;
  minorityOpinion: boolean;
}

const PROC = [
  { code: "ca", he: "ע\"א", court: "בית המשפט העליון", level: "supreme", auth: 90 },
  { code: "hcj", he: "בג\"ץ", court: "בית המשפט העליון", level: "supreme", auth: 92 },
  { code: "civ", he: "ת\"א", court: "בית משפט מחוזי", level: "district", auth: 60 },
  { code: "small_claims", he: "ת\"ק", court: "בית משפט שלום", level: "magistrate", auth: 40 },
  { code: "labor_sesh", he: "סע\"ש", court: "בית הדין האזורי לעבודה", level: "regional_labour", auth: 55 },
  { code: "family_claim", he: "תלה\"מ", court: "בית משפט לענייני משפחה", level: "family", auth: 45 },
];
const JUDGES = ["כהן", "לוי", "מזרחי", "פרידמן", "ברק-ארז", "עמית", "וילנר"];
const TOPICS = ["חוזים", "נזיקין", "מקרקעין", "דיני עבודה", "משפחה", "מנהלי"];

function body(i: number, he: string, num: string, restriction: boolean, minority: boolean): string {
  return [
    `[MOCK] פסק דין לדוגמה מס' ${i} — נתוני בדיקה בלבד.`,
    "העובדות",
    `בתיק ${he} ${num} נדונה שאלה משפטית לצורכי הדגמה.`,
    restriction ? "צו איסור פרסום חל על פרטים מזהים בתיק זה." : "הצדדים הופיעו וטענו את טענותיהם.",
    "דיון והכרעה",
    `כפי שנפסק בע"א 6821/93 ובבג"ץ 73/53, וכן לפי סעיף 12 לחוק החוזים, יש לבחון את הסוגיה.`,
    minority ? "דעת המיעוט\nלדעתי יש לדחות את הערעור." : "",
    "סוף דבר",
    "התביעה מתקבלת בחלקה. אין צו להוצאות.",
  ].filter(Boolean).join("\n\n");
}

/** Build the 50-document MOCK corpus (deterministic). */
export function buildMockCorpus(): MockDoc[] {
  const docs: MockDoc[] = [];
  for (let i = 0; i < 50; i++) {
    const p = PROC[i % PROC.length];
    const year = 2101 + (i % 20); // implausible → obviously MOCK
    const serial = 1000 + i;
    const num = `${serial}/${String(year).slice(2)}`;
    const restriction = i % 11 === 0;       // ~5 restricted
    const minority = i % 7 === 0;           // several with minority opinions
    const malformed = i % 13 === 0;         // a few malformed
    const missingMeta = i % 9 === 0;        // a few missing metadata
    const judges = i % 5 === 0 ? [JUDGES[i % JUDGES.length], JUDGES[(i + 1) % JUDGES.length], JUDGES[(i + 2) % JUDGES.length]] : [JUDGES[i % JUDGES.length]];
    const raw = malformed ? "\x00\x00[MOCK] טקסט פגום" : body(i, p.he, num, restriction, minority);
    docs.push({
      isMock: true,
      documentId: `mock-${String(i).padStart(3, "0")}`,
      caseNumberNormalized: missingMeta ? null : `${p.he} ${num}`,
      title: `[MOCK] ${p.he} ${num} — פלוני נ' אלמוני`,
      court: missingMeta ? null : p.court,
      courtLevel: p.level,
      proceedingType: p.code,
      judges,
      decisionDate: missingMeta ? null : `${year}-0${(i % 9) + 1}-1${i % 9}`,
      normalizedText: raw,
      rawText: raw,
      authorityLevel: p.auth,
      isFinal: i % 3 !== 0,
      citationCount: i % 17,
      canonicalPriority: p.level === "supreme" ? 1 : 3,
      isOfficial: true,
      topic: TOPICS[i % TOPICS.length],
      statutes: ["חוק החוזים (חלק כללי), התשל\"ג-1973"],
      documentType: "judgment",
      officialSourceUrl: `https://example.gov.il/mock/${i}`,
      sourceName: "MOCK_SOURCE",
      publicationStatus: "public",
      restrictionMarker: restriction,
      malformed,
      minorityOpinion: minority,
    });
  }
  return docs;
}
