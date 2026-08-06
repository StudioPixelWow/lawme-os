/**
 * Amendment-operation parser (current Epic, Track A).
 *
 * Israeli amending laws are written in a highly formulaic register ("בסעיף 4,
 * במקום ... יבוא ...", "אחרי סעיף 7 יבוא", "סעיף 9 — בטל"). This parser turns
 * that text into a list of structured mutation ASSERTIONS — it does NOT compute
 * a semantic diff and there is NO LLM in the loop. Each assertion carries the
 * literal evidence span, a confidence, and a status:
 *
 *   parsed       — a supported operation with a resolved target section;
 *   needs_review — operation recognized but target/content ambiguous;
 *   unsupported  — amendment text present but no supported pattern matched.
 *
 * The output feeds `modifies`→Section edges ONLY where a target section is
 * resolved with textual evidence; nothing here fabricates consolidated text.
 */

export type OperationType =
  | "modified_section"
  | "replaced_section"
  | "added_section"
  | "deleted_section"
  | "term_change"
  | "commencement"
  | "transitional";

export type OperationStatus = "parsed" | "needs_review" | "unsupported";

export interface AmendmentOperation {
  opType: OperationType;
  targetSection: string | null; // resolved section number, when present
  status: OperationStatus;
  confidence: number; // 0..1
  evidence: string; // the literal matched clause (trimmed)
  sourceSpan: { start: number; end: number };
}

/** Hebrew section reference: "סעיף 4", "סעיף 4א", "סעיפים 4 עד 7". */
const SECTION_REF = /סעיף(?:ים)?\s+(\d+[א-ת]{0,3})/;

interface Rule {
  opType: OperationType;
  // A test regex that decides the operation type, and how confident we are.
  test: RegExp;
  confidence: number;
  requiresSection: boolean;
}

// Order matters: more specific operations are tested before generic "modify".
const RULES: readonly Rule[] = [
  { opType: "added_section", test: /אחרי\s+סעיף\s+\d+[א-ת]{0,3}\s+יבוא|יתווס[ףפ]|הוספת\s+סעיף|יבוא\s+סעיף/, confidence: 0.85, requiresSection: false },
  { opType: "deleted_section", test: /—\s*בטל|-\s*בטל|יימחק|יימחקו|בטל(?:ים)?\.?$|ביטול\s+סעיף/, confidence: 0.85, requiresSection: false },
  { opType: "replaced_section", test: /במקום\s+סעיף\s+\d+[א-ת]{0,3}\s+יבוא|יבוא\s+במקומו|במקום[^,]{0,40}יבוא/, confidence: 0.75, requiresSection: false },
  { opType: "term_change", test: /בהגדרת|בהגדרה|במקום\s+ההגדרה|הגדרת\s+"/, confidence: 0.7, requiresSection: false },
  { opType: "commencement", test: /תחילת[וה]?\s+של\s+חוק|תחילתו\s+של\s+תיקון|יום\s+התחילה|תחילת[וה]/, confidence: 0.8, requiresSection: false },
  { opType: "transitional", test: /הורא(?:ה|ות)\s+מעבר|הוראת\s+שעה|הוראות\s+מעבר/, confidence: 0.8, requiresSection: false },
  { opType: "modified_section", test: /בסעיף\s+\d+[א-ת]{0,3}|תיקון\s+סעיף/, confidence: 0.6, requiresSection: true },
];

/** Split amendment text into clause-like units for per-operation scanning. */
function splitClauses(text: string): { text: string; start: number }[] {
  const units: { text: string; start: number }[] = [];
  const re = /[^;\n]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0].trim();
    if (t.length > 0) units.push({ text: t, start: m.index });
  }
  return units;
}

function resolveSection(clause: string): string | null {
  const m = SECTION_REF.exec(clause);
  return m ? m[1] : null;
}

/**
 * Parse amendment text into a list of operation assertions. Every clause yields
 * at most one operation; a clause matching no rule becomes an `unsupported`
 * assertion so nothing is silently dropped.
 */
export function parseAmendmentOperations(text: string): AmendmentOperation[] {
  const src = text.normalize("NFC");
  const clauses = splitClauses(src);
  const ops: AmendmentOperation[] = [];

  for (const clause of clauses) {
    const c = clause.text;
    let matched = false;
    for (const rule of RULES) {
      if (!rule.test.test(c)) continue;
      matched = true;
      const target = resolveSection(c);
      let status: OperationStatus = "parsed";
      let confidence = rule.confidence;
      if (rule.requiresSection && target === null) {
        status = "needs_review";
        confidence = Math.min(confidence, 0.4);
      } else if (
        (rule.opType === "added_section" ||
          rule.opType === "deleted_section" ||
          rule.opType === "replaced_section" ||
          rule.opType === "modified_section") &&
        target === null
      ) {
        // A structural op with no resolvable target needs a human look.
        status = "needs_review";
        confidence = Math.min(confidence, 0.45);
      }
      ops.push({
        opType: rule.opType,
        targetSection: target,
        status,
        confidence: Number(confidence.toFixed(2)),
        evidence: c.length > 240 ? `${c.slice(0, 237)}...` : c,
        sourceSpan: { start: clause.start, end: clause.start + clause.text.length },
      });
      break; // one operation per clause
    }
    if (!matched && /סעיף|החלפ|תוספת|יבוא|במקום/.test(c)) {
      // Amendment-shaped clause we could not classify — flag, don't drop.
      ops.push({
        opType: "modified_section",
        targetSection: resolveSection(c),
        status: "unsupported",
        confidence: 0.2,
        evidence: c.length > 240 ? `${c.slice(0, 237)}...` : c,
        sourceSpan: { start: clause.start, end: clause.start + clause.text.length },
      });
    }
  }
  return ops;
}

export interface AmendmentParseSummary {
  total: number;
  parsed: number;
  needsReview: number;
  unsupported: number;
  byType: Record<OperationType, number>;
}

export function summarizeOperations(ops: readonly AmendmentOperation[]): AmendmentParseSummary {
  const byType = {
    modified_section: 0,
    replaced_section: 0,
    added_section: 0,
    deleted_section: 0,
    term_change: 0,
    commencement: 0,
    transitional: 0,
  } as Record<OperationType, number>;
  let parsed = 0,
    needsReview = 0,
    unsupported = 0;
  for (const op of ops) {
    byType[op.opType] += 1;
    if (op.status === "parsed") parsed += 1;
    else if (op.status === "needs_review") needsReview += 1;
    else unsupported += 1;
  }
  return { total: ops.length, parsed, needsReview, unsupported, byType };
}
