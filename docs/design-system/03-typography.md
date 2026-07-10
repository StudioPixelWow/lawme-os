# 03 · Typography System

Typography is LawME's primary interface. The system has **two voices**, both Hebrew-native
variable fonts, loaded via `next/font/google` (self-hosted, zero layout shift):

## The two voices

| Voice | Font | Token | Role |
|---|---|---|---|
| **Display** | Frank Ruhl Libre (serif) | `font-display` | Headlines, matter titles, the daily greeting, key figures. The voice of the institution — authority, permanence, print |
| **Text** | Assistant (sans) | `font-sans` | Everything else: UI, body, labels, data. The voice of the tool — clear, modern, effortless |

The serif/sans pairing is the core of the editorial feel. A screen with only sans reads as
SaaS; the serif opening is what makes it read as a document of consequence.

Mono (`font-mono`) is system mono, reserved for case numbers, file hashes, and code-like
identifiers — used sparingly.

## Scale (fluid, semantic)

Semantic sizes, not t-shirt sizes. Display sizes are fluid via `clamp()`:

| Token | Size | Line height | Voice | Use |
|---|---|---|---|---|
| `text-display` | clamp 40→60px | 1.1 | Display | One per page: the greeting, the matter title |
| `text-title` | clamp 28→36px | 1.2 | Display | Chapter titles |
| `text-heading` | 22px | 1.35 | Sans 600 | Sub-sections, card lead lines |
| `text-subheading` | 18px | 1.5 | Sans 500 | Emphasized body, intro paragraphs |
| `text-body` | 16px | **1.65** | Sans 400 | Default. Never smaller for reading content |
| `text-small` | 14px | 1.6 | Sans 400 | Secondary info, list metadata |
| `text-caption` | 13px | 1.5 | Sans 500 | Labels, timestamps, table headers |
| `text-micro` | 12px | 1.4 | Sans 500 | Legal fine print only. Nothing interactive |

Hebrew needs taller line-height than Latin defaults (ascenders/descenders + niqqud headroom);
1.65 body leading is deliberate — do not "tighten it up".

## Weight and emphasis

- Weights used: 400, 500, 600 (sans); 400, 500, 700 (serif). Nothing above 700 — heavy
  black weights are advertising, not law.
- Hierarchy is built from **size + space + ink shade**, then weight — bold is the last resort.
- Emphasis inside running text: weight 600, never color, never underline (underline = link).
- Letterspacing: display sizes get `-0.01em`; Hebrew body text is never letterspaced
  (tracking Hebrew is a typographic error); ALL-CAPS styling does not exist (no caps in Hebrew —
  and we don't use uppercase labels for English either).

## Hebrew–Latin–number harmony

Legal text constantly mixes Hebrew, English party names, case numbers, and sums:

- Assistant and Frank Ruhl Libre both carry Latin; the fallback stack continues to system
  faces so mixed lines baseline-align.
- Numbers: `font-variant-numeric: tabular-nums` in any column, timeline, timer, or ledger —
  proportional numerals only in running prose.
- Every user-content string in a list is wrapped in bidi isolation (`<bdi>` /
  `unicode-bidi: plaintext`) so an English name never scrambles a Hebrew row (see 13-rtl).
- Dates and currency render through `Intl` with `he-IL` (₪, Hebrew month names); the Hebrew
  calendar date may accompany hearings as a caption.

## Measure and rhythm

- Reading measure: max `42rem` (`max-w-reading`) for prose; never full-bleed paragraphs.
- One `text-display` per page. If two things feel display-worthy, one of them isn't.
- Truncation: single-line ellipsis only for list metadata, never for titles or legal text —
  wrap instead. Hebrew ellipsis is `…` at the **end** of the logical string (bidi-safe by
  using logical CSS, not manual dots).
