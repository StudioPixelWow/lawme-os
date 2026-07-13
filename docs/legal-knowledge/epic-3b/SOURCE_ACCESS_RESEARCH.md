# Source Access Research (Epic 3B, Phase 4)

Grounded in live research (2026-07-12) + the Epic 0 source registry
(`LAWME_LEGAL_SOURCE_REGISTRY.csv`, 134 sources, live-verified July 2026).

## Copyright status (settled)
Israeli **Copyright Act, 2007, §6** — "copyright shall not subsist in
statutes, regulations, Knesset Protocols and judicial decisions of the
courts or of any other government entity having judicial authority."
→ The **text** of primary legislation, regulations, extension orders
(official publications in Reshumot) and case law is **public domain**.
Persisting full text is not a copyright violation. Editorial/annotation
layers (e.g. Nevo notes, Kol Zchut summaries) remain copyrighted.
Source: Israeli Copyright Act 2007 §6 (TAU/Birnhack translation; WIPO Lex).

## Access status (the real constraint — separate from copyright)
Access terms and anti-bot controls, NOT copyright, gate ingestion here.

| Source | Registry | Access finding | Verdict |
|---|---|---|---|
| National Legislation DB (Knesset) LSR-060 | rag=**restricted** | Searchable web portal; **no official API / bulk / open-data route** (gov.il service page confirms manual navigation only; contact legislation@knesset.gov.il). | No autonomous fetch |
| Reshumot official gazette LSR-065 | rag=**restricted** | gov.il returned WAF block to datacenter IP. | No autonomous fetch |
| Extension orders — זרוע העבודה LSR-124 | rag=unknown | **gov.il WAF block** to datacenter IP. | No autonomous fetch |
| AG guidance LSR-114 / unified publications LSR-133 | rag=unknown | **gov.il WAF block**. | No autonomous fetch |
| National Insurance btl.gov.il LSR-119 | rag=unknown | Host reachable in Epic 0, but terms unclear. | Metadata/pointer; no bulk |
| Collective agreements LSR-125 | rag=unknown | Host reachable, terms unclear. | Metadata/pointer |
| Knesset OData LSR-061 | rag=unknown | Structured **metadata** API (no full text). | Metadata only, if terms allow |
| data.gov.il judgments LSR-041 | rag=**open_license** | Open license but **tabular metadata**, no full text. | Metadata only |

## Consequence
Every high-value full-text employment source is either ToS-restricted
(Knesset legislation DB, Reshumot) or WAF-blocked to datacenter IPs
(gov.il extension orders/guidance). Per LawME rules and this spec, LawME
must NOT: bypass a WAF, ignore anti-bot controls, or mass-fetch a
restricted portal. Therefore **autonomous live mass-ingestion is not
available for Epic 3B.**

## Access options that ARE lawful/appropriate
1. **Human-present browser retrieval** (Claude-in-Chrome on the founder's
   residential IP) of *specific* official pages, one at a time — reaches
   gov.il/Knesset (residential IP, not the blocked datacenter range), is
   targeted not bulk, and a human is in the loop. Suitable for a small
   VERIFIED seed of key statutes.
2. **Founder-provided official exports** — the founder downloads official
   PDFs/HTML from the portals and places them in an import folder; LawME
   ingests from disk with full provenance + canonical URL.
3. **Metadata-only / pointer-only** records for everything whose full-text
   terms are unclear — canonical URL preserved, no full text persisted.

## Recommendation
Build the full ingestion INFRASTRUCTURE now (adapters, versioning,
safeguards, retrieval), seed a small number of VERIFIED real primary
texts via option (1) or (2), and classify the rest metadata/pointer.
Do NOT autonomously scrape. Escalate the sourcing choice to the founder
(see FOUNDER_REVIEW.md).
