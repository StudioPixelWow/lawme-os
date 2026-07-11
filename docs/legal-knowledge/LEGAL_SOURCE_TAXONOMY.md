# LawME — Official Legal Source Taxonomy

Every source in the LawME knowledge system belongs to one or more of these
seven categories. The category drives trust tier, ingestion policy and
priority (see LAWME_SOURCE_TRUST_MODEL.md, SOURCE_SCORING_MODEL.md).

## A. Primary judicial sources (מקורות שיפוטיים ראשוניים)
Supreme Court · District courts · Magistrates courts · Labor courts ·
Family courts (where publication is lawful) · Administrative courts ·
Rabbinical courts · Military courts (where public) · Sharia & Druze
religious courts · Disciplinary tribunals · Appeal bodies (tax, planning
& building committees) · Specialized judicial bodies (Competition
Tribunal, land-registration supervisors, patent & trademark adjudicators).
**Rule:** the judgment text itself is copyright-free (Copyright Act 2007
§6); collection wrappers may still assert database rights.

## B. Primary legislation sources (חקיקה)
National Legislation Database · Knesset legislation · Regulations
(תקנות) · Orders (צווים) · Official Gazette (רשומות: ספר החוקים, קובץ
התקנות, ילקוט הפרסומים) · Historical versions · Amendment history ·
Entry-into-force dates · Transitional provisions.
**Rule:** every statute reference must carry a version date.

## C. Legislative-process sources (הליך החקיקה)
Bills (הצעות חוק) · Memoranda (תזכירי חוק) · Explanatory notes (דברי
הסבר) · Committee protocols · Plenary discussions · Knesset Research and
Information Center (ממ"מ) studies.
**Use:** interpretation support (legislative intent), change monitoring.

## D. Regulators and public authorities (רגולטורים ורשויות)
Attorney General guidance · State Attorney guidance · Privacy Protection
Authority · Competition Authority · Tax Authority · National Insurance
Institute · Capital Market Authority · Securities Authority · Bank of
Israel · Israel Land Authority · Ministry of Labor (extension orders,
collective agreements) · Ministry of Health · Registrar of Companies ·
Registrar of Patents · Supervisors of Land Registration · Planning &
building appeals · Government procurement · Freedom of Information
decisions · Professional disciplinary authorities · State Comptroller.
**Rule:** binding force varies (directives vs guidance) — record it.

## E. Open secondary sources (מקורות משניים פתוחים)
Kol Zchut · Academic open-access journals · University repositories ·
Public legal articles · Open research papers · Public policy reports ·
State Comptroller reports · Public legal guides · Public legal datasets
(data.gov.il, HuggingFace corpora, Wikisource).
**Rule:** may discover issues; never the final authority for a claim.

## F. Commercial and licensed sources (מקורות מסחריים)
Nevo · Takdin · LawData · Legalmate · Cligal · TechDin · Lizzy AI ·
other licensed databases and AI products.
**Rule:** researched at business-intelligence level only; never accessed
automatically without a license/permission (COMMERCIAL_DATA_RFI.md).

## G. Firm-private sources (מקורות פנימיים של המשרד)
Pleadings · Contracts · Legal opinions · Approved templates · Partner
notes · Research memoranda · Client documents · Hearing summaries ·
Negotiation history · Prior matter outcomes · Internal playbooks · Firm
clause library.
**Rule:** RLS-guarded, never leave the firm's tenancy, highest
confidentiality; provenance tracked like any other source.

## Cross-cutting attributes
Every source record additionally carries: primary/secondary, official/
unofficial, public/restricted, commercial/non-commercial, and the full
field set of LAWME_LEGAL_SOURCE_REGISTRY.schema.json. A source may hold
multiple categories (e.g. data.gov.il spans B/D/E) — the registry keeps
one row per distinct endpoint with category noted per role.
