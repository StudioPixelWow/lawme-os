# Source Audit — data.gov.il (data.gov.il)

Verdict: **REVIEW** · audit_status: `manual_review_required` · confidence: 0.74
Generated from 8 bounded probe(s). Claims below reflect observed evidence only.

## 1. Source summary
- URL: https://data.gov.il/
- CMS/platform: unknown
- HTTPS: yes · reachable: yes · homepage HTTP: 200

## 2. Ownership
- Normalized domain: data.gov.il

## 3. Coverage
- Coverage score: 56/100 (volume/years/courts/topics/updates — see evidence)

## 4. Access findings
- access_status: `public` · technical_access_status: `open`
- requires login: no · CAPTCHA: no
- Access score: 50/100

## 5. robots findings
- found: yes · disallows relevant paths: no · crawl-delay: none
- declared sitemaps: 0
- (robots is a technical signal only — NOT a license.)

## 6. Sitemap findings
- found: yes · kind: urlset · child sitemaps: 0 · est. urls: 5036
- likely judgment urls (sample): 0 · likely pdf: 0

## 7. API findings
- has API: no · wp-json: no · openapi: no · requires auth: unknown

## 8. Feed findings
- RSS: no · Atom: no · feeds: 0

## 9. Search findings
- public search: no · method: unknown · query param: n/a

## 10. Document formats
- likely PDF present: no (from sitemap sample)

## 11. Metadata availability
- metadata quality score: 0/100 (case-no/date/court/judge/parties/type/stable-id)

## 12. Terms and reuse findings (signals only)
- terms url: not found · license url: not found
- no-automated-access: no · no-scraping: no · no-commercial: no
- open-data license: no · public-domain claim: no · permission-required: no
- legal_reuse_status: `unknown` · legal clarity score: 0/100

## 13. Technical risks
- Fragile if: WAF/anti-bot, JS-only content, or missing stable ids. technical_access_status=`open`.

## 14. Legal uncertainty
- Reuse terms not conclusively established → MANUAL LEGAL REVIEW required before any collection.

## 15. Estimated document volume
- ~5036+ (sitemap-derived, sampled)

## 16. Recommended access method
- sitemap-driven fetch

## 17. Collector recommendation
- Priority score: 29/100
- Build gate: **DENIED**
- Reasons: audit not completed; legal reuse status unknown
- Required actions: run and complete a full audit; complete legal review (manual)

## 18. Final status
- **REVIEW** — manual legal review required

## 19. Evidence and dates
- [homepage] https://data.gov.il/ → HTTP 200 · homepage status 200 · 2026-08-05T16:39:18.903Z · sha256:51c137206376
- [robots] https://data.gov.il/robots.txt → HTTP 200 · robots status 200 · 2026-08-05T16:39:18.903Z · sha256:e4faa5942c7a
- [sitemap] https://data.gov.il/sitemap.xml → HTTP 200 · sitemap urlset, ~5036 urls · 2026-08-05T16:39:18.903Z · sha256:71931f6617cf

## 20. Manual actions required
- run and complete a full audit
- complete legal review (manual)
