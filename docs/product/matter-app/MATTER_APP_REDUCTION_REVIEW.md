# Matter App — Apple-Level Reduction Review (Epic 5.1)

A reduction pass on the recommended Matter Room. Two versions are defined; the
Reduced Premium is recommended for the first prototype.

## The reduction pass (ten moves)

1. **Remove ~20% of visible information.** Cut from the default viewport: the full
   dimension grid (→ Score Lens rail only), secondary next-actions (→ keep one CTA,
   rest in dock), per-dimension numbers (→ show only weakest/strongest numerically),
   the trend panel (→ a single arrow on the state chip), and all panel chrome that
   isn't open. Nothing important is lost — everything is one interaction away.
2. **Re-evaluate.** The eight five-second answers all survive (they live in the
   Decision Core + current spine node). Confirmed no decision-critical loss.
3. **Merge redundant surfaces.** Region A+B+C+D → one Decision Core. "Needs you now"
   and "top blocker" merge onto the current spine node. Provenance + audit → one
   evidence drawer.
4. **Reduce labels.** The state chip carries the posture word; dimensions in the rail
   are icon+state, labeled on hover; the spine nodes are titled once.
5. **Remove decorative containers.** No card borders; surfaces are drawn by shadow
   hairlines (Bible §3.6). The spine has no boxes — nodes sit on the meridian.
6. **Reduce borders.** Hairlines only; no solid strokes (forbidden #18).
7. **Reduce equal-weight objects.** One hero (the active node), everything else
   quieter — no equal cards (forbidden #2/#10).
8. **Strengthen whitespace.** Section rhythm `mt-10/12`; the spine breathes; the dock
   is calm.
9. **Strengthen hierarchy.** State chip (heading) > narrative (body) > one action
   (CTA) > spine context > dock. Size + weight carry it (Hebrew hierarchy, Bible §5).
10. **One obvious first action.** Exactly one CTA on the hero — the top prioritized
    action. Everything else is secondary.

## Version 1 — Full Architecture (reference, not first build)

Everything the Matter Room can show at once: Decision Core + full spine + Score Lens
expanded + one open Intelligence Lens + deadline ledger + team presence + trend. Used
as the "expand all / power view." Kept as a reference so nothing is lost, but not the
default.

## Version 2 — Reduced Premium (recommended first prototype)

Default viewport contains, and nothing more:

- **Decision Core (hero):** practice-area seat · matter name · **state chip
  (posture)** as the headline · one narrative sentence · the **one primary action**
  (verb + owner + due) · a review seal if `requiresHumanReview` · a freshness dot.
- **Milestone Spine:** the stages with the gold meridian on "now"; done nodes muted,
  future nodes dashed, a **missing-item diamond** or **risk pulse** on any node that
  blocks a transition; a דינו seal only where there's a finding.
- **Context Dock (collapsed lenses):** a slim **Score rail** (weakest + strongest
  called out), the **nearest deadline** object, team presence — each expandable.

That is the whole default screen. Everything else — full score, evidence, documents,
legal coverage, client, finance, risk, activity timeline, provenance — opens on
intent (click a spine node, click a rail segment, ⌘K, or a lens).

## Before / after hierarchy

**Before (Epic 5 nine regions, default):** Header · Briefing · Needs-Now (3 blocks) ·
Actions (3) · Score summary strip · [9 collapsed panels] · Dino launcher · Trend ·
Provenance. → ~7 permanent objects competing; the score strip and actions lane risk
grid-ness.

**After (Reduced Premium, default):** Decision Core (1 hero) · Milestone Spine (1
structure) · Context Dock (1 quiet column of collapsed lenses). → **3 objects, one
hero, one obvious action.** Same information, one interaction deeper.

## Recommendation

Prototype the **Reduced Premium** Matter Room first. It is the truest to the Design
Bible (one hero, five-object law, spine, two accents) and the fastest to validate on
the five-second test. The Full Architecture is the "expand all" superset, built
incrementally as lenses land (see Implementation Slices).
