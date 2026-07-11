# LawME — Legal Drafting Pipeline (design)

**Status: design only (Epic 0, Phase 14).** The controlled flow from
matter facts to an export-ready legal document. Drafting consumes the
research pipeline's verified outputs — it never invents authority.

## The flow

```
matter facts → document objective → clarification gate → legal issue map
→ research (Phase-13 pipeline) → verified source set → argument structure
→ draft → citation verification → red team → document QA → partner review
→ final export
```

### Stage definitions

1. **Matter facts** — structured facts from the matter (parties, dates,
   amounts, documents in evidence) + fact gaps listed explicitly. Facts
   carry provenance (which client document / which meeting note).
2. **Document objective** — type (כתב תביעה, כתב הגנה, מכתב התראה, חוות
   דעת, הסכם…), forum, relief sought, strategic posture.
3. **Clarification Gate** — missing facts, unresolved strategy choices,
   conflicting instructions → asked before drafting, not papered over.
4. **Legal issue map** — issues to be argued, each linked to the elements
   that must be established and the facts available per element. Gaps
   become "requires evidence/lawyer decision" flags.
5. **Research** — the Phase-13 pipeline runs per issue (or reuses fresh
   saved research); output: labeled, verified source set.
6. **Verified source set** — the ONLY citation pool for the draft. Each
   entry: document_id, pinpoint anchor, citator status, statute version,
   verification timestamp.
7. **Argument structure** — skeleton: issues ordered, authorities mapped
   to arguments, counterarguments (from Red Team research) assigned
   responses. Approved structure gates drafting.
8. **Draft** — Hebrew legal prose per firm templates/clause library
   (category-G sources), citations inserted ONLY from the verified set,
   every factual assertion linked to a matter fact, every assumption
   marked ("בהנחה ש…").
9. **Citation verification** — machine re-check of the finished draft:
   every citation resolves to its verified source, quote-accuracy check
   (quoted text == source text at anchor), statute versions current as of
   drafting date, citator status still good_law.
10. **Red Team** — adversarial review of the draft itself: weakest
    arguments, exposed admissions, missing alternative pleadings,
    procedural vulnerabilities. Output: risk memo attached to the draft.
11. **Document QA** — structure/formatting (court rules compliance),
    RTL/BiDi correctness, defined-terms consistency, numbers/dates
    cross-check, required sections present.
12. **Partner review** — human sign-off with tracked changes; edits feed
    the firm knowledge loop (clause library, playbooks).
13. **Final export** — DOCX/PDF with firm styling; the export bundle
    embeds the provenance manifest (sources + versions + verification
    timestamps) for the file.

## The five prohibitions (hard gates, not guidelines)
No draft may leave stage 9 containing:
1. **An unverified citation** — a citation not in the verified source set.
2. **A fabricated judgment** — any reference that fails to resolve to an
   ingested/verified document. (The benchmark's hallucinated-citation
   tasks test exactly this gate.)
3. **An outdated statute presented as current** — version check against
   the legislation DB at draft date.
4. **An unsupported fact** — a factual assertion with no matter-fact link.
5. **An unmarked assumption** — assumptions render visibly until partner
   review resolves them.

Violations block export; overrides require partner authority and are
logged.

## Provenance retention
Every legal proposition in the final document retains: source_id →
document_id → anchor → verification event. The provenance manifest
survives into the matter archive, so a year later the firm can answer
"why did we say this, on what authority, and was it good law then?"

## Firm knowledge loop (category G)
Partner-approved language flows back: clauses → clause library, argument
structures → playbooks, memos → firm knowledge, all RLS-guarded and
labeled internal (never external authority).
