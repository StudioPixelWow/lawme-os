# LawME — Master Legal Source Registry (מרשם המקורות המשפטיים)

**134 unique sources · researched and verified 2026-07-11 (Epic 0, Phases 3-6).**
Machine-readable versions: `LAWME_LEGAL_SOURCE_REGISTRY.csv` (all ~45 fields
per source) and `LAWME_LEGAL_SOURCE_REGISTRY.records.json` (validated against
`LAWME_LEGAL_SOURCE_REGISTRY.schema.json`). Raw research files with full
notes: `research/*.json` (7 files, one per research track).

## Methodology & honesty rules
- Every source was researched live (WebSearch + WebFetch), July 2026.
  `verified` records HOW existence was confirmed: `url_opened` (page
  fetched), `partial` (site confirmed but fetch blocked from the research
  environment — gov.il WAF, geo-blocks, robots), `search_result_only`.
- **No permission was inferred.** `rag_permission` is `unknown` unless an
  explicit license was observed. Free-to-view was never treated as
  open-for-reuse.
- Scores (reliability/authority 0-100) are analyst estimates, not
  measurements — they feed the scoring model in SOURCE_SCORING_MODEL.md.
- 17 duplicate URLs across research tracks were merged (notes preserved).
- Category G (firm-private) has no external sources by definition; its
  document types are covered by the unified schema and the taxonomy below.

## Statistics
| Metric | Count |
|---|---|
| Total unique sources | 134 |
| A-judicial | 32 · B-legislation 10 · C-legislative-process 10 · D-regulators 27 · E-open-secondary 42 · F-commercial 13 |
| Primary sources | 71 (incl. dual-role) |
| Secondary sources | 70 (incl. dual-role) |
| Commercial | 19 |
| With API or feed | 55 |
| Permission required | 17 |
| Restricted access | 13 |
| P0 (critical foundation) | 23 |
| P1 (high value) | 37 |

## Key structural findings
1. **No official bulk API exists for Israeli case law.** The judiciary
   publishes through supremedecisions.court.gov.il (with undocumented but
   deterministic JSON/download endpoints), Net HaMishpat, and gov.il
   "collector" pages backed by undocumented JSON backends. Ingestion =
   structured scraping + data agreements, not a public API.
2. **Judgment TEXT is copyright-free** (Copyright Act 2007 §6) — but
   commercial wrappers (Nevo/Takdin/Lawdata) assert database rights over
   their collections. The open path is official upstream + open mirrors.
3. **data.gov.il CKAN API verified live** — companies registry (253MB,
   daily), amutot registry, procurement, enforcement data. The single
   best structured-data gateway.
4. **Knesset OData confirmed but geo/WAF-blocked (HTTP 474) from non-IL
   clouds**; hasadna's oknesset dumps (60k+ bills, datapackage format)
   are the working mirror. Production ingestion needs Israeli egress.
5. **HuggingFace hosts a 751,194-verdict Supreme Court corpus (5.31GB
   parquet, OpenRAIL)** — the largest open case-law asset found; license
   caveats flagged for commercial use.
6. **gov.il is one platform**: ~10 regulators publish through the same
   collector/publication JSON backend — one ingestion pipeline covers AG
   guidelines, State Attorney, extension orders, circulars, and more.
7. Google Scholar does NOT index Israeli case law; Isracourt is defunct;
   openlaw.org.il is consolidated legislation (not judgments).

## Registry tables (compact — full detail in CSV/JSON)

### A-judicial (32)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-036 | הרשות השופטת - אתר בתי המשפט | [The Israeli Judiciary (Judicial Authority) - Courts Website](https://court.gov.il/) | P1 | — | free web | unknown | url_opened |
| LSR-037 | נט המשפט - פורטל הציבור (עיון בתיקים ופרסום החלטות) | [Net HaMishpat public portal (case inquiry and decision publication)](https://www.court.gov.il/ngcs.web.site/homepage.aspx) | P0 | — | free web; some functions need government SSO login | unknown | url_opened |
| LSR-038 | מאגר פסקי הדין וההחלטות של בית המשפט העליון | [Supreme Court of Israel decisions database (supremedecisions)](https://supremedecisions.court.gov.il/) | P0 | — | free web, no login | unknown | url_opened |
| LSR-039 | אתר בית המשפט העליון | [Supreme Court of Israel official website](https://supreme.court.gov.il/) | P2 | — | free web | unknown | partial |
| LSR-040 | פסקי דין והחלטות שהופצו על ידי מערך הדוברות - הרשות השופטת | [Judgments and decisions distributed by the Judiciary Spokesperson unit (gov.il collector)](https://www.gov.il/he/departments/dynamiccollectors/spokmanship_court) | P0 | — | free web, no login | unknown | partial |
| LSR-041 | מאגר פסקי דין - היחידה לחופש המידע (data.gov.il) | [Judgments dataset - Freedom of Information Unit, data.gov.il](https://data.gov.il/dataset/judgments) | P2 | API | free open data | likely permitted for reuse (open license) - confirm exact license text | url_opened |
| LSR-042 | פורטל בתי הדין - משרד המשפטים (UniCourt) | [Ministry of Justice tribunals portal (unicourt.justice.gov.il)](https://unicourt.justice.gov.il/) | P1 | — | free web | unknown | partial |
| LSR-043 | פסקי דין - בתי הדין הרבניים (gov.il) | [Rabbinical Courts published rulings database (gov.il collector)](https://www.gov.il/he/Departments/DynamicCollectors/verdict_the_rabbinical_courts) | P1 | — | free web, no login | unknown | url_opened |
| LSR-044 | אתר פסקי דין רבניים (מכון פסקים) | [Psakim.org - rabbinical monetary-law rulings archive](https://www.psakim.org/) | P2 | — | free web | unknown - nonprofit mission is public accessibility; ask permission | url_opened |
| LSR-045 | פסקי דין של בתי הדין הרבניים בישראל (פד"ר) - אתר דעת | [Digitized Rabbinical Courts reports (PDR volumes) on Daat](https://www.daat.ac.il/he-il/mishpat_ivri/psakim1) | P3 | feed | free web | unknown | search_result_only |
| LSR-046 | פסקי דין ייחודיים של בתי הדין לעבודה מתורגמים לאנגלית (gov.il) | [Selected Labor Court judgments translated to English (gov.il collector)](https://www.gov.il/he/departments/dynamiccollectors/labor_court_verdicts) | P2 | — | free web, no login | unknown | url_opened |
| LSR-047 | פסקי דין - המפקחים על רישום מקרקעין (gov.il) | [Judgments of the Supervisors of Land Registration (condominium disputes)](https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict) | P1 | — | free web, no login | unknown | url_opened |
| LSR-048 | החלטות רשם הפטנטים, המדגמים וסימני המסחר (gov.il) | [Israel Patent Office registrar decisions database](https://www.gov.il/he/departments/dynamiccollectors/registrar-decisions-db) | P1 | — | free web | unknown | partial |
| LSR-049 | מאגר המידע של רשות התחרות (כולל החלטות בית הדין לתחרות) | [Israel Competition Authority database (incl. Competition Tribunal matters)](https://www.gov.il/he/departments/dynamiccollectors/database-trial) | P1 | — | free web, no login | unknown | url_opened |
| LSR-050 | מבא"ת - מידע תכנוני: החלטות ועדות ערר לתכנון ובנייה | [Mavat national planning portal - planning appeal committee decisions/protocols](https://mavat.iplan.gov.il/SV3?searchEntity=3) | P2 | — | free web, no login | unknown | partial |
| LSR-051 | ועדות ערר בסמכות בתי המשפט המחוזיים (כולל ועדות ערר מיסוי מקרקעין) | [Appeal committees under district courts (incl. real-estate tax appeal committees)](https://www.gov.il/he/pages/appeal_committees_district_courts) | P3 | feed | free web | unknown | partial |
| LSR-052 | פדאור אתיקה - מאגר החלטות ועדות האתיקה ובתי הדין המשמעתיים של לשכת עורכי הדין | [Israel Bar Association ethics and disciplinary decisions (Pador Etika free access)](https://www.israelbar.org.il/article.asp?catid=2777&menu=2) | License-needed | — | free access announced (Pador Etika 'free'), possibly registration-gated | unknown | partial |
| LSR-053 | פסקי דין והחלטות - בתי הדין הצבאיים (צה"ל) | [IDF Military Courts - published judgments and decisions](https://www.idf.il/אתרי-יחידות/בתי-הדין-הצבאיים/פסקי-דין-והחלטות/) | P3 | — | free web | unknown | search_result_only |
| LSR-054 | פסקי דין - בתי הדין השרעיים (gov.il) | [Sharia Courts published rulings database (gov.il collector)](https://www.gov.il/he/departments/dynamiccollectors/shrais-verdicts) | P2 | — | free web | unknown | search_result_only |
| LSR-055 | judgments.org.il - המאגר המשפטי החופשי | [Judgments.org.il free case-law database](https://judgments.org.il/) | P2 | — | free, no login | unknown | url_opened |
| LSR-056 | verdicts.co.il - החלטות ופסקי דין פליליים | [Verdicts.co.il free criminal decisions repository](https://www.verdicts.co.il/) | P3 | — | free, no login | unknown | url_opened |
| LSR-057 | תולעת המשפט | [Tolaat HaMishpat (court-case metadata and decisions search)](https://תולעת-המשפט.משפט/) | Research-only | — | free web | unknown | partial |
| LSR-058 | מאגר פסיקת בית המשפט העליון - האוניברסיטה העברית (ISCD) | [The Israeli Supreme Court Database (Hebrew University)](https://iscd.huji.ac.il/) | P2 | feed | free academic access (registration may apply) | unknown | partial |
| LSR-059 | מאגר בתי משפט ובתי דין - data.gov.il (CKAN API) | [data.gov.il CKAN platform - courts/judgments datasets gateway](https://data.gov.il/api/3/action/package_show?id=judgments) | P2 | API | free open API | generally permissive for open datasets - verify per dataset | url_opened |
| LSR-079 | law.co.il - פורטל המשפט של חיים רביה | [law.co.il (Haim Ravia internet & IT law portal)](https://www.law.co.il) | P3 | feed | free (registration only for personalized features) | no (would need permission from the firm) | url_opened |
| LSR-080 | איזראקורט | [Isracourt](https://www.isracourt.com) | P3 | — | defunct | n/a | partial |
| LSR-081 | MyJudgments - מאגר פסקי דין בישראל | [MyJudgments.com](https://www.myjudgments.com) | P2 | — | free, no registration | unknown | url_opened |
| LSR-082 | גוגל סקולר (כיסוי פסיקה ישראלית) | [Google Scholar (Israeli case-law coverage)](https://scholar.google.com) | Research-only | feed | free | no | search_result_only |
| LSR-083 | ויקיטקסט - פסקי דין | [Hebrew Wikisource - Israeli court judgments](https://he.wikisource.org) | P1 | API | free and open | yes (with CC BY-SA attribution for any annotation layers) | search_result_only |
| LSR-084 | baguette - סורק מאגר פסקי הדין של בית המשפט העליון | [GitHub: andyil/baguette (Israel Supreme Court scraper)](https://github.com/andyil/baguette) | Research-only | — | free/open source | code reusable; output governed by court website terms | url_opened |
| LSR-085 | מאגר פסיקה ישראלית ב-HuggingFace | [HuggingFace dataset: guychuk/case-law-israel](https://huggingface.co/datasets/guychuk/case-law-israel) | P2 | API | free download | technically feasible; legally defensible for judgment text (s.6 Copyright Act) but provenance/privacy unvetted | url_opened |
| LSR-086 | פרויקט ורסה - תרגומי פסיקת בית המשפט העליון (קרדוזו) | [VERSA - Cardozo Israeli Supreme Court Project](https://versa.cardozo.yu.edu) | P2 | — | free | unknown - ask project; academic nonprofit likely amenable | url_opened |

### B-legislation (10)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-060 | מאגר החקיקה הלאומי | [National Legislation Database (Knesset)](https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawhome.aspx) | P0 | API | free | likely permissible for statutory text (no copyright in laws); confirm Knesset site terms for scraped scans/UI content | partial |
| LSR-065 | רשומות — העיתון הרשמי (ספר החוקים, קובץ התקנות, ילקוט הפרסומים) | [Reshumot — Official Gazette of Israel on gov.il](https://www.gov.il/he/departments/dynamiccollectors/gazette-official) | P0 | — | free | legal texts reusable (no copyright in laws); gov.il scraping subject to site terms/WAF | url_opened |
| LSR-067 | ספר החוקים הפתוח (ויקיטקסט) | [The Open Book of Laws (Hebrew Wikisource consolidated statutes)](https://he.wikisource.org/wiki/ספר_החוקים_הפתוח) | P0 | API | free | yes, with CC BY-SA attribution/share-alike for the consolidated editorial layer | partial |
| LSR-068 | ספר החוקים הפתוח — openlaw.org.il | [OpenLaw.org.il (Open Law project portal)](https://www.openlaw.org.il/) | P1 | — | free | yes, with attribution (CC BY-SA) | url_opened |
| LSR-070 | מאגרי מידע ממשלתיים — data.gov.il (חקיקה ונתוני כנסת) | [data.gov.il — legislation-related open datasets (CKAN)](https://data.gov.il/dataset?q=חקיקה) | P1 | API | free | generally yes for open-data resources; verify per dataset | url_opened |
| LSR-071 | מאגר האסדרה (מאגר הרגולציה) | [National Regulation Database (Regulatory Authority)](https://www.gov.il/he/departments/dynamiccollectors/regulationdatabase) | P2 | API | free | likely yes (open data), verify license field | partial |
| LSR-073 | העיתון הרשמי של ממשלת המנדט (Palestine Gazette) — ארכיון המדינה ב-Pinpoint | [Palestine Gazette 1921-1948 (Israel State Archives, Google Pinpoint collection)](https://journaliststudio.google.com/pinpoint/search?collection=7ded851a300df5a6) | P2 | — | free | texts themselves public domain; bulk extraction from Pinpoint restricted — source scans from the Archives directly for bulk use | url_opened |
| LSR-074 | קטלוג ארכיון המדינה | [Israel State Archives online catalog](https://catalog.archives.gov.il/site/catalog/) | P3 | — | free (account registration required for some viewing/ordering) | case-by-case; old official publications generally public domain | url_opened |
| LSR-077 | ממשק מסמכי רשומות של משרד המשפטים (SearchPredefinedApi) | [Ministry of Justice Reshumot document delivery API (rfa.justice.gov.il / free-justice.openapi.gov.il)](https://free-justice.openapi.gov.il/free/moj/portal/rest/searchpredefinedapi/v1/SearchPredefinedApi/Documents/) | Research-only | API | free (opaque tokenized document URLs) | content yes; endpoint usage terms unknown | search_result_only |
| LSR-109 | פרויקט knesset-data של הסדנא לידע ציבורי (GitHub) | [hasadna/knesset-data - Knesset data tools and pipelines (GitHub)](https://github.com/hasadna/knesset-data) | P2 | feed | open | yes | url_opened |

### C-legislative-process (10)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-061 | ממשק הנתונים הפתוח של הכנסת (OData) | [Knesset OData API (ParliamentInfo service)](https://knesset.gov.il/Odata/ParliamentInfo.svc) | P0 | API | free | metadata reuse widely practiced (hasadna, MCP servers, academic use); confirm formal terms | partial |
| LSR-062 | הצעות חוק באתר הכנסת (מאגר החקיקה — מודול הצעות חוק) | [Knesset Bills (Hatza'ot Chok) search](https://main.knesset.gov.il/apps/legislation/main/bills) | P1 | API | free | likely permissible for bill texts; confirm site terms | partial |
| LSR-063 | פרוטוקולים של ועדות הכנסת | [Knesset committee protocols](https://m.knesset.gov.il/activity/committees/pages/allcommitteeprotocols.aspx) | P1 | API | free | likely permissible (official proceedings); confirm terms; note privacy of speakers' remarks | partial |
| LSR-064 | פרוטוקולי מליאת הכנסת / דברי הכנסת | [Knesset plenum transcripts (Divrei HaKnesset)](https://main.knesset.gov.il/Activity/plenum/pages/plenumallprotocols.aspx) | P1 | API | free | likely permissible (official proceedings); confirm terms | partial |
| LSR-066 | אתר החקיקה הממשלתי (תזכירי חוק) | [Government Legislation Site — legislation memoranda (Tazkirim)](https://www.tazkirim.gov.il/) | P1 | — | free | likely permissible; confirm terms | partial |
| LSR-069 | מרכז המחקר והמידע של הכנסת (ממ"מ) | [Knesset Research and Information Center (RIC / MMM) publications](https://main.knesset.gov.il/Activity/Info/Research/pages/default.aspx) | P1 | — | free | likely permissible with attribution as official parliamentary research; confirm terms | partial |
| LSR-072 | מאגרי נתוני הכנסת של הסדנא לידע ציבורי (knesset-data) | [Hasadna knesset-data pipelines and CSV dumps (oknesset)](https://production.oknesset.org/pipelines/data/) | P1 | API | free | yes for metadata tables; attribute hasadna; verify freshness | url_opened |
| LSR-075 | עמוד תהליך החקיקה באתר הכנסת | [Knesset legislative-process documentation pages](https://main.knesset.gov.il/Activity/Legislation/Pages/default.aspx) | P2 | — | free | likely permissible; low volume | url_opened |
| LSR-076 | ממשק המסמכים של הכנסת (fs.knesset.gov.il) | [Knesset document file server (fs.knesset.gov.il globaldocs)](https://fs.knesset.gov.il/) | P1 | — | free (direct URLs, no UI) | likely permissible for official documents; confirm terms | partial |
| LSR-078 | הכנסת — שידורי ופרוטוקולי מליאה מקוונים (online.knesset.gov.il) | [Knesset online plenum system](https://online.knesset.gov.il/app) | P3 | — | free | unknown | search_result_only |

### D-regulators (27)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-099 | מאגר חברות - רשם החברות (ica_companies) | [Israeli Companies Registry Extract (Registrar of Companies)](https://data.gov.il/dataset/ica_companies) | P0 | API | open | yes (metadata/registry data, open license) | url_opened |
| LSR-100 | פרטי שינויים בחברות ושותפויות (ica-changes) | [Changes in Companies and Partnerships (Corporations Authority)](https://data.gov.il/dataset/ica-changes) | P1 | API | open | yes with attribution | partial |
| LSR-101 | מאגר עמותות וחברות לתועלת הציבור (moj-amutot) | [Registry of Amutot (NPOs) and Public Benefit Companies](https://data.gov.il/dataset/moj-amutot) | P0 | API | open | yes | url_opened |
| LSR-104 | טבלאות רשות האכיפה והגבייה (הוצאה לפועל) | [Enforcement and Collection Authority Statistical Tables (Hotzaa LaPoal)](https://data.gov.il/dataset/tables) | P3 | API | open | yes for CC-BY items; caution on unlicensed | partial |
| LSR-105 | רשימת חברות ממשלתיות ודירקטורים מכהנים (gsa) | [Government Companies and Serving Directors List](https://data.gov.il/dataset/gsa) | P2 | API | open | yes with attribution | partial |
| LSR-111 | תקן בנקאות פתוחה בישראל (Open Banking IL) | [Israel Open Banking Standard (Bank of Israel Banking Supervision)](https://www.boi.org.il/roles/supervisionregulation/bank-sup/open-banking/open_banking_standart/) | Research-only | — | open (standard documents public; the APIs themselves are bank-customer consented, not open data) | yes (regulatory documents) | search_result_only |
| LSR-114 | הנחיות היועצת המשפטית לממשלה | [Attorney General Guidelines Database](https://www.gov.il/he/departments/dynamiccollectors/legal-advisor-guidelines) | P0 | — | free | unknown | partial |
| LSR-115 | הנחיות פרקליט המדינה | [State Attorney Guidelines Database](https://www.gov.il/he/Departments/DynamicCollectors/guidelines-state-attorney) | P0 | — | free | unknown | partial |
| LSR-116 | הרשות להגנת הפרטיות - הנחיות, מדיניות ואכיפה | [Privacy Protection Authority - Guidelines, Policy and Enforcement](https://www.gov.il/he/departments/the_privacy_protection_authority/govil-landing-page) | P0 | — | free | unknown | url_opened |
| LSR-117 | רשות התחרות - מאגר החלטות הממונה | [Israel Competition Authority - Director General Decisions Database](https://www.gov.il/he/departments/topics/subjectdecisions) | P0 | — | free | unknown | url_opened |
| LSR-118 | רשות המסים - חוזרים מקצועיים, הוראות ביצוע והחלטות מיסוי | [Israel Tax Authority - Professional Circulars, Execution Instructions and Tax Rulings](https://www.gov.il/he/service/preliminary-taxation-decisions) | P0 | — | free | unknown | partial |
| LSR-119 | המוסד לביטוח לאומי - חוקים, תקנות, חוזרים וזכויות | [National Insurance Institute - Laws, Regulations, Circulars and Rights Information](https://www.btl.gov.il/Pages/default.aspx) | P1 | — | free | unknown | url_opened |
| LSR-120 | רשות שוק ההון, ביטוח וחיסכון - חוזרים והסדרה | [Capital Market, Insurance and Savings Authority - Circulars and Regulation](https://www.gov.il/he/departments/policies/hozrim) | P1 | — | free | unknown | partial |
| LSR-121 | רשות ניירות ערך - החלטות, עמדות סגל ואכיפה | [Israel Securities Authority - Decisions, Staff Positions and Enforcement](https://www.new.isa.gov.il/) | P1 | — | free | unknown | url_opened |
| LSR-122 | בנק ישראל - הפיקוח על הבנקים - הוראות ניהול בנקאי תקין | [Bank of Israel - Banking Supervision - Proper Conduct of Banking Business Directives](https://www.boi.org.il/roles/supervisionregulation/) | P0 | — | free | unknown | url_opened |
| LSR-123 | רשות מקרקעי ישראל - קובץ החלטות מועצת מקרקעי ישראל | [Israel Land Authority - Israel Land Council Decisions](https://apps.land.gov.il/CouncilDecisions/) | P1 | — | free | unknown | partial |
| LSR-124 | זרוע העבודה - מאגר צווי הרחבה | [Ministry of Labor - Extension Orders Database](https://www.gov.il/he/Departments/dynamiccollectors/extension-orders) | P0 | — | free | unknown | partial |
| LSR-125 | משרד העבודה - מערכת חיפוש הסכמים קיבוציים | [Ministry of Labor - Collective Agreements Registry Search](https://workagreements.labor.gov.il/) | P1 | — | free | unknown | partial |
| LSR-126 | משרד הבריאות - חוזרי מנכ"ל וחוזרים מקצועיים | [Ministry of Health - Director General and Professional Circulars](https://www.gov.il/he/collectors/policies?officeId=104cb0f4-d65a-4692-b590-94af928c19c0) | P1 | — | free | unknown | url_opened |
| LSR-127 | רשות התאגידים - רשם החברות | [Israel Corporations Authority - Registrar of Companies](https://www.gov.il/he/departments/israeli_corporations_authority/govil-landing-page) | P1 | API | free | unknown | partial |
| LSR-128 | היחידה הממשלתית לחופש המידע - חוות דעת והכרעות | [Governmental Freedom of Information Unit - Legal Opinions and Decisions](https://foi.gov.il/he/homepage) | P2 | — | free | unknown | partial |
| LSR-129 | מינהל הרכש הממשלתי - מכרזים והודעות פטור | [Government Procurement Administration - Tenders and Exemption Notices (mr.gov.il)](https://mr.gov.il/ilgstorefront/he) | P2 | — | free | unknown | url_opened |
| LSR-130 | מינהל התכנון - מערכת מידע תכנוני (מבא"ת) והחלטות ועדות ערר | [Planning Administration - Planning Information System (Mavat) and Appeal Committee Decisions](https://mavat.iplan.gov.il/SV3) | P2 | — | free | unknown | partial |
| LSR-131 | מבקר המדינה ונציב תלונות הציבור - דוחות ביקורת | [State Comptroller and Ombudsman - Audit Reports](https://www.mevaker.gov.il/he) | P2 | — | free | unknown | url_opened |
| LSR-132 | רשות האכיפה והגבייה - נהלים והוצאה לפועל | [Enforcement and Collection Authority - Procedures and Execution Office](https://www.gov.il/he/departments/law_enforcement_and_collection_system_authority/govil-landing-page) | P2 | — | free | unknown | partial |
| LSR-133 | Gov.il - מערכת הפרסומים האחודה (מדיניות ונהלים / פרסומים) | [Gov.il Unified Publications and Policies Collectors](https://www.gov.il/he/collectors/publications) | P0 | API | free | unknown | url_opened |
| LSR-134 | data.gov.il - פורטל הנתונים הפתוחים הממשלתי | [data.gov.il - Israel Government Open Data Portal (CKAN)](https://data.gov.il/) | P0 | API | free | yes for open-licensed datasets (check per dataset) | url_opened |

### E-open-secondary (42)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-001 | משפטים - כתב העת של הפקולטה למשפטים, האוניברסיטה העברית | [Mishpatim - Hebrew University Law Review](https://lawjournal.huji.ac.il/) | P1 | — | open | unclear - academic copyright, no reuse license; index/metadata safe, full-text ingestion needs permission | url_opened |
| LSR-002 | עיוני משפט - כתב העת של הפקולטה למשפטים, אוניברסיטת תל אביב | [Iyunei Mishpat - Tel Aviv University Law Review](https://www.taulawreview.sites.tau.ac.il/) | License-needed | — | open (restricted-use terms) | restricted - explicit non-commercial/academic-only clause; commercial legal-tech RAG requires license | url_opened |
| LSR-003 | מחקרי משפט - כתב העת של הפקולטה למשפטים, אוניברסיטת בר-אילן | [Mehkarei Mishpat - Bar-Ilan University Law Studies](https://law.biu.ac.il/en/node/527) | P3 | — | metadata-only online; full text via print purchase (BIU Press) and closed databases (Nevo) | no - full text not openly available | url_opened |
| LSR-004 | משפט וממשל | [Mishpat u-Mimshal (Law and Government) - University of Haifa](https://law.haifa.ac.il/law-journals/law-and-government/) | P1 | feed | open - full-issue and article PDFs hosted on faculty site (law.haifa.ac.il/wp-content/uploads/...) | unclear - open PDFs but no reuse license | search_result_only |
| LSR-005 | דין ודברים - כתב עת משפטי בין-תחומי | [Din u-Dvarim (Haifa Law Review) - University of Haifa](https://law.haifa.ac.il/law-journals/haifa-law-review/) | P2 | — | open - issue PDFs hosted on faculty site | unclear - open PDFs but no reuse license | search_result_only |
| LSR-006 | המשפט - כתב העת של בית הספר למשפטים, המסלול האקדמי המכללה למינהל | [HaMishpat Law Review - College of Management Academic Studies (COLMAN)](https://hamishpat.colman.ac.il/) | P3 | feed | metadata/TOC open; full text mostly not free (volume purchase via editorial office) | no for full text; metadata harvesting feasible | url_opened |
| LSR-007 | חוקים - כתב עת על חקיקה | [Hukim - Journal on Legislation](https://law.huji.ac.il/hukim) | P2 | — | open - issue pages with full articles hosted on law.huji.ac.il | unclear - open text, no reuse license | search_result_only |
| LSR-008 | הפרקליט | [HaPraklit - Israel Bar Association Law Journal](http://www.hapraklit.co.il/) | License-needed | — | open in browser; article PDFs hosted under /_Uploads/dbsAttachedFiles/; site blocks automated fetchers (403) | unclear - no license; site anti-bot posture suggests permission needed | search_result_only |
| LSR-009 | לשכת עורכי הדין - פרסומים וביטאון 'אתיקה מקצועית' | [Israel Bar Association - Publications and 'Professional Ethics' Bulletin](https://israelbar.cld.bz/) | P2 | — | open - flipbook library (cld.bz platform) with ethics bulletins and annual activity reports; main site israelbar.org.il blocks automated fetchers (403) | unclear - official professional-body guidance, but no reuse license; ethics guidance has quasi-normative value | url_opened |
| LSR-010 | המכון הישראלי לדמוקרטיה | [Israel Democracy Institute (IDI)](https://www.idi.org.il/) | P1 | — | open - free downloads ('הורדה חינם') of books, policy papers, position papers | unclear - free access but rights reserved; permission recommended for full-text RAG | url_opened |
| LSR-011 | פורום קהלת | [Kohelet Policy Forum](https://www.kohelet.org.il/) | P2 | — | open - policy papers freely downloadable, no registration | unclear | url_opened |
| LSR-012 | המכון למחקרי ביטחון לאומי (INSS) | [Institute for National Security Studies (INSS)](https://www.inss.org.il/) | P2 | — | open - publications freely accessible on site | unclear | url_opened |
| LSR-013 | מכון זולת לשוויון וזכויות אדם | [Zulat Institute for Equality and Human Rights](https://zulat.org.il/) | P3 | feed | open - position papers and reports published on site | unclear | url_opened |
| LSR-014 | מרכז המחקר והמידע של הכנסת (ממ"מ) | [Knesset Research and Information Center (RIC / MMM)](https://www.knesset.gov.il/mmm/) | P1 | — | open - all reports freely downloadable as PDF | likely-yes (official parliamentary research, publicly distributed) - confirm terms | partial |
| LSR-015 | מבקר המדינה ונציב תלונות הציבור | [State Comptroller and Ombudsman of Israel](https://www.mevaker.gov.il/) | P1 | — | open - audit reports in digital library, organized by subject | likely-yes (official public audit reports) - confirm site terms | url_opened |
| LSR-016 | ארכיון המדינה | [Israel State Archives](https://www.archives.gov.il/) | P3 | — | open - online search over digitized collections; some files require reading-room/declassification process | unclear - metadata yes; document images case-by-case | url_opened |
| LSR-017 | סדרת מאמרי SSRN - הפקולטה למשפטים, האוניברסיטה העברית (ומאמרי משפט ישראליים ב-SSRN) | [SSRN - Hebrew University of Jerusalem Legal Studies Research Paper Series (and Israeli law papers on SSRN)](https://en.law.huji.ac.il/book/ssrn) | Research-only | feed | open - most papers free to download from papers.ssrn.com (free account sometimes prompted) | no for bulk full text (ToS); metadata/abstract linking acceptable | search_result_only |
| LSR-018 | מפתח חיפה למאמרים (המפתח למאמרים בעברית, IHP) | [IHP - Index to Hebrew Periodicals (Haifa Index)](https://lib.haifa.ac.il/en/ihp/) | License-needed | — | subscription - institutional/public-library/school login portals; not open to anonymous public | no without license | url_opened |
| LSR-019 | רמב"י - רשימת מאמרים במדעי היהדות | [RAMBI - Index of Articles on Jewish Studies (National Library of Israel)](https://www.nli.org.il/en/research-and-teach/catalogs/bibliographic-databases/rambi) | P2 | API | open - free bibliographic search via NLI catalog interface | likely-yes for metadata (facts/bibliography); confirm NLI data-reuse policy | url_opened |
| LSR-020 | עבודות דוקטור של האוניברסיטה העברית (רשימת תלמידי מחקר) | [Hebrew University Doctoral Dissertations Listing / HUJI open-access resources](https://www.huji.ac.il/htbin/doctors/index.cgi) | Research-only | — | open listing; full-text availability per dissertation varies (many theses deposited at NLI or library catalog, access restrictions common) | no for full text without per-work check | search_result_only |
| LSR-021 | מרכז מינרבה לחקר שלטון החוק במצבי קיצון (אוניברסיטת חיפה) | [Minerva Center for the Rule of Law under Extreme Conditions - University of Haifa](https://minervaxtremelaw.haifa.ac.il/) | P3 | — | open - research publications listed/linked on center site | unclear | url_opened |
| LSR-022 | דין אונליין (Din Online) | [Din Online - Israeli and international legal news aggregator](https://din-online.info/) | P3 | feed | open - free browsing; free registration for extras (comments, weekly digest, saved articles) | no for underlying content; site itself is derivative summaries | url_opened |
| LSR-087 | מגזין RULING | [Ruling.co.il legal information magazine](https://ruling.co.il) | P3 | — | free | no (copyrighted editorial content) | url_opened |
| LSR-088 | ביטוח לאומי - זכויות וקצבאות | [National Insurance Institute (BTL) benefits & rights pages](https://www.btl.gov.il/benefits/Pages/default.aspx) | P0 | — | free | de-facto reasonable with attribution and freshness discipline; verify terms page | url_opened |
| LSR-089 | זרוע העבודה - זכויות עובדים (gov.il) | [Labor Branch (Zroa HaAvoda) workers-rights pages on gov.il](https://www.gov.il/he/departments/topics/workers-rights) | P1 | — | free | reasonable with attribution; scraping requires handling bot protection or using gov.il data channels | search_result_only |
| LSR-090 | קו לעובד | [Kav LaOved - Worker's Hotline](https://kavlaoved.org.il) | P2 | — | free | unknown - NGO mission-aligned, ask permission (likely receptive) | search_result_only |
| LSR-091 | הרשות להגנת הצרכן ולסחר הוגן | [Consumer Protection and Fair Trade Authority (gov.il)](https://www.gov.il/he/departments/consumer_protection_and_fair_trade_authority/govil-landing-page) | P1 | — | free | reasonable with attribution; same gov.il crawling caveats | search_result_only |
| LSR-092 | המועצה הישראלית לצרכנות | [Israel Consumer Council](https://www.consumers.org.il) | P1 | — | free | unknown - public-interest body, ask; likely receptive | url_opened |
| LSR-093 | הסיוע המשפטי - משרד המשפטים | [Legal Aid Administration (Ministry of Justice)](https://www.gov.il/he/departments/ministry_of_justice_legal_aid/govil-landing-page) | P1 | — | free | reasonable with attribution | search_result_only |
| LSR-094 | הסנגוריה הציבורית | [Public Defender's Office (Israel)](https://www.gov.il/he/departments/public-defense/govil-landing-page) | P1 | — | free | reasonable with attribution | search_result_only |
| LSR-095 | כל-זכות - מחשבונים | [Kol Zchut calculators section](https://www.kolzchut.org.il/he/מחשבונים) | P0 | API | free | yes for textual calculation rules with attribution; embed/replicate calculators requires review | search_result_only |
| LSR-096 | האגודה לזכויות האזרח בישראל - מידע משפטי | [ACRI (Association for Civil Rights in Israel) legal info & rights guides](https://www.acri.org.il) | P2 | feed | free | unknown - ask; protest-rights guide is designed for wide dissemination | url_opened |
| LSR-097 | יד ריבה - סיוע משפטי לקשיש | [Yad Riva - legal aid for the elderly](https://yadriva.org.il) | P3 | — | free (services for elderly, disabled, and ill) | unknown - small NGO, ask directly | search_result_only |
| LSR-098 | פורטל הנתונים הפתוחים הממשלתי (data.gov.il) - CKAN API | [Israel Government Open Data Portal (data.gov.il) CKAN API](https://data.gov.il/api/3/action/package_search) | P0 | API | open | generally yes for open-licensed datasets; check per-dataset license field | url_opened |
| LSR-102 | דוח מכרזים - מינהל הרכש הממשלתי (tenders) | [Government Procurement Tenders Report (Government Procurement Administration)](https://data.gov.il/dataset/tenders) | P1 | API | open | yes | partial |
| LSR-103 | רשימת מומחים לבתי משפט (court_specialists) | [Court-Appointed Experts List](https://data.gov.il/dataset/court_specialists) | P2 | API | open | yes | partial |
| LSR-106 | API מדדי מחירים של הלמ"ס (api.cbs.gov.il) | [CBS (Central Bureau of Statistics) Price Index & Series API](https://api.cbs.gov.il/index/data/price?id=120010&format=json) | P0 | API | open | yes (numeric data) | search_result_only |
| LSR-107 | API ציבורי של בנק ישראל - שערי חליפין וריבית | [Bank of Israel Public API (exchange rates, interest) + SDMX statistics](https://boi.org.il/PublicApi/GetExchangeRates) | P0 | API | open | yes (numeric data) | url_opened |
| LSR-108 | מפתח התקציב - BudgetKey API (next.obudget.org) | [BudgetKey Open Budget API (obudget)](https://next.obudget.org/api/query) | P1 | API | open | yes | partial |
| LSR-110 | מאגר פסקי דין של בית המשפט העליון (HuggingFace - LevMuchnik) | [Supreme Court of Israel dataset (HuggingFace: LevMuchnik/SupremeCourtOfIsrael)](https://huggingface.co/datasets/LevMuchnik/SupremeCourtOfIsrael) | P1 | API | open | likely yes with OpenRAIL conditions; underlying judgments are public court records - verify license terms for commercial deployment | url_opened |
| LSR-112 | GovMap - ממשק API מפות ממשלתי | [GovMap National Mapping API (govmap.gov.il)](https://www.govmap.gov.il/sites/api_examples.html) | P3 | API | open (JS API with token for embedding; some layers open) | metadata/lookup use likely fine; verify terms | search_result_only |
| LSR-113 | מאגרי בתי הדין הרבניים בפורטל הנתונים (תעריפי אגרות, פסקי דין לפי שנים) | [Rabbinical Courts open datasets (fees tariffs, divorce judgments statistics)](https://data.gov.il/dataset/860) | P3 | API | open | caution on unlicensed items; factual data low risk | partial |

### F-commercial (13)

| ID | שם | Source | Priority | API/Feed | Access | RAG perm | Verified |
|---|---|---|---|---|---|---|---|
| LSR-023 | נבו — המאגר המשפטי | [Nevo Legal Database](https://www.nevo.co.il/) | License-needed | feed | restricted | requires_permission | url_opened |
| LSR-024 | תקדין | [Takdin](https://www.takdin.co.il/) | License-needed | feed | restricted | requires_permission | url_opened |
| LSR-025 | טקדין AI (תקדין AI) | [TechDin AI (Takdin AI)](https://techdin.co.il/) | License-needed | feed | restricted | requires_permission | url_opened |
| LSR-026 | דינים ועוד | [Dinim VeOd](https://www.dinimveod.co.il/) | Research-only | feed | restricted | requires_permission | url_opened |
| LSR-027 | לודאטה — מאגר משפטי מנצח | [LawData](https://www.lawdata.co.il/) | License-needed | feed | restricted | requires_permission | url_opened |
| LSR-028 | ליגלמייט | [Legalmate](https://legalmate.io/) | Research-only | — | restricted | requires_permission | partial |
| LSR-029 | קליגל | [Cligal](https://cligal.com/) | Research-only | feed | restricted | requires_permission | url_opened |
| LSR-030 | ליזי AI | [Lizzy AI](https://lizzyai.com/) | Research-only | — | restricted | requires_permission | url_opened |
| LSR-031 | לומייט (LawMate) | [LawMate](https://about.law-mate.com/) | Research-only | feed | restricted | requires_permission | url_opened |
| LSR-032 | פסקדין | [Psakdin](https://www.psakdin.co.il/) | Research-only | feed | restricted | requires_permission | url_opened |
| LSR-033 | בריפלי (LegalUp / קבוצת נזיקיסט) | [Briefly Legal O.S. (LegalUp)](https://www.legalup.co.il/) | Research-only | feed | restricted | requires_permission | url_opened |
| LSR-034 | דין רגע | [Din Rega](https://www.dinrega.com/) | Research-only | feed | restricted | requires_permission | search_result_only |
| LSR-035 | דיומא | [Dyoma](https://www.dyoma.co.il/) | Research-only | — | restricted | requires_permission | search_result_only |

## Category G — firm-private sources (no external registry rows)
Pleadings, contracts, legal opinions, approved templates, partner notes,
research memoranda, client documents, hearing summaries, negotiation
history, prior matter outcomes, internal playbooks, firm clause library.
These enter the system only through the future Matter/Documents workspaces,
under RLS, and are governed by the unified document schema
(UNIFIED_LEGAL_DOCUMENT_SCHEMA.md) with `source_type: firm_private`.

## Maintenance
- New source → append to records.json + CSV with the next LSR id, validate
  against the schema, re-run `node scripts/build-source-registry.mjs`
  regeneration if rebuilding from research files.
- Every record carries `last_reviewed`; re-review P0 sources quarterly.
