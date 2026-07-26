# Founder Review — Epic 5.1: Matter App Product Design Review

Status: complete, awaiting founder review. **No code, no UI, no commit.** HEAD
`13cbaa2`. This is the final product-design review before any Matter UI is built.

## 1. Review recommendation

**B — Epic 5 architecture requires a small, documentation-only product revision
before visual prototyping.** The data, hierarchy, five-second answers, AI tiering and
safety are correct and stay; three revisions align it with the sealed Design Bible.

## 2. Current architecture strengths

Correct information hierarchy and five-second answers; every surface bound to a real
`MatterProfile` field; categorical-first score; deterministic, traceable narrative;
fail-closed safety; ambient-vs-on-request AI split; explicit human-review; RTL/
accessibility intent. It is genuinely buildable.

## 3. Current architecture weaknesses

It was expressed as a generic **nine-region page**, which risks the "grid of cards /
dashboard" look the Bible forbids. The **Procedure/Milestone Track** — the Bible's
spine of the Matter Workspace — was demoted into a panel. The **Score** defaulted to a
12-cell grid (a forbidden KPI wall). Too many permanent regions competed for the one-
hero slot.

## 4. Regions removed, merged or changed

Nine regions → **five product objects** + the Deadline object. Header+Briefing+Needs-
Now+Actions → the **Decision Core** (hero). Score grid → the **Score Lens** (rail).
Panels → **Intelligence Lenses** in the **Context Dock**. Dino launcher + Provenance →
**דינו seals + evidence drawer**. Trend → folded into spine/score history. The
**Procedure Track promoted** to the **Milestone Spine** (the room's structure).

## 5. Composition options reviewed

A — Operational Command Surface (87/120); B — Matter Story & Timeline / spine
(100/120); C — Focused Matter Canvas (100/120). Full wireframes for all three.

## 6. Recommended composition

**The Matter Room** — a synthesis: B's milestone spine (structure) + A's Decision Core
(headline) + C's one-focus discipline and Context Dock. It is the Bible's literal
Matter Workspace vision; passes the blur, one-hero and two-accent laws.

## 7. Reduction-pass result

Two versions defined; **Reduced Premium** recommended first: default screen = three
objects (Decision Core hero · Milestone Spine · quiet Context Dock of collapsed
lenses), one obvious action, everything else one interaction away.

## 8. Five-second experience

Identity + practice-area seat · **state chip (posture) as headline** · one narrative
sentence · the current milestone node under the gold meridian · nearest deadline · the
**one primary action** (owner + due) · a review seal if required. All eight questions
answered above the fold.

## 9. Decision Core

Max five items (identity, state chip, seals, one sentence, one CTA); full state
behavior (loading/healthy/attention/at-risk/blocked/degraded/stale/insufficient/
policy-restricted/empty) defined; exactly one primary action always.

## 10. Score experience

A diagnostic **health rail** ordered weakest→strongest with a focused lens on click —
**not** a radar, circle, 12-card grid, or KPI wall. Numeric only for measurable
dimensions; unavailable renders as "לא זמין", never zero; full 12 only in a dedicated
Score view.

## 11. Narrative experience

Presented as a senior associate's calm, current, sourced briefing — a headline +
one/two sentences with expandable detail; every sentence drills to evidence; variants
compact/standard/detailed; never a chatbot paragraph or a report.

## 12. Dino experience

Ambient **seals** on the objects he has findings for (silent otherwise) + an
**on-request** tool surface; never a chatbot/mascot/panel; fail-closed no-answer;
evidence one hover/one click away; drafts labelled + routed; never executes external
actions.

## 13. Timeline model

**Three surfaces:** the Procedure Timeline (the spine, primary), the Activity Timeline
(a lens), the Deadline Lens (a focused ledger) — never one overloaded feed. Only the
spine is always visible.

## 14. Role model

One composition adapting by role (partner/senior/lawyer/intern/office-manager/finance/
compliance); visibility matrix defined; **finance is role- and confidentiality-gated
and never occupies permanent space** (approved).

## 15. Interaction model

Selection re-aims context (halo + meridian); Esc walks back; five action-gating
classes (0 view · 1 optimistic+undo · 2 human-approval · 3 prohibited-to-AI · 4
on-request Dino); no hidden-hover critical actions; full primitive catalog.

## 16. Responsive model

Full room at 1440; compact at 1280; dock→drawer, nav→icon at 1024; **recomposition**
at 390 (spine→horizontal shelf, lenses→bottom sheets, sticky CTA). Zero-overflow gate
at four widths.

## 17. Accessibility result

Buildable to **IS 5568 / WCAG 2.0 AA**: state by text + shape (never color alone),
grayscale/blur hierarchy holds, keyboard-only path end-to-end, Hebrew screen-reader
sentences per surface, native RTL via logical properties, reduced-motion safe.

## 18. State coverage

18 states catalogued with triggers + behavior; two invariants enforced (new/empty ≠
broken; degraded ≠ healthy).

## 19. Product-test definition

Five-second, thirty-second, ten-minute tests with measurable pass criteria; automated
data-layer checks (no false-healthy, 100% traceability, two-accent, one-hero, zero-
overflow); the blur "not-generic" test; accessibility gates.

## 20. Implementation slices

14 slices from Static Skeleton → Decision Core → Narrative → Score Lens → Blockers/
Actions → Spine → Documents/Evidence → Client → Legal → Dino → Team/Finance →
Responsive/A11y → Motion → Production data. First four are the validating prototype.

## 21. Exact files created

`docs/product/matter-app/`: MATTER_APP_PRODUCT_DESIGN_REVIEW.md,
COMPOSITION_OPTIONS.md, RECOMMENDED_COMPOSITION.md, REDUCTION_REVIEW.md,
ASCII_WIREFRAMES.md, DECISION_CORE.md, PRODUCT_OBJECTS.md, DINO_EXPERIENCE.md,
TIMELINE_MODEL.md, ROLE_MODEL.md, INTERACTION_MODEL.md, KEYBOARD_MODEL.md,
RESPONSIVE_MODEL.md, ACCESSIBILITY_REVIEW.md, STATE_CATALOG.md, PRODUCT_TESTS.md,
IMPLEMENTATION_SLICES.md, and this FOUNDER_REVIEW_EPIC_5_1.md (18 files).

## 22. Exact files modified

None. The seven Epic 5 documents are **not** edited — the revision is expressed as
this review layer on top (the Design Bible discovery reframes them). If you prefer, a
follow-up can annotate the Epic 5 docs with a one-line pointer to this review; that is
the only optional edit and it is not made unprompted.

## 23. Founder decisions required

1. Approve **Recommendation B** and the Matter Room composition (Reduced Premium
   first).
2. Approve the nine-regions → five-objects reduction and the promotion of the
   Milestone Spine to the room's structure.
3. Approve the Score-as-rail (no default grid) and דינו-as-seals (no panel).
4. Approve the finance role/confidentiality gating.
5. Decide whether to lightly annotate the Epic 5 docs to point at this review (else
   they stand as history).

## 24. Recommended immediate next step

Approve this review, then commit Epic 5 + Epic 5.1 together (or in sequence), and hand
the Reduced Premium Matter Room to the Design Bible team for the first visual mockup
(Slices 1–4). Do not start implementation until approved.

---

### Answers to the ten Phase-22 questions

1. First five seconds → identity + state chip + narrative + now-node + deadline + one
   action + review seal. 2. One primary action → top of `prioritizedActions` as the
   hero CTA. 3. Always visible → Decision Core + Milestone Spine. 4. One interaction
   away → Score Lens, any Intelligence Lens, node detail, deadline ledger, evidence
   drawer. 5. Never by default → score grid, full lists, finance (unpermitted), chain-
   of-thought (never), outcome probability (never). 6. Uniquely LawME → the spine +
   gold meridian + state-chip headline + דינו seals + two-accent restraint. 7.
   Prevents AI-generated look → one hero, no card grid, no KPI/radar, deterministic
   order, sourced quiet AI, the 52 nevers. 8. First mockup → shell + one real matter's
   Decision Core + Spine (healthy vs blocked) + one deadline + one דינו seal. 9. Design
   first → the Reduced Premium Matter Room. 10. Ready for visual design → **yes, after
   this small revision is accepted.**
