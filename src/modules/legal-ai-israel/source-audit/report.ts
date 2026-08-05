/**
 * Audit report generator — renders the 20-section markdown report for a source.
 * It states only what the findings/evidence contain (no unverified claims); an
 * absent signal is rendered as "not observed", never asserted either way.
 */
import type { AuditFindings, SourceScores, SourceVerdict, GateResult } from "./types.ts";

const yn = (b: boolean | null): string => (b === null ? "unknown" : b ? "yes" : "no");

export function reportFilename(normalizedDomain: string): string {
  return `docs/source-audits/${normalizedDomain.replace(/[^a-z0-9.-]/gi, "_")}.md`;
}

export function generateAuditReport(args: {
  name: string;
  findings: AuditFindings;
  scores: SourceScores;
  verdict: SourceVerdict;
  gate: GateResult;
}): string {
  const { name, findings: f, scores, verdict, gate } = args;
  const lines: string[] = [];
  const L = (s: string) => lines.push(s);

  L(`# Source Audit — ${name} (${f.normalizedDomain})`);
  L("");
  L(`Verdict: **${verdict}** · audit_status: \`${f.auditStatus}\` · confidence: ${f.auditConfidence}`);
  L(`Generated from ${f.requestCount} bounded probe(s). Claims below reflect observed evidence only.`);
  L("");

  L("## 1. Source summary");
  L(`- URL: ${f.url}`);
  L(`- CMS/platform: ${f.cms ?? "unknown"}`);
  L(`- HTTPS: ${yn(f.https)} · reachable: ${yn(f.reachable)} · homepage HTTP: ${f.httpStatus ?? "n/a"}`);
  L("");
  L("## 2. Ownership");
  L(`- Normalized domain: ${f.normalizedDomain}`);
  L("");
  L("## 3. Coverage");
  L(`- Coverage score: ${scores.coverageScore}/100 (volume/years/courts/topics/updates — see evidence)`);
  L("");
  L("## 4. Access findings");
  L(`- access_status: \`${f.accessStatus}\` · technical_access_status: \`${f.technicalAccessStatus}\``);
  L(`- requires login: ${yn(f.requiresLogin)} · CAPTCHA: ${yn(f.requiresCaptcha)}`);
  L(`- Access score: ${scores.accessScore}/100`);
  L("");
  L("## 5. robots findings");
  L(`- found: ${yn(f.robots.found)} · disallows relevant paths: ${yn(f.robots.disallowsRelevantPaths)} · crawl-delay: ${f.robots.crawlDelaySeconds ?? "none"}`);
  L(`- declared sitemaps: ${f.robots.sitemaps.length}`);
  L(`- (robots is a technical signal only — NOT a license.)`);
  L("");
  L("## 6. Sitemap findings");
  L(`- found: ${yn(f.sitemap.found)} · kind: ${f.sitemap.kind} · child sitemaps: ${f.sitemap.childSitemapCount} · est. urls: ${f.sitemap.estimatedUrls}`);
  L(`- likely judgment urls (sample): ${f.sitemap.likelyJudgmentUrls} · likely pdf: ${f.sitemap.likelyPdfUrls}`);
  L("");
  L("## 7. API findings");
  L(`- has API: ${yn(f.api.hasApi)} · wp-json: ${yn(f.api.wpJson)} · openapi: ${yn(f.api.openApi)} · requires auth: ${yn(f.api.requiresAuth)}`);
  L("");
  L("## 8. Feed findings");
  L(`- RSS: ${yn(f.feed.hasRss)} · Atom: ${yn(f.feed.hasAtom)} · feeds: ${f.feed.feedUrls.length}`);
  L("");
  L("## 9. Search findings");
  L(`- public search: ${yn(f.search.hasPublicSearch)} · method: ${f.search.method} · query param: ${f.search.queryParam ?? "n/a"}`);
  L("");
  L("## 10. Document formats");
  L(`- likely PDF present: ${yn(f.sitemap.likelyPdfUrls > 0)} (from sitemap sample)`);
  L("");
  L("## 11. Metadata availability");
  L(`- metadata quality score: ${scores.metadataQualityScore}/100 (case-no/date/court/judge/parties/type/stable-id)`);
  L("");
  L("## 12. Terms and reuse findings (signals only)");
  L(`- terms url: ${f.terms.termsUrl ?? "not found"} · license url: ${f.terms.licenseUrl ?? "not found"}`);
  L(`- no-automated-access: ${yn(f.terms.noAutomatedAccess)} · no-scraping: ${yn(f.terms.noScraping)} · no-commercial: ${yn(f.terms.noCommercialUse)}`);
  L(`- open-data license: ${yn(f.terms.openDataLicense)} · public-domain claim: ${yn(f.terms.publicDomainClaim)} · permission-required: ${yn(f.terms.permissionRequired)}`);
  L(`- legal_reuse_status: \`${f.legalReuseStatus}\` · legal clarity score: ${scores.legalClarityScore}/100`);
  L("");
  L("## 13. Technical risks");
  L(`- Fragile if: WAF/anti-bot, JS-only content, or missing stable ids. technical_access_status=\`${f.technicalAccessStatus}\`.`);
  L("");
  L("## 14. Legal uncertainty");
  L(f.legalReuseStatus === "unknown"
    ? "- Reuse terms not conclusively established → MANUAL LEGAL REVIEW required before any collection."
    : `- Reuse basis: \`${f.legalReuseStatus}\` (from extracted signals; confirm with counsel for commercial use).`);
  L("");
  L("## 15. Estimated document volume");
  L(`- ${f.sitemap.estimatedUrls > 0 ? `~${f.sitemap.estimatedUrls}+ (sitemap-derived, sampled)` : "not established by this audit"}`);
  L("");
  L("## 16. Recommended access method");
  L(`- ${f.recommendedAccessMethod ?? "none determined"}`);
  L("");
  L("## 17. Collector recommendation");
  L(`- Priority score: ${scores.priorityScore}/100`);
  L(`- Build gate: **${gate.allowed ? "ALLOWED" : "DENIED"}**`);
  if (!gate.allowed) { L(`- Reasons: ${gate.reasons.join("; ")}`); L(`- Required actions: ${gate.requiredActions.join("; ")}`); }
  L("");
  L("## 18. Final status");
  L(`- **${verdict}** — ${verdict === "OPEN" ? "audited, accessible, lawful reuse — ready to build" : verdict === "ASK" ? "permission required before build" : verdict === "BLOCKED" ? "do not use (blocked/prohibited)" : "manual legal review required"}`);
  L("");
  L("## 19. Evidence and dates");
  for (const e of f.evidence) L(`- [${e.evidenceType}] ${e.url ?? ""} → HTTP ${e.statusCode ?? "n/a"} · ${e.summary} · ${e.observedAt}${e.contentHash ? ` · sha256:${e.contentHash.slice(0, 12)}` : ""}`);
  L("");
  L("## 20. Manual actions required");
  L(gate.requiredActions.length > 0 ? gate.requiredActions.map((a) => `- ${a}`).join("\n") : "- none");
  L("");
  return lines.join("\n");
}
