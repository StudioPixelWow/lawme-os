import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, normalizedDomain, assertFetchableUrl, SsrfBlockedError } from "../url.ts";
import { parseRobots, isPathAllowed } from "../robots.ts";
import { summarizeSitemap, extractLocs, candidateSitemapUrls } from "../sitemap.ts";
import {
  discoverFeeds, discoverSearch, detectCms, interpretWpJson, interpretOpenApi,
  findPolicyLinks, extractTermsSignals,
} from "../signals.ts";
import { computeScores, classifyVerdict, metadataQualityScore } from "../scoring.ts";
import { canBuildCollector, canActivateCollector, isPermissionActive } from "../collector-gate.ts";
import { assertTransition, canTransition, IllegalStatusTransitionError } from "../status-machine.ts";
import { LegalSourceAuditEngine } from "../audit-engine.ts";
import { LegalSourceDiscoveryEngine } from "../discovery-engine.ts";
import { generateAuditReport } from "../report.ts";
import type { HttpTransport, HttpResponse } from "../transport.ts";
import type { AuditFindings, SourceRecord } from "../types.ts";

// ---- URL + SSRF -----------------------------------------------------------

test("normalizeUrl lowercases host, drops default port + trailing slash + hash", () => {
  assert.equal(normalizeUrl("HTTPS://WWW.Court.GOV.il:443/path/#x"), "https://www.court.gov.il/path");
});

test("normalizedDomain strips www", () => {
  assert.equal(normalizedDomain("https://www.judgments.org.il/x"), "judgments.org.il");
});

test("SSRF guard blocks localhost, private ranges, metadata, non-http", () => {
  for (const bad of ["http://localhost/", "http://127.0.0.1/", "http://10.1.2.3/", "http://192.168.0.1/",
    "http://169.254.169.254/", "http://[::1]/", "file:///etc/passwd", "http://foo.internal/"]) {
    assert.throws(() => assertFetchableUrl(bad), SsrfBlockedError, `should block ${bad}`);
  }
});

test("SSRF guard allows public host; allowlist enforced", () => {
  assert.ok(assertFetchableUrl("https://judgments.org.il/x"));
  assert.ok(assertFetchableUrl("https://sub.gov.il/", ["gov.il"]));
  assert.throws(() => assertFetchableUrl("https://evil.com/", ["gov.il"]), SsrfBlockedError);
});

// ---- robots ---------------------------------------------------------------

test("parseRobots + isPathAllowed honor longest-match and Allow ties", () => {
  const r = parseRobots(`User-agent: *\nDisallow: /private\nAllow: /private/public\nCrawl-delay: 5\nSitemap: https://x/sitemap.xml`);
  assert.equal(r.sitemaps.length, 1);
  assert.equal(isPathAllowed(r, "LawMe", "/private/secret"), false);
  assert.equal(isPathAllowed(r, "LawMe", "/private/public/a"), true);
  assert.equal(isPathAllowed(r, "LawMe", "/open"), true);
});

test("robots specific UA group overrides wildcard", () => {
  const r = parseRobots(`User-agent: *\nDisallow: /\n\nUser-agent: goodbot\nDisallow:`);
  assert.equal(isPathAllowed(r, "goodbot", "/x"), true);
  assert.equal(isPathAllowed(r, "otherbot", "/x"), false);
});

// ---- sitemap --------------------------------------------------------------

test("summarizeSitemap detects index vs urlset and flags judgment/pdf", () => {
  const urlset = `<urlset><url><loc>https://x/judgments/a</loc></url><url><loc>https://x/f.pdf</loc></url></urlset>`;
  const s = summarizeSitemap(urlset);
  assert.equal(s.kind, "urlset");
  assert.equal(s.estimatedUrls, 2);
  assert.equal(s.likelyJudgmentUrls, 1);
  assert.equal(s.likelyPdfUrls, 1);
  const index = `<sitemapindex><sitemap><loc>https://x/wp-sitemap-1.xml</loc></sitemap></sitemapindex>`;
  assert.equal(summarizeSitemap(index).kind, "index");
  assert.equal(extractLocs(index).length, 1);
});

test("candidateSitemapUrls covers standard + wordpress", () => {
  const c = candidateSitemapUrls("https://x");
  assert.ok(c.includes("https://x/wp-sitemap.xml"));
});

// ---- signals --------------------------------------------------------------

test("interpretWpJson / interpretOpenApi", () => {
  assert.equal(interpretWpJson(200, JSON.stringify({ namespaces: ["wp/v2"] })), true);
  assert.equal(interpretWpJson(404, ""), false);
  assert.equal(interpretOpenApi(200, JSON.stringify({ openapi: "3.0.0", paths: {} })), true);
});

test("discoverSearch finds WordPress ?s= form", () => {
  const s = discoverSearch(`<form role="search" method="get"><input name="s"></form>`);
  assert.equal(s.hasPublicSearch, true);
  assert.equal(s.method, "GET");
  assert.equal(s.queryParam, "s");
});

test("discoverFeeds + detectCms detect WordPress signals", () => {
  const html = `<link rel="alternate" type="application/rss+xml" href="/feed/"><div class="wp-content">`;
  const f = discoverFeeds(html, "https://x");
  assert.equal(f.hasRss, true);
  assert.equal(detectCms(html, {}), "wordpress");
});

test("extractTermsSignals yields signals only; empty terms → noTermsFound", () => {
  const links = findPolicyLinks(`<a href="/terms">תנאי שימוש</a>`, "https://x");
  assert.ok(links.termsUrl);
  const sig = extractTermsSignals("אין לבצע איסוף אוטומטי (scraping) ללא הרשאה בכתב ומראש", links);
  assert.equal(sig.noScraping, true);
  assert.equal(sig.permissionRequired, true);
  assert.equal(extractTermsSignals(null, links).noTermsFound, true);
});

// ---- scoring + verdict ----------------------------------------------------

function baseFindings(over: Partial<AuditFindings> = {}): AuditFindings {
  return {
    url: "https://x/", normalizedDomain: "x", https: true, reachable: true, httpStatus: 200, cms: "wordpress",
    robots: { found: true, statusCode: 200, contentHash: null, disallowsRelevantPaths: false, crawlDelaySeconds: null, sitemaps: [] },
    sitemap: { found: true, kind: "urlset", childSitemapCount: 0, estimatedUrls: 100, sampleUrls: [], likelyJudgmentUrls: 5, likelyPdfUrls: 1 },
    api: { hasApi: true, wpJson: true, openApi: false, requiresAuth: false, resourceHints: ["wp/v2"] },
    feed: { hasRss: true, hasAtom: false, feedUrls: [] },
    search: { hasPublicSearch: true, method: "GET", queryParam: "s", hasPagination: null },
    terms: { termsUrl: null, privacyUrl: null, licenseUrl: null, personalUseOnly: false, noCommercialUse: false, noScraping: false, noAutomatedAccess: false, attributionRequired: false, openDataLicense: true, publicDomainClaim: false, permissionRequired: false, noTermsFound: false },
    accessStatus: "public", technicalAccessStatus: "open", legalReuseStatus: "open_license",
    auditStatus: "completed", auditConfidence: 0.9, requiresLogin: false, requiresCaptcha: false,
    recommendedAccessMethod: "wp-json REST API", evidence: [], requestCount: 5, ...over,
  };
}

test("priority score weights and clamps 0..100", () => {
  const s = computeScores({ coverage: 80, access: 90, metadata: 70, document: 60, legal: 100 });
  assert.equal(s.priorityScore, Math.round(80 * 0.3 + 90 * 0.25 + 70 * 0.2 + 60 * 0.15 + 100 * 0.1));
  assert.ok(s.priorityScore >= 0 && s.priorityScore <= 100);
});

test("metadataQualityScore proportional to fields present", () => {
  assert.equal(metadataQualityScore({ caseNumber: true, date: true, court: true, judge: true, parties: true, proceedingType: true, stableId: true }), 100);
  assert.equal(metadataQualityScore({ caseNumber: false, date: false, court: false, judge: false, parties: false, proceedingType: false, stableId: false }), 0);
});

test("verdict: OPEN only when audited+accessible+lawful; blocked/unknown gated", () => {
  assert.equal(classifyVerdict(baseFindings(), false), "OPEN");
  assert.equal(classifyVerdict(baseFindings({ technicalAccessStatus: "waf_blocked" }), false), "BLOCKED");
  assert.equal(classifyVerdict(baseFindings({ legalReuseStatus: "automated_access_prohibited" }), false), "BLOCKED");
  assert.equal(classifyVerdict(baseFindings({ legalReuseStatus: "unknown", auditStatus: "manual_review_required" }), false), "REVIEW");
  assert.equal(classifyVerdict(baseFindings({ legalReuseStatus: "commercial_permission_required" }), false), "ASK");
  assert.equal(classifyVerdict(baseFindings({ legalReuseStatus: "commercial_permission_required" }), true), "OPEN");
});

// ---- collector gate + permissions ----------------------------------------

function baseSource(over: Partial<SourceRecord> = {}): SourceRecord {
  return {
    name: "s", normalizedDomain: "x", sourceType: "court", auditStatus: "completed",
    accessStatus: "public", technicalAccessStatus: "open", legalReuseStatus: "public_reuse_allowed",
    collectorStatus: "ready_to_build", requiresLogin: false, requiresCaptcha: false, requiresWrittenPermission: false,
    robotsDisallowsRelevantPaths: false, auditConfidence: 0.9, recommendedAccessMethod: "wp-json",
    hasDocumentedPermission: false,
    scores: { coverageScore: 50, accessScore: 60, metadataQualityScore: 70, documentQualityScore: 50, legalClarityScore: 100, priorityScore: 60 },
    ...over,
  };
}

test("canBuildCollector allows a clean audited lawful source", () => {
  const g = canBuildCollector(baseSource());
  assert.equal(g.allowed, true, g.reasons.join("; "));
});

test("canBuildCollector fails closed on block / captcha / unknown-reuse / low confidence", () => {
  assert.equal(canBuildCollector(baseSource({ technicalAccessStatus: "waf_blocked" })).allowed, false);
  assert.equal(canBuildCollector(baseSource({ requiresCaptcha: true })).allowed, false);
  assert.equal(canBuildCollector(baseSource({ legalReuseStatus: "unknown" })).allowed, false);
  assert.equal(canBuildCollector(baseSource({ auditStatus: "pending" })).allowed, false);
  assert.equal(canBuildCollector(baseSource({ auditConfidence: 0.2 })).allowed, false);
});

test("commercial reuse needs documented permission to build", () => {
  assert.equal(canBuildCollector(baseSource({ legalReuseStatus: "commercial_permission_required", hasDocumentedPermission: false })).allowed, false);
  assert.equal(canBuildCollector(baseSource({ legalReuseStatus: "commercial_permission_required", hasDocumentedPermission: true })).allowed, true);
});

test("canActivateCollector is stricter than build (status + confidence)", () => {
  assert.equal(canActivateCollector(baseSource({ collectorStatus: "ready_to_build", auditConfidence: 0.7 })).allowed, false); // <0.75
  assert.equal(canActivateCollector(baseSource({ collectorStatus: "testing", auditConfidence: 0.8 })).allowed, true);
  assert.equal(canActivateCollector(baseSource({ collectorStatus: "not_evaluated", auditConfidence: 0.9 })).allowed, false);
});

test("isPermissionActive respects flag + date window", () => {
  const p = { automatedAccessAllowed: true, commercialUseAllowed: true, fullTextStorageAllowed: true, effectiveFrom: "2026-01-01T00:00:00Z", expiresAt: "2026-12-31T00:00:00Z", evidenceReference: "ref" };
  assert.equal(isPermissionActive(p, "2026-06-01T00:00:00Z"), true);
  assert.equal(isPermissionActive(p, "2025-06-01T00:00:00Z"), false);
  assert.equal(isPermissionActive(p, "2027-06-01T00:00:00Z"), false);
  assert.equal(isPermissionActive({ ...p, automatedAccessAllowed: false }, "2026-06-01T00:00:00Z"), false);
});

// ---- status machine -------------------------------------------------------

test("status machine allows legal transitions, rejects illegal", () => {
  assert.equal(canTransition("audit_required", "ready_to_build"), true);
  assert.equal(canTransition("not_evaluated", "active"), false);
  assert.throws(() => assertTransition("not_evaluated", "active"), IllegalStatusTransitionError);
  assertTransition("testing", "active"); // no throw
  assertTransition("active", "active"); // same is a no-op
});

// ---- audit engine (mock transport, no network) ----------------------------

function mockTransport(map: Record<string, Partial<HttpResponse>>): HttpTransport {
  return {
    async get(url: string): Promise<HttpResponse> {
      const hit = map[url] ?? map[url.replace(/\/$/, "")] ?? { status: 404, body: "" };
      return { url, status: hit.status ?? 404, headers: hit.headers ?? {}, body: hit.body ?? "", truncated: false, redirects: [], error: hit.error ?? null };
    },
  };
}
const CLOCK = () => "2026-08-05T00:00:00.000Z";

test("audit engine: open WordPress source → completed/open, wp-json recommended", async () => {
  const t = mockTransport({
    "https://ex.gov.il/": { status: 200, body: `<html><link rel="alternate" type="application/rss+xml" href="/feed/"><form role="search" method="get"><input name="s"></form> wp-content</html>` },
    "https://ex.gov.il/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\nSitemap: https://ex.gov.il/sitemap.xml" },
    "https://ex.gov.il/sitemap.xml": { status: 200, body: `<urlset><url><loc>https://ex.gov.il/judgments/a</loc></url></urlset>` },
    "https://ex.gov.il/wp-json/": { status: 200, body: JSON.stringify({ namespaces: ["wp/v2"] }) },
  });
  const f = await new LegalSourceAuditEngine(t, CLOCK).audit({ url: "https://ex.gov.il/" });
  assert.equal(f.reachable, true);
  assert.equal(f.technicalAccessStatus, "open");
  assert.equal(f.api.wpJson, true);
  assert.equal(f.recommendedAccessMethod, "wp-json REST API");
  assert.ok(f.requestCount <= 12);
  assert.ok(f.evidence.length >= 2);
});

test("audit engine: 403 homepage → waf_blocked, incomplete, fail-closed (no extra probes)", async () => {
  const t = mockTransport({ "https://blocked.example/": { status: 403, body: "" } });
  const f = await new LegalSourceAuditEngine(t, CLOCK).audit({ url: "https://blocked.example/" });
  assert.equal(f.technicalAccessStatus, "waf_blocked");
  assert.equal(f.accessStatus, "blocked");
  assert.equal(f.auditStatus, "incomplete");
  assert.equal(f.requestCount, 1, "must not keep probing a blocked source");
  assert.equal(classifyVerdict(f, false), "BLOCKED");
});

test("audit engine: reachable but no terms → manual_review_required (REVIEW)", async () => {
  const t = mockTransport({
    "https://plain.example/": { status: 200, body: "<html>hello</html>" },
    "https://plain.example/robots.txt": { status: 404, body: "" },
  });
  const f = await new LegalSourceAuditEngine(t, CLOCK).audit({ url: "https://plain.example/" });
  assert.equal(f.legalReuseStatus, "unknown");
  assert.equal(f.auditStatus, "manual_review_required");
  assert.equal(classifyVerdict(f, false), "REVIEW");
});

// ---- discovery engine + report -------------------------------------------

test("discovery engine proposes relevant candidates, dedups, skips self", () => {
  const d = new LegalSourceDiscoveryEngine().discover({
    fromDomain: "court.gov.il",
    origin: "https://court.gov.il",
    homepageHtml: `<a href="https://data.gov.il/x">data</a><a href="https://random-shop.com">shop</a><a href="https://court.gov.il/self">self</a>`,
  });
  const domains = d.map((c) => c.normalizedDomain);
  assert.ok(domains.includes("data.gov.il"));
  assert.ok(!domains.includes("random-shop.com"), "irrelevant domain excluded");
  assert.ok(d.every((c) => c.auditStatus === "pending" && c.collectorStatus === "audit_required"));
});

test("report generator emits 20 sections + verdict + evidence", () => {
  const f = baseFindings({ evidence: [{ evidenceType: "homepage", url: "https://x/", statusCode: 200, contentHash: "abc123def456", summary: "ok", observedAt: CLOCK() }] });
  const scores = computeScores({ coverage: 50, access: 60, metadata: 70, document: 40, legal: 100 });
  const md = generateAuditReport({ name: "Example", findings: f, scores, verdict: "OPEN", gate: { allowed: true, reasons: [], requiredActions: [] } });
  for (let i = 1; i <= 20; i += 1) assert.ok(md.includes(`## ${i}.`), `missing section ${i}`);
  assert.ok(md.includes("Verdict: **OPEN**"));
  assert.ok(md.includes("sha256:abc123def456"));
});
