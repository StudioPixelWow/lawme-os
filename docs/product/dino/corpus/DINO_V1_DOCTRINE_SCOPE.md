# Dino V1 — Doctrine Scope Freeze & Prioritization

**Package:** P1-S0 — Doctrine Freeze and Source Acquisition Decision · **Status:** Founder decision draft — specification only (no implementation, no ingestion, no code, no commits, no push).
**Parent:** [`../DINO_MASTER_SPECIFICATION.md`](../DINO_MASTER_SPECIFICATION.md) ([Vol 21 Corpus](../DINO_MASTER_SPECIFICATION.md#volume-21--legal-knowledge-acquisition-roadmap), [Vol 23 V1](../DINO_MASTER_SPECIFICATION.md#volume-23--v1-definition), [Open Question 1](../DINO_MASTER_SPECIFICATION.md#open-questions)).

> **Scope discipline (binding).** A smaller doctrine set LawME can support *correctly* beats a large, shallow one. A doctrine enters **V1 Core** only if it can be answered to conclusion-grade from **verified legislation** with a clear statutory test and low dependence on unverified case law — because today all case law is discovery-only ([Vol 5](../DINO_MASTER_SPECIFICATION.md#volume-5--verified-source-and-citation-standard), [DR-2](../DINO_MASTER_SPECIFICATION.md#required-decision-records)). Doctrines whose *outcome* turns on judicial gloss are **Conditional** (analysis-grade in V1, conclusion-grade after P2 verified case law) or **Deferred**.

> **Legal-content caveat.** Statute names/years below are the working catalog for ingestion planning. Each MUST be independently verified at ingestion against the official source ([DR-3](../DINO_MASTER_SPECIFICATION.md#required-decision-records)); nothing here is a verified citation, and no pinpoint, amendment date or treatment status is asserted.

---

## 1. Classification key

| Class | Meaning | Answer grade in V1 |
|---|---|---|
| **V1 Core** | Statute-driven, clear test, verifiable to conclusion from legislation | Conclusion-grade (confidence-bounded) |
| **V1 Conditional** | Statutory basis exists but outcome leans on case law; ships as **analysis-grade** with honest `needs_facts`/`no_verified_authority` until P2 | Analysis-grade |
| **V2** | Requires verified case law, document intelligence, or drafting to be useful | Not in V1 |
| **Excluded** | Out of V1 labor scope, or specialist area with its own corpus/experts | Declined `out_of_scope` |

---

## 2. Recommendation at a glance

- **V1 Core (6):** Notice of employment terms · Minimum wage · Wages & wage protection · Annual leave · Prior notice before dismissal/resignation · Severance pay.
- **V1 Conditional (5):** Sick leave · Working hours, rest & overtime (combined) · Pregnancy/parental protections (Women's Employment Law) · Hearing before dismissal (*shimua*) · Unlawful/discriminatory dismissal (Equal Opportunities).
- **Deferred to V2 (12):** Employee-vs-contractor classification · Formation of employment relationship · Pension & mandatory contributions · Constructive dismissal · Restrictive covenants/non-compete · Confidentiality & trade secrets · Equal opportunities & discrimination (full) · Sexual harassment in employment · Workplace privacy & surveillance · Termination due to organizational change · Weekly rest (as standalone) · Limitation periods & procedural deadlines (as answerable doctrine — the *computation* is a Core capability, see note).
- **Excluded from V1 (7):** Collective labor relations · Workplace-injury interactions · Reserve-duty rights · Foreign workers · Youth employment · Sexual-harassment adjudication depth · anything non-labor.

> **Note on deadlines (candidate 30).** Deadline/limitation *computation* is a shipped V1 **capability** (C24, deterministic date math), but *limitation-period doctrine as a researched legal answer* (which limitation applies, tolling, case-law exceptions) is Deferred — it is heavily case-law-dependent.

---

## 3. Prioritization model (Part 2)

Each candidate scored 1–5 (5 = most favorable to inclusion) across fourteen factors. Two are **gating** and shown separately because a low score there caps the class regardless of demand: **Statutory clarity** (can it be answered from statute?) and **Case-law dependence** (inverted: 5 = low dependence). The composite is the mean of the twelve non-gating factors; the class is then set by the gates.

Factors: demand · commercial value · practice frequency · statutory clarity **(gate)** · case-law dependence-inverted **(gate)** · official-legislation availability · verified-regulation availability · verified-case-law availability · treatment-data availability · MatterIntelligence factual-model readiness · reasoning-engine readiness · benchmark feasibility · malpractice/staleness-risk-inverted · implementation-complexity-inverted.

### 3.1 Scoring table (composite = mean of 12 non-gate factors)

| # | Doctrine | Demand | Freq | Stat. clarity (gate) | Low case-law dep. (gate) | Legis. avail. | Benchmark feas. | Composite | Class |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 3 | Notice of employment terms | 5 | 5 | **5** | **5** | 5 | 5 | 4.7 | **Core** |
| 5 | Minimum wage | 5 | 5 | **5** | **5** | 5 | 5 | 4.7 | **Core** |
| 4 | Wages & wage protection | 5 | 5 | **4** | **4** | 5 | 4 | 4.3 | **Core** |
| 9 | Annual leave | 4 | 5 | **5** | **4** | 5 | 5 | 4.4 | **Core** |
| 13 | Prior notice (dismissal/resign.) | 5 | 5 | **5** | **4** | 5 | 5 | 4.5 | **Core** |
| 12 | Severance pay | 5 | 5 | **4** | **3** | 5 | 4 | 4.0 | **Core** |
| 10 | Sick leave | 4 | 4 | **4** | **4** | 5 | 4 | 4.0 | **Conditional** |
| 6–8 | Hours, rest & overtime | 5 | 5 | **4** | **3** | 5 | 4 | 3.9 | **Conditional** |
| 16 | Pregnancy/parental protections | 5 | 4 | **4** | **3** | 4 | 4 | 3.8 | **Conditional** |
| 14 | Hearing before dismissal (*shimua*) | 5 | 5 | **2** | **1** | 2 | 3 | 3.2 | **Conditional** |
| 15/18 | Unlawful/discriminatory dismissal | 5 | 4 | **3** | **2** | 4 | 3 | 3.3 | **Conditional** |
| 1 | Employee vs contractor | 5 | 4 | **1** | **1** | 2 | 2 | 2.6 | V2 |
| 11 | Pension & mandatory contributions | 4 | 5 | **2** | **2** | 2 | 3 | 3.0 | V2 |
| 29 | Constructive dismissal | 4 | 4 | **2** | **1** | 3 | 2 | 2.8 | V2 |
| 21 | Restrictive covenants/non-compete | 4 | 3 | **1** | **1** | 2 | 2 | 2.5 | V2 |
| 22 | Confidentiality & trade secrets | 3 | 3 | **3** | **2** | 3 | 2 | 2.7 | V2 |
| 19 | Sexual harassment in employment | 4 | 3 | **3** | **2** | 4 | 2 | 2.9 | V2 |
| 20 | Workplace privacy & surveillance | 3 | 2 | **1** | **1** | 2 | 2 | 2.2 | V2 |
| 28 | Termination — organizational change | 3 | 3 | **2** | **1** | 2 | 2 | 2.5 | V2 |
| 2 | Formation of employment relationship | 3 | 3 | **1** | **1** | 2 | 2 | 2.3 | V2 |
| 8 | Weekly rest (standalone) | 3 | 3 | **4** | **3** | 5 | 4 | 3.6 | V2 (folds into 6–8) |
| 30 | Limitation/procedural deadlines (doctrine) | 4 | 4 | **2** | **1** | 3 | 2 | 2.7 | V2 |
| 23 | Collective labor relations | 3 | 2 | **2** | **1** | 3 | 1 | 2.2 | Excluded |
| 24 | Workplace-injury interactions | 3 | 3 | **1** | **1** | 2 | 1 | 2.0 | Excluded |
| 25 | Reserve-duty rights | 3 | 2 | **3** | **2** | 3 | 2 | 2.6 | Excluded |
| 26 | Foreign workers | 2 | 2 | **3** | **2** | 3 | 2 | 2.5 | Excluded |
| 27 | Youth employment | 2 | 2 | **4** | **3** | 4 | 3 | 3.1 | Excluded (low demand) |
| 17 | Fertility-treatment protections | 3 | 2 | **3** | **2** | 4 | 3 | 3.0 | Folds into 16 |

### 3.2 Reading the gates

Doctrines 1, 2, 14, 20, 21, 28, 29 all score **1–2 on both gates** — they are the ones where a lawyer's answer is *made* by case law (the mixed/"integrated" test for contractor status; the judge-made *shimua* duty; the reasonableness/geographic-scope analysis for non-compete). Shipping them conclusion-grade in V1 would force reliance on unverified case law, violating [F-5](../DINO_MASTER_SPECIFICATION.md#founder-vision--frozen). They are therefore Conditional (analysis-only) or Deferred until P2.

---

## 4. V1 Core doctrine records (full)

Fields per doctrine: id · Hebrew · internal · covered questions · governing statutes · regulations · required case-law interpretation · factual elements · common defenses · statutory exceptions · procedural issues · remedies · limitation/deadline · required verified-source minimum · Beta · GA · exclusions · known ambiguity.

### D-NOTICE — Notice of employment terms
- **Hebrew:** הודעה על תנאי עבודה · **Internal:** employment-terms-notice.
- **Covered questions:** must the employer give a written notice of terms? within what period? what must it contain? consequences of non-delivery or a false notice?
- **Governing statutes:** חוק הודעה לעובד ולמועמד לעבודה (תנאי עבודה והליכי מיון וקבלה לעבודה), התשס"ב-2002 *(verify at ingestion)*.
- **Regulations:** notice-form regulations thereunder *(verify)*.
- **Case-law interpretation required:** low — mainly remedy-quantum guidance; not needed for the primary obligation.
- **Factual elements:** employment relationship; start date; whether a written notice was given; timeliness; completeness/accuracy of contents.
- **Common defenses:** notice given; employee is exempt category; de-minimis omission.
- **Statutory exceptions:** short-term/limited categories as defined in the law *(verify)*.
- **Procedural issues:** labour-court jurisdiction; burden on employer to prove delivery.
- **Remedies:** statutory compensation (court discretion, may be without proof of damage).
- **Limitation/deadline:** general labour-claim limitation *(doctrine deferred; compute via C24)*.
- **Required verified-source minimum:** the statute + its notice regulations, verified with pinpoints and current amendment status.
- **Beta:** analysis + citation to verified statute. **GA:** conclusion-grade with pinpoint + remedy framing.
- **Exclusions:** quantum optimization; strategic drafting of the notice (V2 drafting).
- **Known ambiguity:** remedy amount is discretionary (case-law-informed) — V1 states the range honestly, not a precise number.

### D-MINWAGE — Minimum wage
- **Hebrew:** שכר מינימום · **Internal:** minimum-wage.
- **Covered questions:** what is the current minimum (monthly/hourly/daily)? does a given wage comply? youth/rates variations? enforcement/penalty exposure?
- **Governing statutes:** חוק שכר מינימום, התשמ"ז-1987 *(verify)*.
- **Regulations / updates:** periodic minimum-wage update notices/orders *(verify — currentness-critical)*.
- **Case-law interpretation:** low for the rate; moderate for "what counts as wage" edge cases (folds to D-WAGE).
- **Factual elements:** wage components; hours; employee category; period.
- **Defenses:** compliant components; permitted deductions; category rate.
- **Exceptions:** youth, apprentices, rehabilitation categories *(verify)*.
- **Procedural:** labour-court claim; criminal/administrative enforcement.
- **Remedies:** wage differentials + statutory increments; penalties.
- **Limitation/deadline:** wage-claim limitation *(compute via C24)*.
- **Required verified-source minimum:** the statute **and the current effective rate instrument** — **currentness is the dominant risk** ([DR-4](../DINO_MASTER_SPECIFICATION.md#required-decision-records)); a stale rate is a malpractice hazard.
- **Beta:** cite statute; state that the *current rate* must be confirmed against the effective instrument. **GA:** the verified current rate with effective date and re-verification cadence.
- **Exclusions:** payroll computation product.
- **Known ambiguity:** frequent rate updates; "wage" composition overlaps D-WAGE.

### D-WAGE — Wages & wage protection
- **Hebrew:** שכר עבודה והגנת השכר · **Internal:** wage-protection.
- **Covered questions:** timing of wage payment; permitted/forbidden deductions; delayed-wage compensation (*halanat sachar*); what constitutes "wage".
- **Governing statutes:** חוק הגנת השכר, התשי"ח-1958 *(verify)*.
- **Case-law interpretation:** moderate (delayed-wage compensation reduction discretion) — V1 states the statutory rule and flags judicial discretion honestly.
- **Factual elements:** wage amount; due date; actual payment date; deductions; components.
- **Defenses:** timely payment; lawful deduction; good-faith dispute (affects delayed-wage comp).
- **Exceptions / discretion:** court may reduce delayed-wage compensation.
- **Procedural:** labour court; heightened protection provisions.
- **Remedies:** unpaid wages; delayed-wage compensation; deduction refunds.
- **Required verified-source minimum:** the statute with the deduction and delayed-wage-compensation provisions pinpointed.
- **Beta:** analysis-grade. **GA:** conclusion-grade with the caveat that delayed-wage-compensation quantum is discretionary.
- **Known ambiguity:** the discretionary reduction is case-law-driven — surfaced, not concluded precisely.

### D-ANNUAL — Annual leave
- **Hebrew:** חופשה שנתית · **Internal:** annual-leave.
- **Covered questions:** entitlement days by seniority; accrual; redemption on termination; timing/scheduling; carryover.
- **Governing statutes:** חוק חופשה שנתית, התשי"א-1951 *(verify)*.
- **Case-law:** low for entitlement; moderate for *pidyon* (redemption) computation edge cases.
- **Factual elements:** seniority; days taken; days accrued; termination.
- **Defenses:** leave granted; lawful scheduling; buy-out compliant.
- **Procedural:** labour court; burden on employer to keep leave records.
- **Remedies:** unpaid leave redemption; differentials.
- **Required verified-source minimum:** statute with the seniority/entitlement table pinpointed + current amendments.
- **Beta:** analysis-grade. **GA:** conclusion-grade entitlement with computation caveat.
- **Known ambiguity:** interaction with extension orders/sector norms — flagged.

### D-PRIORNOTICE — Prior notice before dismissal/resignation
- **Hebrew:** הודעה מוקדמת לפיטורים ולהתפטרות · **Internal:** prior-notice.
- **Covered questions:** required notice length by seniority and pay basis; pay-in-lieu; consequences of failing to give notice.
- **Governing statutes:** חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס"א-2001 *(verify)*.
- **Case-law:** low — statute provides an explicit table.
- **Factual elements:** seniority; monthly vs hourly; notice given/worked; pay-in-lieu.
- **Defenses:** notice given; summary dismissal for cause (interacts with severance/case law — flagged).
- **Exceptions:** circumstances negating notice *(verify)*.
- **Procedural:** labour court.
- **Remedies:** pay-in-lieu of notice.
- **Required verified-source minimum:** statute with the notice-period table pinpointed.
- **Beta:** conclusion-grade for the computation. **GA:** same + interaction caveats.
- **Known ambiguity:** "for cause" exceptions lean on case law — surfaced.

### D-SEVERANCE — Severance pay
- **Hebrew:** פיצויי פיטורים · **Internal:** severance-pay.
- **Covered questions:** entitlement on dismissal; qualifying seniority; computation base; s.14 arrangement; resignation-treated-as-dismissal hooks.
- **Governing statutes:** חוק פיצויי פיטורים, התשכ"ג-1963 *(verify)*.
- **Regulations:** severance computation regulations *(verify)*.
- **Case-law:** **moderate–high** for the boundary cases (constructive dismissal s.11; deprivation of severance) → those boundaries are **Conditional/Deferred**; the core entitlement + computation is Core.
- **Factual elements:** dismissal vs resignation; seniority ≥ threshold; last wage; s.14 coverage.
- **Defenses:** s.14 full arrangement; disqualifying misconduct (case-law-heavy — flagged); resignation without qualifying cause.
- **Exceptions:** deprivation/reduction on serious misconduct (requires case law → not concluded in V1).
- **Procedural:** labour court.
- **Remedies:** severance + possible increments.
- **Required verified-source minimum:** statute + computation regulations pinpointed.
- **Beta:** conclusion-grade for the *clean* entitlement/computation; analysis-only for misconduct-deprivation and constructive-dismissal boundaries. **GA:** same, with P2 verified case law extending the boundaries.
- **Known ambiguity:** misconduct deprivation and constructive dismissal are governed by case law — explicitly Deferred boundaries.

---

## 5. V1 Conditional doctrine records (abbreviated)

Ship **analysis-grade** in V1: identify the governing statute, frame the test, classify the matter's facts, and surface the case-law dependence honestly (`needs_facts` / `no_verified_authority` where the *outcome* needs judicial gloss). Promoted to conclusion-grade in **P2** when verified case law lands.

- **D-SICK — Sick leave** (חוק דמי מחלה, התשל"ו-1976 *(verify)*): accrual/entitlement statutory (leans Core-like), but redemption limits and sector extension orders add case-law/collective nuance → Conditional.
- **D-HOURS — Working hours, rest & overtime** (חוק שעות עבודה ומנוחה, התשי"א-1951 *(verify)*; folds candidates 6–8): overtime rates and rest are statutory, but "which employees are excluded" (e.g. positions of trust) is heavily case-law-driven → Conditional.
- **D-PREG — Pregnancy/parental & fertility protections** (חוק עבודת נשים, התשי"ד-1954 *(verify)*; folds candidate 17): dismissal-prohibition and permit requirement are statutory (strong), but causation/permit-standard analysis draws on case law → Conditional (this is the flagship demo doctrine; the existing reasoning fixtures already use it).
- **D-SHIMUA — Hearing before dismissal** (*judge-made* duty; statutory only in public sector): **no private-sector statute** → V1 provides the *procedural checklist and analysis*, never a conclusion of unlawfulness on unverified case law → Conditional, promoted at P2.
- **D-UNLAWFUL — Unlawful/discriminatory dismissal** (חוק שוויון ההזדמנויות בעבודה, התשמ"ח-1988 *(verify)*): prohibited-grounds list is statutory; burden-shifting and remedy quantum are case-law-shaped → Conditional.

---

## 6. Deferred (V2) and Excluded — rationale summary

**Deferred to V2** because the *answer* is made by case law, document analysis, or drafting: employee-vs-contractor classification, formation of relationship, constructive dismissal, restrictive covenants/non-compete, confidentiality/trade secrets, full discrimination analysis, sexual harassment in employment, workplace privacy/surveillance, organizational-change termination, pension & mandatory contributions (pension is largely via an **extension order**, not a statute — needs the extension-order corpus first), and limitation-period doctrine. Each becomes viable once P2 verified case law and/or D (documents)/E (drafting) land.

**Excluded from V1** as separate specialist corpora/experts: collective labor relations, workplace-injury (National Insurance interface), reserve-duty rights, foreign workers, youth employment (low demand), and anything non-labor or non-IL. These are `out_of_scope` and declined honestly ([R-18](../DINO_MASTER_SPECIFICATION.md#volume-18--professional-responsibility-and-safety)).

---

## 7. Consequence for the corpus plan

The V1 Core set is answerable from **~6 statutes + their principal regulations/rate instruments**, none of which *requires* case law to reach a bounded conclusion. That is a small, achievable verified-legislation target ([MVC](./MINIMUM_VERIFIED_CORPUS_STANDARD.md)) and the reason P1-S1 is legislation-first. The Conditional set needs the *same* statutes plus case law at P2. This ordering maximizes lawyer-visible value per unit of verified corpus.

*Specification only — no code, ingestion, scraping, provider connection, migration, commit or push.*
