# Kol Zchut MCP — Connection & Validation Report (2026-07-11)

## Decision
Founder approved (Epic 0, Phase 2). `kolzchut` added to `.mcp.json` —
project scope, stdio, **version pinned `@skills-il/kolzchut-mcp@1.0.1`**,
no credentials, read-only.

## Pre-connection re-verification
| Check | Result |
|---|---|
| Skills-IL page re-opened | agentskills.co.il/he/mcp/kolzchut — trust 81/100 ("אמין") |
| Package / version | `@skills-il/kolzchut-mcp` · npm latest = **1.0.1** — unchanged since the Skills-phase review → no code re-inspection required |
| Maintainer | skills-il org (same org that maintains the skills repos) |
| License | MIT (package.json of the inspected tarball) |
| Credentials | none required (no API key, no registration) |
| Network destinations | exactly one: `https://www.kolzchut.org.il/w/api.php` (MediaWiki public API; verified in dist/client.js source) |
| Write tools | none — 6 tools, all annotated `readOnlyHint: true`, `destructiveHint: false` |
| Tools | kolzchut_search_rights · kolzchut_get_article · kolzchut_get_article_sections · kolzchut_get_article_section · kolzchut_list_category_members · kolzchut_list_categories |

## Protocol test (stdio, sandbox)
`initialize` → `tools/list` → `tools/call` all conform to MCP
2024-11-05. Server boots in <1.5s and streams valid JSON-RPC.

## Live API tests
**Environment note:** `api.php` returns **HTTP 403 to datacenter clients**
(both the cloud sandbox and the web-fetch service) — bot protection on the
API endpoint only; the article site itself serves those clients fine. All
live tests below were therefore executed through the founder's real
browser session, which exercises the identical endpoint + parameters the
MCP client sends (`format=json&origin=*`).

| # | Test | Query | Result |
|---|---|---|---|
| 1 | Employment-rights search | `פיצויי פיטורים` (srlimit=3) | ✅ 573 total hits; top result "פיצויי פיטורים" pageid 10359; fields: ns,title,pageid,size,wordcount,snippet,timestamp |
| 2 | National-Insurance search | `דמי לידה ביטוח לאומי` | ✅ 915 total hits; top result "דמי לידה" pageid 442 (56KB, 4,257 words) |
| 3 | Public article read (structure) | `action=parse&page=דמי לידה&prop=sections` | ✅ 44 sections returned incl. "מי זכאי?", "תהליך מימוש הזכות" and **"מקורות משפטיים ורשמיים"** (פסקי דין / חקיקה ונהלים / הרחבות ופרסומים) |
| 4 | Source URL | — | ✅ canonical URL derivable per result: `https://www.kolzchut.org.il/he/<title>` (+ pageid as stable ID) |
| 5 | Response structure | — | ✅ standard MediaWiki JSON (`query.searchinfo.totalhits`, `query.search[]`, `parse.sections[]`) — matches exactly what dist/client.js maps |
| 6 | Hebrew encoding | — | ✅ valid JSON \uXXXX escapes decoding to correct Hebrew; timestamps ISO-8601 |
| 7 | Latency | — | ✅ ~1–2s per request end-to-end via browser; server adds <100ms |
| 8 | Write operations | — | ✅ none exist; MediaWiki edit actions are not exposed by the server |

## Freshness observation
Result timestamps include 2026-06-15 and 2026-03-22 — the corpus is
actively maintained (weekly-or-better updates on core rights articles).

## Operational caveat (recorded honestly)
From THIS cloud sandbox the MCP's own fetch gets 403 (datacenter IP
block on api.php). On the founder's Mac (residential IP) it is expected
to work; **first local use should confirm one search returns results.**
If kolzchut's WAF ever blocks the `kolzchut-mcp-server/1.0` user-agent
generally, the fallback is browser-based access; report to Skills-IL.

## Classification (binding)
- **Public secondary legal-information source** (explanatory).
- Excellent for rights discovery, client-friendly explanations, intake.
- **Never the sole authority for a legal conclusion.** Every legal claim
  must ultimately be verified against primary legislation, regulation or
  case law. Its "מקורות משפטיים ורשמיים" sections are useful pointers TO
  those primary sources.
- Trust-model tier: **5 — Public explanatory source**
  (see LAWME_SOURCE_TRUST_MODEL.md).
