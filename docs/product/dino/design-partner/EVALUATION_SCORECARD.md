# Dino V1 — Evaluation Scorecard & Score Sheets

**Part 5 of the Evaluation Kit.** Two scorers per question: **L** = the lawyer (perceived) and **R** = the LawME legal reviewer (ground truth). Divergence L−R is a first-class signal (over-/under-trust). Scale **1–5** unless noted.

---

## 1. Per-question score sheet

Fill one row per question asked (from Parts 2–4). Keep it fast — ≤ 30s per row.

| Field | Values | Notes |
|---|---|---|
| Question ID | e.g. B-13, M-11, TB-2 | from the kit |
| Doctrine | doctrine key | |
| In corpus? | yes (D-NOTICE/D-MINWAGE) / no | sets the expectation |
| Status returned | answered / provisional / needs_facts / no_verified_authority / insufficient_coverage / out_of_scope | |
| **Correct behavior?** | ✔ / ✘ | ✔ includes *honest decline* on out-of-corpus |
| Legal correctness (R) | 1–5 / NA | NA if a decline was correct |
| Citation present & correct (R) | ✔ / ✘ / NA | fabricated/wrong = auto-fail |
| Over-trust? | yes/no | lawyer would rely on a wrong/unsupported answer |
| Latency (s) | number | first substantive response |
| Lawyer would rely? | rely / rely-after-check / no | |
| Severity if defect | P0/P1/P2/P3/– | per severity model |
| Note | free text | the "why" |

**Hard rule:** any fabricated/wrong/stale citation, or a confident answer on a DECLINE row, is logged **P0** regardless of other scores.

---

## 2. Per-session dimension scorecard (1–5)

Completed once per session by **both** L and R.

| # | Dimension | 1 (poor) | 3 (adequate) | 5 (excellent) |
|---|---|---|---|---|
| D1 | **Legal correctness** | wrong law | mostly right, minor gaps | precise, defensible |
| D2 | **Reasoning quality** | conclusory | reasonable structure | clear IRAC, element-by-element |
| D3 | **Source quality** | none/irrelevant | some relevant | verified, on-point, authoritative |
| D4 | **Citation quality** | fabricated/wrong | present, imprecise | exact section, honest pinpoint, copyable |
| D5 | **Trust** | "I'd never rely" | "with heavy checking" | "I'd rely after a normal check" |
| D6 | **Confidence calibration** | over/under-confident | roughly right | matches actual correctness |
| D7 | **Speed** | frustrating | acceptable | fast enough to stay in flow |
| D8 | **UX / readability (RTL)** | confusing | usable | clean, bottom-line-first, scannable |
| D9 | **Professional usefulness** | toy | occasionally useful | changes my workflow |
| D10 | **Honesty / no-bluff** | bluffs | mostly honest | never over-reaches; declines cleanly |

### Three decision questions (per session, lawyer)
- **Would you rely on it?** No / Only after full independent check / Yes, after a normal check / Yes, largely as-is.
- **Would you still verify it?** Always / Usually / Sometimes / Rarely — *(and does this decrease across sessions?)*
- **Would you pay for it?** No / Maybe / Yes — *at what price and model (per-seat / per-matter / firm license)?*

---

## 3. Trust metrics (computed from the sheets)

| Metric | Formula | Target (Beta) |
|---|---|---|
| **Calibrated-honesty score** | (correct verified answers + correct honest declines) / total | ≥ 0.95 |
| **Over-trust rate** | over-trust incidents / total | **0** |
| **Under-trust rate** | correct verified answers distrusted / correct verified answers | ≤ 0.25 |
| **Verify-anyway rate** | correct answers lawyer would still verify / correct answers | trend ↓ across sessions |
| **Citation click-through** | source opens / answered questions | ≥ 0.5 |
| **Trust-breaker pass-rate** | PASS / 30 | **1.00** |
| **L−R divergence** | mean(perceived − ground-truth) | |divergence| ≤ 0.5 |

## 4. Adoption metrics

| Metric | Source | Target (GA signal) |
|---|---|---|
| Reliance intent (covered doctrines) | decision Q | ≥ 80% "rely (after normal check)" |
| Willingness to pay | decision Q | ≥ 60% "yes" + price captured |
| Signed LOIs / paid pilots | program outcome | ≥ 2 |
| Self-reported time saved / covered question | interview | ≥ 30% |
| Return usage (2-wk window) | telemetry | unprompted queries on ≥ 3 days |
| Referral offered | interview | ≥ 50% of partners |
| Replaces an open tab (Kol-Zchut/Nevo/checklist) | interview | ≥ 50% "yes, for covered questions" |

---

## 5. Program roll-up (one page for the founder)

| Segment | Partners | Calibrated-honesty | Over-trust | TB pass | Would-rely | Would-pay | P0 | Open P1 |
|---|---|---|---|---|---|---|---|---|
| Boutique labor litigator | | | | | | | | |
| Employer-side | | | | | | | | |
| Employee-side | | | | | | | | |
| Commercial/hybrid | | | | | | | | |
| In-house | | | | | | | | |
| **Program** | | | | | | | | |

**Release readout (auto-derived):**
- **Beta = GREEN** iff: 0 P0 · TB pass = 1.00 · over-trust = 0 · calibrated-honesty ≥ 0.95 · would-rely ≥ 60%.
- **GA = GREEN** iff Beta holds **and** corpus expanded per [MVC Bar C](../corpus/MINIMUM_VERIFIED_CORPUS_STANDARD.md) · correctness ≥ 0.98 · would-pay ≥ 60% · ≥ 2 LOIs · 0 open P1.

Anything else → AMBER (fix + re-test 2 partners) or RED (any P0 / over-trust > 0 / TB pass < 1.00).
