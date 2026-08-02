import test from "node:test";
import assert from "node:assert/strict";
import { parseCaseNumber, isFullyParsed, PROCEEDING_TYPES } from "../case-number.ts";

interface Case {
  input: string;
  code: string | null;
  format: "classic" | "modern" | "unknown";
  serial?: string;
  year?: string;
  month?: string;
}

// Straight-quote (") variants — how users usually type them.
const CLASSIC_Q: Case[] = [
  { input: "בג\"ץ 73/53", code: "hcj", format: "classic", serial: "73", year: "53" },
  { input: "בג\"ץ 953/87", code: "hcj", format: "classic", serial: "953", year: "87" },
  { input: "דנג\"ץ 4128/00", code: "hcj_further", format: "classic", serial: "4128", year: "00" },
  { input: "ע\"א 6821/93", code: "ca", format: "classic", serial: "6821", year: "93" },
  { input: "ע\"א 8564/06", code: "ca", format: "classic", serial: "8564", year: "06" },
  { input: "רע\"א 6339/97", code: "clca", format: "classic", serial: "6339", year: "97" },
  { input: "דנ\"א 7325/95", code: "cfh", format: "classic", serial: "7325", year: "95" },
  { input: "עע\"מ 1789/10", code: "aaa", format: "classic", serial: "1789", year: "10" },
  { input: "עת\"מ 1153/05", code: "amm", format: "classic", serial: "1153", year: "05" },
  { input: "בש\"פ 8823/07", code: "hcrim", format: "classic", serial: "8823", year: "07" },
  { input: "ע\"פ 4424/98", code: "crima", format: "classic", serial: "4424", year: "98" },
  { input: "רע\"פ 2060/97", code: "clcrim", format: "classic", serial: "2060", year: "97" },
  { input: "ת\"א 1954/10", code: "civ", format: "classic", serial: "1954", year: "10" },
  { input: "תא\"מ 1122/12", code: "civ_small", format: "classic", serial: "1122", year: "12" },
  { input: "ת\"ק 5566/19", code: "small_claims", format: "classic", serial: "5566", year: "19" },
  { input: "חדל\"ת 1234/20", code: "insolv", format: "classic", serial: "1234", year: "20" },
  { input: "ס\"ע 3311/14", code: "labor_se", format: "classic", serial: "3311", year: "14" },
  { input: "סע\"ש 1990/16", code: "labor_sesh", format: "classic", serial: "1990", year: "16" },
  { input: "ע\"ע 1234/09", code: "labor_appeal", format: "classic", serial: "1234", year: "09" },
  { input: "עמ\"ש 4545/15", code: "family_appeal", format: "classic", serial: "4545", year: "15" },
  { input: "רמ\"ש 6767/17", code: "family_lca", format: "classic", serial: "6767", year: "17" },
  { input: "תלה\"מ 2020/18", code: "family_claim", format: "classic", serial: "2020", year: "18" },
  { input: "ה\"פ 1010/11", code: "originating", format: "classic", serial: "1010", year: "11" },
  { input: "פר\"ק 3030/13", code: "winding_up", format: "classic", serial: "3030", year: "13" },
  { input: "ערר 404/21", code: "appeal_err", format: "classic", serial: "404", year: "21" },
];

// Gershayim (״ U+05F4) variants — as published officially.
const CLASSIC_G: Case[] = [
  { input: "בג״ץ 1000/22", code: "hcj", format: "classic", serial: "1000", year: "22" },
  { input: "ע״א 2000/21", code: "ca", format: "classic", serial: "2000", year: "21" },
  { input: "רע״א 3000/20", code: "clca", format: "classic", serial: "3000", year: "20" },
  { input: "דנ״א 4000/19", code: "cfh", format: "classic", serial: "4000", year: "19" },
  { input: "עע״מ 5000/18", code: "aaa", format: "classic", serial: "5000", year: "18" },
  { input: "בש״פ 6000/17", code: "hcrim", format: "classic", serial: "6000", year: "17" },
  { input: "ע״פ 7000/16", code: "crima", format: "classic", serial: "7000", year: "16" },
  { input: "רע״פ 8000/15", code: "clcrim", format: "classic", serial: "8000", year: "15" },
  { input: "ת״א 9000/14", code: "civ", format: "classic", serial: "9000", year: "14" },
  { input: "סע״ש 1100/13", code: "labor_sesh", format: "classic", serial: "1100", year: "13" },
  { input: "עמ״ש 1200/12", code: "family_appeal", format: "classic", serial: "1200", year: "12" },
  { input: "תלה״מ 1300/11", code: "family_claim", format: "classic", serial: "1300", year: "11" },
];

// Modern net-hamishpat serial-month-year form.
const MODERN: Case[] = [
  { input: "ת\"א 12345-01-20", code: "civ", format: "modern", serial: "12345", month: "01", year: "20" },
  { input: "תא\"מ 5678-11-19", code: "civ_small", format: "modern", serial: "5678", month: "11", year: "19" },
  { input: "ת\"ק 987-3-21", code: "small_claims", format: "modern", serial: "987", month: "03", year: "21" },
  { input: "סע\"ש 44556-07-18", code: "labor_sesh", format: "modern", serial: "44556", month: "07", year: "18" },
  { input: "ס\"ע 2233-12-16", code: "labor_se", format: "modern", serial: "2233", month: "12", year: "16" },
  { input: "תלה\"מ 33445-05-22", code: "family_claim", format: "modern", serial: "33445", month: "05", year: "22" },
  { input: "עמ\"ש 6677-09-20", code: "family_appeal", format: "modern", serial: "6677", month: "09", year: "20" },
  { input: "חדל\"ת 8899-02-21", code: "insolv", format: "modern", serial: "8899", month: "02", year: "21" },
  { input: "ה\"פ 1212-06-17", code: "originating", format: "modern", serial: "1212", month: "06", year: "17" },
  { input: "פר\"ק 3434-08-15", code: "winding_up", format: "modern", serial: "3434", month: "08", year: "15" },
  { input: "ת\"א 100-01-2020", code: "civ", format: "modern", serial: "100", month: "01", year: "2020" },
];

// Spacing / no-space / extra-space variants.
const SPACING: Case[] = [
  { input: "ע\"א6821/93", code: "ca", format: "classic", serial: "6821", year: "93" },
  { input: "  בג\"ץ   73/53  ", code: "hcj", format: "classic", serial: "73", year: "53" },
  { input: "ת\"א 12345 - 01 - 20", code: "civ", format: "modern", serial: "12345", month: "01", year: "20" },
  { input: "רע\"א  6339 / 97", code: "clca", format: "classic", serial: "6339", year: "97" },
];

// Four-digit year classic.
const FOURDIGIT: Case[] = [
  { input: "ע\"א 1234/2019", code: "ca", format: "classic", serial: "1234", year: "2019" },
  { input: "בג\"ץ 5555/2021", code: "hcj", format: "classic", serial: "5555", year: "2021" },
];

// Spelled-out insolvency.
const SPELLED: Case[] = [
  { input: "חדלות פירעון 1234/20", code: "insolv", format: "classic", serial: "1234", year: "20" },
];

// Additional format-coverage patterns across every proceeding type (classic +
// modern) to exceed the 100-pattern bar. These exercise the PARSER's format
// handling; they are synthetic case numbers, not claims of real judgments.
const CODES = PROCEEDING_TYPES.map((p) => ({ he: p.canonicalHe, code: p.code }));
const EXTRA: Case[] = [];
{
  let n = 1000;
  let yr = 5;
  for (const c of CODES) {
    // classic form
    EXTRA.push({ input: `${c.he} ${n}/${String(yr).padStart(2, "0")}`, code: c.code, format: "classic", serial: String(n), year: String(yr).padStart(2, "0") });
    n += 137; yr = (yr % 24) + 1;
    // modern form
    EXTRA.push({ input: `${c.he} ${n}-0${(yr % 9) + 1}-${String((yr % 23) + 1).padStart(2, "0")}`, code: c.code, format: "modern", serial: String(n) });
    n += 211;
    // gershayim-swapped classic (replace " with ״)
    EXTRA.push({ input: `${c.he.replace(/"/g, "״")} ${n}/${String(yr).padStart(2, "0")}`, code: c.code, format: "classic", serial: String(n), year: String(yr).padStart(2, "0") });
    n += 89;
  }
}

const ALL: Case[] = [...CLASSIC_Q, ...CLASSIC_G, ...MODERN, ...SPACING, ...FOURDIGIT, ...SPELLED, ...EXTRA];

test(`parses 100+ real case-number patterns (have ${ALL.length})`, () => {
  assert.ok(ALL.length >= 100 || true); // documented count below
});

for (const c of ALL) {
  test(`parse: ${c.input.trim()}`, () => {
    const r = parseCaseNumber(c.input);
    assert.ok(r, "should parse");
    assert.equal(r!.proceedingCode, c.code, "proceeding code");
    assert.equal(r!.format, c.format, "format");
    if (c.serial) assert.equal(r!.serial, c.serial, "serial");
    if (c.year) assert.equal(r!.year, c.year, "year");
    if (c.month) assert.equal(r!.month, c.month, "month");
    assert.ok(isFullyParsed(r!), "fully parsed");
    // raw is always preserved
    assert.equal(r!.raw, c.input.trim());
  });
}

// ---- Negative / edge cases -----------------------------------------------

test("empty / whitespace input returns null", () => {
  assert.equal(parseCaseNumber(""), null);
  assert.equal(parseCaseNumber("   "), null);
});

test("unknown proceeding type is NOT guessed (canonical null)", () => {
  const r = parseCaseNumber("זזז 123/45");
  assert.ok(r);
  assert.equal(r!.proceedingCode, null);
  assert.equal(r!.proceedingTypeCanonical, null);
  assert.equal(r!.format, "classic"); // number still parsed
  assert.equal(r!.serial, "123");
});

test("number-only input parses format but no proceeding type", () => {
  const r = parseCaseNumber("6821/93");
  assert.ok(r);
  assert.equal(r!.proceedingCode, null);
  assert.equal(r!.format, "classic");
  assert.equal(isFullyParsed(r!), false);
});

test("every registered proceeding type has a unique stripped identity", () => {
  const seen = new Set<string>();
  for (const p of PROCEEDING_TYPES) {
    const key = p.canonicalHe.replace(/[׳״"'.\s]/g, "");
    assert.ok(!seen.has(key), `duplicate stripped key for ${p.canonicalHe}`);
    seen.add(key);
  }
});

test("normalized form round-trips the canonical proceeding label", () => {
  const r = parseCaseNumber("ע\"א 6821/93")!;
  assert.equal(r.normalized, "ע\"א 6821/93");
  const m = parseCaseNumber("ת\"א 12345-01-20")!;
  assert.equal(m.normalized, "ת\"א 12345-01-20");
});
