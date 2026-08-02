# LEGAL AI ISRAEL — Source Audit Summary (Phase 1)

Date: 2026-07-26. **All collectors are DISABLED.** No document was downloaded.

## Environment limitation (read first)

The build environment could **not reach** the Israeli government/legal sites — fetches to `data.gov.il`, `unicourt.justice.gov.il`, `court.gov.il`, and the Tola'at Mishpat domain returned empty content or a connection timeout, and `robots.txt` paths are outside the fetch-provenance set. So the **technical** audit (robots.txt, live endpoints, sample documents, session/CAPTCHA/rate-limit probing, terms-of-use capture) is **NOT COMPLETE**. Under the founder's own fail-safe, every source is therefore `automated_access_status = unclear` → **collector_enabled = false**. The sections below record the desk-level findings and the exact technical checks an operator must run from a network that can reach each site before any collector is enabled.

## Decision table

| מקור | רשמי | חיפוש ציבורי | מסמך מלא | API | רישיון ברור | Collector Mode | החלטה |
|---|---|---|---|---|---|---|---|
| בית המשפט העליון (supremedecisions) | כן | כן (ידוע) | לרוב כן | לא ידוע | §6 לטקסט; terms לא נבדקו | discovery_only (off) | **LIMITED GO** — pending technical audit |
| דוברות הרשות השופטת | כן | כן | חלקי | לא | לא נבדק | discovery_only (off) | **DISCOVERY ONLY** — selected set, not all case law |
| מפקחים על רישום מקרקעין | כן | כן | חלקי | לא ידוע | לא נבדק | discovery_only (off) | **LIMITED GO** — pre-2021 backfill separate |
| מערכת בתי הדין (unicourt) | כן | לפי קטגוריה | לפי קטגוריה | לא ידוע | לא נבדק | discovery_only (off) | **NO GO (yet)** — per-category policy needed |
| data.gov.il | כן | — (portal) | קבצים | סביר (CKAN) | סביר (open data) | discovery_only (off) | **LIMITED GO** — preferred pilot candidate |
| gov.il משפטי | כן | לפי מקור | לפי מקור | לא ידוע | לא נבדק | discovery_only (off) | **NO GO (yet)** — each sub-source separate |
| נט המשפט | כן | כן (ללא Login) | גרסה פומבית | לא ידוע | לא נבדק | discovery_only (off) | **LIMITED GO** — public judgments/decisions only |
| תולעת המשפט | **לא** (צד ג׳) | כן | מאחורי שכבה | לא ידוע | **לא** | discovery_only (off) | **DISCOVERY ONLY** — never copy text w/o licence |

## Per-source records

### 1. בית המשפט העליון — `supreme_court`
Official Supreme Court decisions. Judgment text is §6-exempt from copyright, so full text is lawful **from the official site**. **NOT verified here:** robots.txt, terms of use, whether a stable permalink + document id exist, rate limits, CAPTCHA. Allowed if audited: public judgments/decisions, case numbers, dates, judges, source links. Decision: **LIMITED GO** pending technical audit; canonical_priority 1.

### 2. דוברות הרשות השופטת — `judiciary_spokesmanship`
`coverage_type = selected_public_interest`. A curated subset — **must never be presented as all case law**. Discovery/metadata only until audited. Decision: **DISCOVERY ONLY**.

### 3. מפקחים על רישום מקרקעין — `land_registrar_verdicts`
Land-registry inspector verdicts. Founder note: pre-2021 documents use narrower search fields → **separate backfill strategy**. Collect (if audited): case no., bureau, inspector, date, locality, block/parcel, published parties, official summary if part of the permitted government data, original verdict, source link. Decision: **LIMITED GO**.

### 4. מערכת בתי הדין (unicourt) — `unicourt_tribunals`
Index of tribunals/committees. **Each category needs its own Source Policy** (land registrars, appeals committees, religious/administrative tribunals where public, etc.). No blanket automation. Decision: **NO GO (yet)** — map categories first.

### 5. data.gov.il — `data_gov_il`
Open-data portal. Most likely to carry an **explicit data licence + API (CKAN datastore) / CSV / JSON** → lowest legal risk, highest structure. **Preferred pilot candidate** once a specific legal dataset + licence is confirmed. Decision: **LIMITED GO**.

### 6. gov.il משפטי — `gov_il_legal`
Appeals committees, tribunals, administrative decisions across ministries. Broad; each sub-source enters the registry and is audited separately. Decision: **NO GO (yet)**.

### 7. נט המשפט — `net_hamishpat`
Official court system. Only `PUBLIC_JUDGMENT` / `PUBLIC_DECISION`, reachable **without login**, are eligible. Never: pleadings, protocols, evidence, appendices, personal-area or party/lawyer-access material, or anything requiring identification. Preferred access order: official API → open feed → sitemap/export → stable public endpoint → conservative public HTML → (only after clear approval) public browser automation → request a data feed. Default `collector_mode = discovery_only`, `collector_enabled = false`. Decision: **LIMITED GO** for a ≤50-doc public pilot **after** the technical audit confirms no login/CAPTCHA and permissive robots/terms.

### 8. תולעת המשפט — `tolaat_mishpat`
**Third-party, non-official.** `source_type = third_party_legal_index`, `canonical_priority = 7`. Role: discovery, cross-checking, coverage-gap detection — **not** an authoritative text source. Defaults: `text_ingestion_allowed = false`, `metadata_ingestion_allowed = false`, `collector_enabled = false`. Manual research only unless an audit finds an explicit reuse licence; when the same judgment exists officially, the **official source is always canonical**. Decision: **DISCOVERY ONLY**.

## Operator technical-audit checklist (per source, before enabling)

1. Fetch and record `robots.txt` (+ hash) for the relevant paths.
2. Capture terms-of-use / data-licence text (+ hash, + date).
3. Identify any official API / open-data feed / sitemap / export.
4. Confirm public access **without** login and **without** CAPTCHA.
5. Confirm stable public document ids + permalinks.
6. Confirm rate limits and set a conservative interval (≥ 1 req / 3–5 s).
7. Legal review → set `automated_access_status`, `collector_mode`, `legal_review_status`.
8. Only then may `collector_enabled` be set true (the DB CHECK enforces the preconditions).

## Recommended pilot

**`data.gov.il`** first (open-data licence + API/CSV most likely, lowest legal risk), then **`supreme_court`** (clear §6 basis, official full text). Both remain OFF until their technical audit passes.
