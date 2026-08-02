import test from "node:test";
import assert from "node:assert/strict";
import { DataGovIlCollector, createDataGovIlDiscoveryCollector } from "../data-gov-il.ts";
import type { CkanHttp } from "../data-gov-il.ts";
import { CollectorDisabledError } from "../../base.ts";

function mockHttp(over: Partial<CkanHttp> = {}): CkanHttp {
  return {
    async json(url) {
      if (url.includes("status_show")) return { success: true, result: {} };
      if (url.includes("package_search")) {
        const start = Number(new URL(url).searchParams.get("start") ?? "0");
        return {
          success: true,
          result: {
            count: 40,
            results: [
              { id: `ds-${start}`, name: `dataset-${start}`, title: "מאגר משפטי לדוגמה",
                notes: "תיאור", license_title: "אחר (פתוח)", license_id: "other-open",
                resources: [{ id: "r1", url: "https://data.gov.il/resource/r1.csv", format: "CSV", name: "data" }],
                metadata_modified: "2026-01-15T00:00:00" },
            ],
          },
        };
      }
      if (url.includes("package_show")) {
        return { success: true, result: {
          id: "ds-0", name: "dataset-0", title: "מאגר", notes: "", license_title: "אחר (פתוח)", license_id: "other-open",
          resources: [{ id: "r1", url: "https://data.gov.il/resource/r1.csv", format: "CSV", name: "data" }],
          metadata_modified: "2026-01-15T00:00:00" } };
      }
      return { success: false };
    },
    async bytes() { return { bytes: new TextEncoder().encode("col1,col2\n1,2\n"), contentType: "text/csv" }; },
    ...over,
  };
}

test("audit: CKAN status success → LIMITED_GO / apparently_allowed", async () => {
  const c = createDataGovIlDiscoveryCollector(mockHttp());
  const a = await c.audit();
  assert.equal(a.decision, "LIMITED_GO");
  assert.equal(a.hasPublicApi, true);
  assert.equal(a.apiKind, "ckan");
});

test("audit: API failure → NO_GO", async () => {
  const c = createDataGovIlDiscoveryCollector(mockHttp({ async json() { throw new Error("network"); } }));
  const a = await c.audit();
  assert.equal(a.decision, "NO_GO");
});

test("discover: maps datasets to items with pagination cursor", async () => {
  const c = createDataGovIlDiscoveryCollector(mockHttp());
  const b1 = await c.discover();
  assert.equal(b1.items.length, 1);
  assert.equal(b1.items[0].externalId, "ds-0");
  assert.equal(b1.nextCursor, "25"); // 0+25 < 40
  const b2 = await c.discover(b1.nextCursor!);
  assert.equal(b2.nextCursor, null); // 25+25 >= 40
});

test("discovery_only mode permits discover but BLOCKS download", async () => {
  const c = createDataGovIlDiscoveryCollector(mockHttp());
  await c.discover(); // allowed
  await assert.rejects(() => c.download({ externalId: "ds-0", url: "x", caseNumberRaw: null, courtName: null, proceedingType: null, decisionDate: null }), CollectorDisabledError);
});

test("official_feed mode downloads a resource with hash", async () => {
  const c = new DataGovIlCollector({ code: "data_gov_il", mode: "official_feed", enabled: true }, mockHttp());
  const d = await c.download({ externalId: "ds-0", url: "x", caseNumberRaw: null, courtName: null, proceedingType: null, decisionDate: null });
  assert.equal(d.mimeType, "text/csv");
  assert.ok(d.sha256.length === 64);
  assert.ok(d.sourceUrl.endsWith(".csv"));
});

test("normalizeMetadata: open license → publicationAllowed true, not corpus-eligible", async () => {
  const c = createDataGovIlDiscoveryCollector(mockHttp());
  const meta = await c.fetchMetadata({ externalId: "ds-0", url: "x", caseNumberRaw: null, courtName: null, proceedingType: null, decisionDate: null });
  const n = await c.normalizeMetadata(meta);
  assert.equal(n.publicationAllowed, true);
  assert.equal(n.eligibleForPublicCorpus, false); // datasets enter as discovery
  assert.equal(n.documentType, "other");
});

test("disabled collector cannot discover", async () => {
  const c = new DataGovIlCollector({ code: "data_gov_il", mode: "disabled", enabled: false }, mockHttp());
  await assert.rejects(() => c.discover(), CollectorDisabledError);
});
