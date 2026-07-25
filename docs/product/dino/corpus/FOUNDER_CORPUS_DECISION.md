# Founder Corpus Decision — P1-S0 Decision Package

**Status:** Awaiting founder ratification — specification only (no implementation, no ingestion, no scraping, no accounts, no provider connection, no migration, no commits, no push).
**Companion docs:** [Doctrine Scope](./DINO_V1_DOCTRINE_SCOPE.md) · [Source Strategy](./VERIFIED_LEGAL_SOURCE_STRATEGY.md) · [Minimum Corpus + Contract](./MINIMUM_VERIFIED_CORPUS_STANDARD.md) · [Benchmark Spec](./VERIFIED_CITATION_BENCHMARK_SPEC.md) · [P1-S1 Plan](./P1_S1_VERIFIED_LEGISLATION_PLAN.md) · [Master Spec](../DINO_MASTER_SPECIFICATION.md).

This document holds the two decisions that gate P1-S1 (doctrine set + source strategy), the legislation-only-badge resolution (Part 8), and the consolidated 15-row decision table.

---

## Part 8 — Legislation-only conclusions: badge decision

**Question:** should a conclusion based only on verified legislation carry a distinct visible confidence badge?

- **Option A — standard confidence model only.** Simpler UI; but hides a real epistemic difference (statute-only vs statute+case-law) that a lawyer needs to see.
- **Option B — distinct label**, e.g. *"מבוסס חקיקה בלבד — ללא אימות פסיקתי מלא."* Makes the basis explicit; aligns with [F-6](../DINO_MASTER_SPECIFICATION.md#founder-vision--frozen) epistemic honesty; matches today's reality (case law unverified).
- **Option C — forbid legislation-only conclusions.** Safest-seeming but wrong: it would block the entire V1 Core set, which is *designed* to be answerable from clear statutory tests ([DR-5](../DINO_MASTER_SPECIFICATION.md#required-decision-records)), and would make V1 unshippable.

**Recommendation: Option B**, with a two-tier nuance so it neither alarms on clear statutes nor overstates on interpretation-sensitive ones:

- **Default (clear statutory test, low judicial-gloss doctrines — e.g. D-PRIORNOTICE, D-MINWAGE rate):** badge
  **`מבוסס חקיקה מאומתת`** ("based on verified legislation") — a positive, honest trust signal.
- **When the doctrine has known judicial gloss that is not yet verified (e.g. D-WAGE delayed-wage discretion, D-SEVERANCE boundaries):** badge
  **`מבוסס חקיקה בלבד — טרם אומתה פסיקה רלוונטית`** ("based on legislation only — relevant case law not yet verified"), plus the confidence cap and a one-line note that judicial interpretation may affect the outcome.

**Rationale:** the badge converts a limitation into visible trust, is consistent with the coverage/confidence model already shipped, and degrades gracefully to conclusion-grade-with-caveat rather than refusal. **Exact user-facing strings above are the ratifiable language** (subject to founder wording preference). *Alternatives rejected:* A (hides the distinction), C (blocks V1). *Review trigger:* when verified case law lands (P2), the second-tier badge is replaced by full confidence for promoted doctrines.

---

## Consolidated founder decision table

> Rows 1–11 are **recommendations to ratify**. Rows 12–15 are **action routing**. Nothing proceeds to build until rows 1, 4, and 12 (license basis) are confirmed.

| # | Decision | Recommendation |
|---|---|---|
| **1. V1 Core doctrines** | The conclusion-grade set | **Notice of employment terms · Minimum wage · Wages & wage protection · Annual leave · Prior notice (dismissal/resignation) · Severance pay** (6) |
| **2. V1 Conditional doctrines** | Analysis-grade in V1, conclusion-grade at P2 | **Sick leave · Working hours/rest/overtime · Pregnancy/parental (Women's Employment Law) · Hearing before dismissal (*shimua*) · Unlawful/discriminatory dismissal (Equal Opportunities)** (5) |
| **3. Explicitly deferred doctrines** | Not in V1 | Employee-vs-contractor · relationship formation · pension & contributions · constructive dismissal · non-compete · trade secrets · full discrimination · sexual harassment · privacy/surveillance · organizational-change termination · limitation-period doctrine (compute-only stays) — **plus excluded**: collective relations, workplace injury, reserve duty, foreign workers, youth employment, non-labor |
| **4. Legislation source strategy** | How statutes/regs are sourced | **Hybrid, official-first, editor-verified:** Knesset National Legislation DB + Reshumot for text/dates, **only under a confirmed reuse basis** `⚖`; else license a commercial consolidated-text source and keep official as the verification reference. Mandatory editorial verification layer. No scraping. |
| **5. Case-law strategy** | For P2 (not P1-S1) | **Primary:** license a commercial DB (identity + pinpoints + **treatment**) over the narrow doctrine set, `⚖`. **Fallback:** official courts portal for identity/text + LawME editorial treatment (bounded). No scraping; no academic dataset in production. |
| **6. Treatment-data strategy** | Currency/treatment | Provider-supplied or editorially verified only; **negative treatment never auto-inferred**; default `unknown`; **no Shepard's/KeyCite-equivalent claim**. Minimum-wage rate on a short re-verify cadence. |
| **7. Legislation-only confidence** | Part 8 | **Option B (two-tier badge)** — `מבוסס חקיקה מאומתת` / `מבוסס חקיקה בלבד — טרם אומתה פסיקה רלוונטית` |
| **8. Internal corpus minimum (Bar A)** | Dev bar | D-NOTICE + D-MINWAGE statutes + current minimum-wage rate instrument, verified; seed benchmark 100%; internal-only, no public claim |
| **9. Beta corpus minimum (Bar B)** | Design-partner bar | All 6 Core verified (conclusion-grade) + 5 Conditional (analysis-grade); case law discovery-only labeled; full benchmark 100%; claim = "developing corpus" |
| **10. GA corpus minimum (Bar C)** | Market bar | Core + Conditional verified incl. **verified case law with treatment** for Conditional; controlling authority (or both lines) per doctrine; benchmark incl. case-law 100% + contrary-authority recall; partner sign-off; claim = "professional research, named doctrines" |
| **11. P1-S1 exact scope** | Next slice | Verified **legislation-only** ingestion, D-NOTICE + D-MINWAGE → all 6 Core; verified citation with section/subsection + link + version + effective status + badge + copy/export; benchmark 100%; **Development only; no case law; no drafting; STOP** |
| **12. Founder commercial/legal actions** | Must be done by founder/counsel | (a) Ratify rows 1–3, 7. (b) **Obtain written legal opinion on a reuse basis** for the chosen legislation source `⚖`. (c) If licensing: open commercial discussions with a legislation/case-law vendor (do **not** let engineering create accounts/scrape). (d) Approve the two-tier badge wording. (e) Confirm privacy/anonymization obligations for any future case-law use. |
| **13. Engineering actions allowed now** | Green-light | Author the P1-S1 plan into buildable tickets; design the corpus-contract types/interfaces (no data); build the read-only adapter **against a confirmed-permitted source only after row 12(b)**; author the benchmark harness + gold-record *format* (no gold data until source approved); create **local** (unapplied) migration files. All behind a dev flag; nothing to Production; no push. |
| **14. Actions that must NOT begin** | Hard stop | No ingestion/scraping of any source; no account creation on commercial DBs; no provider connection; no remote migration/SQL writes; no Production touch; no marketing claim of coverage/verified case law; no conclusion on unverified authority; no commit/push without founder approval |
| **15. Remaining unresolved decisions** | Open | Final wording of the two-tier badge; chosen legislation source (official-reuse vs licensed) pending row 12(b); chosen case-law vendor (P2); privacy handling for anonymized/sealed decisions; whether Conditional analysis-grade ships in Beta or waits for P2 |

---

## Contradiction check with the Master Specification

**No contradiction found.** This package refines, and stays within, the Master Specification: it instantiates [Vol 21](../DINO_MASTER_SPECIFICATION.md#volume-21--legal-knowledge-acquisition-roadmap) (corpus roadmap), [Vol 23](../DINO_MASTER_SPECIFICATION.md#volume-23--v1-definition) (V1), [DR-3/4/5/8](../DINO_MASTER_SPECIFICATION.md#required-decision-records), and resolves [Open Question 1 and 5](../DINO_MASTER_SPECIFICATION.md#open-questions) (doctrine set; legislation-only badge). The Master Specification was **not modified**. Two items are proposed as *future* master-spec footnotes once ratified (not applied here): recording the ratified V1 doctrine list in Vol 23, and the Option-B badge in Vol 8/DR-5. These are additive clarifications, not contradictions — flagged for the founder to apply if desired.

*Specification only — no code, SQL, migration, ingestion, scraping, account, provider connection, commit or push. Production untouched.*
