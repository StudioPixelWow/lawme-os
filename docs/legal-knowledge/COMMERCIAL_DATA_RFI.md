# LawME — Request for Information (RFI): Israeli Legal Data Licensing

**Status: DRAFT — NOT SENT.** Prepared for founder review (Epic 0,
Phase 18). Send only after founder approval, per recipient, per the
contact plan (COMMERCIAL_SOURCE_CONTACT_PLAN.md).

---

## נוסח ה-RFI (עברית — הנוסח שיישלח)

**נדון: בקשת מידע (RFI) — רישוי תוכן ונתונים משפטיים לפלטפורמת LawME**

שלום רב,

חברת LawME מפתחת פלטפורמת בינה משפטית למשרדי עורכי דין בישראל. אנו בוחנים
התקשרות לרישוי תוכן ונתונים משפטיים, ונבקש מידע על יכולות ותנאי הרישוי
שלכם בנושאים הבאים:

### א. ממשקים טכניים
1. Search API — האם קיים ממשק חיפוש תכנותי? תיעוד? SLA?
2. Document API — שליפת מסמך מלא לפי מזהה?
3. Metadata API — מטא-נתונים (ערכאה, שופט, צדדים, אזכורים, תוצאה)?
4. Embedded search — הטמעת חיפוש בתוך מוצר צד שלישי?
5. Delta feed — עדכונים שוטפים (יומי/שבועי) של תוכן חדש ומעודכן?
6. Historical corpus — עומק הארכיון הזמין לרישוי, לפי ערכאות ושנים?

### ב. זכויות שימוש ב-AI
7. RAG rights — שימוש בתכנים כמקורות לאחזור בתשובות מבוססות-AI?
8. Embedding rights — יצירת embeddings מהתכנים ואחסונם?
9. Local metadata storage — אחסון מטא-נתונים מקומי אצלנו?
10. Full-text storage — אחסון טקסט מלא מקומי (אם בכלל)?
11. Result display rights — הצגת קטעי תוכן למשתמש קצה במוצרנו?
12. Citation display — הצגת אזכורים/ציטוטים עם קישור למקור אצלכם?
13. AI-generated output rights — מעמד תוצרים (תקצירים, טיוטות) שנוצרו
    בהסתמך על התכנים?

### ג. נכסי תוכן ייחודיים
14. Citator metadata — נתוני "אוזכר ב…" / יחס פסיקה מאוחרת (חיובי/שלילי)?
15. Summaries — תקצירים ערוכים?
16. Keywords — מפתוח/מילות מפתח ערוכות?
17. Legal articles — מאמרים וכתבי עת ברישוי?
18. Pleadings — כתבי טענות?

### ד. מסחרי ותפעולי
19. Enterprise tenancy — מודל רב-משרדי (multi-tenant) למוצר SaaS?
20. Pricing model — לפי משתמש / שאילתה / מסמך / רישיון שנתי?
21. Minimum commitments — התחייבות מינימלית, תקופות, יציאה?
22. White-label rights — אפשרות הטמעה תחת מותג LawME?
23. Data residency — היכן מאוחסן המידע? התאמה לדרישות ישראליות?
24. Audit requirements — דרישות ביקורת/דיווח שימוש מצדכם?
25. Security requirements — דרישות אבטחה מהצד שלנו?
26. Termination and data deletion — מה קורה לנתונים מאוחסנים/embeddings
    בסיום ההתקשרות?

נודה לקבלת מענה, מסמכי מוצר רלוונטיים, ותיאום שיחת המשך.

בברכה,
טל צטלמן, מייסד LawME
tal.pixeld@gmail.com

---

## Internal annex — what we already know per vendor (from public research)

| Vendor | Public corpus claims | API signals | Known unknowns |
|---|---|---|---|
| **Nevo** | Case law "all courts, all periods", legislation, Reshumot, journals; ~90% of judges as users | none public; gov sole-supplier records exist | price list (robots-blocked), any API, AI-rights posture |
| **Takdin / TechDin (Guideline)** | 1.5M+ rulings claim; TechDin = "Takdin AI" | none public | corpus provenance, delta feeds, RAG willingness — one RFI covers Takdin+TechDin+Dinim VeOd (consolidated) |
| **LawData** | full DB claim, gov sole-supplier records | none public | everything in sections א-ב |
| **Legalmate** | AI litigation platform + case-law DB | product API unknown | data licensing vs product-only posture |
| **Briefly/LegalUp (Nezikist)** | 2M+ rulings claim | none public | provenance of the 2M claim |
| **Lizzy AI** | no corpus (workbench product) | enterprise: VPC/self-host, SSO | partnership rather than data licensing |
| **Cligal (Axioma)** | practice mgmt, 20K+ lawyers | ships "send to Lizzy" embed | distribution partnership option |

## Evaluation criteria for responses
RAG+embedding rights posture (decisive) · delta feed existence · citator
metadata availability · pricing vs POC budget · termination data-deletion
terms · willingness to white-label. A vendor refusing local
metadata storage + RAG rights cannot power LawME regardless of corpus
depth.
