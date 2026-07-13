# Matter Next-Action Model (Epic 4)

Engine: `matter-next-action` · `src/modules/matter/engines/next-action.ts`

## Question

What next, who, and when? Next-Action is the **canonical action planner**. The
orchestrator surfaces its ranked output as the matter's recommended plan
(`MatterState.questions.whatNext`).

## Derivation order

Actions are derived, then ranked. Sources, in priority intent:

1. **Time-critical** — overdue strict deadlines (critical), then imminent
   (≤7 days) deadlines.
2. **Unblock the current stage** — one action per `BlockingCondition`
   (missing fact → verify; missing evidence → collect; policy → partner
   approval; deadline → senior review; missing document → prepare).
3. **Client follow-up** — when the client is slow/unreachable.
4. **Advance** — when nothing blocks and a next stage exists.
5. **Terminal note** — an informational finding when the stage is the last in
   the graph.

## Ranking

Actions are sorted by `priority` (critical→info), ties broken by insertion
order so time-critical items lead. `data.plan` is the ordered list; `data.topPriority`
is the highest priority present. The engine's `score` is `null` — a plan is not
a health score.

## Ownership and approval

Every action carries an `ownerRole` (`partner | senior_lawyer | lawyer | intern
| paralegal | client`) which populates the matter's **who**. Externally-effective
actions carry `requiresHumanApproval: true`; the engine flags
`requiresHumanReview` when any queued action needs approval.
