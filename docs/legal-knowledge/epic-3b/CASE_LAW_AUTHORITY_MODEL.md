# Case-Law Authority Model (Epic 3B Triad, Pillar B)

`case-law/authority.ts`. Deterministic — Dino never treats all judgments
equally.

- **Court hierarchy weight**: supreme 4 · national_labor 3 · regional 1.5 ·
  other 0.5. A regional ruling never outranks national authority (enforced
  by `rankJudgments`, tested).
- **Binding vs persuasive**: supreme/national → binding; regional →
  persuasive; other → informative.
- **Currentness**: never asserts "current" when later treatment is
  unchecked; overruled → not usable; limited → use with caution.
- **Usable for a claim** only when `verified_official` + case number
  verified + not overruled. POC candidates are all unverified → discovery
  only. Every case-law reliance requires human (lawyer) review.
