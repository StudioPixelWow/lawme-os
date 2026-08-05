# Source Audit — Judgments.org.il (judgments.org.il)

Verdict: **REVIEW** · audit_status: `manual_review_required` · confidence: 1
Generated from 4 bounded probe(s). Claims below reflect observed evidence only.

## 1. Source summary
- URL: https://judgments.org.il/
- CMS/platform: wordpress
- HTTPS: yes · reachable: yes · homepage HTTP: 200

## 2. Ownership
- Normalized domain: judgments.org.il

## 3. Coverage
- Coverage score: 15/100 (volume/years/courts/topics/updates — see evidence)

## 4. Access findings
- access_status: `public` · technical_access_status: `open`
- requires login: no · CAPTCHA: no
- Access score: 100/100

## 5. robots findings
- found: yes · disallows relevant paths: no · crawl-delay: 5
- declared sitemaps: 1
- (robots is a technical signal only — NOT a license.)

## 6. Sitemap findings
- found: yes · kind: index · child sitemaps: 828 · est. urls: 0
- likely judgment urls (sample): 20 · likely pdf: 0

## 7. API findings
- has API: yes · wp-json: yes · openapi: no · requires auth: no

## 8. Feed findings
- RSS: yes · Atom: no · feeds: 2

## 9. Search findings
- public search: yes · method: GET · query param: s

## 10. Document formats
- likely PDF present: no (from sitemap sample)

## 11. Metadata availability
- metadata quality score: 0/100 (case-no/date/court/judge/parties/type/stable-id)

## 12. Terms and reuse findings (signals only)
- terms url: https://judgments.org.il/%d7%aa%d7%a0%d7%90%d7%99-%d7%a9%d7%99%d7%9e%d7%95%d7%a9-%d7%91%d7%90%d7%aa%d7%a8/ · license url: https://judgments.org.il/article-category/%d7%93%d7%99%d7%a0%d7%99-%d7%aa%d7%a2%d7%91%d7%95%d7%a8%d7%94/%d7%a7%d7%95%d7%a8%d7%a7%d7%99%d7%a0%d7%98%d7%99%d7%9d-%d7%a7%d7%98%d7%99%d7%a0%d7%99%d7%9d-%d7%95%d7%a8%d7%99%d7%a9%d7%99%d7%95%d7%9f-%d7%a0%d7%94%d7%99%d7%92%d7%94-%d7%a2%d7%aa%d7%99%d7%93%d7%99/
- no-automated-access: no · no-scraping: no · no-commercial: no
- open-data license: no · public-domain claim: no · permission-required: no
- legal_reuse_status: `unknown` · legal clarity score: 0/100

## 13. Technical risks
- Fragile if: WAF/anti-bot, JS-only content, or missing stable ids. technical_access_status=`open`.

## 14. Legal uncertainty
- Reuse terms not conclusively established → MANUAL LEGAL REVIEW required before any collection.

## 15. Estimated document volume
- not established by this audit

## 16. Recommended access method
- wp-json REST API

## 17. Collector recommendation
- Priority score: 30/100
- Build gate: **DENIED**
- Reasons: audit not completed; legal reuse status unknown
- Required actions: run and complete a full audit; complete legal review (manual)

## 18. Final status
- **REVIEW** — manual legal review required

## 19. Evidence and dates
- [homepage] https://judgments.org.il/ → HTTP 200 · homepage status 200 · 2026-08-05T16:39:41.491Z · sha256:f8e84c703530
- [robots] https://judgments.org.il/robots.txt → HTTP 200 · robots status 200 · 2026-08-05T16:39:41.491Z · sha256:83b17b1ae863
- [sitemap] https://judgments.org.il/sitemaps/sitemap_index.xml → HTTP 200 · sitemap index, ~0 urls · 2026-08-05T16:39:41.491Z · sha256:291a5cd3f4e7
- [api] https://judgments.org.il/wp-json/ → HTTP 200 · wp-json present · 2026-08-05T16:39:41.491Z · sha256:4f7cbff870d6
- [search] https://judgments.org.il/ → HTTP 200 · search GET param=s · 2026-08-05T16:39:41.491Z · sha256:f8e84c703530
- [feed] https://judgments.org.il/ → HTTP 200 · feeds rss=true atom=false · 2026-08-05T16:39:41.491Z · sha256:f8e84c703530

## 20. Manual actions required
- run and complete a full audit
- complete legal review (manual)
