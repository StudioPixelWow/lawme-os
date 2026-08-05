# Source Audit — רשות ניירות ערך (isa.gov.il)

Verdict: **REVIEW** · audit_status: `manual_review_required` · confidence: 0.74
Generated from 8 bounded probe(s). Claims below reflect observed evidence only.

## 1. Source summary
- URL: https://www.isa.gov.il/
- CMS/platform: unknown
- HTTPS: yes · reachable: yes · homepage HTTP: 200

## 2. Ownership
- Normalized domain: isa.gov.il

## 3. Coverage
- Coverage score: 15/100 (volume/years/courts/topics/updates — see evidence)

## 4. Access findings
- access_status: `public` · technical_access_status: `open`
- requires login: no · CAPTCHA: no
- Access score: 50/100

## 5. robots findings
- found: yes · disallows relevant paths: no · crawl-delay: none
- declared sitemaps: 1
- (robots is a technical signal only — NOT a license.)

## 6. Sitemap findings
- found: yes · kind: index · child sitemaps: 5 · est. urls: 0
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
- not established by this audit

## 16. Recommended access method
- sitemap-driven fetch

## 17. Collector recommendation
- Priority score: 17/100
- Build gate: **DENIED**
- Reasons: audit not completed; legal reuse status unknown
- Required actions: run and complete a full audit; complete legal review (manual)

## 18. Final status
- **REVIEW** — manual legal review required

## 19. Evidence and dates
- [homepage] https://www.new.isa.gov.il/ → HTTP 200 · homepage status 200 · 2026-08-05T16:39:29.375Z · sha256:447225a31c1b
- [robots] https://www.new.isa.gov.il/robots.txt → HTTP 200 · robots status 200 · 2026-08-05T16:39:29.375Z · sha256:407a7077c2c0
- [sitemap] https://www.new.isa.gov.il/sitemap.xml → HTTP 200 · sitemap index, ~0 urls · 2026-08-05T16:39:29.375Z · sha256:7cc2d715c3cf

## 20. Manual actions required
- run and complete a full audit
- complete legal review (manual)
