# LawME Legal Knowledge Atlas — אטלס הידע המשפטי
### The executive master document of the LawME Legal Knowledge Infrastructure (Epic 0)

*Prepared 2026-07-11. Audience: technical partner, legal partner, investor.
Everything here is backed by the referenced working documents in
`docs/legal-knowledge/` and by the 134-source registry researched live in
July 2026.*

---

## 1. Executive summary

LawME is building the legal-intelligence layer for Israeli law firms:
research, drafting, monitoring and matter intelligence with **verified
citations and zero tolerance for fabricated authority**. Epic 0 delivered
the complete foundation on paper and one live connector — **before**
ingesting data, building UI, or committing to any storage schema.

The core strategic findings:

1. **Israeli case law has no official bulk API** — but the judgment text
   itself is copyright-free, official publication channels have stable
   (if undocumented) JSON backends, and a 751k-verdict open Supreme Court
   corpus exists. An open-source-first strategy is viable.
2. **The legislative layer is the strongest open asset**: the National
   Legislation Database, Knesset OData and Reshumot give version-dated
   statute authority — the backbone of "is this still valid?" answers
   that competitors under-serve.
3. **Commercial databases (Nevo/Takdin/LawData) hold the depth** (lower
   courts, pre-2000s, editorial citator layers). They are researched,
   an RFI is drafted, and nothing was accessed without permission.
4. **Trust is the product.** The trust model, provenance-carrying
   document schema, labeled knowledge graph and hallucination-gated
   benchmark are designed so that "LawME never fabricates authority" is
   an architectural property, not a hope.
5. **Recommended POC: labor law** — best sources, bounded questions,
   checkable answers, three practice packs already installed.

## 2. Source taxonomy
Seven categories — A judicial · B legislation · C legislative-process ·
D regulators · E open-secondary · F commercial · G firm-private — with
binding rules per category. → `LEGAL_SOURCE_TAXONOMY.md`

## 3. Top P0 sources (critical foundation — 23 total)
The backbone (full list + scores in the registry):
supremedecisions.court.gov.il · Net HaMishpat public portal · judiciary
spokesperson collector (gov.il) · National Legislation Database · Knesset
OData · Reshumot (Official Gazette) · Wikisource Open Book of Laws ·
AG guidelines DB · State Attorney guidelines DB · Privacy Protection
Authority · Competition Authority decisions · Tax Authority circulars ·
BOI banking directives · extension-orders DB · BTL rights pages ·
data.gov.il CKAN (+ companies & amutot registries) · CBS index API ·
BOI public API · Kol Zchut calculators · gov.il unified collectors.
→ `LAWME_LEGAL_SOURCE_REGISTRY.md` (+ CSV/JSON)

## 4. Top P1 sources (37)
Regulator decision databases, open-access law reviews (Mishpatim, Iyunei
Mishpat…), Knesset RIC studies, State Comptroller, IDI research,
Wikisource judgment transcriptions, HuggingFace Supreme Court corpus
(license-caveated), rabbinical/land-supervisor collectors, procurement
data. → registry.

## 5. Open sources
71 primary + 70 secondary records (134 unique, incl. dual-role); 55 with
APIs/feeds; data.gov.il CKAN and BOI API verified live from this
environment. Verified-freshness observations recorded per source.

## 6. Licensed sources
Nevo · Takdin/TechDin/Dinim VeOd (Guideline) · LawData · Legalmate ·
Briefly/LegalUp · plus embed-partners Lizzy AI / Cligal. Corpus claims,
API signals, contact paths documented; **no paid content accessed**.

## 7. Restricted sources
13 records marked Restricted/Research-only: anonymous judgment mirrors
(paid-takedown churn → pointer-only policy), SSRN (ToS), JS-gated bar
content, geo-blocked endpoints pending IL egress.

## 8. Sources requiring direct contact
The six commercial targets (RFI drafted, NOT sent) + Israel Bar
(ethics/disciplinary corpus) + State Archives (bulk historical) +
HuggingFace corpus author (license clarification).
→ `COMMERCIAL_DATA_RFI.md`, `COMMERCIAL_SOURCE_CONTACT_PLAN.md`

## 9. Israeli MCP roadmap
Kol Zchut ✅ connected (read-only, pinned, validated) → Knesset →
DataGov → CBS → Budget; per-server security review + founder approval
gates. → `ISRAELI_MCP_ROADMAP.md`

## 10. Kol Zchut validation
6 read-only tools, MediaWiki JSON, Hebrew verified, ~1–2s latency, source
URLs derivable, corpus actively maintained (2026 timestamps). Classified
tier-5: discovery + explanation, never sole authority.
→ `KOL_ZCHUT_MCP_VALIDATION.md`

## 11. Technical architecture (data layer)
Unified legal document envelope: 18 document types, one schema —
identity, provenance (required), multi-dimensional time, structured
citations with anchors, verification status, per-document storage policy.
JSON Schema validated. **No database tables created yet — by design.**
→ `UNIFIED_LEGAL_DOCUMENT_SCHEMA.md` + `unified-legal-document.schema.json`

## 12. Trust model
Six source tiers; ten binding rules (discovery-vs-authority, provenance
inseparable from citation, freshness mandatory, conflicts surfaced,
unknown never presented as verified…); a claim-labeling contract every
pipeline must honor. → `LAWME_SOURCE_TRUST_MODEL.md`

## 13. Graph architecture
22 entities, 24 relations in 5 layers (reference → documents → 
deterministic citations → labeled inference → firm matters). Every edge
carries confidence + provenance + evidence anchor. Postgres-first
storage strategy. → `LEGAL_KNOWLEDGE_GRAPH_ARCHITECTURE.md` + JSONs

## 14. Citator architecture
Israeli Shepard's: treatment, validity, hierarchy, legislative-change
flags. Honest capability boundaries: what's automatic (citation parsing,
hierarchy, legislative deltas), what's inference (treatment
classification), what needs humans (overruled verdicts), what needs
licenses (deep inbound coverage). → `LAWME_CITATOR_ARCHITECTURE.md`

## 15. Continuous update pipeline
18-stage design: fetch → preserve → hash → extract → cite → validate →
graph → matter alerts; with delta detection, failure queues, legal review
queue, re-verification and a removal/correction process.
→ `CONTINUOUS_LEGAL_UPDATE_PIPELINE.md`

## 16. Research pipeline
20 stages from question to labeled answer — clarification gate, Hebrew
query expansion, tri-modal retrieval (keyword/semantic/graph), authority
filtering, mandatory contradiction + Red Team passes, source
verification, human review, matter subscription.
→ `LEGAL_RESEARCH_PIPELINE.md`

## 17. Drafting pipeline
Matter facts → verified source set → structured draft → citation
verification → Red Team → QA → partner review → export with provenance
manifest. Five hard prohibitions (no unverified citation, no fabricated
judgment, no outdated statute, no unsupported fact, no unmarked
assumption). → `LEGAL_DRAFTING_PIPELINE.md`

## 18. Benchmark
LILB: 680 tasks across 12 categories, 13 metrics, hallucination rate as
the headline zero-tolerance gate; 12 synthetic samples shipped; full
authoring is a POC work item with a practitioner.
→ `LAWME_ISRAELI_LEGAL_BENCHMARK.md`, `benchmark/`

## 19. POC recommendation
**Labor law, 8 weeks, ~10-15k documents**, gates from the benchmark;
requires: first Supabase migration (founder approval), Israeli egress
decision, Hebrew embedding model selection.
→ `LEGAL_KNOWLEDGE_POC_PLAN.md`

## 20. Major risks
1. **Geo/WAF blocks** on Knesset OData + parts of gov.il from non-IL
   clouds → ingestion needs Israeli egress (infra decision).
2. **Undocumented backends** (supremedecisions JSON, gov.il collectors)
   can change without notice → adapter monitoring + failure queues.
3. **License ambiguity** on the largest open corpus (HuggingFace,
   OpenRAIL) → clarify before commercial use.
4. **Commercial dependency risk**: licensing talks reveal our build to
   potential competitors → founder controls timing (post-POC leverage).
5. **Privacy/takedown churn** on judgment mirrors → pointer-only policy +
   removal process designed in.
6. **Treatment-classification errors** (wrongly saying "still good law")
   → human gates on negative-treatment verdicts + insufficient_data
   honesty + benchmark gates.
7. **Hebrew NLP maturity** (extraction, OCR, embeddings) → eval harness
   first (hebrew-llm-eval-suite), model choice is an experiment, not an
   assumption.

## 21. Recommended next steps
1. Founder review of this Atlas + registry (approve/adjust P0 set).
2. Approve the labor-law POC and its first Supabase migration
   (RLS-first, per DATABASE_WORKFLOW.md).
3. Decide Israeli-egress approach for ingestion.
4. Verify Kol Zchut MCP on the Mac (one search — 30 seconds).
5. Review Knesset MCP package (next connector).
6. Decide RFI timing (recommend: after POC baseline proves the open
   stack).
7. Engage a labor-law practitioner for benchmark gold-answer authoring.

---
*Every claim in this Atlas traces to a registry record or working
document. Unknowns are marked unknown. No source or API was invented.*
