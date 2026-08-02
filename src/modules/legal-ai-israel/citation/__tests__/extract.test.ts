import test from "node:test";
import assert from "node:assert/strict";
import { extractCitations, distinctCitations, resolveCitations } from "../extract.ts";
import { PROCEEDING_TYPES } from "../case-number.ts";

// A representative real citation string per proceeding type (ASCII quotes).
const SAMPLE: Record<string, string> = {
  hcj: "בג\"ץ 73/53", hcj_further: "דנג\"ץ 4128/00", ca: "ע\"א 6821/93", clca: "רע\"א 6339/97",
  cfh: "דנ\"א 7325/95", aaa: "עע\"מ 1789/10", amm: "עת\"מ 1153/05", hcrim: "בש\"פ 8823/07",
  crima: "ע\"פ 4424/98", clcrim: "רע\"פ 2060/97", civ: "ת\"א 1954/10", civ_small: "תא\"מ 1122/12",
  small_claims: "ת\"ק 5566/19", insolv: "חדל\"ת 1234/20", labor_se: "ס\"ע 3311/14",
  labor_sesh: "סע\"ש 1990/16", labor_appeal: "ע\"ע 1234/09", family_appeal: "עמ\"ש 4545/15",
  family_lca: "רמ\"ש 6767/17", family_claim: "תלה\"מ 2020/18", originating: "ה\"פ 1010/11",
  winding_up: "פר\"ק 3030/13", appeal_err: "ערר 404/21",
};

const CONTEXTS: ((c: string) => string)[] = [
  (c) => `כפי שנקבע ב${c}, בית המשפט דחה את הטענה.`,
  (c) => `ראו ${c} והאסמכתאות שם.`,
  (c) => `בהתאם להלכת ${c} משנת התשע"ה.`,
  (c) => `הנתבע הפנה אל ${c} לתמיכה בעמדתו.`,
  (c) => `${c} — פסק דין מנחה בסוגיה זו.`,
  (c) => `בית המשפט העליון שב ואישר את ${c}.`,
];

let singleCount = 0;
for (const p of PROCEEDING_TYPES) {
  const cite = SAMPLE[p.code];
  for (const ctx of CONTEXTS) {
    const text = ctx(cite);
    test(`single [${p.code}] ascii: ${cite}`, () => {
      const found = extractCitations(text);
      assert.equal(found.length, 1, "one citation");
      assert.equal(found[0].normalized.proceedingCode, p.code);
    });
    singleCount += 1;
    // gershayim variant
    const g = cite.replace(/"/g, "״");
    test(`single [${p.code}] gershayim: ${g}`, () => {
      const found = extractCitations(ctx(g));
      assert.equal(found.length, 1);
      assert.equal(found[0].normalized.proceedingCode, p.code);
    });
    singleCount += 1;
  }
}

// Multiple citations in one sentence.
const MULTI: { text: string; codes: string[] }[] = [
  { text: "השוו ע\"א 6821/93 ו-רע\"א 6339/97 לעניין זה.", codes: ["ca", "clca"] },
  { text: "בבג\"ץ 73/53; בג\"ץ 953/87; ובש\"פ 8823/07 נדונה הסוגיה.", codes: ["hcj", "hcj", "hcrim"] },
  { text: "ת\"א 1954/10, ת\"א 100-01-2020 ו-תא\"מ 1122/12.", codes: ["civ", "civ", "civ_small"] },
  { text: "ראו דנ\"א 7325/95, עע\"מ 1789/10, עת\"מ 1153/05.", codes: ["cfh", "aaa", "amm"] },
  { text: "סע\"ש 1990/16 וכן ע\"ע 1234/09.", codes: ["labor_sesh", "labor_appeal"] },
];
for (const [i, m] of MULTI.entries()) {
  test(`multi #${i + 1} finds ${m.codes.length}`, () => {
    const found = extractCitations(m.text);
    assert.equal(found.length, m.codes.length);
    assert.deepEqual(found.map((f) => f.normalized.proceedingCode), m.codes);
  });
}

// Citation with party names + year.
const WITH_PARTIES = [
  "ע\"א 6821/93 בנק המזרחי המאוחד בע\"מ נ' מגדל כפר שיתופי (1995).",
  "בג\"ץ 953/87 פורז נ' ראש עיריית תל-אביב-יפו, פ\"ד מב(2) 309.",
  "רע\"א 6339/97 רוקר נ' סלומון.",
];
for (const [i, t] of WITH_PARTIES.entries()) {
  test(`with-parties #${i + 1} extracts exactly one`, () => {
    const found = extractCitations(t);
    assert.equal(found.length, 1);
  });
}

// Citations split across a line break.
const SPLIT = [
  "בהתאם ל‏ע\"א\n6821/93 שנזכר לעיל.",
  "ראו בש\"פ\n8823/07.",
  "בג\"ץ\n73/53 קבע כי...",
];
for (const [i, t] of SPLIT.entries()) {
  test(`split-line #${i + 1} still captured`, () => {
    const found = extractCitations(t);
    assert.equal(found.length, 1);
  });
}

// Modern net-hamishpat form inside text.
const MODERN_TEXT = [
  { text: "בתיק ת\"א 12345-01-20 נפסק כי...", code: "civ" },
  { text: "סע\"ש 44556-07-18 עוסק בפיטורים.", code: "labor_sesh" },
  { text: "תלה\"מ 33445-05-22 בבית המשפט לענייני משפחה.", code: "family_claim" },
];
for (const [i, t] of MODERN_TEXT.entries()) {
  test(`modern-in-text #${i + 1} [${t.code}]`, () => {
    const found = extractCitations(t.text);
    assert.equal(found.length, 1);
    assert.equal(found[0].normalized.proceedingCode, t.code);
    assert.equal(found[0].normalized.format, "modern");
  });
}

// Negatives / false positives — must find ZERO citations.
const NEGATIVE = [
  "הפגישה נקבעה ליום 12/2024 בשעה 10:00.",       // date, not a citation
  "סעיף 12 לחוק החוזים אינו רלוונטי כאן.",        // statute ref, not case
  "מספר הטלפון הוא 03-1234567.",                    // phone
  "העמוד 73/53 בספר אינו קשור.",                    // number pair without proceeding type
  "בשנת 1993 התקבלה החלטה.",                        // year only
  "המסמך כולל 250 עמודים.",                          // plain number
  "אבגד הוז 12/34 ניסיון.",                          // unknown token
];
for (const [i, t] of NEGATIVE.entries()) {
  test(`negative #${i + 1} finds none`, () => {
    assert.equal(extractCitations(t).length, 0);
  });
}

// Malformed — proceeding type but no valid number → no citation.
const MALFORMED = [
  "ע\"א ללא מספר.",
  "בג\"ץ /53",
  "ת\"א 12--20",
];
for (const [i, t] of MALFORMED.entries()) {
  test(`malformed #${i + 1} finds none`, () => {
    assert.equal(extractCitations(t).length, 0);
  });
}

// Aggregate + resolver behaviour.
test(`generated ${singleCount} single-citation cases (>=150)`, () => {
  assert.ok(singleCount >= 150, `have ${singleCount}`);
});

test("distinctCitations dedupes repeats", () => {
  const t = "ע\"א 6821/93 וכן שוב ע\"א 6821/93 ובג\"ץ 73/53.";
  assert.deepEqual(distinctCitations(t).sort(), ["בג\"ץ 73/53", "ע\"א 6821/93"].sort());
});

test("resolver links exact normalized match; leaves others unresolved", () => {
  const cites = extractCitations("ראו ע\"א 6821/93 וכן בג\"ץ 73/53.");
  const resolved = resolveCitations(cites, [{ documentId: "doc-1", caseNumberNormalized: "ע\"א 6821/93" }]);
  const ca = resolved.find((r) => r.citation.normalized.proceedingCode === "ca")!;
  const hcj = resolved.find((r) => r.citation.normalized.proceedingCode === "hcj")!;
  assert.equal(ca.citedDocumentId, "doc-1");
  assert.equal(ca.resolutionStatus, "resolved");
  assert.equal(ca.resolutionScore, 100);
  assert.equal(hcj.citedDocumentId, null);
  assert.equal(hcj.resolutionStatus, "unresolved");
});
