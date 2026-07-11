# supremedecisions.court.gov.il — Access Research (Epic 1, Phase 7)

**Researched 2026-07-11 from the cloud environment. Honest findings:**

| Question | Finding |
|---|---|
| Exact source / domain | ✅ `supremedecisions.court.gov.il` — the Supreme Court's decisions search (Hebrew/English Angular SPA). Confirmed live. |
| Access terms | **Not found** on the reachable pages. No published terms permitting or forbidding automated access were located from this environment. |
| Public pages & document URLs | SPA search UI; documents served via download endpoints (`/Home/Download?path=…` pattern observed in Epic 0 research). HTML shell is template code; data arrives from a JSON backend. |
| HTML/PDF structures | Documents are typically DOC/PDF downloads + HTML viewer. Not exercised live in this task (no mass-fetch rule). |
| Pagination | Backend JSON accepts paging parameters (Epic 0 observation) — **undocumented**, may change without notice. |
| Metadata | Case number, parties, date, judges available in search results (Epic 0 observation). |
| Automated access allowed? | **UNKNOWN.** robots.txt could not be retrieved/parsed from this environment; no API documentation exists; the backend is undocumented. |
| Structured feed / better endpoint | None documented. The judiciary spokesperson collector on gov.il (LSR-040) and the open HuggingFace corpus are alternative channels — each with its own review. |
| WAF/CAPTCHA/login | gov.il WAF behavior observed on sibling properties; no login for public reads. **No bypass attempted, none will be.** |

## Decision (per Phase 7 rules)
Lawful automated retrieval is **not clearly supported** → the POC adapter
is **fixture-backed**: it implements the full `LegalSourceAdapter`
contract against a small local synthetic fixture set
(`fixtures/employment-poc.fixtures.json`, 13 documents, all fictional).
**No live crawler was created. No live fetch occurs anywhere in the POC.**

## What permission/verification is needed before live ingestion
1. Written confirmation (or published terms) that automated retrieval of
   decisions from the site is permitted, OR use of an officially provided
   channel (data agreement with the Courts Administration /
   הנהלת בתי המשפט; FOI request if needed).
2. Robots policy verification from an Israeli egress point.
3. Rate-limit agreement (self-imposed conservative cap even if permitted).
4. Founder approval per the infrastructure guardrails.

## Adapter notes
`SupremeDecisionsAdapter.classifyAccess()` returns `public_unspecified` —
publicly viewable, reuse terms unstated. Documents fetched through this
adapter (when it goes live) start as `storage_policy: store_extract`,
`verification_status: unverified`, and are upgraded only through the
verification pipeline. Judgment TEXT is copyright-free (Copyright Act
2007 §6) — the caution here is about ACCESS method, not content rights.
