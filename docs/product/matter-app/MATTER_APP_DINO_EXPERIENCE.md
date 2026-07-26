# Matter App — דינו Experience (Epic 5.1)

Governed by the Design Bible §14 (the דינו constitution): never a chatbot, never a
mascot, always contextual, always useful, always evidence-based, restrained (one
seal per object). דינו does not dominate the Matter App. He is a **quiet seal inside
the work** plus an **on-request tool** — never a permanent chat panel.

## Two modes

### Ambient intelligence (automatic, deterministic — Tier 1)
Surfaced from `MatterProfile` (no pipeline run, no cost). Appears as **seals** on the
object each finding is about — never as a floating oracle:

| Ambient finding | Where the seal sits | Source |
|---|---|---|
| missing required item | the ◆ diamond on the spine node | `matter-evidence`/`matter-document` |
| deadline risk | the Urgent Deadline object / ▲ on the node | `matter-deadline` |
| legal-coverage gap | ⚑ seal on the assessment/legal node + the state chip | `matter-legal` `canRecommend` |
| contradiction | ⚑ seal on the relevant node | legal/contradiction signal |
| stale client update | the Client Waiting object | `matter-communication` |
| missing owner | the Team lens + a core note | `matter-team` |
| required specialist review | the review seal on the core + legal lens | dimension `reviewRoute = specialist_review` |

Rule: **if דינו has nothing actionable on an object, there is no seal.** Silence is
the default; the seal's scarcity is its authority.

### On-request intelligence (Tier 2 — the Dino pipeline)
Launched explicitly (⌘K, the TopBar דינו, or `/`), scoped to the matter, fail-closed:

- prepare a research plan · summarize the matter · prepare for the hearing · draft an
  internal research memo · analyze evidence gaps · compare legal authorities ·
  propose next actions.

Each runs the 26-stage pipeline with a **bounded context package** (facts with
epistemic status + identity + AI policy + confidentiality; never more than needed;
via the application layer — Dino and Matter never import each other).

## Where דינו appears

- **On objects** (ambient seals) — the primary presence.
- **In the TopBar** (the assistant tool surface) — for on-request runs; opens a tool
  surface, not a chat thread in the canvas.
- **Never** as a permanent side panel, never as a chat bubble, never as a mascot.

## When דינו stays quiet

- On-track matters with nothing actionable: no seals; the assistant offers, on
  request, strategic suggestions only.
- Policy `prohibited`: דינו is disabled for the matter; a manual-handling notice
  replaces AI surfaces.
- When coverage is insufficient: דינו does **not** guess — see fail-closed below.

## Provenance

Every דינו statement (ambient or on-request) carries provenance: source, confidence
(decomposed `ConfidenceReport`, never one bare number), updated time. Evidence is
**one hover away (glimpse)** and **one click away (drawer)** — the Bible pattern.
Unsourced דינו output is a product bug.

## Clarification

When a request lacks a critical input, דינו asks a single, specific clarification
(the Clarification Gate) rather than guessing — shown as one question with the
missing field named, not a chat back-and-forth.

## Blocked actions & human approval

- A `do_not_proceed` review route visibly disables the corresponding Class-2 drafting
  affordance; דינו states why and routes to the human.
- Every draft דינו produces is labelled "טיוטת מחקר משפטי — נדרשת בדיקת עורך דין" and
  carries its review route. דינו never sends, files, or serves (Class 3).
- Human approval is shown as an explicit gate on the action, not an afterthought.

## Fail-closed output

When the Triad coverage is insufficient, an on-request Dino answer returns the
no-answer state — *"לא נמצאו בקורפוס מקורות ברמת רלוונטיות מספקת לשאלה זו"* — with what
is missing and a specialist-review route. It never manufactures a weak answer, and it
never shows an outcome probability.

## Returning to the Matter flow

Any דינו surface closes with Esc (evidence drawer, assistant) and returns focus to
the object it was attached to — one focus level back, per the Bible's interaction
model. A pinned Dino result becomes a sourced note on the relevant node; it does not
navigate the attorney away from the matter.

## What דינו never does here

Dominate the screen · run automatically · appear as a chatbot/mascot/toast · show
chain-of-thought (none exists) · show an outcome probability · present an allegation
as fact or an unverified case number as authority · execute an external action.
