# Founder Review — Epic 4.2: Matter Score & Matter Narrative

Status: complete, awaiting founder review. **Not committed. Not pushed.**
Baseline: `01b19aa` (Epic 4.1) on `dev-preview`, confirmed on `origin`.

Epic 4.2 turns the structured Matter Intelligence output into two stable,
additive product contracts — a decomposed **Matter Score** and a deterministic,
source-traceable **Matter Narrative** — both derived from the same `MatterState`
and the same assessment ids. No UI, no persistence, no LLM, no engine-logic change.

## 1. Current branch and baseline

`dev-preview`, HEAD `01b19aa`, `origin/dev-preview` `01b19aa`, working tree clean
before the work.

## 2. Score dimensions implemented

12 required — legal, procedure, evidence, documents, deadlines, readiness,
progress, client, communication, team, finance, risk — plus optional
outcomeReadiness. Each maps to a specific engine assessment (no logic duplication).

## 3. Dimension state rules

Categorical-first states (strong/healthy/attention/at_risk/blocked/unknown/
unavailable/stale/requires_review/not_applicable). Resolution order: unavailable
(failed engine) → base status → dimension hard rules (deadlines strict-overdue →
blocked; legal insufficient → requires_review; missing mandatory evidence/docs →
at_risk; no owner → blocked; critical risk → at_risk) → strong upgrade → stale cap.
Precedence documented in MATTER_SCORE_DIMENSIONS.md.

## 4. Numeric scoring decisions

Integer 0..100 only for measurable dimensions (evidence, documents, readiness,
progress, team, finance-if-available, risk), always paired with a state. Categorical
only for legal, deadlines, client, procedure, outcomeReadiness. Unknown/unavailable
→ null (never 0). No blended overall percentage. Details in
MATTER_SCORE_NUMERIC_POLICY.md.

## 5. Overall Matter posture model

`on_track / needs_attention / at_risk / blocked / degraded / requires_review /
insufficient_data`, by precedence over required dimensions — not an average.
Blocked/degraded/requires_review dominate; low coverage → insufficient_data.
Summary adds dominant concern, strongest/weakest dimension, top blockers,
opportunities, unavailable/stale dimensions, assessment coverage, review flag.

## 6. Trend contract

`computeTrend(prev, current)` — improving/stable/deteriorating/unknown from posture
concern-rank + per-dimension changes. Deterministic, **no persistence**.

## 7. Narrative contract

`MatterNarrative` with headline, current state/stage, urgent items, blockers,
missing items, next actions, per-dimension status lines, opportunities, limitations,
confidence, review route, generatedAt, sourceAssessmentIds, and a full
`sentenceEvidenceMap`. Every sentence maps to finding/blocker/action/assessment ids.

## 8. Narrative engine

Deterministic templates only (NO LLM). Sentences are built from structured items,
so traceability is structural. Priority order and per-variant caps
(compact/standard/detailed). Three render forms: one-line, morning briefing, full
briefing. Never personifies, never states an outcome probability, never claims "no
risk" when an engine is unavailable — enforced by a banned-phrase test.

## 9. Hebrew language rules

Deterministic Hebrew formatters (day counts with number agreement, relative dates,
overdue, dimension states, dd.mm.yyyy, list joins), all relative to asOf. Modern,
short, impersonal, RTL-safe, no marketing/anthropomorphism. See
MATTER_NARRATIVE_LANGUAGE_RULES.md.

## 10. Briefing output variants

`oneLineHe`, `morningBriefingHe`, `fullBriefingHe` — all derive from the same
narrative object and the same source assessment ids; repeated sentences deduped.

## 11. Action prioritization

Deterministic composite ranking (priority × 10, +6 deadline, +5 blocking, +1
approval). Emits rank, reason, owner (or "לא ידוע"), due (or "לא ידוע"),
dependencies, blocker codes, approval requirement, expected effect. No invented
owner/due.

## 12. Matter integration

`buildMatterProfile(matter)` / `profileFromState(state)` compose
state → score → prioritized actions → narrative, additively. `assessMatter` and
`MatterState` unchanged; backward compatible.

## 13. Failure and stale-data behavior

Failed engine → dimension unavailable + posture degraded, disclosed in the
narrative, never healthy, no raw exception leaked. Unavailable integration not
penalized as 0. Partial legal coverage → requires_review + specialist route. Missing
facts named. Stale required dimension → not on_track. Missing owner disclosed.

## 14. Test scenarios

A healthy → on_track; B hearing-in-4-days/missing affidavit → deadline prominent,
affidavit prioritized; C client-silence → communication at_risk, no legal inflation;
D engine failure → degraded/unavailable/disclosed; E missing legal coverage →
requires_review + specialist; F finance unavailable → unavailable, no penalty; G
multiple blockers → blocked, ranked, concise; H conflicting facts → disputed never
asserted as confirmed. All pass.

## 15. Benchmark results

`matter:benchmark` PASSED — 8 cases: 0 unsupported statements, 0 allegations as
fact, 0 false-healthy-on-failure, 1.0 sentence traceability, 1.0 blocking-deadline
surfaced, 1.0 specialist routing. Hard targets met.

Full matrix: typecheck ✓, lint ✓, intelligence 19, matter 46, dino 12, triad 24,
poc 97 (+1 pre-existing skip), corpus 32, dino:benchmark PASSED,
legal:benchmark:run 100%, build ✓ (`/today`, `/dev` unchanged).

## 16. Exact files created

`src/modules/matter/score/` (types, dimensions, resolver, posture, trend, index),
`src/modules/matter/narrative/` (types, formatters, templates, prioritizer,
narrative-engine, index), `src/modules/matter/profile.ts`,
`src/modules/matter/benchmark/score-narrative-benchmark.ts`,
`src/modules/matter/__tests__/{score,narrative}.test.ts` + `score-fixtures.ts`,
and 11 `docs/matter/` documents (incl. this one).

## 17. Exact files modified

`src/modules/matter/index.ts` (export the additive surface), `package.json`
(`matter:test` glob already covers new tests; added `matter:benchmark`).

## 18. Behavior changes

None to existing outputs. Score/posture/narrative/prioritizedActions are additive;
`MatterState` and all engine outputs are unchanged. No scoring/pipeline/UI/route
change; no migration; no DB write; no provider/LLM call.

## 19. Founder decisions required

1. Approve the categorical-first score + posture model and the numeric policy
   (which dimensions are numeric vs categorical).
2. Approve the deterministic-templates narrative for V1 (LLM phrasing remains a
   future, downstream option — not built).
3. Confirm the `outcomeReadiness` dimension should remain optional/among the set.

## 20. Recommended immediate next step

Review and approve Epic 4.2; commit it as its own isolated commit on top of
`01b19aa`; push via the bundle flow. Do not start Epic 4.3 (e.g. persistence
snapshots or Matter Workspace UI) until this is reviewed.
