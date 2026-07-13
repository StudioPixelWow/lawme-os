# Findings and Actions (Epic 4.1)

`src/modules/intelligence/core/finding.ts` · `recommended-action.ts` ·
`warning.ts` · `blocking-condition.ts`

## Neutral cross-domain shapes

These are the canonical shapes future domains build against and that Dino/Matter
converge to. Domain-specific *logic* stays in the domain; only the shapes are
shared. Matter keeps its richer domain `Finding` (with the seven-question
`dimension`) and `RecommendedAction` (with its role vocabulary) in this epic — the
shared contracts coexist and are the convergence target, not a forced rewrite.

## Finding

```ts
interface Finding {
  id: string;
  type: string;                 // stable code, e.g. "deadline:overdue"
  titleHe: string;
  descriptionHe?: string;
  severity: Severity;
  confidence?: number | null;
  provenance?: Provenance | null;
  relatedObjectIds?: string[];  // matter/document/deadline ids
  blocking?: boolean;
  freshness?: { computedAt: string; stale?: boolean } | null;
}
```

## RecommendedAction

```ts
interface RecommendedAction {
  id: string;
  type: string;
  titleHe: string;
  reasonHe: string;
  ownerRole: string;            // domain owns its role vocabulary
  dueHint?: string | null;
  priority: Severity;
  dependencies?: string[];
  requiresHumanApproval: boolean;
  relatedFindingIds?: string[];
  provenance?: Provenance | null;
  status?: ActionStatus;        // proposed | accepted | in_progress | done | rejected | blocked
}
```

## Warning

Warnings are **never swallowed**. A degraded/stale/partial condition becomes a
structured `Warning { code, kind, messageHe, severity }` where `kind` ∈
`stale_inputs | partial_data | degraded_dependency | engine_unavailable |
coverage_gap | policy_restriction | other`. This is what the Matter failure-
isolation path emits so a problem is visible, not hidden.

## BlockingCondition

Neutral `{ code, kind, messageHe, severity }`. `kind` is domain-specific
(`missing_fact` / `policy` / `deadline` for Matter; coverage kinds for Dino),
but the envelope is shared so the application layer can render blockers uniformly.

## Relationship to the domain types

- Matter's `Finding.severity` and `RecommendedAction.priority` now use the shared
  `Severity`.
- Matter's domain `Finding` adds `dimension` (which of the seven matter questions
  it answers) — a legitimate domain extension the neutral contract does not carry.
- Convergence of Matter's domain finding/action onto the neutral contracts is a
  documented, incremental follow-up; it is intentionally out of scope for this
  small refactor to avoid rewriting every engine and test.
