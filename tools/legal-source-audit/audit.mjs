#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — local operator Source-Audit tool.
 *
 * Runs on the OPERATOR's normal internet connection (the build/CI environment
 * cannot reach the Israeli sites). It performs a SMALL number of diagnostic
 * requests (hard cap 15) and downloads at most 3 sample documents. It does NOT
 * scrape, authenticate, solve CAPTCHA, rotate proxies, bypass Cloudflare, mimic
 * users, enumerate case numbers, or touch personal/lawyer-only areas.
 *
 * Usage:  node tools/legal-source-audit/audit.mjs --source data_gov_il
 * Output: artifacts/legal-source-audits/{date}/{source_code}/{audit.json,audit.md,evidence/}
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const UA = "LegalAIIsrael-Research/0.1 (+contact: operator-provided)";
const MAX_REQUESTS = 15;
const MAX_SAMPLES = 3;

// Known official API probes for portal-type sources (public, no auth, no bypass).
// Kept small; each probe counts against the ≤15 request budget.
const API_PROBES = {
  data_gov_il: [
    "https://data.gov.il/api/3/action/status_show",
    "https://data.gov.il/api/3/action/package_search?q=%D7%9E%D7%A9%D7%A4%D7%98&rows=1",
  ],
};

// UA-aware robots.txt: does the ruleset for `*` (or our UA) disallow the base path?
function robotsDisallowsRoot(text, uaToken) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let groups = [];
  let cur = null;
  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      const ua = line.split(":")[1].trim().toLowerCase();
      if (!cur || cur.rules.length > 0) { cur = { agents: [ua], rules: [] }; groups.push(cur); }
      else cur.agents.push(ua);
    } else if (/^disallow:/i.test(line) && cur) {
      cur.rules.push(line.split(":").slice(1).join(":").trim());
    }
  }
  const applies = (g) => g.agents.includes("*") || g.agents.some((a) => uaToken.toLowerCase().includes(a) && a.length > 2);
  for (const g of groups) {
    if (!applies(g)) continue;
    if (g.rules.some((r) => r === "/" )) return true;
  }
  return false; // no applicable group disallows root
}

const SOURCES = {
  data_gov_il: "https://data.gov.il/",
  supreme_court: "https://supremedecisions.court.gov.il/",
  net_hamishpat: "https://www.court.gov.il/ngcs.web.site/homepage.aspx",
  court_spokesperson: "https://www.gov.il/he/departments/dynamiccollectors/spokmanship_court",
  land_supervisors: "https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict",
  unicourt: "https://unicourt.justice.gov.il/information",
  gov_il_legal: "https://www.gov.il",
  tolaat_hamishpat: "https://xn----8hcborozt8bdd.xn--9dbq2a/",
};

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function politeFetch(url, budget) {
  if (budget.count >= MAX_REQUESTS) throw new Error("request budget exhausted");
  budget.count += 1;
  await new Promise((r) => setTimeout(r, 4000)); // ≥1 req / 3–5s
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  return res;
}

async function main() {
  const source = arg("--source");
  if (!source || !SOURCES[source]) {
    console.error(`usage: --source <${Object.keys(SOURCES).join("|")}>`);
    process.exit(1);
  }
  const base = SOURCES[source];
  const budget = { count: 0 };
  const day = new Date().toISOString().slice(0, 10);
  const dir = `artifacts/legal-source-audits/${day}/${source}`;
  await mkdir(`${dir}/evidence`, { recursive: true });

  const artifact = {
    schemaVersion: "1", sourceCode: source, auditedAt: new Date().toISOString(), userAgent: UA,
    requestCount: 0,
    dns: { resolved: false, addresses: [] },
    tls: { ok: false, protocol: null },
    http: { status: null, redirects: [], contentType: null, headers: {}, rateLimitHeaders: {}, retryAfter: null },
    robots: { found: false, sha256: null, disallowsRelevantPaths: null },
    policies: { termsUrl: null, privacyUrl: null, sitemapUrl: null, termsSha256: null },
    access: {
      hasPublicSearch: false, apiHints: [], cookiesRequired: false, loginRequired: false,
      captchaDetected: false, publicDocumentOpenableWithoutAuth: null, sampleDocumentUrl: null,
      stableIdentifiersFound: false, formFields: [], jsEndpointHints: [],
    },
    sampleDocumentsFetched: 0,
    operatorNotes: arg("--notes") ?? "",
  };

  try {
    const res = await politeFetch(base, budget);
    artifact.tls.ok = base.startsWith("https");
    artifact.http.status = res.status;
    artifact.http.contentType = res.headers.get("content-type");
    artifact.http.retryAfter = res.headers.get("retry-after");
    for (const [k, v] of res.headers) {
      artifact.http.headers[k] = v;
      if (/ratelimit|retry-after/i.test(k)) artifact.http.rateLimitHeaders[k] = v;
    }
    const html = await res.text();
    await writeFile(`${dir}/evidence/home.html`, html);
    artifact.dns.resolved = true;
    artifact.access.cookiesRequired = Boolean(res.headers.get("set-cookie"));
    artifact.access.loginRequired = /login|התחבר|כניסה\s+לחשבון|אזור\s+אישי/i.test(html);
    artifact.access.captchaDetected = /captcha|recaptcha|hcaptcha|אימות\s+אנושי/i.test(html);
    artifact.access.hasPublicSearch = /(<form[^>]*search)|חיפוש|search/i.test(html);
    for (const m of html.matchAll(/\/api\/[\w./-]+|datastore_search|\.json(\?|")/gi)) artifact.access.apiHints.push(m[0]);
    for (const m of html.matchAll(/<input[^>]*name=["']([^"']+)["']/gi)) artifact.access.formFields.push(m[1]);
    artifact.access.apiHints = [...new Set(artifact.access.apiHints)].slice(0, 20);
    artifact.access.formFields = [...new Set(artifact.access.formFields)].slice(0, 30);

    // robots.txt (one request within budget)
    try {
      const robotsUrl = new URL("/robots.txt", base).toString();
      const rr = await politeFetch(robotsUrl, budget);
      if (rr.ok) {
        const robots = await rr.text();
        await writeFile(`${dir}/evidence/robots.txt`, robots);
        artifact.robots.found = true;
        artifact.robots.sha256 = sha256(robots);
        // UA-aware: only a `*` (or our-UA) group disallowing "/" counts against us.
        artifact.robots.disallowsRelevantPaths = robotsDisallowsRoot(robots, UA);
      }
    } catch { /* leave robots as not found */ }

    // Official-API probe for portal-type sources (public, no auth, within budget).
    const probes = API_PROBES[source] ?? [];
    for (const probeUrl of probes) {
      if (budget.count >= MAX_REQUESTS) break;
      try {
        const pr = await politeFetch(probeUrl, budget);
        if (pr.ok && /json/i.test(pr.headers.get("content-type") ?? "")) {
          const j = await pr.json();
          if (j && j.success === true) {
            artifact.access.apiHints.push(probeUrl.replace(base, "/").replace(/\?.*$/, ""));
            artifact.access.publicDocumentOpenableWithoutAuth = true; // API returns data without auth
            artifact.access.hasPublicSearch = true;
            // CKAN package_search → confirm stable dataset ids + read a license.
            const rec = j.result?.results?.[0];
            if (rec) {
              if (rec.id || rec.name) artifact.access.stableIdentifiersFound = true;
              const licTitle = rec.license_title ?? null;
              const licUrl = rec.license_url ?? null;
              if (licTitle || licUrl) {
                artifact.policies.termsUrl = licUrl ?? artifact.policies.termsUrl;
                artifact.operatorNotes += ` [license: ${licTitle ?? "?"}${licUrl ? " " + licUrl : ""}]`;
              }
            }
          }
        }
      } catch { /* probe failed; leave hints as-is */ }
    }
    artifact.access.apiHints = [...new Set(artifact.access.apiHints)].slice(0, 20);
  } catch (e) {
    artifact.operatorNotes += ` [fetch error: ${String(e.message ?? e)}]`;
  }

  artifact.requestCount = Math.min(budget.count, MAX_REQUESTS);
  artifact.sampleDocumentsFetched = Math.min(artifact.sampleDocumentsFetched, MAX_SAMPLES);

  await writeFile(`${dir}/audit.json`, JSON.stringify(artifact, null, 2));
  await writeFile(`${dir}/audit.md`, [
    `# Source Audit — ${source}`, "",
    `- audited_at: ${artifact.auditedAt}`,
    `- http_status: ${artifact.http.status}`,
    `- robots: ${artifact.robots.found ? "found" : "not found"}${artifact.robots.disallowsRelevantPaths ? " (disallows)" : ""}`,
    `- login_required: ${artifact.access.loginRequired}`,
    `- captcha_detected: ${artifact.access.captchaDetected}`,
    `- public_search: ${artifact.access.hasPublicSearch}`,
    `- api_hints: ${artifact.access.apiHints.length}`,
    `- requests_made: ${artifact.requestCount} (cap ${MAX_REQUESTS})`,
    "",
    "Next: `node tools/legal-source-audit/import.mjs --path " + `${dir}/audit.json\``,
  ].join("\n"));

  console.log(`audit written: ${dir}/audit.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
