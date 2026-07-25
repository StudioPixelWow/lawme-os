/**
 * P1-S1 verified-citation benchmark — gold cases for D-NOTICE + D-MINWAGE.
 * Gold records authored from the verified seed. Runner maps the deterministic
 * answer builder to the harness ActualAnswer. Hard gates G1–G9 at 100%.
 */
import type { BenchmarkCase, ActualAnswer, EmittedCitation, GoldCitation } from "./harness.ts";
import { buildVerifiedLegislationAnswer, type AnswerRequest } from "../answer.ts";

const NOW = "2026-07-25T09:00:00+03:00";
const HISTORICAL = "2026-03-15T09:00:00+03:00"; // before the 2026-04-01 rate
const STALE = "2026-12-01T09:00:00+03:00"; // past the rate re-verify due date

const NOTICE_TITLE = "חוק הודעה לעובד ולמועמד לעבודה (תנאי עבודה והליכי מיון וקבלה לעבודה)";
const MINWAGE_TITLE = "חוק שכר מינימום";
const RATE_TITLE = "שיעור שכר המינימום במשק";
const NOTICE_LINK = "https://www.kolzchut.org.il/he/הודעה_על_תנאי_העבודה";
const MINWAGE_LINK = "https://www.kolzchut.org.il/he/שכר_מינימום";

const P_NOTICE = "מעסיק חייב למסור לעובד הודעה בכתב על תנאי העבודה לא יאוחר מ-30 ימים מתחילת העבודה (7 ימים לגבי עובד שטרם מלאו לו 18).";
const P_MINWAGE_ENT = "עובד שמלאו לו 18 המועסק במשרה מלאה זכאי לשכר שלא יפחת משכר המינימום.";
const P_RATE = "שכר המינימום החל מ-1.4.2026: 6,443.85 ₪ לחודש (משרה מלאה) ו-35.40 ₪ לשעה.";

const goldNotice: GoldCitation = {
  sourceId: "vlc-notice-2002", titleHe: NOTICE_TITLE, year: 2002, section: "סעיף 1", subsection: null,
  versionId: "vlc-notice-2002-v1", effectiveStatus: "in_force", link: NOTICE_LINK, pinpointExpected: false,
  supportsProposition: P_NOTICE,
};
const goldMinwageEnt: GoldCitation = {
  sourceId: "vlc-minwage-1987", titleHe: MINWAGE_TITLE, year: 1987, section: "סעיף 2", subsection: null,
  versionId: "vlc-minwage-1987-v1", effectiveStatus: "in_force", link: MINWAGE_LINK, pinpointExpected: false,
  supportsProposition: P_MINWAGE_ENT,
};
const goldRate: GoldCitation = {
  sourceId: "vlc-minwage-rate", titleHe: RATE_TITLE, year: 2026, section: "שיעור עדכני", subsection: null,
  versionId: "vlc-minwage-rate-2026-04", effectiveStatus: "in_force", link: MINWAGE_LINK, pinpointExpected: false,
  supportsProposition: P_RATE,
};

/** Map the answer builder output to the harness ActualAnswer shape. */
export function answerToActual(req: AnswerRequest): ActualAnswer {
  const a = buildVerifiedLegislationAnswer(req);
  const citations: EmittedCitation[] = a.citations.map((c) => ({
    citationId: c.citationId, sourceId: c.sourceId, titleHe: c.titleHe, year: c.year,
    section: c.sectionHe, subsection: null, versionId: c.versionId, effectiveStatus: c.effectiveStatus,
    link: c.link, pinpointResolvable: c.pinpointResolvable, supportsProposition: c.supportsProposition,
    licenseCompliant: true, fromCorpus: true,
  }));
  return { status: a.status, citations, coverageLevel: a.coverage?.coverageLevel ?? "insufficient" };
}

function mkCase(caseId: string, req: AnswerRequest, gold: BenchmarkCase["gold"]): BenchmarkCase & { req: AnswerRequest } {
  return { caseId, doctrineId: req.doctrineId ?? "?", questionHe: req.question, contextKind: req.contextKind, asOfISO: req.asOfISO, gold, req };
}

function noticePositive(i: number, q: string): BenchmarkCase & { req: AnswerRequest } {
  return mkCase(`notice-pos-${i}`, { question: q, contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "answered", expectedCitations: [goldNotice], forbiddenSourceIds: ["vlc-minwage-1987", "vlc-minwage-rate"], expectedCoverageLevel: "substantial",
  });
}
function minwagePositive(i: number, q: string): BenchmarkCase & { req: AnswerRequest } {
  return mkCase(`minwage-pos-${i}`, { question: q, contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "answered", expectedCitations: [goldMinwageEnt, goldRate], forbiddenSourceIds: ["vlc-notice-2002"], expectedCoverageLevel: "substantial",
  });
}

export const P1S1_CASES: (BenchmarkCase & { req: AnswerRequest })[] = [
  // D-NOTICE — 10 positive
  noticePositive(1, "האם מעסיק חייב למסור לעובד הודעה בכתב על תנאי העבודה?"),
  noticePositive(2, "תוך כמה זמן צריך למסור הודעה על תנאי העבודה?"),
  noticePositive(3, "האם חובה למסור הודעה בכתב על תנאי העסקה לעובד חדש?"),
  noticePositive(4, "מה קובע החוק לגבי הודעה על תנאי העבודה?"),
  noticePositive(5, "האם מעסיק חייב הודעה בכתב על תנאי עבודה לעובד?"),
  noticePositive(6, "חובת הודעה על תנאי העבודה — מה הדין?"),
  noticePositive(7, "האם יש חובה למסור לעובד פירוט תנאי העבודה בכתב?"),
  noticePositive(8, "מהי המסגרת החוקית להודעה על תנאי העבודה?"),
  noticePositive(9, "האם עובד זכאי להודעה בכתב על תנאי העבודה שלו?"),
  noticePositive(10, "מתי יש למסור הודעה על תנאי העבודה לעובד חדש?"),
  // D-NOTICE — 3 negative/missing-fact + 2 distractor
  mkCase("notice-needsfacts-1", { question: "האם ההודעה על תנאי העבודה בתיק נמסרה כדין?", contextKind: "matter", factsPresent: false, asOfISO: NOW }, {
    expectedStatus: "needs_facts", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "substantial",
  }),
  mkCase("notice-needsfacts-2", { question: "האם מסירת ההודעה על תנאי העבודה בתיק הזה תקינה?", contextKind: "matter", factsPresent: false, asOfISO: NOW }, {
    expectedStatus: "needs_facts", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "substantial",
  }),
  mkCase("notice-needsfacts-3", { question: "לגבי ההודעה על תנאי העבודה של הלקוח — האם הופרה החובה?", contextKind: "matter", factsPresent: false, asOfISO: NOW }, {
    expectedStatus: "needs_facts", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "substantial",
  }),
  mkCase("distractor-severance", { question: "האם מגיעים לעובד פיצויי פיטורים לאחר שנתיים?", contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "out_of_scope", expectedCitations: [], forbiddenSourceIds: ["vlc-notice-2002"], expectedCoverageLevel: "insufficient",
  }),
  mkCase("distractor-pension", { question: "מהי חובת ההפרשה לפנסיה של המעסיק?", contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "out_of_scope", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "insufficient",
  }),
  // D-MINWAGE — 8 positive/current-rate
  minwagePositive(1, "מהו שכר המינימום החל כיום?"),
  minwagePositive(2, "כמה שכר מינימום לחודש במשרה מלאה?"),
  minwagePositive(3, "מהו שכר המינימום לשעה?"),
  minwagePositive(4, "מה שכר המינימום העדכני במשק?"),
  minwagePositive(5, "האם עובד זכאי לשכר מינימום ומהו הסכום?"),
  minwagePositive(6, "מהו שכר המינימום התקף היום לעובד בגיר?"),
  minwagePositive(7, "כמה הוא שכר המינימום במשק כעת?"),
  minwagePositive(8, "מהו שכר המינימום לחודש ולשעה?"),
  // D-MINWAGE — 4 historical/future/stale traps
  mkCase("minwage-historical-1", { question: "מה היה שכר המינימום במרץ 2026?", contextKind: "general", asOfISO: HISTORICAL }, {
    expectedStatus: "insufficient_coverage", expectedCitations: [goldMinwageEnt], forbiddenSourceIds: [], expectedCoverageLevel: "partial",
  }),
  mkCase("minwage-historical-2", { question: "מהו שכר המינימום שחל בתחילת 2026?", contextKind: "general", asOfISO: HISTORICAL }, {
    expectedStatus: "insufficient_coverage", expectedCitations: [goldMinwageEnt], forbiddenSourceIds: [], expectedCoverageLevel: "partial",
  }),
  mkCase("minwage-stale-1", { question: "מהו שכר המינימום העדכני?", contextKind: "general", asOfISO: STALE }, {
    expectedStatus: "insufficient_coverage", expectedCitations: [goldMinwageEnt], forbiddenSourceIds: [], expectedCoverageLevel: "partial",
  }),
  mkCase("minwage-future-ok", { question: "מהו שכר המינימום התקף במאי 2026?", contextKind: "general", asOfISO: "2026-05-01T09:00:00+03:00" }, {
    expectedStatus: "answered", expectedCitations: [goldMinwageEnt, goldRate], forbiddenSourceIds: [], expectedCoverageLevel: "substantial",
  }),
  // D-MINWAGE — 3 negative/distractor
  mkCase("minwage-needsfacts-1", { question: "האם שולם ללקוח שכר מינימום כדין בתיק?", contextKind: "matter", factsPresent: false, asOfISO: NOW }, {
    expectedStatus: "needs_facts", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "substantial",
  }),
  mkCase("distractor-hours", { question: "כמה שעות נוספות מותר לעבוד בשבוע?", contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "out_of_scope", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "insufficient",
  }),
  mkCase("distractor-leave", { question: "כמה ימי חופשה שנתית מגיעים לעובד?", contextKind: "general", asOfISO: NOW }, {
    expectedStatus: "out_of_scope", expectedCitations: [], forbiddenSourceIds: [], expectedCoverageLevel: "insufficient",
  }),
];
