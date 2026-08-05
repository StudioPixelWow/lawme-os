/**
 * LegalSourceDiscoveryEngine — proposes NEW candidate sources from signals we
 * already gathered (homepage links, robots-declared sitemaps, sitemap sample
 * URLs). It downloads NO documents. Every candidate enters pending / audit_required.
 */
import { normalizedDomain } from "./url.ts";
import type { OwnerType } from "./types.ts";

export interface DiscoveryInput {
  fromDomain: string;
  homepageHtml: string;
  origin: string;
  sitemapSampleUrls?: string[];
  robotsSitemaps?: string[];
}

export interface CandidateSource {
  url: string;
  normalizedDomain: string;
  ownerTypeGuess: OwnerType;
  discoveredVia: "homepage_link" | "sitemap" | "robots_sitemap";
  auditStatus: "pending";
  collectorStatus: "audit_required";
}

function ownerGuess(domain: string): OwnerType {
  if (domain.endsWith(".gov.il") || domain.endsWith(".court.gov.il")) return "official";
  if (domain.endsWith(".ac.il")) return "academic";
  if (domain.endsWith(".org.il") || domain.endsWith(".org")) return "non_profit";
  if (domain.endsWith(".co.il") || domain.endsWith(".com")) return "commercial";
  return "unknown";
}

// Only surface links that plausibly relate to legal/government content.
const RELEVANT_HINT = /(gov\.il|court|justice|mishpat|psak|pesika|verdict|judgment|tribunal|beitdin|law|legisl|regulat|\.ac\.il)/i;

function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

export class LegalSourceDiscoveryEngine {
  /** Propose candidate sources. Pure: operates on already-fetched signals. */
  discover(input: DiscoveryInput): CandidateSource[] {
    const seen = new Set<string>([normalizedDomain(`https://${input.fromDomain}`)]);
    const out: CandidateSource[] = [];

    const add = (raw: string, via: CandidateSource["discoveredVia"]) => {
      let u: URL;
      try { u = new URL(raw, input.origin); } catch { return; }
      if (u.protocol !== "https:" && u.protocol !== "http:") return;
      const dom = normalizedDomain(u.toString());
      if (seen.has(dom)) return;
      if (!RELEVANT_HINT.test(`${dom} ${u.pathname}`)) return;
      seen.add(dom);
      out.push({
        url: `${u.protocol}//${u.host}/`,
        normalizedDomain: dom,
        ownerTypeGuess: ownerGuess(dom),
        discoveredVia: via,
        auditStatus: "pending",
        collectorStatus: "audit_required",
      });
    };

    for (const href of extractHrefs(input.homepageHtml)) add(href, "homepage_link");
    for (const s of input.robotsSitemaps ?? []) add(s, "robots_sitemap");
    for (const s of input.sitemapSampleUrls ?? []) add(s, "sitemap");
    return out;
  }
}
