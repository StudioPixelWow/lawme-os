# Real Corpus Scope (Epic 3B, Phase 2)

Target: 50–100 real Israeli employment-law documents in the Supabase
**Development** project (udispadsbxqicmawqcuk) only.

Success metric is not count — it is whether Dino answers real questions
with the correct primary source, correct version, correct section, exact
quote, exact anchor, honest limitations, and correct no-answer behavior.

## Governing principle (founder emphasis, 2026-07-12)
**Quality over quantity: 50 official, current, well-anchored documents are
worth far more than 5,000 with unclear permission, version, or metadata.**
Therefore, a document is admitted to the real corpus ONLY when its
publisher is official, its full-text permission is settled, its version
state is known (or the claim is explicitly marked version-uncertain), and
its anchors validate byte-exact. Anything short of that is metadata-only,
pointer-only, or excluded — never a low-confidence full-text record. It is
always correct to ingest fewer, cleaner documents.

## Composition (target)
- Primary legislation (statutes) — 15–25 (current; historical where useful)
- Regulations under those statutes — included within legislation slice
- Extension orders — 8–15
- Official guidance (Ministry of Labor, Equal-Opportunity Commission, NII,
  gov.il) — 10–25 (mostly metadata/pointer given access limits)
- Secondary discovery records (Kol Zchut) — 5–15, pointer_only, discovery
  of official references and terminology ONLY (never editorial text)

## Priority statutes (canonical targets)
חוק פיצויי פיטורים · חוק הודעה מוקדמת לפיטורים ולהתפטרות · חוק שעות עבודה
ומנוחה · חוק חופשה שנתית · חוק דמי מחלה · חוק שכר מינימום · חוק עבודת נשים ·
חוק שוויון ההזדמנויות בעבודה · החוק למניעת הטרדה מינית · חוק הגנת השכר ·
חוק הסכמים קיבוציים · חוק בית הדין לעבודה · הוראות רלוונטיות מחוק הביטוח
הלאומי · חקיקת הגנת עובדים · חקיקת פנסיה וזכויות סוציאליות.

## Priority extension orders
צו הרחבה לפנסיה חובה · צו הרחבה לדמי הבראה · צו הרחבה להשתתפות בהוצאות
נסיעה · צווי הרחבה כלליים; ענפיים רק כשרלוונטיים וממקור רשמי.

## Hard constraints
No commercial databases · no restricted-portal scraping · no WAF bypass ·
no paid embeddings · no mass case-law crawling · no real client data ·
development project only · no production.

## Sourcing reality (see SOURCE_ACCESS_RESEARCH.md)
Autonomous live fetch is unavailable (restricted ToS / WAF). Full text is
sourced via a lawful human-present or founder-provided channel for a
verified seed; everything else is metadata/pointer. The dry run
(DRY_RUN_REPORT.md) enumerates the candidate list; ingestion awaits the
founder's sourcing decision (FOUNDER_REVIEW.md).
