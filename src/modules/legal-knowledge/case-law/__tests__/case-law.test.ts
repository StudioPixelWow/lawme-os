import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPLOYMENT_CASE_LAW, EMPLOYMENT_CASE_LAW_CATALOG } from "../catalog.ts";
import { assessAuthority, rankJudgments, bindingClass, COURT_WEIGHT } from "../authority.ts";

test("catalog has 20 candidate judgments across topics, pointing to official source", () => {
  assert.equal(EMPLOYMENT_CASE_LAW.length, 20);
  for (const r of EMPLOYMENT_CASE_LAW) {
    assert.ok(r.canonicalSourceUrl.includes("court.gov.il"), `${r.id} not official pointer`);
    assert.equal(r.access, "pointer_only");
  }
});

test("NO fabricated case numbers — all unverified candidates are null/to_verify", () => {
  for (const r of EMPLOYMENT_CASE_LAW) {
    if (r.verification !== "verified_official") {
      assert.equal(r.caseNumberRaw, null, `${r.id} has an unverified case number`);
      assert.equal(r.caseNumberStatus, "to_verify");
    }
  }
});

test("unverified candidates cannot back a substantive claim (discovery-only)", () => {
  for (const r of EMPLOYMENT_CASE_LAW) {
    const a = assessAuthority(r);
    assert.equal(a.usableForClaim, false, `${r.id} usable despite unverified`);
    assert.ok(a.requiresHumanReview);
  }
});

test("authority: national labor court is binding, regional is persuasive", () => {
  assert.equal(bindingClass("national_labor"), "binding");
  assert.equal(bindingClass("regional_labor"), "persuasive");
  assert.ok(COURT_WEIGHT.national_labor > COURT_WEIGHT.regional_labor);
});

test("ranking never lets a regional ruling outrank a national one on the same topic", () => {
  const wage = EMPLOYMENT_CASE_LAW.filter((r) => r.legalTopics.includes("wage_claims"));
  const ranked = rankJudgments(wage);
  // the first regional must not precede any national on this topic
  const firstRegionalIdx = ranked.findIndex((r) => r.court === "regional_labor");
  const lastNationalIdx = ranked.map((r) => r.court).lastIndexOf("national_labor");
  if (firstRegionalIdx >= 0 && lastNationalIdx >= 0) {
    assert.ok(firstRegionalIdx > lastNationalIdx, "a regional ruling outranked a national one");
  }
});

test("currentness never asserts 'current' when later treatment is unchecked", () => {
  for (const r of EMPLOYMENT_CASE_LAW) {
    const a = assessAuthority(r);
    assert.ok(a.currentnessHe.includes("לא נבדק") || a.currentnessHe.includes("בוטלה") || a.currentnessHe.includes("צומצמה") || a.currentnessHe.includes("לא אותרה"), `${r.id} over-claims currentness`);
  }
});

test("access research documents the official source and the no-crawler stance", () => {
  const t = EMPLOYMENT_CASE_LAW_CATALOG.accessResearchHe.join(" ");
  assert.ok(t.includes("court.gov.il"));
  assert.ok(t.includes("crawler"));
  assert.ok(t.includes("סעיף 6"));
});

test("cited statutes link into the legislation pillar by refId", () => {
  const linked = EMPLOYMENT_CASE_LAW.flatMap((r) => r.citedStatutes).filter((c) => c.statuteRefId);
  assert.ok(linked.some((c) => c.statuteRefId === "E3B-LEG-007"), "expected link to women's employment law");
  assert.ok(linked.some((c) => c.statuteRefId === "E3B-LEG-001"), "expected link to severance law");
});
