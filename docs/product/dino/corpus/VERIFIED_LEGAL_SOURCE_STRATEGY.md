# Verified Legal Source Strategy — Legislation, Case Law, Treatment

**Package:** P1-S0 · **Status:** Founder decision draft — specification only (no ingestion, no scraping, no accounts, no provider connection, no code, no commits, no push).
**Parent:** [`../DINO_MASTER_SPECIFICATION.md`](../DINO_MASTER_SPECIFICATION.md) ([Vol 4](../DINO_MASTER_SPECIFICATION.md#volume-4--legal-research-system), [Vol 5](../DINO_MASTER_SPECIFICATION.md#volume-5--verified-source-and-citation-standard), [Vol 21](../DINO_MASTER_SPECIFICATION.md#volume-21--legal-knowledge-acquisition-roadmap)).

> **Binding legal posture.** This document evaluates *candidate* sources. **No terms-of-use, license grant, API right, or reuse permission stated below is asserted as fact.** Every such field is a **founder/counsel due-diligence item** and marked `⚖ verify`. LawME will not ingest, redistribute, or make production use of any source until its license is confirmed in writing. **No unauthorized scraping; no bypassing authentication, robots, rate limits, or contractual restrictions; no unlicensed production use** ([R-21.1](../DINO_MASTER_SPECIFICATION.md#volume-21--legal-knowledge-acquisition-roadmap)). Sourced background is cited at the end.

---

## Part 3 — Legislation source review

### 3.1 Candidate sources (evaluation)

**S-KNESSET — National Legislation Database (מאגר החקיקה הלאומי).**
- **Operator/owner:** the Knesset, with Ministry of Justice support.
- **Official status:** Official primary-legislation database.
- **Public/licensed:** Publicly accessible online. **Reuse/redistribution/API terms:** `⚖ verify` — no published open-data/reuse license confirmed; public accessibility ≠ permission to ingest or redistribute.
- **Access method:** Web database; structured feed/API `⚖ verify`; bulk download `⚖ verify`.
- **Amendment history / consolidated text:** Provides consolidated statutes incorporating amendments (coverage historically **partial** — secondary legislation and older versions incomplete).
- **Section/subsection anchors & permalinks:** Present in-page; **permalink stability** `⚖ verify`.
- **Machine-readability:** `⚖ verify` (likely HTML; structured export uncertain).
- **Reliability:** High as an authority (official).
- **Operational risks:** Partial secondary-legislation coverage; unclear reuse rights; structure/permalink stability unknown.
- **Recommended role:** **Primary authority-of-record for statute text and amendment status**, *subject to a confirmed reuse basis*. If reuse is not permitted, use as the **verification reference** against which a permitted source is checked (see 3.3).

**S-RESHUMOT — Reshumot (רשומות) official gazette** — *Sefer HaChukkim* (statutes), *Kovetz HaTakanot* (regulations), and related booklets.
- **Operator:** State of Israel (official publication).
- **Official status:** The definitive publication of enactments and effective dates.
- **Public/licensed:** Public; **reuse** `⚖ verify`.
- **Role:** **Authoritative source for enactment/effective/commencement dates and the amendment chain** — the "currentness backbone". Format is publication-oriented (PDF booklets), so it is a *verification and dating* source more than a consolidated-text source.
- **Risk:** Not consolidated; requires assembling the amendment chain.

**S-GOVIL — gov.il / data.gov.il open data.**
- **Operator:** Israeli government.
- **Status:** Official portal; some datasets under open-data terms `⚖ verify per-dataset`.
- **Role:** Check for machine-readable legislation/regulation datasets and any explicit open-data license. **Per-dataset license verification required.**

**S-COMMERCIAL-LEG — Commercial legal databases (e.g. Nevo, Takdin, Padaor, Dinim).**
- **Operator:** Private vendors.
- **Status:** Secondary (editorial) over official primary law; carry consolidated text, cross-references, pinpoints, and editorial currency.
- **Public/licensed:** **Subscription; ingestion/redistribution requires a license** `⚖ verify`.
- **Role:** **Optional licensed accelerator** for consolidated text + pinpoints + amendment tracking, **only under an explicit ingestion license**. Authority always traces to the underlying official source ([R-4.1](../DINO_MASTER_SPECIFICATION.md#volume-4--legal-research-system)).

### 3.2 Recommended legislation strategy

**Hybrid, official-first, editor-verified:**

1. **Primary authority + currentness:** S-KNESSET (consolidated text, amendments) cross-checked against **S-RESHUMOT** (effective/commencement dates, amendment chain).
2. **Permission basis:** confirm a lawful reuse basis for the chosen text source *before any ingestion* (`⚖ verify` — open-data terms, official permission, or a licensed vendor). If S-KNESSET reuse cannot be confirmed, **license a commercial consolidated-text source** and keep S-KNESSET/S-RESHUMOT as the verification reference.
3. **Editorial verification layer:** a legal editor confirms each ingested provision's title, section/subsection, effective date, amendment status and permalink against the official source, stamping a `LegalVerificationRecord` ([contract](./MINIMUM_VERIFIED_CORPUS_STANDARD.md)). This layer is mandatory regardless of source — it is what turns "retrieved" into **verified** ([DR-3](../DINO_MASTER_SPECIFICATION.md#required-decision-records)).
4. **Scope:** only the ~6 Core statutes + principal regulations + the **minimum-wage current-rate instrument** for P1-S1.

**Why not scrape the free site:** public accessibility does not grant reuse/redistribution rights; ingesting at scale may breach terms even where reading is free. The permission basis is a legal decision, not an engineering one.

---

## Part 4 — Case-law provider strategy

> Reminder: **all case law is discovery-only today** and cannot support a conclusion until verified ([F-5](../DINO_MASTER_SPECIFICATION.md#founder-vision--frozen)). This part plans **P2**, not P1-S1.

### 4.1 Candidate categories & providers (evaluation matrix)

| Candidate | Verified identity + metadata | Pinpoints | Treatment/currency data | Full text | Official link | Licensing to ingest | Production suitability |
|---|---|---|---|---|---|---|---|
| **Official courts portal** (Supreme Court decisions site; courts administration) | Court, case no., date, panel, parties | Paragraph numbering in text | **None** (no editorial treatment) | Yes (published decisions) | Yes (official) | `⚖ verify` — public but reuse terms unconfirmed | Good for *identity + text*; **not** for treatment |
| **Government open data** (data.gov.il) | Varies by dataset | Varies | Rare | Partial | Yes | `⚖ verify per-dataset` | Supplementary |
| **Licensed commercial DBs** (Nevo/Takdin/Padaor/Dinim) | Full editorial metadata | Editorial pinpoints | **Editorial treatment + citation graph** (vendor-dependent) | Yes | Links | **License required** `⚖ verify` | **Best for treatment/breadth** under license |
| **Direct partnership / ingestion agreement** | Negotiated | Negotiated | Negotiated | Negotiated | Negotiated | Contractual | Strategic, medium-term |
| **Internal editorial verification** | LawME-built | LawME-built | LawME-assessed (bounded) | From licensed text | From source | N/A (process) | **Essential glue**; labor-intensive |

### 4.2 Recommended case-law strategy

- **Primary (P2):** **License a commercial database** whose terms permit structured ingestion/display, for (a) verified case identity + metadata + pinpoints and (b) **editorial treatment/currency** — the one thing official sources do not provide — **over the narrow Core/Conditional doctrine set only**, layered with LawME editorial verification.
- **Fallback:** **official courts portal** for verified *identity + full text + official link* (under a confirmed reuse basis), with **treatment determined by LawME legal-editorial review** rather than claimed automatically. Narrower, slower, but avoids vendor dependency; treatment coverage will be explicitly limited and labeled.
- **Not chosen for production:** scraping any source; academic datasets (e.g. university Supreme Court research datasets) — valuable for R&D, not licensed production authority.

### 4.3 Negotiation questions (for any case-law/legislation vendor)
Ingestion vs display-only rights; permitted internal storage and hashing; permitted excerpt length and pinpoint display; redistribution/sublicensing to end-lawyers; treatment/citation-graph licensing; update latency and feed/API/export mechanics; permalink stability guarantees; audit/attribution requirements; data-retention and deletion obligations; price model and scaling; termination/data-return terms; liability for errors in vendor metadata.

### 4.4 Technical due-diligence checklist
Feed/API/export format and stability; unique stable identifiers per source & version; paragraph-level pinpoint fidelity; amendment/version deltas; treatment-signal schema and provenance; permalink resolvability tests; text-hash reproducibility; update cadence vs our re-verification cadence; rate limits; bulk vs incremental sync; error/retraction handling.

### 4.5 Legal/licensing due-diligence checklist
Written reuse/ingestion license; scope (internal DB, display, export to lawyer's work product); territory; sublicense to end-users; open-data terms per dataset; attribution obligations; personal-data/anonymization obligations in published decisions (privacy — some decisions are anonymized/sealed); confidentiality of sealed matters; export-control/residency; indemnity; audit rights; change-of-terms handling.

---

## Part 5 — Currentness & treatment model

### 5.1 Legislation currentness signals

| Signal | Definition | Source | Inference rule |
|---|---|---|---|
| Consolidated current text | In-force text incl. amendments | S-KNESSET / licensed | Provider-supplied only |
| Amendment chain | Ordered amendments w/ dates | Reshumot / provider | Provider-supplied + editor-verified |
| Effective date | When a provision took effect | Reshumot | Provider-supplied only |
| Commencement date | When the law commenced | Reshumot | Provider-supplied only |
| Transitional provisions | Interim regime | Statute text | Provider-supplied only |
| Repealed sections | No longer in force | Provider/Reshumot | Provider-supplied + editor-verified |
| Future-effective amendments | Enacted, not yet in force | Reshumot | Provider-supplied only |
| Verification timestamp | Last editor verification | LawME | LawME-generated |
| Re-verification cadence | How often re-checked | LawME policy | LawME-generated |

**R-5.1** No effective/commencement/amendment date is ever inferred — it is provider-supplied and editor-verified, else `unknown`. **Minimum-wage rate is re-verified on a short cadence** (rate changes are frequent and outcome-determinative).

### 5.2 Case-law treatment signals & who may set them

| Treatment | May be **provider-supplied** | May be **editorially verified** | May be **deterministically inferred** | **Never inferred automatically** |
|---|:--:|:--:|:--:|:--:|
| Good/valid law | ✓ | ✓ | — | — |
| Overruled | ✓ | ✓ | — | ✓ (never auto) |
| Superseded (by statute) | ✓ | ✓ | — | ✓ |
| Limited | ✓ | ✓ | — | ✓ |
| Distinguished | ✓ | ✓ | — | ✓ |
| Criticized | ✓ | ✓ | — | ✓ |
| Conflicting | ✓ | ✓ | partial (detect two lines) | resolution never auto |
| Unknown | — | — | — | default when no signal |

**R-5.2 (hard).** Negative treatment (overruled/limited/distinguished/criticized) is **never inferred by the model or by heuristic**; it is provider-supplied or editorially verified, otherwise **`unknown`**, and an authority of `unknown` treatment cannot support a conclusion at conclusion-grade. **R-5.3** LawME does **not** claim a Shepard's/KeyCite-equivalent. Treatment coverage is explicitly bounded to what the licensed provider or LawME editors actually supply, and stated in the coverage map. Deterministic detection may *flag a possible conflict* (two lines exist) but never *resolve* it ([DR-8](../DINO_MASTER_SPECIFICATION.md#required-decision-records)).

### 5.3 Currentness → confidence coupling
Stale or `unknown`-treatment authority caps confidence and can force `no_verified_authority`/`insufficient_coverage` ([Vol 6](../DINO_MASTER_SPECIFICATION.md#volume-6--legal-reasoning-framework)). Currentness is a **gate**, not a footnote.

---

## Sources (background for source landscape; not legal authority, terms unverified)
- National Legislation Database — Open Government Partnership (Israel) commitment: [opengovpartnership.org/members/israel/commitments/il0027](https://www.opengovpartnership.org/members/israel/commitments/il0027/)
- Legal Research Guide: Israel — Law Library of Congress: [loc.gov](https://www.loc.gov/law/help/legal-research-guide/israel.php)
- Israeli Legal Databases — Tel Aviv University Law Library: [en-lawlib.tau.ac.il/israeli_databases](https://en-lawlib.tau.ac.il/israeli_databases)
- Finding Israeli Supreme Court Decisions — Harvard Library guide: [guides.library.harvard.edu/IsraeliSupremeCourt](https://guides.library.harvard.edu/IsraeliSupremeCourt)
- Labor Courts of Israel — overview: [en.wikipedia.org/wiki/Labor_Courts_of_Israel](https://en.wikipedia.org/wiki/Labor_Courts_of_Israel)

*All license/terms/API/reuse claims above are marked `⚖ verify` and are founder/counsel due-diligence items, not assertions. Specification only — no ingestion, scraping, account creation, provider connection, migration, commit or push.*
