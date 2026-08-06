# OpenLawBook Qualification (Track B)

Live qualification of OpenLawBook (ספר החוקים הפתוח) as a source of consolidated
current law text. Sample captured live 2026-08-06 from the Knesset National
Legislation API + the OpenLawBook target site's MediaWiki API. Artifacts:
`artifacts/openlawbook-qualification.json`, `artifacts/openlawbook-coverage.csv`.

## Headline finding

**OpenLawBook is Hebrew Wikisource (ויקיטקסט, `he.wikisource.org`)** — a
community-maintained wiki hosted by the Wikimedia Foundation, licensed
**CC BY-SA 4.0**. The Knesset National Legislation API links to it via
`general.openBookUrl`, but the Knesset **neither owns nor maintains it**. It is
therefore **community_consolidated**, *not* official.

## Sample (33 diverse laws)

Selected across validity and age: 7 Basic Laws (חוקי יסוד), 9 repealed (בטל),
5 obsolete (נושן), 3 expired (פקע), current laws both heavily amended and new,
laws with and without `openBookUrl`. IsraelLawIDs 2000001–2000072.

## Metrics (real)

| Metric | Value |
|---|---|
| Sample size | 33 |
| Coverage (has `openBookUrl`) | 17 / 33 = **51.5%** |
| Coverage among in-force (תקף) | 16 / 16 = **100%** |
| Coverage among בטל / נושן / פקע | 1 / 9, 0 / 5, 0 / 3 |
| Accessible rate (OB pages resolving) | 17 / 17 = **100%** |
| Empty-content rate | **0%** |
| Missing-law rate | **0%** |
| `IsraelLawID` present in OB URL | **0 / 17** (title-based URLs) |
| IsraelLawID match rate (via Knesset backlink) | **100%** |
| Freshness match (wiki rev ≥ newest official amendment) | 15 / 17 = **88.2%** |

Coverage tracks **currency**: OpenLawBook consolidates laws that are *in force*
and effectively ignores repealed/obsolete/expired ones. Where a law has multiple
versions (e.g. Basic Law: The Government 1968/1992/2001), the Knesset backlink
points **only the in-force version** to the wiki page.

## Authority classification (step 11)

```
authority_level      = community_reference   (community_consolidated text)
official?            = NO
```

Not official merely because the Knesset links to it. Owner/maintainer =
Wikimedia Foundation + volunteer ויקיטקסט community; terms = CC BY-SA 4.0.

## License / terms verdict (step 12)

```
Verdict: OPEN_WITH_ATTRIBUTION
```

- The **law text itself** is public domain in Israel (Copyright Act §6).
- The **editorial/consolidation work** (merging amendments, arrangement, HTML
  structure) is the Wikisource community's contribution under **CC BY-SA 4.0** —
  §6 does **not** cover it. Reuse of the consolidated text therefore carries
  **attribution + ShareAlike** obligations.
- Automated access: `he.wikisource.org/robots.txt` has **no blanket `Disallow: /`
  for `*`**; the **MediaWiki API is the sanctioned programmatic path** (used
  here). Caching/redistribution are permitted under CC BY-SA with attribution.

## Identity resolution (step 13)

```
exact (LawID in URL/metadata)        0 / 17
high-confidence (Knesset backlink)   17 / 17   (1 flagged title-ambiguous)
ambiguous                            1  (חוק שמאי מקרקעין 2000015 vs 2000016 share a short title)
unmatched                            0
```

The OB URL is a Wikisource **page title** with no IsraelLawID, and titles are
neither unique (2000015 vs 2000016) nor exactly normalized to the official name
(e.g. "רשות הפיתוח" vs wiki "רשות פיתוח", "נמל חופשיים" vs "נמל חפשיים"). Fuzzy
title matching is therefore **unsafe**; the reliable link is the **authoritative
Knesset-API backlink** (resolution order step 2), which disambiguates every
case. No fuzzy auto-merge is performed.

## Decision — OpenLawBook Consolidated Corpus

```
REVIEW
```

Rationale: real, accessible, and often current (88% caught up), but it is
**community-maintained (CC BY-SA), not official**, and can lag on very active
laws (see coverage report). Store **metadata + link + attribution**; connect to
IsraelLawID via the Knesset backlink; **do not present it as the official
current consolidated text**; require human verification before any authoritative
use. Full-text persistence is permitted only under CC BY-SA (attribution +
ShareAlike) and must be labelled `community_consolidated`, never
`verified_consolidated_current`.
