# LawME — Case-Law Citator Architecture (סייטטור)

**Status: design only (Epic 0, Phase 11).** The citator is the future
subsystem that answers: *is this judgment still good law, and how strong
is it?* It is the Israeli-law equivalent of Shepard's/KeyCite — a product
capability no Israeli open source currently provides end-to-end.

## What the citator determines
For any judgment J:
1. **Cases cited** by J (outbound) and **cases citing** J (inbound).
2. **Treatment** of J by later cases: positive (followed/approved),
   negative (criticized/not followed), limited, distinguished,
   **overruled/superseded**.
3. **Legislative change after judgment** — a statute J relied on was
   amended/repealed after J was decided (the silent killer of precedent).
4. **Appeal status** of J's own case (pending, affirmed, reversed).
5. **Court hierarchy context** → binding vs persuasive per forum
   (Supreme Court binds all; district binds magistrates in its district
   as persuasive-plus; labor-court hierarchy separate; בג"ץ vs civil).
6. **Similarity**: factual similarity and legal-issue similarity to a
   query case (retrieval aid, never authority).
7. **Citation metrics**: frequency, weighted by citing-court level, and
   recent trend (rising/falling reliance).

## Signal architecture

```
                    ┌───────────────────────────────┐
 citation parser →  │  CITATION LAYER (deterministic)│ → cites/cited_by
 case-no normalizer │                               │
                    └──────────────┬────────────────┘
                                   ▼
                    ┌───────────────────────────────┐
 treatment model →  │  TREATMENT LAYER (inference)   │ → follows/limits/…
 context windows    │  + human review queue          │    verified flags
                    └──────────────┬────────────────┘
                                   ▼
                    ┌───────────────────────────────┐
 legislation deltas │  VALIDITY LAYER                │ → still-good-law
 appeal records     │  (rule + inference mixed)      │    verdict + reasons
                    └──────────────┬────────────────┘
                                   ▼
                       Citator verdict object
        {status, treatments[], legislative_flags[], appeal, confidence, provenance[]}
```

## Honest capability boundaries (required by the founder spec)

### Extractable automatically (high confidence)
- Outbound citations: Israeli citation formats are regular (ע"א 123/45,
  בג"ץ 7803/06, סע"ש 12345-01-20 …) — deterministic parser + normalizer.
- Inbound citations: inversion of the above across the ingested corpus.
  **Caveat: completeness equals corpus completeness — with open sources
  only, inbound counts are lower bounds and must be labeled as such.**
- Court hierarchy/binding class: rule table over court + procedure code.
- Citation frequency/trend: arithmetic over the citation layer.
- Legislative-change flags: National Legislation DB amendment metadata
  crossed with statutes_cited — deterministic to the section level.

### Requires AI inference (must be labeled inference until reviewed)
- Treatment classification (follows vs distinguishes vs limits…) from the
  citation's textual context. Hebrew legal discourse rarely says "overruled"
  explicitly — הלכה reversal is often implicit; model + calibration set.
- Ratio vs obiter identification.
- Factual/issue similarity (embeddings + issue taxonomy).

### Requires human verification before stated as fact
- **Overruled/superseded** determinations (product-fatal if wrong).
- Conflicts between co-equal courts.
- Any verdict that a lawyer will cite in court filings.

### Requires licensed metadata (or large corpus we don't yet have)
- Complete inbound-citation coverage for lower courts (commercial DBs
  hold the deep corpus — RFI question).
- Editorial treatment history pre-2000s (Nevo/Takdin editorial layers).
- Anything relying on their proprietary headnotes/keywords.

## Verdict statuses
`good_law` · `caution_negative_treatment` · `caution_legislation_changed`
· `overruled` · `superseded_by_legislation` · `appeal_pending` ·
`insufficient_data` (honest default when inbound coverage is thin).
Every verdict lists its evidence edges with anchors — a verdict without
evidence cannot render.

## Build order (when implementation is approved)
1. Case-number normalizer + golden tests (benchmark citation tasks).
2. Citation parser over the POC corpus → citation layer.
3. Hierarchy rule table → binding/persuasive labeling.
4. Legislative-change flags (legislation DB × statutes_cited).
5. Treatment classifier + review queue (lawyer-in-the-loop).
6. Verdict object + UI surface (later epic; no UI in Epic 0).
