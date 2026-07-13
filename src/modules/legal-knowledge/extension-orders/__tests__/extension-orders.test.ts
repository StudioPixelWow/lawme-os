import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateApplicability } from "../applicability.ts";
import { normalizeOrderName, resolveCurrentOrder } from "../normalize.ts";
import type { ExtensionOrder } from "../types.ts";

function order(over: Partial<ExtensionOrder>): ExtensionOrder {
  return {
    orderId: "pension-mandatory", titleHe: "צו הרחבה לביטוח פנסיוני מקיף במשק",
    scope: "general", sectorHe: null, coverageHe: "פנסיה חובה", geographicScopeHe: "כלל המשק",
    employeeCategoriesHe: ["כל העובדים"], employerCategoriesHe: ["כל המעסיקים"],
    relatedCollectiveAgreementHe: null, publicationDate: "2011-01-01", effectiveDate: "2011-01-01",
    expirationDate: null, replacementOrderId: null, supersededByOrderId: null, amendments: [],
    applicabilityNotesHe: [], officialSourceUrl: "https://www.gov.il/...", publisherHe: "זרוע העבודה",
    verificationStatus: "verified", ...over,
  };
}

test("order name normalization strips 'צו הרחבה' + year", () => {
  assert.equal(
    normalizeOrderName("צו הרחבה לביטוח פנסיוני מקיף במשק, 2011"),
    normalizeOrderName("צו הרחבה לביטוח פנסיוני מקיף במשק"),
  );
});

test("general order applies in-window, verified", () => {
  const r = evaluateApplicability(order({}), { asOf: "2020-01-01" });
  assert.equal(r.applies, "yes");
  assert.equal(r.temporalOk, "yes");
  assert.equal(r.scopeOk, "yes");
});

test("sectoral order without a sector query is uncertain, limitation surfaced", () => {
  const r = evaluateApplicability(order({ scope: "sectoral", sectorHe: "בנייה" }), { asOf: "2020-01-01" });
  assert.equal(r.applies, "uncertain");
  assert.ok(r.limitationsHe.some((l) => l.includes("ענף")));
});

test("out-of-window order does not apply", () => {
  const r = evaluateApplicability(order({ effectiveDate: "2021-01-01" }), { asOf: "2019-01-01" });
  assert.equal(r.applies, "no");
});

test("unverified order is never a confident 'applies'", () => {
  const r = evaluateApplicability(order({ verificationStatus: "unverified" }), { asOf: "2020-01-01" });
  assert.notEqual(r.applies, "yes");
  assert.ok(r.limitationsHe.some((l) => l.includes("לא מאומת")));
});

test("superseded order surfaces a version limitation", () => {
  const r = evaluateApplicability(order({ supersededByOrderId: "pension-2016" }), { asOf: "2020-01-01" });
  assert.ok(r.limitationsHe.some((l) => l.includes("הוחלף")));
});

test("resolveCurrentOrder picks the single active verified order", () => {
  const old = order({ orderId: "pension-2008", supersededByOrderId: "pension-2011" });
  const cur = order({ orderId: "pension-2011" });
  const r = resolveCurrentOrder([old, cur], "2026-07-12");
  assert.equal(r.order?.orderId, "pension-2011");
});
