# Pillar B — Case-Law Foundation (Epic 3B Triad)

Module: `src/modules/legal-knowledge/case-law` (types, authority, catalog;
8 tests).

## Lawful access (researched)
Official source: the Judiciary's published-decisions system
(supremedecisions.court.gov.il / court.gov.il) + the official labor-court
ODR portal. Case law is public-domain (Copyright §6), but the database's
access terms and anti-bot controls are unconfirmed and datacenter IPs may
be blocked — so **no crawler**. Commercial DBs (Nevo/Takdin) rejected.

## Catalog
20 curated CANDIDATE judgment records across employment topics (pregnancy
dismissal, hearing duty, severance, section 14, employee-vs-contractor,
overtime, pension, discrimination, harassment, notice period, collective
arrangements, wage claims, vacation, sick leave, labor-court review).

**No fabricated case numbers**: every unverified candidate has
`caseNumberRaw=null` + `caseNumberStatus="to_verify"`, points to the
official source, is `verification="unverified"` and `access="pointer_only"`.
None may back a substantive claim until confirmed against the official
source (discovery-only). Doctrine descriptions are accurate statements of
established Israeli labor law; specific numbers await verification.
