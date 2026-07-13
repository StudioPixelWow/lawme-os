# Matter Action Prioritization (Epic 4.2)

`src/modules/matter/narrative/prioritizer.ts`

## Purpose

Deterministically rank the Matter's recommended actions. The source is the
canonical Next-Action plan already present in `MatterState.questions.whatNext`
(no engine logic is re-run). Owners and due dates are **never invented** — unknown
stays `"לא ידוע"`.

## Ranking signals

A composite rank score (higher = act sooner):

- **priority** (action severity): `severityRank × 10` — the dominant term.
- **deadline proximity**: `+6` when the action addresses a deadline.
- **blocking impact**: `+5` when the action clears a current blocker (matched by
  the blocker code appearing in the action id).
- **approval requirement**: `+1` when human approval is required (start earlier to
  leave approval time).

Ties break by action severity. The ranking is fully deterministic.

## Output — `PrioritizedAction`

`rank`, `actionId`, `labelHe`, `reasonHe` (the action's "why"), `ownerRoleHe`
(Hebrew role or "לא ידוע"), `dueHe` (due hint or "לא ידוע"), `priority`,
`dependencies`, `blockerCodes` (blockers this action clears),
`requiresHumanApproval`, `expectedEffectHe`, `sourceAssessmentIds`.

## Expected effect

Derived transparently: deadline actions → "מניעת החמצת מועד קשיח"; blocker-clearing
actions → "הסרת חסם וקידום השלב"; high/critical → "טיפול בסיכון מהותי"; else
"קידום שוטף של התיק".

## Guarantees

- No invented owner or due date (unknown is explicit).
- Approval requirement is preserved from the underlying action.
- Deterministic given the same `MatterState`.
- The top-ranked actions feed the narrative's `nextActionsHe` (capped per variant).
