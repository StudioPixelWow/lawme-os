/**
 * sitemap.xml parsing (index + urlset). Lightweight regex extraction — no XML
 * dependency — sufficient for counting, sampling, and file-type heuristics.
 * We never download an entire large sitemap tree during audit; the caller
 * samples a bounded number of child sitemaps.
 */
import type { SitemapFindings } from "./types.ts";

const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

export function extractLocs(xml: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  LOC_RE.lastIndex = 0;
  while ((m = LOC_RE.exec(xml)) !== null) {
    out.push(m[1].replace(/&amp;/g, "&").trim());
  }
  return out;
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

const JUDGMENT_HINT = /(judgment|verdict|psak|pesika|ruling|decision|hachlata|\/judgments?\/|פסק|החלט|פסיק)/i;

function looksLikeJudgment(url: string): boolean {
  return JUDGMENT_HINT.test(decodeURIComponent(url));
}
function looksLikePdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

/**
 * Summarize a single sitemap document. For an index, `childLocs` are child
 * sitemap URLs; for a urlset, they are page URLs. `estimatedUrls` counts the
 * urlset entries directly, or is left as the child count for an index (the
 * caller multiplies out with bounded sampling).
 */
export function summarizeSitemap(xml: string, sampleLimit = 20): SitemapFindings {
  const locs = extractLocs(xml);
  if (locs.length === 0) {
    return { found: false, kind: "none", childSitemapCount: 0, estimatedUrls: 0, sampleUrls: [], likelyJudgmentUrls: 0, likelyPdfUrls: 0 };
  }
  const index = isSitemapIndex(xml);
  const sample = locs.slice(0, sampleLimit);
  return {
    found: true,
    kind: index ? "index" : "urlset",
    childSitemapCount: index ? locs.length : 0,
    estimatedUrls: index ? 0 : locs.length,
    sampleUrls: sample,
    likelyJudgmentUrls: sample.filter(looksLikeJudgment).length,
    likelyPdfUrls: sample.filter(looksLikePdf).length,
  };
}

/** Candidate sitemap locations to probe (standard + WordPress). */
export function candidateSitemapUrls(origin: string): string[] {
  const base = origin.replace(/\/+$/, "");
  return [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`, `${base}/wp-sitemap.xml`];
}
