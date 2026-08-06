/**
 * Tests for the rule-based amendment-operation parser (no LLM diff).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmendmentOperations, summarizeOperations } from "../amendment-operations.ts";

test("parses a replace-in-section operation with target", () => {
  const ops = parseAmendmentOperations('בסעיף 4 לחוק העיקרי, במקום "שלושים" יבוא "ארבעים"');
  const op = ops[0];
  assert.equal(op.opType, "replaced_section");
  assert.equal(op.targetSection, "4");
  assert.equal(op.status, "parsed");
  assert.ok(op.confidence > 0.5);
});

test("parses added / deleted / commencement / transitional operations", () => {
  const added = parseAmendmentOperations("אחרי סעיף 7 יבוא סעיף 7א");
  assert.equal(added[0].opType, "added_section");
  assert.equal(added[0].targetSection, "7");

  const deleted = parseAmendmentOperations("סעיף 9 — בטל");
  assert.equal(deleted[0].opType, "deleted_section");
  assert.equal(deleted[0].targetSection, "9");

  const commence = parseAmendmentOperations("תחילתו של חוק זה ביום פרסומו");
  assert.equal(commence[0].opType, "commencement");

  const trans = parseAmendmentOperations("הוראות מעבר: הוראות אלה יחולו על עניין תלוי ועומד");
  assert.equal(trans[0].opType, "transitional");
});

test("term change is detected", () => {
  const ops = parseAmendmentOperations('בהגדרת "אדם", במקום "יחיד" יבוא "אדם פרטי"');
  assert.ok(ops.some((o) => o.opType === "term_change" || o.opType === "replaced_section"));
});

test("modify-without-target is flagged needs_review", () => {
  const ops = parseAmendmentOperations("תיקון סעיף באופן כללי ללא מספר");
  assert.equal(ops[0].status, "needs_review");
  assert.ok(ops[0].confidence <= 0.45);
});

test("amendment-shaped but unclassifiable text is unsupported, not dropped", () => {
  const ops = parseAmendmentOperations("בתוספת השנייה יבוא שינוי מערכתי מורכב");
  assert.equal(ops[0].status, "unsupported");
});

test("summarize counts by type and status", () => {
  const ops = parseAmendmentOperations(
    'בסעיף 4, במקום "א" יבוא "ב"; אחרי סעיף 5 יבוא סעיף 5א; סעיף 6 — בטל',
  );
  const s = summarizeOperations(ops);
  assert.equal(s.total, ops.length);
  assert.equal(s.parsed + s.needsReview + s.unsupported, s.total);
  assert.ok(s.byType.replaced_section >= 1);
});
