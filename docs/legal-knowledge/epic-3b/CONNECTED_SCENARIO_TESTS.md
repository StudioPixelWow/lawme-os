# Connected Scenario Tests (Epic 3B Triad)

Deterministic triad tests (`triad/__tests__/triad.test.ts`):

- **Scenario 1 — dismissal during pregnancy**: law (חוק עבודת נשים §9 +
  שוויון הזדמנויות) + procedure present; case law unverified →
  `insufficient_case_law`, recommendation allowed WITH the case-law gap
  disclosed; next action = verify binding case law.
- **Scenario 2 — severance after material deterioration**: severance statute
  present; procedure present; case law (סעיף 11(א) doctrine) unverified —
  same justified-partial behavior.
- **Scenario 3 — overtime**: requires BOTH חוק שעות עבודה ומנוחה AND חוק
  הגנת השכר; with only one → `insufficient_legislation`-style block; with
  both → law+procedure usable.
- **Scenario 4 — employee vs contractor**: case-law-driven (no governing
  statute); unverified case law → `requires_specialist_review`, NO
  recommendation.

Also tested: missing facts always block; missing governing legislation
blocks a statutory claim; single-pillar coverage never recommends.

## Still to wire (next step, honestly flagged)
Full integration into the Dino 26-stage orchestrator (coverage stage +
research-plan upgrade to emit the 13-point triad plan + procedure-aware
claim types) is designed here and unit-tested at the model level; wiring it
through `runDinoPipeline` end-to-end and the unified graph extension are the
next build, on top of these tested pillars.
