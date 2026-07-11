# LawME — Legal Research Pipeline (design)

**Status: design only (Epic 0, Phase 13).** The controlled flow from a
lawyer's question to a verified, provenance-carrying answer. Every stage
respects the trust model; the pipeline is honest by construction.

## The 20 stages

```
 1. user question           11. re-ranking
 2. clarification gate      12. citation extraction
 3. matter context          13. contradiction search
 4. research plan           14. red team search
 5. Hebrew query expansion  15. source verification
 6. keyword retrieval       16. answer drafting
 7. semantic retrieval      17. confidence & limitations
 8. graph retrieval         18. human review
 9. authority filtering     19. save to matter
10. source diversification  20. re-run when sources change
```

### 1. User question
Free-form Hebrew (or English). Captured verbatim; never silently
rewritten.

### 2. Clarification Gate
Before any retrieval: ambiguity check (jurisdiction? time frame? which
party do we represent? procedural posture?). If material ambiguity exists
→ ask, don't guess. Skippable only by explicit "run with assumptions",
and then assumptions are printed in the answer.

### 3. Matter context extraction
If asked inside a matter: practice area, parties (conflict awareness),
procedural stage, existing issue map, prior research in the matter.
Firm-private context stays RLS-guarded.

### 4. Research-plan generation
Issues to investigate, source classes to hit (per taxonomy), stop
conditions. The plan is shown — the lawyer can edit before execution.

### 5. Query expansion in Hebrew
Legal-Hebrew synonym/term expansion (פיטורים שלא כדין ↔ ביטול פיטורים ↔
שימוע), statutory nicknames (חוק החוזים ↔ חוק החוזים (חלק כללי)),
procedure codes, transliteration variants. Expansion list is logged.

### 6. Keyword retrieval
Exact/boolean search over indexed corpus + live source search where
available (per-source adapters). Recall-oriented.

### 7. Semantic retrieval
Embedding search (paragraph-level) over the same corpus. Hebrew-capable
embeddings, version-stamped.

### 8. Graph retrieval
From seed hits: walk cites/cited_by, interprets (statute→cases),
legal_issue links, version chains. Depth-bounded; every hop recorded.

### 9. Authority filtering
Trust-tier + binding-class filter per the question's forum. Tier-5/6
material marked discovery-only at this stage.

### 10. Source diversification
Guarantee representation across: binding precedent, recent decisions,
statute text (current version), regulator guidance, contrary authority.
Prevents "ten copies of the same holding".

### 11. Re-ranking
Composite: authority × freshness × issue-similarity × citation trend.
Weights logged per run.

### 12. Citation extraction
Pinpoint anchors (paragraph/page) extracted for every candidate
proposition, producing citation-ready references.

### 13. Contradiction search
Explicit search for authority AGAINST the emerging answer:
conflicts_with edges, negative-treatment signals, opposite outcomes on
similar facts. Not optional.

### 14. Red Team search
Adversarial pass: what would opposing counsel cite? Distinguishing
arguments, procedural attacks, alternative characterizations. Output is
a distinct answer section.

### 15. Source verification
Every proposition's supporting source: re-fetch/verify against canonical
URL (or verified store), citator status check (good_law?), statute
version check. Failures downgrade the claim's label.

### 16. Answer drafting
Structured memo: question, short answer, analysis per issue, authorities
table (with treatment status), contrary authority, Red Team section.
Hebrew, RTL, firm tone.

### 17. Confidence & limitations
Explicit: coverage limits (which sources were NOT searched — e.g.
commercial DBs pre-license), inbound-citation completeness caveat,
inference-labeled edges relied upon, date of freshness.

### 18. Human review
A lawyer signs off before any external use. Review actions (accept/
correct/reject per claim) are captured — they feed the benchmark's
lawyer-correction-rate metric and future training.

### 19. Save to matter
The memo + its full provenance bundle (sources, versions, hashes,
labels) is attached to the matter. Nothing is saved label-free.

### 20. Re-run when sources change
The saved research subscribes to its own sources via affects_matter:
statute amended / judgment negatively treated → matter alert + optional
re-run diff ("what changed in the answer").

## Answer labeling contract (hard requirement)
Every statement carries exactly one label:
- **Verified fact** (verified against tier 1–3 source, link + anchor)
- **Legal interpretation** (reasoned position on verified sources)
- **Inference** (model-derived, so marked)
- **Recommendation** (professional judgment, so marked)
- **Unknown** (explicitly unresolved)
- **Requires lawyer review** (gate before reliance)

The renderer refuses to display an unlabeled statement; the drafting
pipeline (Phase 14) refuses to import them.
