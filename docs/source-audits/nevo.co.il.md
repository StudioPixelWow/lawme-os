# Source Audit — נבו (מסחרי) (nevo.co.il)

Verdict: **BLOCKED** · audit_status: `manual_review_required` · confidence: 0.74
Generated from 10 bounded probe(s). Claims below reflect observed evidence only.

## 1. Source summary
- URL: https://www.nevo.co.il/
- CMS/platform: unknown
- HTTPS: yes · reachable: yes · homepage HTTP: 200

## 2. Ownership
- Normalized domain: nevo.co.il

## 3. Coverage
- Coverage score: 0/100 (volume/years/courts/topics/updates — see evidence)

## 4. Access findings
- access_status: `login_required` · technical_access_status: `robots_disallowed`
- requires login: yes · CAPTCHA: no
- Access score: 15/100

## 5. robots findings
- found: yes · disallows relevant paths: yes · crawl-delay: none
- declared sitemaps: 0
- (robots is a technical signal only — NOT a license.)

## 6. Sitemap findings
- found: no · kind: none · child sitemaps: 0 · est. urls: 0
- likely judgment urls (sample): 0 · likely pdf: 0

## 7. API findings
- has API: no · wp-json: no · openapi: no · requires auth: unknown

## 8. Feed findings
- RSS: yes · Atom: no · feeds: 1

## 9. Search findings
- public search: yes · method: POST · query param: n/a

## 10. Document formats
- likely PDF present: no (from sitemap sample)

## 11. Metadata availability
- metadata quality score: 0/100 (case-no/date/court/judge/parties/type/stable-id)

## 12. Terms and reuse findings (signals only)
- terms url: https://www.nevo.co.il/general/TermsOfUse.aspx · license url: not found
- no-automated-access: no · no-scraping: no · no-commercial: no
- open-data license: no · public-domain claim: no · permission-required: no
- legal_reuse_status: `unknown` · legal clarity score: 0/100

## 13. Technical risks
- Fragile if: WAF/anti-bot, JS-only content, or missing stable ids. technical_access_status=`robots_disallowed`.

## 14. Legal uncertainty
- Reuse terms not conclusively established → MANUAL LEGAL REVIEW required before any collection.

## 15. Estimated document volume
- not established by this audit

## 16. Recommended access method
- RSS/Atom feed

## 17. Collector recommendation
- Priority score: 4/100
- Build gate: **DENIED**
- Reasons: audit not completed; technical access 'robots_disallowed' is not usable; login required; robots disallows the relevant paths; legal reuse status unknown
- Required actions: run and complete a full audit; resolve access (allowlist/API) or mark blocked; obtain public/authorized access path; confirm scope with owner / choose allowed paths; complete legal review (manual)

## 18. Final status
- **BLOCKED** — do not use (blocked/prohibited)

## 19. Evidence and dates
- [homepage] https://www.nevo.co.il/ → HTTP 200 · homepage status 200 · 2026-08-05T16:39:37.364Z · sha256:71e8ae277502
- [robots] https://www.nevo.co.il/robots.txt → HTTP 200 · robots status 200 · 2026-08-05T16:39:37.364Z · sha256:acdf990f6570
- [search] https://www.nevo.co.il/ → HTTP 200 · search POST param=null · 2026-08-05T16:39:37.364Z · sha256:71e8ae277502
- [feed] https://www.nevo.co.il/ → HTTP 200 · feeds rss=true atom=false · 2026-08-05T16:39:37.364Z · sha256:71e8ae277502

## 20. Manual actions required
- run and complete a full audit
- resolve access (allowlist/API) or mark blocked
- obtain public/authorized access path
- confirm scope with owner / choose allowed paths
- complete legal review (manual)
