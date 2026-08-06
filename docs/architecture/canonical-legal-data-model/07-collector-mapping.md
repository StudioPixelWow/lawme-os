# CLDM — Collector Mapping Guidelines

How every *future* collector maps its source onto the canonical model. This is
the contract that keeps collectors from inventing shapes. **No collector is built
here.** These are the rules a collector must follow when one is eventually
implemented (per the Collector Prioritization, Knesset OData legislation first).

## The universal mapping contract

Every collector, regardless of source, performs the same steps:

```
1. FETCH lawfully        (respect the Source Registry's access/legal status;
                          fail-closed on 403/429/robots-disallow; no bypass)
2. RECORD Document Source (raw bytes → content_sha256, license, retrieved_at,
                          full provenance) — dedup on hash
3. EXTRACT to canonical  (map source fields → canonical entity fields ONLY;
                          anything with no canonical home → source_extras)
4. RESOLVE identity      (emit same_as candidates via the resolution pipeline;
                          never mint duplicate canonical ids blindly)
5. VERSION               (compare to head → new_version | correction | snapshot |
                          diff; content immutable)
6. ASSERT edges          (typed, directional, with provenance + confidence)
7. STAGE unverified      (everything lands verification_status=unverified,
                          lifecycle draft/active; restriction-flagged → never
                          published) — matches the existing persist pipeline
```

### Non-negotiable rules
- **Map into canonical fields; never add source-specific canonical columns.**
  Source-only data goes in `source_extras`; promotion to a canonical field is a
  reviewed model change, not a collector decision.
- **Provenance on every assertion** (platform/publisher/dataset/resource/url +
  method + parser_version + confidence).
- **Idempotent & resumable.** Re-running a collector produces corrections/version
  touches, never duplicates (dedup on external_ids + content hash).
- **Lawful-only.** The collector honors the Source Registry's recorded license and
  access status; it never scrapes anti-bot/WAF systems.

## Source archetype → canonical mappings

### CKAN (data.gov.il) → Canonical
```
CKAN dataset            → source_dataset (provenance)
CKAN resource (CSV/PDF) → Document Source (one per file, hashed)
CSV row                 → one canonical entity (type by dataset category):
   ararim / mishmoret     → Judicial: Decision (+ Case, Court) [full_documents]
   judgments              → Judicial: Case + Decision-metadata (summary only)
   ica_companies/…        → Registry: Company (+ Person officers via hub)
   moj-amutot             → Registry: Nonprofit
   patents / trademarks   → Registry: Patent / Trademark
   yerusha / hekdeshot    → Registry: Estate / Trust
   regulationdatabase     → Legislation: Regulation (metadata)
CKAN license (cc-by/…)  → Document Source.license (attribution propagates)
```
One `DataGovCkanCollector` with per-dataset config serves ALL datasets — never one
collector per resource or per publisher (per the Source Entity Model).

### Knesset OData → Canonical
```
KNS_IsraelLaw           → Legislation: Law
KNS_DocumentIsraelLaw   → Legislation: Section (versioned text)
KNS_Bill                → Legislation: Bill
committee entity sets   → Government: Committee (+ Person members via hub)
session/vote sets       → Government: Procedure / Proceeding-like events
OData row keys          → external_ids (scheme: knesset_*)
OData navigation props  → typed edges (bill→law becameLaw, section→law partOf)
```
OData's relational links map directly to canonical edges — a clean, high-value
first build (0% realized today).

### Court feed (official; NOT scraping) → Canonical
```
case record             → Judicial: Case
judgment document       → Judicial: Decision + Document Source (immutable, hashed)
bench                   → Panel + Judge (via Person hub)
parties                 → Party (role) → Person/Organization (via hub)
representation          → Attorney (via Person hub)
in-text references      → Citation entities (resolved async; dangling retained)
```
Gated on obtaining an official data feed (the Coverage Map's STRATEGIC track);
core-court scraping remains prohibited.

### Regulatory APIs → Canonical
```
regulator               → Regulatory: Authority (via Organization hub)
decision/ruling         → Regulatory Decision (+ Document Source)
circular/חוזר           → Circular
guideline               → Guideline
enforcement/sanction    → Enforcement Action → affects Company/Person (via hub)
legal basis refs        → basedOn edges → Law/Section
```
Per-regulator audit precedes any build (endpoints currently estimated).

## Mapping template every collector must fill (planning artifact)

For each source, the collector author documents, before coding:

1. **Source → entity-type table** (which record becomes which canonical entity).
2. **Field crosswalk** (source field → canonical field | source_extras).
3. **External-id schemes emitted** (registered in the Reference id-scheme list).
4. **Edges emitted** (type, from, to, qualifiers).
5. **Identity keys** (which strong/fuzzy keys this source contributes).
6. **Versioning signals** (which source fields indicate change vs correction).
7. **License/access** (from Source Registry; attribution/restriction handling).
8. **Confidence policy** (default confidence by extraction_method).

This template is the deliverable a collector Epic starts from — not code.

## Conformance checklist (a collector is "canonical-compliant" iff)
- ☑ Emits only canonical fields + `source_extras`; adds no canonical columns.
- ☑ Attaches full provenance to every entity, version, and edge.
- ☑ Produces a Document Source (hashed) for every primary document.
- ☑ Emits identity `same_as` candidates rather than blind duplicates.
- ☑ Chooses the correct `change_kind`; treats primary text as immutable.
- ☑ Lands everything `unverified`; fail-closed on restrictions and on 403/429.
- ☑ Is idempotent and resumable.
