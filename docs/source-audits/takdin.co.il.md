# Source Audit — תקדין (מסחרי) (takdin.co.il)

Verdict: **BLOCKED** · audit_status: `manual_review_required` · confidence: 0.87
Generated from 8 bounded probe(s). Claims below reflect observed evidence only.

## 1. Source summary
- URL: https://www.takdin.co.il/
- CMS/platform: unknown
- HTTPS: yes · reachable: yes · homepage HTTP: 200

## 2. Ownership
- Normalized domain: takdin.co.il

## 3. Coverage
- Coverage score: 10/100 (volume/years/courts/topics/updates — see evidence)

## 4. Access findings
- access_status: `login_required` · technical_access_status: `authentication_required`
- requires login: yes · CAPTCHA: no
- Access score: 35/100

## 5. robots findings
- found: yes · disallows relevant paths: no · crawl-delay: none
- declared sitemaps: 0
- (robots is a technical signal only — NOT a license.)

## 6. Sitemap findings
- found: yes · kind: urlset · child sitemaps: 0 · est. urls: 5
- likely judgment urls (sample): 0 · likely pdf: 0

## 7. API findings
- has API: no · wp-json: no · openapi: no · requires auth: unknown

## 8. Feed findings
- RSS: no · Atom: no · feeds: 0

## 9. Search findings
- public search: yes · method: POST · query param: n/a

## 10. Document formats
- likely PDF present: no (from sitemap sample)

## 11. Metadata availability
- metadata quality score: 0/100 (case-no/date/court/judge/parties/type/stable-id)

## 12. Terms and reuse findings (signals only)
- terms url: https://www.takdin.co.il/Privacy · license url: not found
- no-automated-access: no · no-scraping: no · no-commercial: no
- open-data license: no · public-domain claim: no · permission-required: no
- legal_reuse_status: `unknown` · legal clarity score: 0/100

## 13. Technical risks
- Fragile if: WAF/anti-bot, JS-only content, or missing stable ids. technical_access_status=`authentication_required`.

## 14. Legal uncertainty
- Reuse terms not conclusively established → MANUAL LEGAL REVIEW required before any collection.

## 15. Estimated document volume
- ~5+ (sitemap-derived, sampled)

## 16. Recommended access method
- sitemap-driven fetch

## 17. Collector recommendation
- Priority score: 12/100
- Build gate: **DENIED**
- Reasons: audit not completed; technical access 'authentication_required' is not usable; login required; legal reuse status unknown
- Required actions: run and complete a full audit; resolve access (allowlist/API) or mark blocked; obtain public/authorized access path; complete legal review (manual)

## 18. Final status
- **BLOCKED** — do not use (blocked/prohibited)

## 19. Evidence and dates
- [homepage] https://www.takdin.co.il/ → HTTP 200 · homepage status 200 · 2026-08-05T16:39:39.494Z · sha256:ab65cdedda65
- [robots] https://www.takdin.co.il/robots.txt → HTTP 200 · robots status 200 · 2026-08-05T16:39:39.494Z · sha256:8735faec674b
- [sitemap] https://www.takdin.co.il/sitemap.xml → HTTP 200 · sitemap urlset, ~5 urls · 2026-08-05T16:39:39.494Z · sha256:eff850abca56
- [search] https://www.takdin.co.il/ → HTTP 200 · search POST param=null · 2026-08-05T16:39:39.494Z · sha256:ab65cdedda65

## 20. Manual actions required
- run and complete a full audit
- resolve access (allowlist/API) or mark blocked
- obtain public/authorized access path
- complete legal review (manual)
