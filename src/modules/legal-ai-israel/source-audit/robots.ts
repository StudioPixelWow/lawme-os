/**
 * robots.txt parsing — a TECHNICAL signal only, never a legal license.
 * Implements the subset that matters for audit: per-User-Agent Allow/Disallow,
 * Crawl-delay, and Sitemap declarations, with correct longest-match precedence.
 */

export interface RobotsRules {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay: number | null;
}

export interface ParsedRobots {
  groups: RobotsRules[];
  sitemaps: string[];
}

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsRules[] = [];
  const sitemaps: string[] = [];
  let current: RobotsRules[] = [];
  let sawDirective = false;

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line.length === 0) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (sawDirective) { current = []; sawDirective = false; }
      const g: RobotsRules = { userAgent: value.toLowerCase(), allow: [], disallow: [], crawlDelay: null };
      current.push(g);
      groups.push(g);
    } else if (field === "disallow") {
      sawDirective = true;
      for (const g of current) g.disallow.push(value);
    } else if (field === "allow") {
      sawDirective = true;
      for (const g of current) g.allow.push(value);
    } else if (field === "crawl-delay") {
      sawDirective = true;
      const n = Number(value);
      if (!Number.isNaN(n)) for (const g of current) g.crawlDelay = n;
    } else if (field === "sitemap") {
      if (value) sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

function selectGroup(parsed: ParsedRobots, userAgent: string): RobotsRules | null {
  const ua = userAgent.toLowerCase();
  let specific: RobotsRules | null = null;
  let wildcard: RobotsRules | null = null;
  for (const g of parsed.groups) {
    if (g.userAgent === "*") { wildcard = wildcard ?? g; continue; }
    if (ua.includes(g.userAgent) && (specific === null || g.userAgent.length > specific.userAgent.length)) {
      specific = g;
    }
  }
  return specific ?? wildcard;
}

function matchLength(pattern: string, path: string): number {
  // Longest-match with '*' wildcard and '$' end-anchor (Google convention).
  if (pattern === "") return -1;
  const hasEnd = pattern.endsWith("$");
  const pat = hasEnd ? pattern.slice(0, -1) : pattern;
  const parts = pat.split("*");
  let pos = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const seg = parts[i];
    if (seg === "") continue;
    const found = path.indexOf(seg, pos);
    if (found < 0) return -1;
    if (i === 0 && found !== 0) return -1; // first literal must anchor at start
    pos = found + seg.length;
  }
  if (hasEnd && pos !== path.length) return -1;
  return pat.replace(/\*/g, "").length;
}

/** Is `path` allowed for `userAgent`? Longest matching rule wins; Allow ties beat Disallow. */
export function isPathAllowed(parsed: ParsedRobots, userAgent: string, path: string): boolean {
  const group = selectGroup(parsed, userAgent);
  if (!group) return true; // no applicable group → allowed
  let bestDisallow = -1, bestAllow = -1;
  for (const p of group.disallow) bestDisallow = Math.max(bestDisallow, matchLength(p, path));
  for (const p of group.allow) bestAllow = Math.max(bestAllow, matchLength(p, path));
  if (bestDisallow < 0) return true;
  return bestAllow >= bestDisallow; // tie → allow
}
