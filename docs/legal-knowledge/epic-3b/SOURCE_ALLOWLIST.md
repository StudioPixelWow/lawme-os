# Source Allowlist (Epic 3B)

Host allowlist for any adapter/importer. Autonomous fetching remains
disabled for restricted/WAF hosts (see SOURCE_ACCESS_RESEARCH.md); this
list is the ceiling of what an importer may ever touch, and the ingestion
command refuses anything not on it.

## Allowed canonical hosts (official only)
- main.knesset.gov.il — National Legislation Database (statutes/regs)
- knesset.gov.il / fs.knesset.gov.il — Knesset docs + OData metadata
- www.gov.il — extension orders (זרוע העבודה), Ministry of Labor guidance,
  Equal-Opportunity Commission, unified publications
- www.btl.gov.il — National Insurance (חוקים/תקנות/חוזרים)
- workagreements.labor.gov.il — collective agreements search
- data.gov.il — open-license datasets (metadata only)

## Discovery-only (never full text)
- www.kolzchut.org.il — terminology + official-reference discovery only

## Access mode per host (importer default)
All hosts default to **import-from-disk / human-present** mode. No host is
enabled for autonomous crawling in Epic 3B. Full-text persistence allowed
only for public-domain primary law per SOURCE_PERMISSION_REVIEW.md.
