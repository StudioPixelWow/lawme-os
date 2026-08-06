# Knesset Official Publication Collector

Status: implemented (offline-tested) + metadata pilot persisted to dev on 2026-08-06.
Scope: Track A of the "Official Legislation Publication Collector" Epic — a real
collector for the Knesset National Legislation API and the official ספר החוקים
publication PDFs on `fs.knesset.gov.il`. This corpus is the **official
publication stream** (a law + every amendment publication), **not** a
consolidated current text.

## 1. Source contract — `GetLegislationLawItem`

```
GET https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/GetLegislationLawItem?ItemId=<IsraelLawID>
```

- `ItemId` **equals** the OData `IsraelLawID` exactly. There is **no fuzzy/name
  resolution** — `assertItemId()` rejects any non-numeric id.
- Content negotiation: browser navigation (Accept text/html or xml) returns a
  **WCF DataContract XML** document; a programmatic `fetch()` (default Accept)
  returns the **JSON** representation. The typed client
  (`legislation-api.ts`) parses the **XML** representation via a small
  dependency-free WCF parser (`wcf-xml.ts`); callers that prefer JSON can adapt
  the same Zod shapes. No `any` anywhere — every external field is Zod-validated
  before it is trusted (`LegislationLawItemSchema`).
- Real element structure (confirmed live): root `iLegislationLawItem` →
  `general` + `corrections > listCorrections > iLegislationLawItemCorrectionResult[]`
  + `secondaryLawInstalled`. Corrections are returned **newest-first**.

### Fields captured per law (when present)

`IsraelLawID`, law title (`hebSubject`), `lawValidity` (תקף/נושן/בטל/פקע),
first publication date, `latestPublicationDate` (= last observed amendment),
`openBookUrl`, `kolZchutUrl`; and per correction/publication: `itemId`,
`name`, `correctionNumber`, `correctionType` (ישיר/עקיף), `publicationDate`,
`publicationSeries` (ספר החוקים), `magazineNumber` (חוברת), `pageNumber`
(עמוד), `filePath` (→ official PDF), `fileType`, `summaryLaw`.

Real fixtures are captured and minimized under
`src/modules/legal-ai-israel/ingestion/legislation/publication/__fixtures__/`
(law 2001008 — חוק מילווה חסכון — 3 real publications, נושן, no openBookUrl).

## 2. Deterministic identity (`publication-identity.ts`)

```
Law            knesset:<IsraelLawID>
Publication    knesset:publication:<itemId>
Amendment      knesset:law:<IsraelLawID>:correction:<correctionNumber>
               (fallback, documented) knesset:law:<IsraelLawID>:pub:<itemId>
Official PDF   canonical PDF URL + binary SHA-256   (pdf:<sha256>)
```

- The Knesset API frequently leaves `correctionNumber` empty (notably for
  indirect/עקיף amendments), so the amendment-event id falls back to an
  itemId-keyed form. Both are deterministic; **a publication is never
  identified by title alone**.
- `canonicalPdfUrl()` normalizes the API's Windows-style backslash paths
  (`\9\law\9_lsr_211856.PDF`) and collapses duplicate slashes into a canonical
  `https://fs.knesset.gov.il/...` URL.
- **Known identity nuance:** an `itemId` is not always unique per row. An
  omnibus (עקיף) amendment publishes once but amends several laws under the
  *same* `itemId` (e.g. ס״ח 3016 / itemId 2199304 amends both חוק שמאי מקרקעין
  and חוק תרומת ביציות), and a correction-of-error PDF can reuse an `itemId`
  days later (2000003 → 147021). The publication is correctly stored **once**
  and linked to each law via amendment-graph edges; when two rows collide on a
  single law the pipeline flags it (`dataQuality.duplicateItemIdRows`) rather
  than silently merging, and identity should fall back to
  `(itemId, publicationDate)` where a same-law collision is detected.

## 3. SSRF-guarded PDF fetch (`pdf-fetch.ts`)

Server-side only, transport injected for testability. Enforced policy:

- HTTPS only; hostname allowlist `["fs.knesset.gov.il"]`; literal IPs, userinfo
  and non-443 ports rejected; redirects followed manually and **re-validated on
  every hop** (no allowlist bypass via redirect).
- Wall-clock timeout, max redirects, max byte size (40 MB default).
- Response must be `application/pdf` **and** begin with the `%PDF-` magic bytes.
- SHA-256 of the bytes → content-addressed identity + idempotent object storage.
- Retry **only** on network error / 5xx; **never** on 403/404/429.

Per fetched file we persist: source URL, IsraelLawID, publication itemId,
correction number, publication date, ספר החוקים number, page, `fetched_at`,
content hash (SHA-256), file size, content type, license basis. **PDF bytes go
to object storage, never into Postgres** — `law_publications` stores only the
url/hash/metadata.

## 4. PDF text extraction (`pdf-extract.ts`)

Staged, cheapest-and-most-faithful first; engines injected:
`text_layer → layout → normalize → structural(parseLegislation) → OCR`. **OCR
runs only when the embedded text layer is effectively empty** (a scanned image)
— never a blanket pass. Low-confidence / OCR-fallback documents return
`status: needs_review` (→ quarantined, not published). Persisted per document:
`extraction_method`, `extraction_version`, `raw_text_hash`,
`normalized_text_hash`, page count, extraction confidence, `ocr_used`.

## 5. Environment note

This session's container has **no network egress**, so live fetches ran through
the Claude-in-Chrome browser and the bulk **PDF download + extraction is the
operator step** — the fetch/extract code is fully implemented and offline-tested
behind injected transports/engines, and the pilot reports PDFs as
*discovered* (URLs resolved) rather than downloaded. Remote dev-DB writes go via
the Supabase MCP under the founder's standing dev-only authorization.

## 6. Tests

`publication/__tests__/` — 26 tests: WCF-XML parsing (nested/array/`i:nil`),
Zod validation on the real fixture, identity keys, SSRF policy (protocol/host/
IP/userinfo/port/redirect/retry matrix), extraction staging + OCR-only-on-empty,
publication model + amendment graph. All green; whole ingestion suite 64/64.
