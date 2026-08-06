/**
 * Tests for pre-parse normalization + amendment parser v2 + evaluation harness.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePdfText } from "../pdf-normalize.ts";
import { parseAmendmentsV2, summarizeV2 } from "../amendment-parser-v2.ts";
import { evaluateAmendments } from "../amendment-eval.ts";
import { AMENDMENT_EVAL_SET } from "../__fixtures__/amendment-eval-set.ts";

test("normalize fixes reversed RTL parentheses", () => {
  assert.match(normalizePdfText("סעיף קטן )ה( בטל").normalizedText, /\(ה\)/);
  assert.match(normalizePdfText("בסעיף 9א)א(").normalizedText, /9א\(א\)/);
});

test("normalize inserts missing year hyphen and חוק-יסוד hyphen", () => {
  assert.match(normalizePdfText('התשי"ט1959').normalizedText, /התשי"ט-1959/);
  assert.match(normalizePdfText("בחוקיסוד: השפיטה").normalizedText, /בחוק-יסוד/);
});

test("normalize remaps the lone פ glyph and warns", () => {
  const r = normalizePdfText("שופטים פ שהם תשעה");
  assert.ok(!/\sפ\s/.test(r.normalizedText));
  assert.ok(r.warnings.some((w) => w.includes("glyph_remap")));
  assert.ok(r.confidence < 1);
});

test("normalize rejoins a mid-sentence line break but keeps structural markers", () => {
  const r = normalizePdfText("במקום המילים בסעיף\n6 לחוק יבוא");
  assert.match(r.normalizedText, /בסעיף 6 לחוק/); // rejoined
  const r2 = normalizePdfText("הוראה כללית\n1. סעיף ראשון");
  assert.match(r2.normalizedText, /\n1\. סעיף ראשון/); // NOT joined (section marker)
});

test("normalize removes repeated running heads (רשומות / ספר החוקים / page number)", () => {
  const raw = "רשומות\nספר החוקים\n16\nחוק לדוגמה\n\nרשומות\nספר החוקים\n17\nהמשך החוק";
  const r = normalizePdfText(raw);
  assert.ok(!/רשומות/.test(r.normalizedText));
  assert.ok(!/ספר החוקים/.test(r.normalizedText));
  assert.match(r.normalizedText, /חוק לדוגמה/);
});

test("normalize is versioned and deterministic", () => {
  const a = normalizePdfText("בסעיף 3, במקום \"א\" יבוא \"ב\"");
  const b = normalizePdfText("בסעיף 3, במקום \"א\" יבוא \"ב\"");
  assert.equal(a.normalizedText, b.normalizedText);
  assert.equal(a.version, "legal-normalize-1");
});

test("parser v2 extracts replace_words with old/new text and target", () => {
  const ops = parseAmendmentsV2('בסעיף 3, במקום "פקיד סעד" יבוא "עובד סוציאלי"');
  const op = ops[0];
  assert.equal(op.operationType, "replace_words");
  assert.equal(op.targetSection, "3");
  assert.equal(op.oldText, "פקיד סעד");
  assert.equal(op.newText, "עובד סוציאלי");
  assert.equal(op.status, "parsed");
});

test("parser v2 covers the structural + word + schedule + date operations", () => {
  const cases: [string, string][] = [
    ["במקום סעיף 14 לחוק העיקרי יבוא:", "replace_section"],
    ["אחרי סעיף 13 יבוא סעיף זה:", "add_section"],
    ["סעיף קטן (ה) בטל", "delete_section"],
    ['אחרי המילים "בית המשפט" יבוא "המחוזי"', "insert_words"],
    ['המילים "לפי בקשתו" יימחקו', "delete_words"],
    ['במקום ההגדרה "פקיד סעד" יבוא:', "rename_term"],
    ["האמור בו יסומן כפסקה (1)", "renumber_section"],
    ["תחילתו של חוק זה ביום פרסומו", "change_effective_date"],
    ["הוראת מעבר: הוראה זו תחול על עניין תלוי ועומד", "transitional"],
    ['בתוספת הראשונה, במקום "פרט 3" יבוא "פרט 3א"', "replace_schedule"],
  ];
  for (const [text, expected] of cases) {
    const op = parseAmendmentsV2(text).find((o) => o.status !== "unsupported");
    assert.ok(op, `no op for: ${text}`);
    assert.equal(op!.operationType, expected, `expected ${expected} for "${text}", got ${op!.operationType}`);
  }
});

test("parser v2 flags subsection-only replace as needs_review, not a false mutation", () => {
  const ops = parseAmendmentsV2("(1) במקום סעיף קטן (ב) יבוא:");
  const op = ops[0];
  assert.ok(["needs_review", "parsed"].includes(op.status));
  // never a high-confidence wrong section
  assert.ok(op.confidence <= 0.8);
});

test("summarize counts by status and type", () => {
  const ops = parseAmendmentsV2('בסעיף 4, במקום "א" יבוא "ב"\nסעיף 6 בטל\nתחילתו של חוק זה ביום פרסומו');
  const s = summarizeV2(ops);
  assert.equal(s.total, ops.length);
  assert.equal(s.parsed + s.needsReview + s.unsupported + s.ambiguous, s.total);
});

test("evaluation set meets the GO thresholds", () => {
  const m = evaluateAmendments(AMENDMENT_EVAL_SET);
  assert.ok(m.total >= 100, `eval set must have >=100 clauses, has ${m.total}`);
  assert.ok(m.precision >= 0.95, `precision ${m.precision}`);
  assert.ok(m.operationTypeAccuracy >= 0.95, `type acc ${m.operationTypeAccuracy}`);
  assert.ok(m.targetSectionAccuracy >= 0.95, `target acc ${m.targetSectionAccuracy}`);
  assert.ok(m.unsupportedRate + m.ambiguousRate <= 0.1, `unsupported+ambiguous ${m.unsupportedRate + m.ambiguousRate}`);
  assert.equal(m.highConfidenceFalseMutations, 0, "must have zero high-confidence false mutations");
});
