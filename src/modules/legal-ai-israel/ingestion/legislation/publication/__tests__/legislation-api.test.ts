/**
 * Tests for the Zod-validated GetLegislationLawItem client + WCF-XML parser,
 * driven by a real (minimized) captured fixture for IsraelLawID 2001008.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWcfXml } from "../wcf-xml.ts";
import {
  assertItemId,
  legislationLawItemUrl,
  parseLegislationLawItemXml,
  fetchLegislationLawItem,
} from "../legislation-api.ts";
import { LAW_2001008_XML, LAW_2001008_ITEM_ID } from "../__fixtures__/law-2001008.ts";

test("wcf-xml parses nested elements, arrays and i:nil", () => {
  const doc = parseWcfXml(LAW_2001008_XML) as Record<string, Record<string, unknown>>;
  const root = doc.iLegislationLawItem;
  assert.ok(root, "root element present");
  const general = root.general as Record<string, unknown>;
  assert.equal(general.hebSubject, 'חוק מילווה חסכון, התשל"ד-1974');
  assert.equal(general.openBookUrl, null); // i:nil → null
});

test("client validates the real fixture into typed fields", () => {
  const item = parseLegislationLawItemXml(LAW_2001008_ITEM_ID, LAW_2001008_XML);
  assert.equal(item.itemId, "2001008");
  assert.equal(item.general.lawValidity, "נושן");
  assert.equal(item.general.openBookUrl, null);
  assert.equal(item.corrections.length, 3);
  assert.equal(item.secondaryCount, 1);
  const first = item.corrections[0];
  assert.equal(first.itemId, "416102");
  assert.equal(first.correctionType, "עקיף");
  assert.equal(first.publicationSeries, "ספר החוקים");
  assert.equal(first.magazineNumber, "874");
  assert.equal(first.correctionNumber, null); // empty element → null
});

test("assertItemId rejects non-numeric ids (no fuzzy resolution)", () => {
  assert.equal(assertItemId("2001008"), "2001008");
  assert.throws(() => assertItemId("חוק"));
  assert.throws(() => assertItemId("2001008; drop"));
});

test("legislationLawItemUrl builds the ItemId query", () => {
  const url = legislationLawItemUrl("2000002");
  assert.ok(url.endsWith("?ItemId=2000002"));
});

test("malformed XML throws rather than returning partial", () => {
  assert.throws(() => parseLegislationLawItemXml("1", "<iLegislationLawItem><general>"));
});

test("fetchLegislationLawItem uses the injected fetcher", async () => {
  let requested = "";
  const item = await fetchLegislationLawItem(LAW_2001008_ITEM_ID, {
    fetchRawXml: async (url) => {
      requested = url;
      return LAW_2001008_XML;
    },
  });
  assert.ok(requested.endsWith("?ItemId=2001008"));
  assert.equal(item.corrections.length, 3);
});
