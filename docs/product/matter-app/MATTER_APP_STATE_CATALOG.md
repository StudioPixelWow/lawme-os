# Matter App — State Catalog (Epic 5.1)

Every screen state, its trigger (from `MatterProfile`), and its behavior. Two laws:
**a new/empty matter must never look broken**, and **a degraded matter must never look
healthy.**

| State | Trigger | Decision Core | Spine | Lenses | דינו |
|---|---|---|---|---|---|
| **Loading** | profile not resolved | structure-true skeleton (name/chip/line/CTA) in paper-300; no values, no shimmer | skeleton nodes | collapsed skeletons | silent |
| **Empty / new matter** | matter opened, no stage data yet | identity + "תיק חדש — השלם פרטי פתיחה" + one onboarding CTA | full future spine, all ○ | prompt to add first facts/documents | silent until data |
| **Healthy (on_track)** | `posture = on_track` | green chip (only color) + calm one-liner + one forward CTA | ● done, ◉ now, ○ future; no diamonds/pulse | all quiet (ink, not color) | strategic suggestion on request only |
| **Needs attention** | `posture = needs_attention` | amber chip + top attention concern + its action | a node may carry attention | the relevant lens flagged | seal only if actionable |
| **At risk** | `posture = at_risk` | urgent-family chip + concern + clearing action | ▲/◆ on the current/next node | risk/legal lens flagged | seal on the risk source |
| **Blocked** | `posture = blocked` | red chip + the blocker sentence + the clearing CTA | ▲ risk pulse on the blocked transition | blocker's lens surfaced | seal on the blocker |
| **Degraded** | `state.degraded.hasFailures` | grey-red "הערכה חלקית" chip + names failed engine(s); **never healthy**; CTA "בדוק ידנית" if it blocks | the failed dimension's node shows "לא זמין" | the failed lens shows unavailable | discloses the gap, no guess |
| **Stale** | `score.freshness.stale` | amber freshness dot + `computedAt` + one-tap refresh; chip cannot read `strong` | stale nodes marked | stale lens labelled | notes staleness |
| **Insufficient data** | `posture = insufficient_data` | neutral "מידע חסר להערכה" chip + action to complete missing facts | current node shows missing facts | missing-info lens surfaced | asks a single clarification |
| **Review required** | `requiresHumanReview` | "טעון בדיקה" seal + the review target | node carries the seal | the routed lens flagged | states the route, no autonomous step |
| **No legal coverage** | `matter-legal` `canRecommend=false` | chip ≥ requires_review; narrative names missing authority | ⚑ on the assessment node | Legal lens → specialist route | fail-closed no-answer on request |
| **Engine unavailable** | an engine failed | dimension "לא זמין"; posture degraded | that node neutral-marked | that lens unavailable (not zero) | discloses |
| **Disconnected finance** | finance engine/integration down | (finance not in core) | — | Finance lens "לא זמין" (never 0, no invented balance); hidden for non-finance roles | silent |
| **No documents** | no docs for stage | — | node shows ◆ if a doc is required | Documents lens: templates + "הכן מסמך" | suggests a template on request |
| **No deadlines** | no strict/imminent deadline | no deadline object (calm) | no ▲ | Deadline lens: "אין מועדים בסיכון" quiet confirmation | silent |
| **Closed matter** | matter closed | chip "סגור" + closure summary + reopen (permission-gated) | full ● spine, no now-node meridian | read-only lenses | historical only |
| **Archived matter** | matter archived | read-only banner "בארכיון"; restore (permission-gated) | read-only | read-only | disabled |
| **Policy-restricted** | `aiPolicy = prohibited` | "טיפול ידני — מדיניות הלקוח" replaces AI content; identity/stage/deadline remain | structural only (non-AI) | non-AI data only | disabled |

## Empty-state doctrine (Bible §12)

No blank states. Each empty case answers "what's the smartest next thing": no
deadlines → quiet confirmation + opportunity; no documents → templates/knowledge; a
new matter → the onboarding CTA. A completed stage collapses to a one-line
confirmation with a completed-state dot — never celebration theater.

## The two invariants (must be tested)

1. **New/empty ≠ broken:** every empty region renders a purposeful state; the shell
   never skeletons; the room always has identity + a next step.
2. **Degraded ≠ healthy:** any failed engine forces posture off `on_track`, shows the
   failed dimension as "לא זמין", and surfaces the partial-assessment banner. There is
   no path where a failure reads as green. (Guaranteed at the data layer by Epic 4.1
   failure isolation and asserted by the score/narrative benchmark.)
