/**
 * Structured answer prototype — NON-AUTONOMOUS and FULLY EXTRACTIVE.
 * Every statement is a passage extracted from a retrieved source, linked to
 * its citation. Nothing is generated freely; propositions without a
 * supporting source are NOT stated — they appear as unresolved gaps.
 * All output carries the mandatory label:
 *   "טיוטת מחקר — נדרשת בדיקת עורך דין"
 */
import type { EvidenceItem, ResearchResult } from "./engine.ts";

export const ANSWER_LABEL = "טיוטת מחקר — נדרשת בדיקת עורך דין";

export interface AnswerClaim {
  index: number;
  /** Extractive finding — verbatim passage from a source (never free text) */
  text: string;
  label: "secondary_supported" | "unverified" | "unresolved";
  citations: string[];       // formatted citations
  anchorKeys: string[];
  documentIds: string[];
}

export interface StructuredAnswer {
  label: string;                       // the mandatory draft label
  questionRestatement: string;
  keySources: Array<{ title: string; citation: string; authorityClass: string; warnings: string[] }>;
  extractiveFindings: AnswerClaim[];
  statutorySections: EvidenceItem[];
  judgments: EvidenceItem[];
  conflictingOrLimiting: EvidenceItem[];
  gaps: string[];
  suggestedNextQuestions: string[];
  warnings: string[];
}

export function buildStructuredAnswer(research: ResearchResult): StructuredAnswer {
  const evidence = research.evidence;

  const statutorySections = evidence.filter((e) => e.authorityClass === "legislation");
  const judgments = evidence.filter((e) =>
    ["supreme", "national_labor", "regional"].includes(e.authorityClass),
  );
  const conflictingOrLimiting = evidence.filter(
    (e) =>
      e.title.includes("מנוגדת") ||
      e.passage.includes("בניגוד לגישה") ||
      e.passage.includes("דעת מיעוט"),
  );

  // Extractive findings: top passages become claims, each bound to its citation.
  const claims: AnswerClaim[] = evidence.slice(0, 6).map((e, i) => ({
    index: i,
    text: e.passage,
    // Fixture corpus can NEVER exceed secondary_supported; real verified
    // primary sources are required for stronger labels (trust model).
    label: e.anchor.verificationStatus === "verified_against_fixture" ? "secondary_supported" : "unverified",
    citations: [e.citation],
    anchorKeys: [e.anchor.anchorKey],
    documentIds: [e.documentId],
  }));

  const gaps: string[] = [];
  if (statutorySections.length === 0) gaps.push("לא אותר מקור חקיקתי בקורפוס — נדרש אימות מול מאגר החקיקה הלאומי");
  if (judgments.length === 0) gaps.push("לא אותרה פסיקה רלוונטית בקורפוס הנוכחי");
  if (research.missingSourceNotice) gaps.push(research.missingSourceNotice);
  gaps.push("סטטוס תוקף (citator) טרם ממומש — אין לצטט ללא בדיקת הלכה עדכנית");

  const suggestedNextQuestions = [
    "האם קיימת פסיקה עדכנית יותר באותה סוגיה?",
    "האם חל הסכם קיבוצי או צו הרחבה על הצדדים?",
    "מהו נוסח הסעיף הרלוונטי בגרסה התקפה למועד האירוע?",
  ];

  return {
    label: ANSWER_LABEL,
    questionRestatement: research.normalizedQuery,
    keySources: evidence.map((e) => ({
      title: e.title,
      citation: e.citation,
      authorityClass: e.authorityClass,
      warnings: e.warnings,
    })),
    extractiveFindings: claims,
    statutorySections,
    judgments,
    conflictingOrLimiting,
    gaps,
    suggestedNextQuestions,
    warnings: [
      ...research.warnings,
      "כל הממצאים חילוציים (extractive) בלבד — לא נוסחה עמדה משפטית",
    ],
  };
}
