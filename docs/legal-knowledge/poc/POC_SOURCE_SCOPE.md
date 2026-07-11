# POC Source Scope (Phase 3)

## Now (this task): 13 synthetic fixtures
All fictional, machinery-testing only: 7 judgments (national labor ×2,
regional labor ×4, HCJ ×1), 2 legislation digests, 1 extension order,
1 guidance, 2 secondary explainers. Every body is synthetic — no real
judgment text, no commercial content, `isSynthetic: true` throughout.

## Approved next step: 100–300 PUBLIC documents (founder-gated per adapter)

| Slice | Target | Source (registry) | Access status |
|---|---|---|---|
| Court judgments/decisions (employment) | 40–100 | supremedecisions (LSR-038), judiciary spokesperson collector (LSR-040), Net HaMishpat (LSR-037) | **permission-verification required** (ACCESS_RESEARCH.md); manual selection of public samples is the lawful fallback |
| Statutes & regulations | 20–50 | National Legislation DB (LSR-060), Reshumot (LSR-065) | public official; version-dated ingestion |
| Extension orders / guidance / circulars | 20–50 | extension-orders DB (LSR-124), gov.il collectors (LSR-133), AG/State-Attorney guidance (LSR-114/115) | public official; gov.il WAF needs IL egress |
| Public explanatory / secondary | 20–50 | Kol Zchut (MCP, LSR-095 family), BTL rights pages (LSR-088) | live MCP (read-only) + public pages |
| Synthetic firm documents (Matter-context testing) | 5–10 | FIRM (category G) | synthetic only — no real client data in the POC |

## Selection rules (binding)
1. Public · legally usable · stable · verifiable · metadata-rich ·
   employment-relevant · credential-free.
2. **No copyrighted commercial summaries or editorial enrichment** —
   judgment text yes (public domain), Nevo/Takdin headnotes never.
3. Storage follows the registry's classification: allowed → per
   storage_policy; **uncertain → metadata only** (`pointer_only`,
   `rag_permission: unknown` or `requires_permission`), full text not
   persisted.
4. Every ingested document passes the validation gate (provenance,
   sha256, dates) and the privacy pass (anonymization respected — no
   ingestion of documents under צווי איסור פרסום).
5. Per-source counts recorded in `legal_source_fetches`; the corpus stays
   hand-auditable (≤300).
