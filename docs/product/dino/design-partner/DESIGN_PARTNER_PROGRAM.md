# Dino V1 — Design Partner Program

**Purpose:** validate whether real Israeli labor-law lawyers would **trust, adopt, and pay for** Dino — not to validate code.
**Status:** Evaluation design — no implementation. **Companion files:** [`BENCHMARK_QUESTIONS_100.md`](./BENCHMARK_QUESTIONS_100.md) · [`MATTER_QUESTIONS_50.md`](./MATTER_QUESTIONS_50.md) · [`TRUST_BREAKERS_30.md`](./TRUST_BREAKERS_30.md) · [`EVALUATION_SCORECARD.md`](./EVALUATION_SCORECARD.md) · [`INTERVIEW_GUIDE.md`](./INTERVIEW_GUIDE.md).

> **Read this first — the honesty framing.** Dino V1's **verified corpus is only D-NOTICE (notice of terms) and D-MINWAGE (minimum wage)**. The evaluation is therefore *as much a test of honest declining as of answering*. For every out-of-corpus question, the **correct** behavior is a transparent limitation (`no_verified_authority` / `insufficient_coverage` / `out_of_scope`), never a confident answer. A partner who sees Dino refuse to bluff on a hard question should score **trust up**, not down. The kit is built so evaluators reward calibrated honesty.

---

## Methodology overview

Each design partner runs **three structured sessions** (≈75 min each), moderated, screen-recorded (with consent), over 2–3 weeks:

1. **Session A — Blind research drive.** The lawyer asks Dino questions from their own practice + a moderator-seeded subset of the 100 benchmark questions ([`BENCHMARK_QUESTIONS_100.md`](./BENCHMARK_QUESTIONS_100.md)). Think-aloud protocol. No coaching.
2. **Session B — Matter-in-the-loop.** Using a seeded demo matter (or, under NDA, a de-identified real matter), the lawyer runs the 50 matter questions ([`MATTER_QUESTIONS_50.md`](./MATTER_QUESTIONS_50.md)) — testing law-applied-to-facts, missing-fact detection, and the opposing argument.
3. **Session C — Adversarial trust test.** The moderator drives the 30 trust-breakers ([`TRUST_BREAKERS_30.md`](./TRUST_BREAKERS_30.md)) to probe hallucination, wrong-statute, stale-rate, and fabricated-citation failure modes. This is the make-or-break session.

After every session: the **scorecard** ([`EVALUATION_SCORECARD.md`](./EVALUATION_SCORECARD.md)) is completed by (a) the lawyer (perceived) and (b) an independent LawME legal reviewer (ground truth), and the **interview guide** ([`INTERVIEW_GUIDE.md`](./INTERVIEW_GUIDE.md)) is administered. Divergence between perceived and ground-truth scores is itself a key signal (over-trust vs under-trust).

**Sample size:** 6–10 design partners spanning the profiles below; ≥ 2 per primary segment. Minimum 3 sessions each ⇒ ≥ 18 sessions, ≥ 540 scored question-instances.

**Instrumentation captured per question:** status returned, citations shown (verified vs discovery-only), latency, whether the lawyer clicked into the source, whether they said they'd verify, and the moderator's ground-truth correctness/honesty verdict.

---

## Part 1 — Ideal Design Partner profile

The program deliberately over-samples the segment Dino V1 serves best (labor-law, litigation-leaning, small/boutique) and includes a minority of adjacent profiles to test scope edges.

### 1.1 Primary target (must-have; ≥ 60% of partners)

| Attribute | Ideal | Why |
|---|---|---|
| **Practice area** | Israeli labor & employment law (דיני עבודה) | Matches the entire V1 corpus & reasoning. |
| **Role** | Partner or senior associate who *owns* the legal answer | They feel the malpractice risk; their trust is the real signal. |
| **Firm size** | Boutique / small firm (1–15 lawyers) | Highest leverage from a "second lawyer"; fastest buying decision; least legacy tooling. |
| **Orientation** | Litigation-leaning (labour courts) | Exercises opposing-argument, risk, deadlines. |
| **Client mix** | Represents employers **and** employees (or a firm with both) | Tests both sides of every doctrine. |
| **Tech posture** | Willing early adopter, not necessarily technical | Realistic adopter, not an enthusiast outlier. |
| **Volume** | ≥ 5 new labor matters/month | Enough repetition to feel ROI. |

### 1.2 Secondary / edge profiles (nice-to-have; ≤ 40%)

- **Commercial/employment hybrid** at a mid-size firm (10–50) — tests contract-review appetite and the scope boundary (much of their need is V2/out-of-corpus → good honesty test).
- **In-house counsel** with a labor component — tests the "quick defensible answer" job and client-facing constraints.
- **One large-firm associate** (50+) — tests whether Dino survives a rigorous, citation-obsessed reviewer and integration expectations (Word export).
- **One paralegal / legal assistant** — tests document/deadline surfacing and whether non-lawyers over-trust (a safety signal).

### 1.3 Explicit anti-profiles (exclude from V1 program)

Pure corporate/M&A, litigation outside labor, criminal, family, IP — their core need is entirely out of the V1 corpus, so sessions would only produce "out of scope" and no adoption signal. Also exclude anyone who cannot commit to all three sessions.

### 1.4 Recruitment screener (pass all)
Practices Israeli labor law weekly · personally responsible for legal answers · ≥ 5 labor matters/month · can commit 3× 75-min sessions · willing to be recorded · will sign a mutual NDA · not a current competitor.

---

## Part 7 — Severity model

Every observed defect (from any session) is triaged. Severity is about **impact on trust/adoption**, not engineering effort.

| Sev | Name | Definition | Example | Gate impact |
|---|---|---|---|---|
| **P0** | Trust-destroying | Lawyer loses trust *immediately and irreversibly*; a defensibility hazard. | A **fabricated or wrong citation**; a confident wrong legal conclusion; a **stale minimum-wage figure** stated as current; citing a repealed/overruled provision as good law; cross-matter data leak. | **Any P0 blocks Beta.** Zero-tolerance. |
| **P1** | Adoption-blocking | Doesn't destroy trust in one shot but the lawyer "wouldn't rely on it" / "wouldn't pay". | Honest-but-too-shallow answers on core doctrines; missing the outcome-determinative fact; opposing argument absent or strawman; no usable Word/citation export; coverage over-claimed. | **Blocks GA; a few tolerated in Beta if scheduled.** |
| **P2** | Annoying | Friction that irritates but doesn't block reliance. | Clunky refinement, verbose answers, weak source-card layout, slow first response, awkward RTL wrapping. | Tracked; not a gate. |
| **P3** | Nice-to-improve | Polish / delight. | Nicer citation formatting, keyboard shortcuts, saved-answer pinning, tone tweaks. | Backlog. |

**Triage rules.** (1) A single P0 in adversarial Session C halts that partner's remaining sessions until root-caused. (2) Every P0/P1 gets a reproduction case added to the verified-citation benchmark ([regression discipline](../corpus/VERIFIED_CITATION_BENCHMARK_SPEC.md)). (3) "Honest decline on an out-of-corpus question" is **never** a defect — it's expected V1 behavior.

---

## Part 8 — Acceptance criteria

Gates are **doctrine- and behavior-based**, evaluated on the covered corpus (D-NOTICE, D-MINWAGE) plus honest-behavior across everything else. Numbers are targets to ratify with the first two partners.

### 8.1 Before **Beta** (design-partner-ready)

| # | Criterion | Threshold |
|---|---|---|
| B-1 | **Zero P0** across all sessions | 0 |
| B-2 | Verified-citation accuracy on covered doctrines | **100%** (no fabricated/wrong/stale citation) — matches the release gate |
| B-3 | **Honest-decline rate** on out-of-corpus questions | ≥ 98% (Dino declines/limits rather than bluffs) |
| B-4 | Over-trust incidents (lawyer would rely on a wrong/unsupported answer) | 0 |
| B-5 | Covered-doctrine correctness (ground truth) | ≥ 95% |
| B-6 | Minimum-wage currentness (never stale/ future/ wrong) | 100% |
| B-7 | "Would rely, *after my own check*" on covered doctrines | ≥ 60% of partners |
| B-8 | Trust score (see scorecard) median | ≥ 3.5 / 5 |
| B-9 | Authorization/cross-matter leakage | 0 |

### 8.2 Before **GA** (sellable professional product)

| # | Criterion | Threshold |
|---|---|---|
| G-1 | All Beta gates still hold | — |
| G-2 | Verified corpus expanded to the full V1 doctrine set (Core + Conditional) with **verified case law + treatment** where the doctrine needs it | per [MVC Bar C](../corpus/MINIMUM_VERIFIED_CORPUS_STANDARD.md) |
| G-3 | Covered-doctrine correctness (ground truth) | ≥ 98% |
| G-4 | Confidence calibration (stated confidence vs actual correctness) | within ±10% |
| G-5 | Opposing-argument quality (non-strawman, rated by partners) | ≥ 4 / 5 median |
| G-6 | "Would rely" (with normal professional verification) | ≥ 80% of partners |
| G-7 | "Would pay" at target price | ≥ 60% of partners, ≥ 2 signed LOIs/paid pilots |
| G-8 | P1 open count | 0 |
| G-9 | Independent partner sign-off per marketed doctrine | documented |

---

## Trust metrics (tracked across the program)

- **Calibrated-honesty score** = (honest declines on unknowns + correct verified answers) / total. The headline metric.
- **Over-trust rate** = share of wrong/unsupported answers the lawyer said they'd rely on. Target 0. (The dangerous direction.)
- **Under-trust rate** = share of correct verified answers the lawyer distrusted. High values ⇒ a UX/trust-signal problem, not a correctness one.
- **Verify-anyway rate** = share of correct answers the lawyer would still independently verify. Expected > 0 for lawyers; a *drop* over sessions signals earned trust.
- **Citation-click-through** = how often lawyers open the source. Healthy engagement + a trust proxy.
- **Time-to-first-distrust** — sessions until a partner first says "I don't believe that." Later = better.

## Adoption metrics

- **Reliance intent** (would rely, with/without verification) by doctrine.
- **Willingness to pay** + price point + preferred model (per-seat / per-matter).
- **Task-time delta** — self-reported minutes saved vs current workflow on a covered question.
- **Return usage** — in a 2-week free window, unprompted queries/day.
- **Net promoter-style** "would you recommend to a colleague in labor law?" + referral offered.
- **Switching signal** — would it replace a tab they keep open (Kol-Zchut / Nevo / a checklist)?

---

## Release recommendation (how the program concludes)

At program end, LawME issues one verdict:

- **GREEN — proceed to Beta:** all §8.1 gates met; produce the ranked P1/P2 backlog and the corpus-expansion order (from where partners hit "out of scope" most).
- **AMBER — conditional:** ≤ 2 scheduled P1s, no P0; re-test the fixed items with 2 partners before Beta.
- **RED — hold:** any P0, any over-trust incident, or honest-decline < 98%. Root-cause, add regression cases, re-run Session C.

The recommendation explicitly separates **"trustworthy on what it covers"** (the V1 claim) from **"broad enough to sell"** (the GA claim), so a GREEN Beta verdict never implies GA readiness.
