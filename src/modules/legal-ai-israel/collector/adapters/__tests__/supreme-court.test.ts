import test from "node:test";
import assert from "node:assert/strict";
import {
  SupremeCourtCollector, createSupremeCourtDiscoveryCollector,
  parseVerdictRefs, buildSearchBody, isBlockPage, SupremeCourtBlockedError,
} from "../supreme-court.ts";
import type { SupremeHttp } from "../supreme-court.ts";
import { CollectorDisabledError } from "../../base.ts";

// Real-format results HTML (two judgments, each with type 2/4/5 links).
const RESULTS_HTML = `
<div class="results">
 <a href="Home/Download?path=NetVerdicts/2026/7/15/2025-8-25914-3-1&fileName=1544972e5e8b44c988e1d4ef8d368223&type=4">PDF</a>
 <a href="Home/Download?path=NetVerdicts/2026/7/15/2025-8-25914-3-1&fileName=1544972e5e8b44c988e1d4ef8d368223&type=5">WORD</a>
 <a href="Home/Download?path=NetVerdicts/2026/7/15/2025-8-25914-3-1&fileName=1544972e5e8b44c988e1d4ef8d368223&type=2">HTML</a>
 <a href="Home/Download?path=NetVerdicts/2026/7/9/2025-12-70752-3-1&fileName=69f2f2752d8446a2b1221efef2f37598&type=4">PDF</a>
 <a href="Home/Download?path=NetVerdicts/2026/7/9/2025-12-70752-3-1&fileName=69f2f2752d8446a2b1221efef2f37598&type=2">HTML</a>
</div>`;

function mockHttp(over: Partial<SupremeHttp> = {}): SupremeHttp {
  return {
    async postForHtml() { return { status: 200, text: RESULTS_HTML }; },
    async getBytes() { return { bytes: new TextEncoder().encode("<html>פסק דין</html>"), contentType: "text/html" }; },
    ...over,
  };
}

test("buildSearchBody sets the date window + empty search", () => {
  const b = buildSearchBody("2026-07-01T00:00:00.000Z", "2026-07-31T00:00:00.000Z") as { document: Record<string, unknown> };
  assert.equal(b.document.PublishFrom, "2026-07-01T00:00:00.000Z");
  assert.equal(b.document.dateType, 1);
  assert.deepEqual(b.document.SearchText, []);
});

test("parseVerdictRefs extracts unique refs via the type=2 link", () => {
  const refs = parseVerdictRefs(RESULTS_HTML);
  assert.equal(refs.length, 2); // two judgments, deduped across the 2/4/5 links
  assert.equal(refs[0].path, "NetVerdicts/2026/7/15/2025-8-25914-3-1");
  assert.equal(refs[0].fileName, "1544972e5e8b44c988e1d4ef8d368223");
});

test("audit: SearchVerdicts 200 → LIMITED_GO apparently_allowed", async () => {
  const a = await createSupremeCourtDiscoveryCollector(mockHttp()).audit();
  assert.equal(a.decision, "LIMITED_GO");
  assert.equal(a.requiresLogin, false);
  assert.equal(a.hasCaptcha, false);
});

test("audit: non-200 → NO_GO", async () => {
  const a = await createSupremeCourtDiscoveryCollector(mockHttp({ async postForHtml() { return { status: 403, text: "" }; } })).audit();
  assert.equal(a.decision, "NO_GO");
});

test("discover(window) returns items pointing at the HTML download url", async () => {
  const c = createSupremeCourtDiscoveryCollector(mockHttp());
  const b = await c.discover("2026-07-01T00:00:00.000Z|2026-07-31T00:00:00.000Z");
  assert.equal(b.items.length, 2);
  assert.ok(b.items[0].url.includes("type=2"));
  assert.ok(b.items[0].url.includes("Home/Download"));
  assert.equal(b.items[0].courtName, "בית המשפט העליון");
});

test("discover without a date window throws (never invents a range)", async () => {
  await assert.rejects(() => createSupremeCourtDiscoveryCollector(mockHttp()).discover(), /date-window/);
});

test("download fetches the HTML text layer + hashes it", async () => {
  const c = createSupremeCourtDiscoveryCollector(mockHttp());
  const items = (await c.discover("2026-07-01T00:00:00.000Z|2026-07-31T00:00:00.000Z")).items;
  const d = await c.download(items[0]);
  assert.equal(d.mimeType, "text/html");
  assert.ok(d.sha256.length === 64);
  assert.ok(d.sourceUrl.includes("type=2"));
});

test("discovery_only mode blocks downloads", async () => {
  const c = new SupremeCourtCollector({ code: "supreme_court", mode: "discovery_only", enabled: true }, mockHttp());
  await assert.rejects(() => c.download({ externalId: "p|f", url: "x", caseNumberRaw: null, courtName: null, proceedingType: null, decisionDate: null }), CollectorDisabledError);
});

const BLOCK_HTML = "<HTML><HEAD><TITLE>חסימת בקשה לא מורשית</TITLE></HEAD><BODY>הבקשה נחסמה</BODY></HTML>";

test("isBlockPage detects the anti-bot block page", () => {
  assert.equal(isBlockPage(BLOCK_HTML), true);
  assert.equal(isBlockPage(RESULTS_HTML), false);
});

test("audit: anti-bot block page → NO_GO / prohibited (never treated as success)", async () => {
  const c = createSupremeCourtDiscoveryCollector(mockHttp({ async postForHtml() { return { status: 200, text: BLOCK_HTML }; } }));
  const a = await c.audit();
  assert.equal(a.decision, "NO_GO");
  assert.equal(a.automatedAccessStatus, "prohibited");
  assert.equal(a.hasPublicApi, false);
});

test("discover: block page throws SupremeCourtBlockedError (not a silent 0)", async () => {
  const c = createSupremeCourtDiscoveryCollector(mockHttp({ async postForHtml() { return { status: 200, text: BLOCK_HTML }; } }));
  await assert.rejects(() => c.discover("2026-07-01T00:00:00.000Z|2026-07-31T00:00:00.000Z"), SupremeCourtBlockedError);
});

test("disabled collector cannot discover", async () => {
  const c = new SupremeCourtCollector({ code: "supreme_court", mode: "disabled", enabled: false }, mockHttp());
  await assert.rejects(() => c.discover("a|b"), CollectorDisabledError);
});
