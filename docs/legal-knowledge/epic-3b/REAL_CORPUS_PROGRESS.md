# Real Corpus — Ingestion Progress (Epic 3B, live)

## Proven this session (human-present browser, your residential IP)
The National Legislation Database (main.knesset.gov.il) is reachable on
your IP (the datacenter WAF block does not apply), and clean, **version-
certain official metadata** extracts reliably per law. Captured as real
records under `real-metadata/`:

| Law | Permalink | In force | Last amendment |
|---|---|---|---|
| חוק פיצויי פיטורים, התשכ"ג-1963 | laws/2001162 | תקף | 2025-01-30 |
| חוק עבודת נשים, התשי"ד-1954 | laws/2001135 | תקף | 2026-03-31 |
| חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס"א-2001 | laws/2000283 | תקף | 2014-07-15 |

Each record carries: canonical permalink, Reshumot publication date,
effective-start, in-force status, responsible ministry, committee, the
amendment chain, and subsidiary regulations — all official, all
version-certain.

## Design finding (drives the corpus shape)
The official page gives **metadata + amendment chain + subsidiary-reg
list**, NOT a single consolidated section-by-section text. Consolidated
text is reached via a volunteer "ספר החוקים הפתוח / לחוק המלא" link.
Therefore the corpus is TWO layers:
- **Layer 1 — statute metadata** (extractable now, official, version-certain)
  → `verified_primary_metadata`. Lets Dino identify the correct statute,
  state the correct version *status*, and cite the canonical URL, honestly
  marking section text pending.
- **Layer 2 — consolidated section text** (exact quotes + anchors, the
  Epic 3B success metric) → requires founder-supplied official text, or a
  clearly-labeled `consolidated_community` source. NOT auto-scraped.

## Plan
1. Extract Layer-1 metadata for the remaining priority statutes
   (work hours, wage protection, equal opportunity, harassment, minimum
   wage, sick pay, annual leave, collective agreements, labor court) — same
   reliable flow.
2. Obtain Layer-2 consolidated text for the P0 laws (founder-supplied
   preferred) and ingest with exact anchors, tied to Layer-1 metadata.
3. Ingest into the dev DB via the import command; then wire the retrieval
   upgrade + Dino integration + real benchmark.

Nothing has been written to any database yet — records are saved as
artifacts pending the Layer-2 text so ingestion is genuinely useful.
