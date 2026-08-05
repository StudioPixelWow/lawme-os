/**
 * Pure signal extractors over fetched HTML/JSON text: API, feeds, search form,
 * and terms/license signals. No network here — the audit engine fetches and
 * passes bodies in. Terms extraction yields SIGNALS ONLY, never a legal verdict.
 */
import type { ApiFindings, FeedFindings, SearchFindings, TermsSignals } from "./types.ts";

// ---- API discovery --------------------------------------------------------

/** Interpret a probe of /wp-json/ (WordPress REST root). */
export function interpretWpJson(status: number, body: string): boolean {
  if (status !== 200) return false;
  try {
    const j = JSON.parse(body) as { namespaces?: unknown; routes?: unknown };
    return Array.isArray(j.namespaces) || typeof j.routes === "object";
  } catch { return /"namespaces"|"routes"|wp\/v2/.test(body); }
}

/** Interpret an OpenAPI/Swagger probe. */
export function interpretOpenApi(status: number, body: string): boolean {
  if (status !== 200) return false;
  try {
    const j = JSON.parse(body) as { openapi?: string; swagger?: string; paths?: unknown };
    return typeof j.openapi === "string" || typeof j.swagger === "string" || typeof j.paths === "object";
  } catch { return false; }
}

export function buildApiFindings(opts: {
  wpJson: boolean; openApi: boolean; wpRequiresAuth: boolean | null; resourceHints: string[];
}): ApiFindings {
  return {
    hasApi: opts.wpJson || opts.openApi,
    wpJson: opts.wpJson,
    openApi: opts.openApi,
    requiresAuth: opts.wpRequiresAuth,
    resourceHints: opts.resourceHints,
  };
}

/** Standard, public, non-guessy endpoints only (no brute force). */
export function standardApiProbePaths(origin: string): string[] {
  const b = origin.replace(/\/+$/, "");
  return [`${b}/wp-json/`, `${b}/wp-json/wp/v2/`, `${b}/openapi.json`, `${b}/swagger.json`, `${b}/api/docs`];
}

// ---- Feed discovery -------------------------------------------------------

export function discoverFeeds(html: string, origin: string): FeedFindings {
  const feedUrls = new Set<string>();
  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let hasRss = false, hasAtom = false;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/rel=["']?alternate/i.test(tag)) continue;
    const typeMatch = tag.match(/type=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!typeMatch || !hrefMatch) continue;
    const type = typeMatch[1].toLowerCase();
    if (type.includes("rss") || type.includes("rdf")) { hasRss = true; feedUrls.add(absolutize(hrefMatch[1], origin)); }
    if (type.includes("atom")) { hasAtom = true; feedUrls.add(absolutize(hrefMatch[1], origin)); }
  }
  // WordPress default feed
  if (/\/feed\/?/.test(html)) hasRss = true;
  return { hasRss, hasAtom, feedUrls: [...feedUrls] };
}

function absolutize(href: string, origin: string): string {
  try { return new URL(href, origin).toString(); } catch { return href; }
}

// ---- Search discovery -----------------------------------------------------

/** Detect a public search form and its method/param from homepage HTML. */
export function discoverSearch(html: string): SearchFindings {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  for (const form of forms) {
    const looksSearch = /role=["']search["']|type=["']search["']|name=["']s["']|name=["']q["']|name=["']query["']|search/i.test(form);
    if (!looksSearch) continue;
    const methodMatch = form.match(/method=["']?(get|post)["']?/i);
    const method = methodMatch ? (methodMatch[1].toUpperCase() as "GET" | "POST") : "GET";
    const nameMatch = form.match(/name=["'](s|q|query|search|keyword)["']/i);
    return { hasPublicSearch: true, method, queryParam: nameMatch ? nameMatch[1] : null, hasPagination: null };
  }
  // WordPress `?s=` even without an obvious form
  if (/name=["']s["']|\?s=/.test(html)) return { hasPublicSearch: true, method: "GET", queryParam: "s", hasPagination: null };
  return { hasPublicSearch: false, method: "unknown", queryParam: null, hasPagination: null };
}

// ---- CMS detection --------------------------------------------------------

export function detectCms(html: string, headers: Record<string, string>): string | null {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const poweredBy = h["x-powered-by"] ?? "";
  if (/wp-content|wp-json|wordpress/i.test(html) || /wordpress/i.test(poweredBy)) return "wordpress";
  if (/_next\/static|__NEXT_DATA__/i.test(html)) return "nextjs";
  if (/drupal-settings-json|\/sites\/default\/files/i.test(html)) return "drupal";
  if (/data-reactroot|react-dom/i.test(html)) return "react";
  if (/x-drupal-cache/i.test(JSON.stringify(h))) return "drupal";
  return null;
}

// ---- Terms / license signals (SIGNALS ONLY) -------------------------------

const POLICY_LINK_HINTS: { key: "terms" | "privacy" | "license"; re: RegExp }[] = [
  { key: "terms", re: /terms|תנאי\s*שימוש|תקנון/i },
  { key: "privacy", re: /privacy|פרטיות/i },
  { key: "license", re: /license|רישיון|licence/i },
];

export function findPolicyLinks(html: string, origin: string): { termsUrl: string | null; privacyUrl: string | null; licenseUrl: string | null } {
  const res = { termsUrl: null as string | null, privacyUrl: null as string | null, licenseUrl: null as string | null };
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1]; const text = m[2].replace(/<[^>]+>/g, " ");
    const hay = `${href} ${text}`;
    for (const hint of POLICY_LINK_HINTS) {
      if (hint.re.test(hay)) {
        if (hint.key === "terms" && !res.termsUrl) res.termsUrl = absolutize(href, origin);
        if (hint.key === "privacy" && !res.privacyUrl) res.privacyUrl = absolutize(href, origin);
        if (hint.key === "license" && !res.licenseUrl) res.licenseUrl = absolutize(href, origin);
      }
    }
  }
  return res;
}

/** Extract reuse signals from terms text. Never returns a legal conclusion. */
export function extractTermsSignals(
  termsText: string | null,
  links: { termsUrl: string | null; privacyUrl: string | null; licenseUrl: string | null },
): TermsSignals {
  const t = (termsText ?? "").toLowerCase();
  const has = (re: RegExp) => re.test(t);
  const noTermsFound = termsText === null || t.trim().length === 0;
  return {
    termsUrl: links.termsUrl,
    privacyUrl: links.privacyUrl,
    licenseUrl: links.licenseUrl,
    personalUseOnly: has(/personal use only|שימוש אישי בלבד|לשימוש פרטי/),
    noCommercialUse: has(/non-commercial|no commercial|לא מסחרי|איסור.*מסחרי|שימוש מסחרי אסור/),
    noScraping: has(/scrap|crawl|automated collection|איסוף אוטומטי|גריפה/),
    noAutomatedAccess: has(/automated access|bots?\b|robot|גישה אוטומטית|אוטומצי/),
    attributionRequired: has(/attribution|קרדיט|ייחוס|יש לציין את המקור/),
    openDataLicense: has(/creative commons|\bcc[- ]?by\b|open data|מידע פתוח|רישיון פתוח|odbl|odc/),
    publicDomainClaim: has(/public domain|נחלת הכלל|אין זכויות יוצרים/),
    permissionRequired: has(/prior written|written permission|בכתב ומראש|נדרש אישור|הרשאה מראש/),
    noTermsFound,
  };
}
