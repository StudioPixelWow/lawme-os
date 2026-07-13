# Matter Narrative Engine (Epic 4 Architecture Review — design only)

Designs, but does **not** implement, an engine that lets a matter state itself in
a concise professional briefing. Not a chatbot; not a persona; not prose
invention. It converts verified structured assessments into a partner-grade
operational summary.

## Design decision: v1 is deterministic templates, NOT LLM prose

The first version must be **deterministic template composition** over the typed
`MatterState`, for the same reasons Dino keeps its controlled draft rule-bound:

- The narrative must never assert anything not present in a structured finding.
- It must be reproducible for audit (same MatterState → same narrative).
- It must carry provenance (each sentence traces to an engine finding/action).
- It must respect the client AI policy — a `prohibited` matter gets a minimal,
  no-AI-processing narrative.

An LLM phrasing layer may be added **later**, strictly downstream of the
deterministic briefing, and only under the same fail-closed / human-review rules
as Dino's drafting. It never sources content; it only rephrases already-verified
sentences. That is a future decision, not v1.

## Example (target output, deterministic)

```
תיק כהן נמצא בשלב הכנה לדיון.
הדיון בעוד 4 ימים.
חסר תצהיר עד מרכזי.
הלקוח לא עודכן 8 ימים.
שתי משימות חוסמות התקדמות.
המערכת ממליצה להשלים את התצהיר ולשלוח עדכון ללקוח עד מחר.
```

Each line is emitted from a specific structured source: stage from the state
machine; deadline from the Deadline engine; missing affidavit from Evidence;
client-silence from Client/Communication; blockers from the state machine;
recommended actions from Next-Action. No line exists without a backing finding.

## Priority & ordering rules

Sentences are ordered by operational urgency, not narrative flow:

1. **Current state** (stage) — orientation.
2. **Urgent / time-critical** — strict overdue then imminent deadlines.
3. **Blockers** — what stops progress now.
4. **Missing** — facts / evidence / documents required for the stage.
5. **Client status** — silence / unreachable / awaiting response.
6. **Next actions** — the top 1–2 from the Next-Action plan, with owner + due.

Within a group, order by severity (critical→info). The narrative is length-
bounded (headline + ≤ ~6 lines by default; an extended mode lists all findings).

## Typed output proposal

```ts
interface MatterNarrative {
  headline: string;                 // one line: matter + stage + top concern
  currentState: string;
  urgentItems: string[];            // from Deadline (overdue/imminent)
  missingItems: string[];           // from Missing-Info / Evidence / Document
  nextActions: string[];            // rendered Next-Action items (owner + due)
  blockers: string[];               // from state machine blocking conditions
  clientStatus: string | null;      // from Client / Communication
  deadlineStatus: string | null;    // from Deadline
  legalStatus: string | null;       // from Legal (triad coverage, disclosed)
  confidence: ConfidenceReport;     // shared primitive — never one bare number
  generatedAt: string;              // = MatterState.asOf (deterministic)
  sourceAssessmentIds: string[];    // engine+version ids the narrative drew from
  aiPolicyApplied: string;          // e.g. "allowed_with_review" / "prohibited"
}
```

## Hard rules

- **Verified structured inputs only.** Inputs are `EngineAssessment` findings and
  actions from `assessMatter`. The narrative never reads raw documents or invents
  facts.
- **No-claim rule.** It never states a legal conclusion or an outcome
  probability. Legal status is reported as *coverage* ("sufficient / insufficient
  / specialist review"), mirroring the Legal engine — never "you will win".
- **No personification.** The matter does not speak in the first person or claim
  feelings; it is a briefing, phrased impersonally ("המערכת ממליצה", not "אני
  ממליץ"). "Dino recommends" phrasing, if used, refers to the system, not a
  persona.
- **Human-review behaviour.** When any source assessment `requiresHumanReview`,
  the narrative carries a visible review flag and never implies autonomous
  action.
- **Prohibited language.** No certainty claims, no probabilities, no advice
  framed as a decision, no invented citations.
- **Localization & tone.** Hebrew-first, RTL, professional register; concise,
  factual, partner-grade. Tone is briefing, not marketing.
- **Determinism & provenance.** `generatedAt = asOf`; `sourceAssessmentIds`
  makes every narrative auditable back to its engines.

## Ownership

The Narrative Engine is a **consumer** of `MatterState` — it sits above the
engines, owns no facts, and holds no source of truth. It belongs in
`src/modules/matter/narrative/` (future), depends only on the Matter module's
public output and the shared confidence primitive.
