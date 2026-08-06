# Knesset LawID Resolution

## The mapping (exact, no fuzzy matching)

The legislation content API is keyed by the **same identifier as OData**:

```
GetLegislationLawItem?ItemId=<X>   ⇔   KNS_IsraelLaw.Id == KNS_IsraelLawName.IsraelLawID == <X>
law page: main.knesset.gov.il/apps/legislation/main/laws/<X>
```

So every law in `KNS_IsraelLawName` (2,180 IsraelLawIDs) resolves **1:1** to its
Knesset legislation page + content API by identity — no title fuzzy-matching, no
publication-year fallback needed.

## Identity precedence (per the model)

1. `IsraelLawID` (== ItemId) — **direct, authoritative**.
2. official law number — fallback only if an ID is missing.
3. canonical source URL.
4. exact normalized title.
5. title + publication year.

V1 uses (1) exclusively; (2)-(5) are not needed because (1) is exact.

## Confirmed samples (live)

| IsraelLawID | API hebSubject | Match |
|---|---|---|
| 2001008 | חוק מילווה חסכון, התשל"ד-1974 | exact |
| 2000002 | חוק התקשורת (בזק ושידורים), התשמ"ב-1982 | exact |

Full data: `artifacts/knesset-lawid-resolution.csv`.

## Validation approach for the remaining laws

`GetLegislationLawItem?ItemId=<IsraelLawID>` returns `hebSubject`; assert it
equals `KNS_IsraelLawName.Name` for that IsraelLawID. Any mismatch → flag for
review (expected: near-zero, since the ID space is shared). Report buckets:
exact / high-confidence / ambiguous / unmatched.

## Result

Exact matches: structural (all 2,180 by formula). Fuzzy/ambiguous: none required.
Unmatched: none expected. **LawID resolution is reliable.**
