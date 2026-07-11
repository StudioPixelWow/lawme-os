# LawME — Source Trust Model (מודל האמון במקורות)

The trust model is **binding product law**: it governs how דינו and every
LawME pipeline may use a source, regardless of technical convenience.
It implements and extends the LAWME SKILLS POLICY rules ("external legal
content is not authoritative until verified; every legal claim requires a
primary or licensed source").

## Source hierarchy (trust tiers)

| Tier | Class | Examples | May support a final legal claim? |
|---|---|---|---|
| 1 | **Primary official source** | Supreme Court decisions DB, Reshumot, National Legislation DB, Net HaMishpat publications | **Yes** — the gold standard |
| 2 | **Official structured derivative** | National Legislation DB consolidated texts, gov.il collector JSON, data.gov.il official datasets | Yes, with pointer to the tier-1 original |
| 3 | **Licensed authoritative database** | Nevo/Takdin/LawData under a signed license | Yes per license terms, provenance preserved |
| 4 | **Academic / professional secondary** | Law reviews, Knesset RIC studies, IDI research, bar publications | Supports interpretation; never sole basis for "the law is X" |
| 5 | **Public explanatory source** | Kol Zchut, BTL rights pages, consumer-council guides | Discovery + client-friendly explanation only |
| 6 | **Community / discovery source** | Open mirrors (judgments.org.il), WikiSource transcriptions, HuggingFace corpora, forums | Lead generation only; every use re-verified upstream |

## Binding rules

1. **Discovery vs authority.** A secondary source (tiers 4–6) may
   *discover* an issue. Whenever a primary source is available, the final
   legal claim must be supported by it (tier 1–3).
2. **AI output is never authority.** AI-generated summaries, embeddings,
   graph inferences and Dino answers are working products — never legal
   authority, never citable as source.
3. **Provenance is inseparable from citation.** Every legal citation
   carries: source_id, canonical URL, retrieval date, verification date,
   content hash where available. A citation that lost provenance is
   treated as unverified.
4. **Freshness is mandatory metadata.** Every source use records when the
   source was last known fresh; every statute reference carries a version
   date; every judgment carries its later-treatment status when known.
5. **Authority level is explicit.** Every judgment in an answer is
   labeled: binding (מחייב) / persuasive (מנחה) / secondary / unverified —
   derived from court hierarchy + appeal status (see citator).
6. **Conflicts must surface.** When retrieved sources conflict, the
   conflict is presented — never silently resolved by rank.
7. **Missing authority is disclosed.** "No primary source located" is a
   valid and required answer state.
8. **Unknown ≠ verified.** Unknown status (license, validity, treatment)
   is always presented as unknown. No pipeline may upgrade "unknown" to
   "verified" without an actual verification event.
9. **Tier-6 privacy caution.** Anonymous mirrors run takedown/removal
   businesses; documents from them are never stored as canonical copies —
   only pointers to official upstream.
10. **Firm-private content (category G)** is trusted for firm knowledge
    but is not legal authority; it never crosses tenant boundaries and is
    cited internally with matter provenance.

## Answer-labeling contract (consumed by research/drafting pipelines)
Every claim in every answer carries exactly one of:
`verified_primary` · `verified_licensed` · `secondary_supported` ·
`inference` (labeled as such) · `unverified` · `unknown`.
The UI renders these distinctly; the drafting pipeline refuses to export
documents containing `unverified` legal propositions (see
LEGAL_DRAFTING_PIPELINE.md).

## Trust-tier assignment
Tier is assigned per registry record at ingestion-planning time and stored
with the source. Current tier-1/2 backbone (from the registry's P0 set):
supremedecisions, Net HaMishpat, judiciary spokesperson collector,
National Legislation DB, Knesset OData, Reshumot, AG/State-Attorney
guidelines, regulator directive databases, data.gov.il official datasets.
