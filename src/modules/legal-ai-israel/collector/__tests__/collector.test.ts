import test from "node:test";
import assert from "node:assert/strict";
import {
  BaseCollector, DisabledCollector, CollectorDisabledError,
  modeAllowsDownload, modeAllowsMetadata, modeAllowsAutomation,
} from "../base.ts";
import type { CollectorMode, DiscoveryBatch, SourceMetadata, DownloadedDocument, DiscoveredItem } from "../types.ts";

const ITEM: DiscoveredItem = { externalId: "x", url: "https://example.gov.il/d/1", caseNumberRaw: null, courtName: null, proceedingType: null, decisionDate: null };

// A test collector whose do* would "succeed" IF the guard let it through.
class TestCollector extends BaseCollector {
  async audit() {
    return {
      reachable: true, hasPublicApi: false, apiKind: "none" as const, requiresLogin: false,
      hasCaptcha: false, robotsChecked: true, robotsAllowsPath: true as const, termsChecked: true,
      automatedAccessStatus: "apparently_allowed" as const, decision: "LIMITED_GO" as const, notesHe: "",
    };
  }
  protected async doDiscover(): Promise<DiscoveryBatch> { return { items: [], nextCursor: null, windowLabel: null }; }
  protected async doFetchMetadata(): Promise<SourceMetadata> { return { raw: {} }; }
  protected async doDownload(): Promise<DownloadedDocument> {
    return { bytes: new Uint8Array(), mimeType: "text/html", sha256: "x", sourceUrl: ITEM.url };
  }
}

test("mode capability helpers are correct", () => {
  assert.equal(modeAllowsDownload("discovery_only"), false);
  assert.equal(modeAllowsDownload("public_search_pilot"), true);
  assert.equal(modeAllowsMetadata("discovery_only"), true);
  assert.equal(modeAllowsMetadata("disabled"), false);
  assert.equal(modeAllowsAutomation("manual_only"), false);
  assert.equal(modeAllowsAutomation("official_feed"), true);
});

test("disabled collector fails closed on every operation", async () => {
  const c = new DisabledCollector({ code: "x", mode: "disabled", enabled: false });
  await assert.rejects(() => c.discover(), CollectorDisabledError);
  await assert.rejects(() => c.download(ITEM), CollectorDisabledError);
  await assert.rejects(() => c.fetchMetadata(ITEM), CollectorDisabledError);
  // audit is always permitted (that is how a source becomes eligible)
  const a = await c.audit();
  assert.equal(a.decision, "NO_GO");
});

test("enabled:false blocks even a capable mode", async () => {
  const c = new TestCollector({ code: "x", mode: "official_feed", enabled: false });
  await assert.rejects(() => c.discover(), CollectorDisabledError);
  await assert.rejects(() => c.download(ITEM), CollectorDisabledError);
});

test("discovery_only permits metadata but NEVER download", async () => {
  const c = new TestCollector({ code: "x", mode: "discovery_only", enabled: true });
  const b = await c.discover();
  assert.equal(b.items.length, 0); // metadata op allowed
  await assert.rejects(() => c.download(ITEM), CollectorDisabledError); // download blocked
});

test("public_search_pilot permits both metadata and download", async () => {
  const c = new TestCollector({ code: "x", mode: "public_search_pilot", enabled: true });
  await c.discover();
  const d = await c.download(ITEM);
  assert.equal(d.mimeType, "text/html");
});

test("manual_only permits neither metadata nor download automation", async () => {
  const c = new TestCollector({ code: "x", mode: "manual_only", enabled: true });
  await assert.rejects(() => c.discover(), CollectorDisabledError);
  await assert.rejects(() => c.download(ITEM), CollectorDisabledError);
});

test("healthCheck reports mode + enabled", async () => {
  const modes: CollectorMode[] = ["disabled", "discovery_only", "official_feed"];
  for (const m of modes) {
    const h = await new DisabledCollector({ code: "x", mode: m, enabled: false }).healthCheck();
    assert.equal(h.mode, m);
    assert.equal(h.enabled, false);
  }
});
