import test from "node:test";
import assert from "node:assert/strict";
import {
  authorityClassOf,
  authorityRankOf,
  rankByAuthority,
  SOURCE_REGISTRY,
  sourcesByWorkstream,
} from "../index.ts";
import type { CanonicalSourceRecord } from "../index.ts";

function rec(over: Partial<CanonicalSourceRecord>): CanonicalSourceRecord {
  return {
    recordId: "r", sourceKey: "il-knesset-legislation-db", sourceOwner: "o", sourceUrl: null,
    acquisitionMode: "METADATA_AND_LINK", authorityTier: "binding_primary", issuingBody: null,
    instrumentNumber: null, titleHe: "t", publicationDate: null, decisionDate: null, effectiveDate: null,
    validFrom: null, validTo: null, version: null, amendmentOf: null, currentness: "unknown",
    officialStatus: "official", fullTextAvailable: false, licenseRef: null, sourceHash: null,
    ingestedAt: "x", lastCheckedAt: "x", tenantId: null, verificationStatus: "ingested_unverified",
    ...over,
  };
}

test("C1: legislation is primary authority; Supreme Court is a court decision", () => {
  assert.equal(authorityClassOf(rec({ sourceKey: "il-knesset-legislation-db" })), "primary_authority");
  assert.equal(authorityClassOf(rec({ sourceKey: "il-supreme-court" })), "court_decision");
});

test("C2: regulator guidance and academic/secondary map to their classes", () => {
  assert.equal(authorityClassOf(rec({ sourceKey: "il-boi-guidance", authorityTier: "official_regulatory" })), "public_guidance");
  assert.equal(authorityClassOf(rec({ sourceKey: "il-academic-law", authorityTier: "academic" })), "academic_source");
  assert.equal(authorityClassOf(rec({ sourceKey: "il-kolzchut", authorityTier: "discovery_material" })), "secondary_source");
});

test("C3: higher authority outranks lower (legislation > guidance > secondary)", () => {
  const leg = authorityRankOf(rec({ sourceKey: "il-knesset-legislation-db", authorityTier: "binding_primary" }));
  const guide = authorityRankOf(rec({ sourceKey: "il-boi-guidance", authorityTier: "official_regulatory" }));
  const sec = authorityRankOf(rec({ sourceKey: "il-kolzchut", authorityTier: "discovery_material" }));
  assert.ok(leg > guide, "legislation outranks guidance");
  assert.ok(guide > sec, "guidance outranks secondary");
});

test("C4: binding Supreme Court outranks a persuasive regional judgment", () => {
  const supreme = authorityRankOf(rec({ sourceKey: "il-supreme-court", authorityTier: "binding_primary" }));
  const regional = authorityRankOf(rec({ sourceKey: "il-regional-labour-courts", authorityTier: "persuasive_primary" }));
  assert.ok(supreme > regional);
});

test("C5: rankByAuthority sorts highest authority first, stable within ties", () => {
  const sorted = rankByAuthority([
    rec({ recordId: "sec", sourceKey: "il-kolzchut", authorityTier: "discovery_material" }),
    rec({ recordId: "leg", sourceKey: "il-knesset-legislation-db", authorityTier: "binding_primary" }),
    rec({ recordId: "guide", sourceKey: "il-boi-guidance", authorityTier: "official_regulatory" }),
  ]);
  assert.deepEqual(sorted.map((s) => s.recordId), ["leg", "guide", "sec"]);
});

test("C6: registry now spans academic (M) and public-secondary (L) workstreams", () => {
  assert.ok(sourcesByWorkstream("M_academic").length >= 1);
  assert.ok(sourcesByWorkstream("L_public_secondary").length >= 2);
  // still no duplicate keys after broadening
  const keys = new Set(SOURCE_REGISTRY.map((s) => s.sourceKey));
  assert.equal(keys.size, SOURCE_REGISTRY.length);
});
