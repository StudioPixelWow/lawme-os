# LawME — Legal Knowledge POC Plan

**Status: recommendation only (Epic 0, Phase 19). The POC is NOT built in
this epic.**

## Domain evaluation

| Criterion | Labor law | Torts & NII | Civil litigation | Real estate | Contracts |
|---|---|---|---|---|---|
| Public-source availability | **Excellent** — national labor court publishes, extension orders DB, BTL rights, Kol Zchut deep | Good — NII materials strong, case law scattered | Fair — broad but diffuse | Fair — land supervisor decisions good, rest fragmented | Fair — case law diffuse, statutes excellent |
| Source quality/structure | **High** (dedicated hierarchy, gov.il collectors, extension orders) | Medium | Medium | Medium-high for supervisors | High for legislation only |
| Matter volume (typical firm) | **High** — recurring, standardized | High but expert-heavy | High but heterogeneous | Medium | High but contract-drafting is category-G-centric |
| Drafting use cases | **Strong** — letters, claims, responses highly templatable | Medium | Broad but varied | Medium | Strong but firm-private |
| Research complexity (POC-friendly) | **Bounded** — closed hierarchy, well-defined issues | Bounded-ish | Unbounded | Bounded | Doctrine-heavy |
| Commercial value | **High** — every firm touches employment | High (plaintiff firms) | High | High | High |
| Benchmark feasibility | **Excellent** — clear gold answers (entitlements, deadlines, quantums) | Good | Hard | Good | Medium |
| Bonus alignment | **3 practice packs already installed** (employment ×3); Kolzchut MCP live; existing WhatsApp/matter mock data is labor-flavored | 1 pack | — | 1 pack | 2 packs |

## ✅ Recommendation: **דיני עבודה (Labor law)**
Labor law wins on every axis that matters for a proof of concept: the
best public sources (a self-contained court hierarchy that publishes,
extension orders as structured regulation, BTL + Kol Zchut as the
explanatory layer), bounded research questions with checkable answers,
high matter volume, strong drafting templates, and three already-installed
practice packs. Runner-up: torts/NII (natural second domain — shares the
labor-court/NII ecosystem).

## POC definition

**Sources (from the registry, all P0/P1, no licensing blockers):**
supremedecisions (labor appeals: בג"ץ/עליון), judiciary spokesperson
collector + Net HaMishpat (בתי הדין לעבודה), National Legislation DB
(labor statutes + version chains), extension orders DB (צווי הרחבה),
Reshumot deltas, BTL rights pages, Kol Zchut MCP (live), HuggingFace
Supreme Court corpus (labor subset — license caveat review first),
data.gov.il datasets (companies registry for entity resolution).

**Data volume:** ~8,000–15,000 documents (labor judgments 2015→present +
~60 core statutes/regulations with versions + ~200 extension orders +
~500 rights articles). Deliberately small enough to hand-audit.

**Sample matters (synthetic):** 10 fictional matters — dismissal without
שימוע, pregnancy dismissal, unpaid overtime, contractor-vs-employee
classification, severance calculation, workplace harassment, tips &
minimum wage, extension-order applicability, non-compete, collective
dismissal.

**Research questions:** the LILB labor subset — 40 research + 20
precedent-retrieval + 10 validity + 10 deadline tasks authored first.

**Drafting tasks:** 10 — מכתב התראה, כתב תביעה (סע"ש), כתב הגנה, בקשה
לגילוי מסמכים, סיכום לקוח.

**Success metrics (gates from the benchmark design):**
hallucination rate 0 on drafting/citation tasks · citation accuracy ≥98%
· Recall@10 ≥85% on precedent retrieval · authority accuracy ≥95% ·
lawyer correction rate <20% on research memos · time-saved ≥40% on the
drafting set (expert-judged).

**Timeline (indicative, founder-approved start):**
Weeks 1–2 ingestion adapters (labor sources) + normalizer golden tests ·
Weeks 3–4 unified-schema population + citation layer + validity flags ·
Weeks 5–6 retrieval (keyword+semantic+graph) + research pipeline v0 ·
Weeks 7–8 benchmark authoring (with a labor-law practitioner) + eval +
Go/No-Go report.

**Technical requirements:** Supabase schema (FIRST migration — founder
approval; RLS-first per DATABASE_WORKFLOW.md), Israeli egress for
Knesset/gov.il fetching (decision: IL proxy or scheduled runs from the
founder's machine), Hebrew embedding model selection (eval via
hebrew-llm-eval-suite), storage per storage_policy.

**Legal review requirements:** practitioner reviews benchmark gold
answers; privacy pass on ingested judgments (anonymization respect);
license re-check of the HuggingFace corpus before any commercial use.

**Go/No-Go decision:** benchmark gates met → expand corpus depth + second
domain (torts/NII) + commercial licensing talks with data. Gates missed →
diagnose (retrieval? extraction? corpus gaps?) before any expansion.
