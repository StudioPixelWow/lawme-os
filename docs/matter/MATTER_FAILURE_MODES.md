# Matter Failure & Degraded Modes (Epic 4 Architecture Review)

The governing rule: **a Matter must never appear healthy because an engine failed
silently.** Absence of a signal is not a green signal. This document defines the
states and the behaviour under each failure.

## Assessment states (proposed contract addition)

Today `assessMatter` assumes every engine runs and returns. The target contract
adds an explicit per-engine and overall completeness state:

- **complete** — engine ran, inputs sufficient.
- **partial** — engine ran but some inputs were missing/stale (result is
  provisional; confidence lowered).
- **stale** — served from cache; inputs changed since; recompute pending.
- **unavailable** — engine could not run (dependency down / threw). **Not
  healthy.**
- **blocked** — engine deliberately withheld a substantive result (e.g. AI policy
  prohibits, legal coverage insufficient). A *decision*, not a failure.
- **requires_review** — engine ran but flags human review before reliance.

Overall matter status must degrade to the **worst** of these — an `unavailable`
engine forces the matter to `unknown`/`attention`, never `healthy`.

## Failure scenarios & required behaviour

| Scenario | Required behaviour |
|---|---|
| One engine throws | Catch at the orchestrator; that engine → `unavailable` with an error finding; matter status cannot be `healthy`; other engines still reported. Never let one engine crash the whole assessment. |
| Legal coverage unavailable (triad error/timeout) | Legal + Outcome → `unavailable`/`unknown`; **fail closed** — no substantive legal recommendation; route to specialist review. |
| Finance integration disconnected | Financial → `unavailable` (not `healthy`); other engines unaffected; UI shows finance as "data unavailable", not "no issues". |
| Communication data stale | Communication → `stale` with age; awaiting-response findings flagged provisional. |
| Team calendar unavailable | Team → `partial`/`unavailable` for load; staffing facts still assessed if present. |
| Document parsing fails | Affected document → treated as **not present/verified** (fail closed); Document engine surfaces a parse-failure finding; never assume content. |
| Event arrives out of order | Events carry a monotonic sequence/timestamp; a stale event never overwrites a newer state; recompute uses the latest known inputs; `inputsHash` guards against regressions. |
| Deadline disputed | Deadline kept as a deadline with a `disputed` flag; still counted for risk/urgency (a disputed strict deadline is not a safe deadline); surfaced for human resolution. |
| Matter facts conflict | Conflicting facts → `disputed` status (never silently pick one); Missing-Info/Risk surface the conflict; Readiness treats a disputed required fact as not-satisfied (fail closed). |
| A source is revoked (authority withdrawn/superseded) | Legal re-evaluates; any recommendation resting on it → downgraded; snapshot records the change; Outcome recomputed. |
| AI policy blocks analysis (`prohibited`) | `blocked` (a decision): engines that require AI processing withhold; the matter is handled manually; this is surfaced as a policy block, not an error, and never as `healthy`. |

## Design implications

1. **Orchestrator must isolate engine failures.** Wrap each engine call;
   a thrown engine becomes an `unavailable` assessment with a coded finding, not
   an exception that aborts `assessMatter`. (Today the engines are pure and don't
   throw on the fixtures, but the contract must guarantee isolation before real,
   messy data arrives.)
2. **Fail closed, everywhere.** Missing input → treat as *not satisfied*, never
   as *satisfied*. This already holds for facts/evidence/coverage; extend it to
   every external dependency.
3. **Freshness is part of the answer.** `stale`/`partial`/`unavailable` travel
   with each engine result and roll up; the UI can render honest degraded states.
4. **Blocked ≠ failed.** A deliberate withholding (policy, coverage) is a
   first-class, explainable state distinct from an engine that could not run.

## Gap in the current implementation (for the review)

`assessMatter` currently calls each engine directly with no try/catch and assumes
all 17 return. That is fine for deterministic fixtures but is **not** safe for
production inputs. Adding orchestrator-level failure isolation + the completeness
state is a **small, additive change** (wrap calls, add a `state` field to the
assessment) and is listed as a recommended (non-blocking) follow-up, not a commit
blocker — the failure surface is empty while inputs are trusted fixtures.
