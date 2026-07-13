# Triad Coverage Model (Epic 3B Triad)

`triad/coverage.ts` (7 tests). For a matter-specific topic, evaluates all
three pillars and returns a state:

triad_complete · legislation_only · legislation_and_case_law ·
legislation_and_procedure · case_law_only · procedure_only ·
insufficient_case_law · insufficient_procedure · insufficient_legislation ·
insufficient_facts · requires_specialist_review.

Rules:
- Missing critical facts → `insufficient_facts` (blocks).
- Missing governing statute for a statutory claim → `insufficient_legislation`
  (blocks).
- POC case law is unverified → not "usable"; a statute-driven topic with
  law + procedure present but case law unverified → `insufficient_case_law`
  (a JUSTIFIED partial that MAY recommend, with the gap disclosed).
- A case-law-DRIVEN topic (employee/contractor, hearing duty — no governing
  statute) with no usable case law → `requires_specialist_review` (blocks).
- Only `triad_complete` or the justified statute-driven partial may produce
  a substantive matter recommendation. Single-pillar coverage never can.
