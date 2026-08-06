/**
 * Tests for the Hebrew legislation section parser + legal chunker.
 * Fixture is authentic Israeli statutory STRUCTURE (public domain under §6),
 * exercising: law title, chapters (פרק), sections (סעיף incl. inserted 1א),
 * inline headings, definitions, subsections (א)(ב), cross-references, schedule
 * (תוספת), source spans, content hashes, and heading-path-preserving chunks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLegislation } from "../section-parser.ts";
import { chunkLaw } from "../section-chunker.ts";
import { normalizeHebrewLegalText } from "../../../parser/hebrew-normalize.ts";

const LAW = `חוק הגנת הדוגמה, התשפ"ה-2025

פרק א': פרשנות

1. מטרה
מטרתו של חוק זה להגן על עניין ציבורי חשוב ולקבוע הוראות בעניין זה.

2. הגדרות.
בחוק זה -
(א) "אדם" - יחיד או תאגיד;
(ב) "רשות" - רשות מוסמכת שמונתה לפי סעיף 5.

1א. תחולה
חוק זה יחול על כל אדם כהגדרתו בסעיף 2.

פרק ב': סמכויות

5. מינוי רשות
השר ימנה רשות מוסמכת לביצוע חוק זה, בהתאם להוראות פרק זה.

6. הוראות מעבר
הוראות חוק זה יחולו גם על עניין שהיה תלוי ועומד ערב תחילתו.

תוספת ראשונה
פירוט העניינים לפי סעיף 5.
`;

const norm = normalizeHebrewLegalText(LAW).normalizedText;

test("parses law title + Hebrew year", () => {
  const law = parseLegislation(norm);
  assert.ok(law.lawTitle && law.lawTitle.includes("חוק הגנת הדוגמה"));
  assert.equal(law.hebrewYear, "התשפ\"ה-2025");
});

test("extracts all sections including inserted 1א, in order", () => {
  const law = parseLegislation(norm);
  const nums = law.sections.map((s) => s.sectionNumber);
  assert.deepEqual(nums, ["1", "2", "1א", "5", "6"]);
  // ordinals are 0-based and monotonic
  assert.deepEqual(law.sections.map((s) => s.ordinal), [0, 1, 2, 3, 4]);
});

test("captures hierarchy (chapter path) per section", () => {
  const law = parseLegislation(norm);
  const s5 = law.sections.find((s) => s.sectionNumber === "5")!;
  assert.ok(s5.headingPath.some((h) => h.kind === "chapter" && h.heading.includes("סמכויות")));
});

test("classifies definitions / transitional sections", () => {
  const law = parseLegislation(norm);
  assert.equal(law.sections.find((s) => s.sectionNumber === "2")!.sectionType, "definitions");
  assert.equal(law.sections.find((s) => s.sectionNumber === "6")!.sectionType, "transitional");
});

test("splits subsections (א)(ב) inside the definitions section", () => {
  const law = parseLegislation(norm);
  const defs = law.sections.find((s) => s.sectionNumber === "2")!;
  assert.equal(defs.subsections.length, 2);
  assert.equal(defs.subsections[0].marker, "(א)");
  assert.ok(defs.subsections[1].text.includes("רשות מוסמכת"));
});

test("extracts cross-references to other sections", () => {
  const law = parseLegislation(norm);
  const s1a = law.sections.find((s) => s.sectionNumber === "1א")!;
  assert.ok(s1a.references.some((r) => r.includes("סעיף 2")));
});

test("each section has a non-empty source span and content hash", () => {
  const law = parseLegislation(norm);
  for (const s of law.sections) {
    assert.ok(s.sourceSpan.end > s.sourceSpan.start, `span for ${s.sectionNumber}`);
    assert.equal(s.contentHash.length, 64);
  }
});

test("detects the schedule (תוספת)", () => {
  const law = parseLegislation(norm);
  assert.equal(law.scheduleCount, 1);
});

test("chunker preserves heading path + section number, never empties", () => {
  const law = parseLegislation(norm);
  const chunks = chunkLaw(law, {
    maxChars: 1200, lawId: "Law:knesset_law_id:demo", documentVersionId: "dv1",
    sectionId: (s) => `Section:demo:${s.sectionNumber}`,
  });
  assert.ok(chunks.length >= law.sections.length);
  for (const c of chunks) {
    assert.ok(c.text.includes("חוק הגנת הדוגמה"), "law title in chunk");
    assert.ok(c.text.includes(`סעיף ${c.sectionNumber}`), "section number in chunk");
    assert.ok(c.tokenCount > 0 && c.contentHash.length === 64);
  }
});

test("idempotent: same text → same section hashes (re-parse stable)", () => {
  const a = parseLegislation(norm).sections.map((s) => s.contentHash);
  const b = parseLegislation(norm).sections.map((s) => s.contentHash);
  assert.deepEqual(a, b);
});
