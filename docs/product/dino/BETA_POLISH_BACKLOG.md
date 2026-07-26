# Dino V1 — Beta Polish Backlog (product-quality sprint)

**Rule applied to every item:** *would a lawyer notice this immediately?* If not, it's not here. **No new architecture, engines, domain models, corpus, or providers** — every item is presentation/interaction over data the response contracts **already carry**. Grounded in the current components: `dino/reasoned/components/reasoned-answer.tsx`, `reasoned-conversation.tsx`, `shell/assistant-panel.tsx`, `legal-corpus/components/legislation-answer.tsx`.

**Effort:** S = hours · M = 1–2 days · L = multi-day. **Priority:** P0 (first-session make/break) → P3 (delight).

> **What's already good (don't touch):** bottom-line-first structure exists; coverage is honestly "never complete"; verified vs discovery-only split is present; the research trace is collapsible; RTL + Shayish is clean; honest failure modes render. The gaps below are about *legibility, disclosure, and lift-out*, not correctness.

---

## P0 — first-session make-or-break (do first)

### P0-1 · The "compact" panel isn't compact — it's the whole answer
**Problem.** `reasoned-conversation.tsx` renders the *full* `ReasonedAnswer` inline; the "הרחב לתצוגת מחקר מלאה" modal shows the **same** content. So the in-panel answer is an 8-section wall the lawyer must scroll, and "expand" adds nothing.
**Why lawyers care.** They scan for the answer in ~2 seconds. A wall reads as "search results," not "a partner's opinion." This is the single biggest felt-quality issue.
**Fix (presentation only).** Compact view = bottom line (hero) + status + confidence + the top verified citation + a "הרחב" affordance. Move the deep sections (full law, case law, all challenges, all sources, trace) into the full-research modal so it becomes a real workspace.
**Impact.** Very high (visual hierarchy, reading flow, bottom-line visibility, full-research mode — 4 areas at once). **Effort.** M. **Noticed immediately?** Yes.

### P0-2 · No copy / export on the reasoned answer
**Problem.** `reasoned-answer.tsx` has **no** copy-answer, copy-citation, or Word export (only `legislation-answer.tsx` does). A lawyer who wants to lift the bottom line + citation into a memo/email has to hand-retype.
**Why lawyers care.** The output only has value if it flows into their work product. "I can't copy the citation" is an instant adoption blocker.
**Fix.** Reuse the P1-S1 copy/Word-export pattern in the reasoned answer: copy bottom line, copy each citation (already-formatted), and a "ייצוא בלוק מקורות". No new data — the citation strings already exist.
**Impact.** Very high (copy/export, professional usefulness). **Effort.** S–M. **Noticed immediately?** Yes — they'll reach for it.

### P0-3 · Loading is one static line; the wait feels broken
**Problem.** `reasoned-conversation.tsx` shows a single breathing line ("דינו חוקר, מנתח ובוחן טענות נגד…") for the entire multi-second wait; no staged progress, no skeleton — even though the pipeline has real stages and `researchTrace` data.
**Why lawyers care.** A multi-second blank wait reads as hung. Worse, it wastes the best chance to *show the investigation* — the core trust story.
**Fix.** Staged progress reflecting the real stages (חוקר מקורות → מנתח → בוחן טענות נגד → מנסח) + a lightweight skeleton for the answer card. Purely visual; no pipeline change.
**Impact.** High (loading experience, latency perception, trust signals). **Effort.** M. **Noticed immediately?** Yes.

---

## P1 — strong adoption levers (visible, high-value)

### P1-4 · No one-click follow-ups / refinement
**Problem.** The response already carries recommended follow-ups and missing-fact questions, but they render as **static bullets**; the only way to act is to free-type. No chips for "הצג טענה נגדית", "יישם על התיק", "רק בית הדין הארצי", "אחרי 2020".
**Why lawyers care.** Legal research *is* iteration. One-click refinement is what makes it feel like a conversation with a colleague rather than a search box.
**Fix.** Render the already-present follow-ups + missing-fact questions as clickable chips that submit the refinement; add 3 starter chips in the empty state for the covered doctrines.
**Impact.** High (conversation quality, follow-up refinement, empty state). **Effort.** M. **Noticed immediately?** Yes.

### P1-5 · Citation cards are dense; no inline inspection or per-citation copy
**Problem.** In `reasoned-answer.tsx` a `Citation` is a cramped single line (title + two badges + pinpoint status); clicking leaves the app; no excerpt preview, no copy — while the P1-S1 `legislation-answer.tsx` already has the richer card (excerpt, honest pinpoint, copy).
**Why lawyers care.** Citations are the trust core; lawyers scrutinize them and want to inspect without losing their place.
**Fix.** Align the reasoned citation to the richer source-card (verified/authority badges, effective date, honest-pinpoint line, copy). All fields already exist on the contract.
**Impact.** High (citation readability, source inspection, trust). **Effort.** M. **Noticed immediately?** Yes.

### P1-6 · Confidence & coverage are text-only — no visual anchor
**Problem.** "ביטחון: בינוני" and "כיסוי: חלקי" are plain text. No calibrated scale/meter to anchor them.
**Why lawyers care.** A visible confidence scale + coverage bar makes the honesty *legible at a glance* — it's what separates a careful tool from a confident bot.
**Fix.** A small 3-step confidence indicator (low/moderate/high) and a coverage meter (substantial/partial/insufficient) with the "never complete" note kept. Reasons stay on tap/expand.
**Impact.** Medium-high (confidence presentation, coverage explanation, trust). **Effort.** S. **Noticed immediately?** Yes.

### P1-7 · Trust signals are buried at the very bottom
**Problem.** The ShieldGlyph + `trustStatementsHe` sit as tiny gray text at the end of a long card — the exact message that should build first-session belief is the least visible.
**Why lawyers care.** Trust is the entire value proposition; a first-session lawyer needs to *see why* to believe the answer.
**Fix.** A compact, tasteful trust chip adjacent to the bottom line ("מבוסס מקורות מאומתים · ללא בדיקת עו״ד אין להסתמך") — surfaced, not shouted. Keep the fuller statements in the trust footer.
**Impact.** Medium-high (trust signals). **Effort.** S. **Noticed immediately?** Yes.

### P1-8 · Matter application — the differentiator — reads too quietly
**Problem.** "יישום על התיק" renders element findings as small chips and "רכיבים חסרים" as one red line. The established / disputed / **missing** distinction — the thing generic chatbots can't do — doesn't visually dominate.
**Why lawyers care.** "It read my file and told me what's missing" is the wow moment and the reason to pay.
**Fix.** Group and color-code established/disputed/missing; make the missing-fact the visual call-to-action (it's what they do next). Data already present in `applicationToMatter`.
**Impact.** High (matter application clarity, the core differentiator). **Effort.** M. **Noticed immediately?** Yes.

---

## P2 — friction (visible, not blocking)

### P2-9 · Keyboard workflow is minimal
**Problem.** Only Enter submits; no Cmd/Ctrl+Enter, no shortcut to open/focus Dino, no Esc to close the full-research modal, no focus return.
**Why lawyers care.** Associates live on the keyboard; friction here caps daily use. **Fix.** Ctrl/⌘+Enter to send, a global open/focus shortcut, Esc-to-close, focus management. **Impact.** Medium (keyboard workflow). **Effort.** S–M. **Noticed?** Yes, by power users.

### P2-10 · No progressive reveal — the answer lands all at once
**Problem.** The panel awaits the full response then renders everything; no streaming, no staged reveal, so even a ready bottom line waits for the whole payload.
**Why lawyers care.** Perceived speed; "it's answering me" beats "it's frozen." **Fix (scoped, no new infra).** Reveal the already-returned sections progressively (bottom line → application → sources) with a short stagger; *optional larger follow-up:* token-streaming the prose (flag as bigger, not in this sprint). **Impact.** Medium (streaming, latency perception). **Effort.** M. **Noticed?** Yes.

### P2-11 · Full research mode must earn its name
**Problem.** Today the modal duplicates the panel. Once P0-1 lands, the modal should be the *depth* view (all sources with excerpts, full trace, every challenge). **Why lawyers care.** When they dig in, they want a workspace, not a bigger card. **Fix.** Compose the modal as the deep view (mostly falls out of P0-1). **Impact.** Medium (full research mode, source inspection). **Effort.** M. **Noticed?** Yes when they expand.

### P2-12 · Mobile tap targets & long-scroll comfort
**Problem.** Copy chips are `text-micro`; the answer is a long scroll; the modal is `max-w-3xl` on small screens. **Why lawyers care.** Some read on a phone between hearings. **Fix.** ≥44px tap targets, comfortable panel padding, mobile-friendly modal, sticky bottom-line header on scroll. **Impact.** Medium (mobile usability). **Effort.** S–M. **Noticed?** Yes on mobile.

### P2-13 · Research trace reads as vague counts
**Problem.** The trace shows "N התאמות" — meaningless to a lawyer. **Why lawyers care.** The trace is a trust artifact; vague numbers undercut it. **Fix.** Make it read like an investigation log ("חקיקה: חוק שכר מינימום — נמצאה הוראה מאומתת"), using data already in `researchTrace`. **Impact.** Medium (research trace, trust). **Effort.** S. **Noticed?** Yes when opened.

---

## P3 — delight / polish

### P3-14 · Typography & rhythm
The whole answer sits on a heavy `gold-100/50` wash; section spacing is uniform. Refine hierarchy (section rhythm, line-length, lighter background for depth sections) so the answer breathes. **Impact.** Low-medium (visual hierarchy, overall feeling). **Effort.** S. **Priority.** P3.

### P3-15 · Saved / pinned answers + thread naming
Return-usage nicety (pin an answer, name a thread). Not first-session critical. **Impact.** Low for Beta. **Effort.** M. **Priority.** P3.

---

## 20-area coverage map

| # | Review area | Backlog item(s) | State |
|---|---|---|---|
| 1 | Visual hierarchy | P0-1, P3-14 | needs work |
| 2 | Reading flow | P0-1 | needs work |
| 3 | Bottom line visibility | P0-1 | partial → hero it |
| 4 | Matter application clarity | P1-8 | good data, weak surfacing |
| 5 | Citation readability | P1-5 | dense; align to P1-S1 card |
| 6 | Research trace | P2-13 | exists, too terse |
| 7 | Trust signals | P1-7 | present but buried |
| 8 | Confidence presentation | P1-6 | text-only |
| 9 | Coverage explanation | P1-6 | good, add visual |
| 10 | Conversation quality | P1-4 | static bullets → chips |
| 11 | Streaming | P2-10 | none (scoped reveal) |
| 12 | Loading experience | P0-3 | single line |
| 13 | Copy/export | P0-2 | missing in reasoned view |
| 14 | Keyboard workflow | P2-9 | minimal |
| 15 | Mobile usability | P2-12 | usable, needs targets |
| 16 | Full research mode | P0-1, P2-11 | duplicates compact |
| 17 | Source inspection | P1-5, P2-11 | link-out only |
| 18 | Follow-up refinement | P1-4 | not clickable |
| 19 | Latency perception | P0-3, P2-10 | no progress |
| 20 | Overall feeling | P0-1…P1-8 | "search-y", fix hierarchy+trust |

---

## Recommended sprint order (founder to prioritize)

1. **P0-1** (real compact vs full) — unlocks P2-11 and lifts areas 1/2/3/16/20 at once.
2. **P0-2** (copy/export) — cheapest high-value adoption lever.
3. **P0-3** (staged loading) — fixes the worst "feels broken" moment and reinforces trust.
4. **P1-4 → P1-8** in that order — conversation, citations, confidence/coverage visuals, trust chip, matter-application emphasis.
5. P2 friction items as capacity allows; P3 last.

**Estimated sprint:** the three P0s + five P1s are all S/M presentation work on existing contracts — a realistic 1.5–2 week polish sprint with no architecture, engine, corpus, or provider changes. Nothing here is invisible engineering; every item is something a lawyer feels in the first session.

*Review only — no implementation, no code, no commits, no push. Awaiting founder prioritization.*
