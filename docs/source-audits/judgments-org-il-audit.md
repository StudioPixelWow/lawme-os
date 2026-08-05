# Source Audit — judgments.org.il (Selective Ingestion Connector)

Status: **AUDIT COMPLETE — connector BLOCKED at server-side (HTTP 403).**
Audited: 2026-08-05, via an authorized real-browser session (no login, no CAPTCHA
solving, no bypass) plus one polite server-side probe.
Authorization: per founder, Law Me holds the site owner's permission to run
automated server-side search/fetch/extract/store/commercial-use against this
source. This audit records the *technical* reality; it does not itself verify the
legal permission.

---

## 0. Headline finding (read first)

The site serves full content to a **real browser**, but a **server-side HTTP
request returns `403` (103 bytes, `text/plain`)** — including with the honest
`User-Agent: LawMeLegalResearch/1.0`. There is no Cloudflare header and no JS
challenge page; the 403 is an outright access-control block on non-browser
clients.

Per the task's own rules ("אין לעקוף … תגובת `403` … יש לעצור אוטומטית") and Law
Me's hard safety boundary, we **do not bypass** this. We do not spoof browser
headers, rotate IPs, or defeat the WAF. The connector is therefore built to
**fail-closed on 403** and cannot return live data until the site owner
**allowlists Law Me's server** (by static egress IP, a shared `User-Agent`
token, or an API key/endpoint). This is the lawful unblock for a *permissioned*
integration — the permission has simply not yet been provisioned on the site
side.

Everything below (structure, selectors, id strategy) is verified and ready, so
the connector can go live the moment allowlisting is in place.

---

## 1. Platform

- **WordPress.** Search uses the native `?s=` query param; judgments are a custom
  post type (`single-judgment` body class), archived at `/judgments/`.
- **Front-end CSS: Tailwind utilities** (e.g. `max-w-5xl mx-auto px-4 …`). There
  are **no stable semantic class names** for fields. → Parsers MUST be
  **label-anchored and structural**, never class-name based. Recorded as a
  fragility with fallbacks (§6).
- A separate AI product exists at `lawreview.judgments.org.il` (out of scope).

## 2. Search

- **Method:** `GET`
- **Endpoint:** `https://judgments.org.il/?s=<url-encoded query>`
  - Verified: `?s=רשלנות רפואית` → "תוצאות חיפוש עבור: רשלנות רפואית", **1,818
    results**.
- **Content-type tabs** on the results page: `הכל` (all), `פסיקה` (judgments,
  1,792), `מאמרים` (articles, 26). Judgments-only is the target set. The exact
  query param for the פסיקה filter (WP `post_type`/tax filter) is **not yet
  finalized against raw HTML** (blocked by 403) — treat as TODO, verify against a
  raw fixture once allowlisted; default behaviour: request `?s=` and keep only
  results whose permalink is under `/judgments/`.
- **Pagination:** WordPress standard `/(page/N/)?s=…` or `&paged=N`. To be
  confirmed against raw HTML; the parser reads the "next page" link rather than
  guessing.
- **View toggle:** cards (`כרטיסיות`) / table (`טבלה`) — cosmetic only.
- **Result card fields (verified, rendered):** title = proceeding-type + `(court
  district)` + case number + parties (e.g. `רע"א (מרכז) 70802-04-26 – מדינת
  ישראל … נ' פלונית`), a snippet, and a labeled date box (`תאריך פסק הדין`).

## 3. Document page

- **URL (canonical permalink):** `https://judgments.org.il/judgments/<hebrew-slug>/`
  - Confirmed `<link rel="canonical">` and `og:url` present.
- **Stable external id (verified):** WordPress post id from the body class
  **`postid-15795932`** (post type `single-judgment`). Id-resolution order for the
  connector:
  1. WP post id (`postid-<n>` body class) → `judgments:<n>` — **primary, stable.**
  2. Canonical permalink slug (`/judgments/<slug>/`).
  3. Hash of the normalized canonical URL.
  4. Composite: normalized case number + decision date + court.
  Never the title alone.
- **Metadata (verified, label-anchored):** each field renders as
  `<span>label</span> value` inside a parent whose text is `"label: value"`:
  | Label (he) | Example value | Maps to |
  |---|---|---|
  | `תאריך` | `31.05.2026` | `decisionDate` (DD.MM.YYYY) |
  | `בית המשפט` | `בית המשפט המחוזי מרכז-לוד` | `court` |
  | `סוג מסמך` | `החלטה` | `documentType` (`החלטה`/`פסק-דין`) |
  | `מס׳ הליך` | `70802-04-26` | `caseNumber` (raw; normalize via existing normalizer) |
  - **Proceeding type** appears in the breadcrumb/category (e.g. `רע"א - רשות
    ערעור אזרחי`); it is also derivable from the normalized case number.
  - **Court level** derivable from `court` ("המחוזי" → district, "העליון" →
    supreme, "השלום" → magistrate).
- **Official text container:** the full §6-exempt judgment body is inside the
  page `<article>`. Parse this as the judgment text.
- **AI summary (MUST segregate):** the page also renders **their** AI summary
  under "תקציר ההחלטה השיפוטית", explicitly marked
  `* תקציר זה נוצר באמצעות בינה מלאכותית`. This is **third-party editorial
  content** — it is NOT the official judgment and is NOT §6-exempt. The document
  parser must **exclude** it from `contentText`/`contentHtml` (cut at the AI-marker
  boundary) and never store or present it as the ruling.
- **PDF:** none on the sampled judgment (text is inline HTML). PDF links are
  therefore optional/absent; when present, gate by allowlisted host + content-type
  + size, download server-side only, on user demand.
- **Removal notice:** each page shows "מופיע בפסק דין זה? ניתן לבקש את הסרתו"
  (subject-initiated removal). The connector must honor `removed_at_source`: if a
  previously-seen document 404s/redirects, mark it removed rather than serving a
  stale copy.

## 4. Structured data

- No JSON-LD/microdata relied upon (not required — label-anchored extraction is
  sufficient and more stable than the Tailwind DOM). If `<meta property="article:
  published_time">`/`og:*` are present in raw HTML they serve as fallback date/
  title sources — confirm against a raw fixture once unblocked.

## 5. Rate / access

- **Server-side: 403 for non-browser clients** (the blocker). No `Retry-After`,
  no challenge markers — a flat deny.
- Reasonable-use policy still applies once allowlisted: ≤1–2 req/s, concurrency
  2–4, jittered spacing, no crawl/enumeration, caching.

## 6. Selector strategy + fallbacks (for the parsers)

Because the DOM is Tailwind utilities, selectors are **content-anchored**:

- **Document id:** `body[class*="postid-"]` → digits. Fallback: canonical slug.
- **Metadata:** locate the `<span>` whose trimmed text ∈ {`תאריך`,`בית המשפט`,
  `סוג מסמך`,`מס׳ הליך`/`מס' הליך`}; value = parentText after the first `:`
  (fallback: `nextElementSibling.textContent`).
- **Title:** `h1` (single per page).
- **Official body:** `article`, with the AI-summary subtree removed by cutting at
  the node containing `תקציר ההחלטה השיפוטית` through the AI marker
  `נוצר באמצעות בינה מלאכותית`.
- **Confidence gate:** if the `<article>` is missing, or fewer than 2 of the 4
  metadata labels resolve, or the body after AI-summary removal is < N chars →
  return `parse_structure_changed` (do NOT store a partial doc as complete).

## 7. Stop / fail-closed policy (structure change or block)

Trip the circuit breaker and mark the source `blocked`/`degraded` (no bypass, no
retry-to-defeat) on any of: `403`, `429`, CAPTCHA, login redirect, unrecognized
HTML, missing `<article>`, <2 metadata labels, non-legal content, or a run of
errors. Law Me continues on local data; operator gets an alert; audit-logged.

## 8. Anonymized examples (verified this audit)

- Search: `?s=רשלנות רפואית` → 1,818 results (1,792 judgments).
- Document: `רע"א (מרכז) 70802-04-26`, court `בית המשפט המחוזי מרכז-לוד`, type
  `החלטה`, date `31.05.2026`, post id `15795932`, canonical `/judgments/<slug>/`.

## 9. Known limitations / honesty

- **Raw HTML not captured** (403) → exact WP pagination param, the פסיקה-only
  filter param, and precise child selectors inside `<article>` are **derived from
  the rendered DOM, not raw markup**; they must be re-verified against a raw
  fixture once the server is allowlisted. Parsers are written defensively with
  fallbacks and a confidence gate so a mismatch fails closed rather than
  producing bad data.
- Only one judgment + one search were sampled (polite). Field presence across
  proceeding types (esp. `פסק-דין` vs `החלטה`, multi-judge panels, PDFs) needs a
  small labeled sample once unblocked.
- The site's AI summaries are third-party content and are excluded by design.
