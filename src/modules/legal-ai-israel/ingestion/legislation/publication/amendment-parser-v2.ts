/**
 * Amendment-operation parser v2 (current Epic Track A) — hardened over v1.
 *
 * Rule-based, DETERMINISTIC, NO LLM. Runs on NORMALIZED text (see pdf-normalize)
 * and extracts richer mutation assertions with old/new text and a resolved
 * target section, over the full Epic operation set. Every assertion is an
 * assertion (confidence + status), never a fact; it never emits a mutation when
 * the target law/section is unclear (→ needs_review / ambiguous).
 *
 * Built against REAL pilot clauses, e.g.:
 *   בסעיף 3, בכל מקום, במקום "פקיד סעד" יבוא "עובד סוציאלי"   → replace_words §3
 *   במקום סעיף 14 לחוק העיקרי יבוא:                            → replace_section §14
 *   אחרי סעיף 13 ... יבוא סעיף זה:                             → add_section after §13
 *   סעיף קטן (ה) בטל                                          → delete_section (ה)
 *   במקום ההגדרה "פקיד סעד" יבוא                               → rename_term
 *   האמור בו יסומן כפסקה "(1)"                                 → renumber_section
 *   המילים "X" יימחקו                                         → delete_words
 *   אחרי המילים "X" יבוא "Y"                                   → insert_words
 *   תחילתו של חוק זה ...                                       → change_effective_date
 */

export const AMENDMENT_PARSER_VERSION = "amendops-2";

export type OperationTypeV2 =
  | "add_section"
  | "replace_section"
  | "delete_section"
  | "amend_phrase"
  | "rename_term"
  | "change_effective_date"
  | "add_schedule"
  | "replace_schedule"
  | "repeal_law"
  | "insert_words"
  | "delete_words"
  | "replace_words"
  | "renumber_section"
  | "transitional";

export type OperationStatusV2 = "parsed" | "needs_review" | "unsupported" | "ambiguous";

export interface AmendmentOperationV2 {
  operationType: OperationTypeV2;
  targetSection: string | null; // "13", "9א", "7(4)" ...
  oldText: string | null;
  newText: string | null;
  status: OperationStatusV2;
  confidence: number;
  evidence: string;
  sourceSpan: { start: number; end: number };
}

const QUOTE = '["“”״]'; // ", curly quotes, gershayim
const SECTION_REF = new RegExp(`סעיף(?:ים)?\\s+(\\d+[א-ת]{0,3})(?:\\s*\\(([^)]{1,6})\\))?`);
const SUBSECTION_ONLY = /סעיף\s+קטן\s*\(([^)]{1,6})\)/;

interface RuleV2 {
  type: OperationTypeV2;
  test: RegExp;
  confidence: number;
  /** Extract oldText/newText if the rule carries a substitution. */
  extract?: (clause: string) => { oldText: string | null; newText: string | null };
}

function subst(clause: string): { oldText: string | null; newText: string | null } {
  const m = new RegExp(`במקום\\s+${QUOTE}([^"“”״]+)${QUOTE}\\s+(?:יבוא|יקראו)\\s+${QUOTE}([^"“”״]+)${QUOTE}`).exec(clause);
  if (m) return { oldText: m[1].trim(), newText: m[2].trim() };
  return { oldText: null, newText: null };
}

// Order matters: most specific first.
const RULES: readonly RuleV2[] = [
  // whole-law repeal (a law name + בטל, not a mere section)
  { type: "repeal_law", test: /חוק\s+[^,]{2,60}\s*[-–]\s*בטל|ביטול\s+חוק/, confidence: 0.7 },
  // transitional (tested before commencement: transitional clauses often say תחילתו)
  { type: "transitional", test: /הורא(?:ה|ות|ת)\s+מעבר|הוראת\s+שעה/, confidence: 0.8 },
  // renumbering / marking
  { type: "renumber_section", test: /יסומ[ןנ]/, confidence: 0.75 },
  // schedules / addenda (commas allowed between "בתוספת" and "במקום")
  { type: "replace_schedule", test: new RegExp(`בתוספת[^\\n]{0,40}במקום[^\\n]{0,40}(?:יבוא|יקראו)`), confidence: 0.75 },
  { type: "add_schedule", test: /אחרי\s+התוספת|הוספת\s+תוספת|תוספת\s+חדשה|יבוא\s+תוספת/, confidence: 0.7 },
  // definitions / terms
  { type: "rename_term", test: new RegExp(`(?:במקום\\s+ה)?הגדר[הת]\\s+${QUOTE}|בהגדרת\\s+${QUOTE}`), confidence: 0.7, extract: subst },
  // words-level edits
  { type: "insert_words", test: new RegExp(`אחרי\\s+המיל[הים]{1,2}\\s+${QUOTE}`), confidence: 0.8, extract: subst },
  { type: "delete_words", test: new RegExp(`(?:המיל[הים]{1,2}\\s+${QUOTE}[^"“”״]+${QUOTE}\\s+)?(?:יימחק(?:ו|ים)?|תימחק)`), confidence: 0.75 },
  // section-level structural edits
  { type: "add_section", test: /אחרי\s+סעיף\s+\d+[א-ת]{0,3}[^-\n]{0,40}יבוא|הוספת\s+סעיף|יתווס[ףפ]/, confidence: 0.85 },
  { type: "replace_section", test: /במקום\s+סעיף(?:\s+קטן)?\s*(?:\d+[א-ת]{0,3}|\([^)\n]{1,6}\))[^"\n]{0,20}יבוא|החלפת\s+סעיף/, confidence: 0.8 },
  { type: "delete_section", test: /סעיף(?:\s+קטן)?\s*(?:\d+[א-ת]{0,3}|\([^)]+\))\s*[-–—]?\s*בטל|ביטול\s+סעיף/, confidence: 0.85 },
  // commencement / effective date
  { type: "change_effective_date", test: /תחילת[והו]?\s+של\s+(?:חוק|תיקון)|יום\s+התחילה|תחילת[והו]\b/, confidence: 0.8 },
  // generic in-section substitution → words replacement
  { type: "replace_words", test: new RegExp(`במקום\\s+${QUOTE}[^"“”״]+${QUOTE}\\s+(?:יבוא|יקראו)`), confidence: 0.8, extract: subst },
  // fallback: "בסעיף N ..." modification with no clearer op
  { type: "amend_phrase", test: /בסעיף\s+\d+[א-ת]{0,3}|תיקון\s+סעיף/, confidence: 0.55 },
];

function resolveTarget(clause: string): { section: string | null; subOnly: boolean } {
  const m = SECTION_REF.exec(clause);
  if (m) return { section: m[2] ? `${m[1]}(${m[2]})` : m[1], subOnly: false };
  const s = SUBSECTION_ONLY.exec(clause);
  if (s) return { section: `(${s[1]})`, subOnly: true };
  return { section: null, subOnly: false };
}

function splitClauses(text: string): { text: string; start: number }[] {
  const units: { text: string; start: number }[] = [];
  const re = /[^;\n]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0].trim();
    if (t.length > 3) units.push({ text: t, start: m.index });
  }
  return units;
}

const NEEDS_TARGET: ReadonlySet<OperationTypeV2> = new Set([
  "add_section", "replace_section", "delete_section", "amend_phrase", "renumber_section",
]);

export function parseAmendmentsV2(normalizedText: string): AmendmentOperationV2[] {
  const src = normalizedText.normalize("NFC");
  const ops: AmendmentOperationV2[] = [];
  for (const clause of splitClauses(src)) {
    const c = clause.text;
    const matches = RULES.filter((r) => r.test.test(c));
    if (matches.length === 0) {
      if (/סעיף|יבוא|במקום|יימחק|תוספת|הגדר/.test(c)) {
        ops.push({ operationType: "amend_phrase", targetSection: resolveTarget(c).section, oldText: null, newText: null, status: "unsupported", confidence: 0.2, evidence: cap(c), sourceSpan: span(clause) });
      }
      continue;
    }
    const rule = matches[0];
    const { section, subOnly } = resolveTarget(c);
    const ex = rule.extract ? rule.extract(c) : { oldText: null, newText: null };
    let status: OperationStatusV2 = "parsed";
    let confidence = rule.confidence;
    if (matches.length > 1 && matches[1].confidence >= rule.confidence - 0.05 && matches[1].type !== "amend_phrase") {
      status = "ambiguous";
      confidence = Math.min(confidence, 0.5);
    } else if (NEEDS_TARGET.has(rule.type) && section === null) {
      status = "needs_review";
      confidence = Math.min(confidence, 0.4);
    } else if (subOnly && (rule.type === "replace_words" || rule.type === "rename_term")) {
      status = "needs_review";
      confidence = Math.min(confidence, 0.5);
    } else if ((rule.type === "replace_words" || rule.type === "insert_words" || rule.type === "rename_term") && ex.oldText === null) {
      status = "needs_review";
      confidence = Math.min(confidence, 0.5);
    }
    ops.push({ operationType: rule.type, targetSection: section, oldText: ex.oldText, newText: ex.newText, status, confidence: Number(confidence.toFixed(2)), evidence: cap(c), sourceSpan: span(clause) });
  }
  return ops;
}

function cap(s: string): string {
  return s.length > 240 ? `${s.slice(0, 237)}...` : s;
}
function span(clause: { text: string; start: number }): { start: number; end: number } {
  return { start: clause.start, end: clause.start + clause.text.length };
}

export interface AmendmentSummaryV2 {
  total: number;
  parsed: number;
  needsReview: number;
  unsupported: number;
  ambiguous: number;
  byType: Partial<Record<OperationTypeV2, number>>;
}

export function summarizeV2(ops: readonly AmendmentOperationV2[]): AmendmentSummaryV2 {
  const byType: Partial<Record<OperationTypeV2, number>> = {};
  let parsed = 0, needsReview = 0, unsupported = 0, ambiguous = 0;
  for (const op of ops) {
    byType[op.operationType] = (byType[op.operationType] ?? 0) + 1;
    if (op.status === "parsed") parsed += 1;
    else if (op.status === "needs_review") needsReview += 1;
    else if (op.status === "ambiguous") ambiguous += 1;
    else unsupported += 1;
  }
  return { total: ops.length, parsed, needsReview, unsupported, ambiguous, byType };
}
