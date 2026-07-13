# Employment-Law Vocabulary (Epic 3B, Phase 13)

Module: `src/modules/legal-knowledge/vocabulary/employment-law.ts`.
A CLOSED, reviewed controlled vocabulary — 22 canonical entries covering
every required topic: פיצויי פיטורים, סעיף 14, הרעה מוחשית, הודעה מוקדמת,
שימוע, שעות נוספות, חופשה שנתית, דמי מחלה, דמי הבראה, פנסיה חובה, עבודת
נשים, פיטורים בהיריון, שוויון הזדמנויות, הטרדה מינית, יחסי עובד–מעסיק,
עובד קבלן, עובד שעתי, עובד חודשי, צו הרחבה, הסכם קיבוצי, הגנת השכר,
שכר מינימום.

Each entry: canonical · variants (typed: common_language / legal_variant /
spelling_variant / abbreviation / ocr_variant / gender_variant /
plural_variant, each with drift risk none|low|medium) · statuteRef ·
sectionRef · meaningHe · expansionConfidence · reviewStatus.

`controlledExpansions(canonical)` returns the canonical plus none/low-drift
variants ONLY — medium-drift variants (which could shift legal meaning) are
excluded from automatic expansion. `lookupTerm` resolves any variant to its
canonical entry. NO uncontrolled expansion; extending the list is a
reviewed code change.
