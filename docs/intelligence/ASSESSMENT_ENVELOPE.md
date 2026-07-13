# Assessment Envelope (Epic 4.1)

`src/modules/intelligence/core/assessment.ts` · `result.ts`

## Decision

Create a shared assessment envelope **as a contract**, generic over a typed
domain payload — but do **not** rewrite Matter's existing `EngineAssessment` in
this epic. The envelope improves cross-domain consistency without removing domain
detail, and it fixes the one design smell the review flagged: no `data: any`.

## `AssessmentEnvelope<TData>`

```ts
type EngineStatus = "healthy" | "attention" | "at_risk" | "blocked" | "unknown";

type ExecutionState =
  | "complete" | "partial" | "stale"
  | "unavailable" | "blocked" | "requires_review";

interface AssessmentEnvelope<TData = Record<string, unknown>> {
  assessmentId?: string;
  engine: string;
  engineVersion: string;
  status: EngineStatus;
  executionState: ExecutionState;     // a failed engine is `unavailable`, never healthy
  findings: Finding[];
  actions: RecommendedAction[];
  warnings: Warning[];
  blockers: BlockingCondition[];
  confidence?: ConfidenceReport | number | null;
  reviewRoute?: ReviewRoute | null;
  provenance?: Provenance | null;
  data: TData;                        // typed, domain-owned — never `any`
  generatedAt?: string;
  inputsHash?: string;
  durationMs?: number;
}
```

## Why generic, not `any`

The Epic 4 Matter `EngineAssessment.data` is `Record<string, unknown>`. The shared
envelope is generic (`<TData>`) so a domain can pass its **typed** payload
(e.g. the Deadline engine's `DeadlineView[]`) and keep full type-safety across the
boundary. Future domains adopt the envelope with their own `TData`.

## `DomainResult<TPayload>`

The outer wrapper an orchestrator returns for one run:

```ts
interface DomainResult<TPayload> {
  domain: "matter" | "dino" | "client" | "document" | "office" | "team" | "finance";
  version: string;
  generatedAt: string;
  payload: TPayload;                  // e.g. MatterState, DinoRunResult
  warnings?: Warning[];
  reviewRoute?: ReviewRoute | null;
  correlationId?: string;
}
```

This is what the **application layer** composes across domains (per the approved
dependency model) — one domain never imports another; they meet as `DomainResult`
values above both.

## Adoption

`EngineStatus` is adopted by Matter now (identical values, re-exported). The full
`AssessmentEnvelope`/`DomainResult` are contracts for incremental adoption and for
new domains; Matter's `EngineAssessment` and `MatterState` are documented as the
current domain specializations and converge to the envelope over time. Matter's
new `MatterState.degraded` + per-engine failure representation already implement
the `ExecutionState` idea in domain form (see FAILURE isolation in the founder
review).
