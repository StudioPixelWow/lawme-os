/**
 * LegalSourceAuditEngine — orchestrates a bounded, fail-closed audit of a source
 * using an injected HttpTransport (no live requests in tests/CI). It probes the
 * homepage, robots.txt, a few standard sitemap/API endpoints, and derives
 * statuses. It downloads NO judgments and never exceeds the request cap. On
 * 403/429/CAPTCHA/login it fails closed (blocked / rate_limited) and does not
 * retry-to-defeat.
 */
import { createHash } from "node:crypto";
import type { HttpTransport, HttpResponse } from "./transport.ts";
import { normalizeUrl, normalizedDomain } from "./url.ts";
import { parseRobots, isPathAllowed } from "./robots.ts";
import type { ParsedRobots } from "./robots.ts";
import { summarizeSitemap, candidateSitemapUrls } from "./sitemap.ts";
import {
  detectCms, discoverFeeds, discoverSearch, findPolicyLinks, extractTermsSignals,
  interpretWpJson, interpretOpenApi, buildApiFindings, standardApiProbePaths,
} from "./signals.ts";
import type {
  AuditFindings, EvidenceItem, TechnicalAccessStatus, AccessStatus, LegalReuseStatus,
  AuditStatus, RobotsFindings, SitemapFindings,
} from "./types.ts";

export interface AuditInput { name?: string; url: string; relevantPathHint?: string; }

const REQUEST_CAP = 12;
const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
const nowIso = (clock?: () => string): string => (clock ? clock() : "1970-01-01T00:00:00.000Z");

function ev(type: EvidenceItem["evidenceType"], r: HttpResponse | null, summary: string, when: string): EvidenceItem {
  return {
    evidenceType: type,
    url: r ? r.url : null,
    statusCode: r ? r.status : null,
    contentHash: r && r.body ? sha(r.body) : null,
    summary,
    observedAt: when,
  };
}

const CAPTCHA_RE = /captcha|recaptcha|hcaptcha|cf-challenge|just a moment|attention required|are you human/i;
const LOGIN_RE = /type=["']password["']|name=["']password["']|log ?in|sign ?in|התחבר|כניסה למערכת/i;

export class LegalSourceAuditEngine {
  private readonly transport: HttpTransport;
  private readonly clock: (() => string) | undefined;
  constructor(transport: HttpTransport, clock?: () => string) {
    this.transport = transport;
    this.clock = clock;
  }

  async audit(input: AuditInput): Promise<AuditFindings> {
    const when = nowIso(this.clock);
    const url = normalizeUrl(input.url);
    const origin = new URL(url).origin;
    const domain = normalizedDomain(url);
    const evidence: EvidenceItem[] = [];
    let requests = 0;

    // 1. Homepage
    const home = await this.transport.get(url); requests += 1;
    evidence.push(ev("homepage", home, `homepage status ${home.status}`, when));

    const https = new URL(url).protocol === "https:";
    const reachable = home.status !== null && home.status >= 200 && home.status < 400;
    const html = home.body ?? "";
    const captcha = home.status === 200 && CAPTCHA_RE.test(html);
    const login = home.status === 200 && LOGIN_RE.test(html);

    // Fail-closed technical status from the homepage signal
    let tech: TechnicalAccessStatus = "unknown";
    let access: AccessStatus = "unknown";
    if (home.status === 403) { tech = "waf_blocked"; access = "blocked"; }
    else if (home.status === 429) { tech = "rate_limited"; access = "restricted"; }
    else if (home.status === null) { tech = "unavailable"; access = "unavailable"; }
    else if (captcha) { tech = "captcha"; access = "restricted"; }
    else if (login) { tech = "authentication_required"; access = "login_required"; }
    else if (reachable) { tech = "open"; access = "public"; }

    const blockedEarly = tech === "waf_blocked" || tech === "rate_limited" || tech === "unavailable" || tech === "captcha";

    const cms = reachable ? detectCms(html, home.headers) : null;

    // 2. robots.txt
    let robots: RobotsFindings = { found: false, statusCode: null, contentHash: null, disallowsRelevantPaths: null, crawlDelaySeconds: null, sitemaps: [] };
    let parsedRobots: ParsedRobots | null = null;
    if (!blockedEarly && requests < REQUEST_CAP) {
      const r = await this.transport.get(`${origin}/robots.txt`); requests += 1;
      evidence.push(ev("robots", r, `robots status ${r.status}`, when));
      if (r.status === 200 && r.body) {
        parsedRobots = parseRobots(r.body);
        const relPath = input.relevantPathHint ?? "/";
        robots = {
          found: true, statusCode: 200, contentHash: sha(r.body),
          disallowsRelevantPaths: !isPathAllowed(parsedRobots, "LawMeLegalResearch", relPath),
          crawlDelaySeconds: parsedRobots.groups.find((g) => g.crawlDelay !== null)?.crawlDelay ?? null,
          sitemaps: parsedRobots.sitemaps,
        };
      } else {
        robots = { found: false, statusCode: r.status, contentHash: null, disallowsRelevantPaths: null, crawlDelaySeconds: null, sitemaps: [] };
      }
    }
    if (robots.disallowsRelevantPaths === true) tech = "robots_disallowed";

    // 3. sitemap (robots-declared first, then standard candidates) — probe one hit
    let sitemap: SitemapFindings = { found: false, kind: "none", childSitemapCount: 0, estimatedUrls: 0, sampleUrls: [], likelyJudgmentUrls: 0, likelyPdfUrls: 0 };
    if (!blockedEarly) {
      const candidates = [...robots.sitemaps, ...candidateSitemapUrls(origin)];
      for (const cand of candidates) {
        if (requests >= REQUEST_CAP) break;
        const r = await this.transport.get(cand); requests += 1;
        if (r.status === 200 && /<(sitemapindex|urlset)/i.test(r.body)) {
          sitemap = summarizeSitemap(r.body);
          evidence.push(ev("sitemap", r, `sitemap ${sitemap.kind}, ~${sitemap.estimatedUrls} urls`, when));
          break;
        }
      }
    }

    // 4. API discovery (standard endpoints only)
    let wpJson = false, openApi = false, wpAuth: boolean | null = null;
    if (!blockedEarly) {
      for (const p of standardApiProbePaths(origin)) {
        if (requests >= REQUEST_CAP) break;
        const r = await this.transport.get(p); requests += 1;
        if (p.includes("wp-json") && interpretWpJson(r.status ?? 0, r.body)) { wpJson = true; wpAuth = false; evidence.push(ev("api", r, "wp-json present", when)); break; }
        if ((p.includes("openapi") || p.includes("swagger")) && interpretOpenApi(r.status ?? 0, r.body)) { openApi = true; evidence.push(ev("api", r, "openapi present", when)); break; }
      }
    }
    const api = buildApiFindings({ wpJson, openApi, wpRequiresAuth: wpAuth, resourceHints: wpJson ? ["wp/v2"] : [] });

    // 5. feeds + search + policy links from the homepage HTML (no extra requests)
    const feed = reachable ? discoverFeeds(html, origin) : { hasRss: false, hasAtom: false, feedUrls: [] };
    const search = reachable ? discoverSearch(html) : { hasPublicSearch: false, method: "unknown" as const, queryParam: null, hasPagination: null };
    const links = reachable ? findPolicyLinks(html, origin) : { termsUrl: null, privacyUrl: null, licenseUrl: null };
    if (search.hasPublicSearch) evidence.push(ev("search", home, `search ${search.method} param=${search.queryParam}`, when));
    if (feed.hasRss || feed.hasAtom) evidence.push(ev("feed", home, `feeds rss=${feed.hasRss} atom=${feed.hasAtom}`, when));

    // 6. terms signals — do NOT auto-conclude a license. unknown → manual review.
    const terms = extractTermsSignals(null, links); // terms body fetch deferred to a dedicated job
    let legal: LegalReuseStatus = "unknown";
    if (terms.noAutomatedAccess || terms.noScraping) legal = "automated_access_prohibited";
    else if (terms.publicDomainClaim || terms.openDataLicense) legal = "open_license";
    else if (terms.permissionRequired) legal = "written_permission_required";
    else if (terms.noCommercialUse) legal = "personal_use_only";
    // else stays 'unknown' → REVIEW

    // Audit status: fail-closed. Blocked/network → incomplete/failed; else completed.
    let auditStatus: AuditStatus;
    if (home.status === null) auditStatus = "failed";
    else if (blockedEarly) auditStatus = "incomplete";
    else if (legal === "unknown") auditStatus = "manual_review_required";
    else auditStatus = "completed";

    // Confidence: proportion of successful signal probes, penalized by blocks.
    const positiveSignals = [reachable, robots.found, sitemap.found, api.hasApi, search.hasPublicSearch].filter(Boolean).length;
    let confidence = Math.min(1, 0.35 + positiveSignals * 0.13);
    if (blockedEarly) confidence = Math.min(confidence, 0.3);

    const recommended = api.hasApi ? (api.wpJson ? "wp-json REST API" : "OpenAPI")
      : sitemap.found ? "sitemap-driven fetch"
      : feed.hasRss || feed.hasAtom ? "RSS/Atom feed"
      : search.hasPublicSearch ? "public search + document pages"
      : null;

    return {
      url, normalizedDomain: domain, https, reachable, httpStatus: home.status, cms,
      robots, sitemap, api, feed, search, terms,
      accessStatus: access, technicalAccessStatus: tech, legalReuseStatus: legal,
      auditStatus, auditConfidence: Number(confidence.toFixed(2)),
      requiresLogin: login, requiresCaptcha: captcha,
      recommendedAccessMethod: recommended, evidence, requestCount: requests,
    };
  }
}
