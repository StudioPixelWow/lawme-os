/**
 * Hebrew legislation structural parser (Knesset full-legislation Epic, Step 6).
 *
 * Turns a consolidated Hebrew statute's full text into an ordered set of
 * Section units, preserving the legal hierarchy (חוק → פרק → סימן → סעיף →
 * תת-סעיף) and every section number. It never removes section numbers and never
 * blind-cuts by character count. It relies on a COMBINATION of signals —
 * numbering patterns, headings, and known structural keywords — not a single
 * regex.
 *
 * Output feeds Section canonical entities + legal chunks. The parser is pure and
 * offline (no network, no DB). It is deliberately conservative: when a boundary
 * is ambiguous it keeps text together rather than splitting mid-provision.
 *
 * node --test conventions: union types, relative `.ts` imports, `import type`.
 */
import { createHash } from "node:crypto";

export type StructuralKind =
  | "chapter" // פרק
  | "subchapter" // סימן
  | "section" // סעיף
  | "schedule" // תוספת
  | "preamble";

export interface HeadingPathNode {
  kind: StructuralKind;
  number: string | null; // e.g. "א'", "3"
  heading: string;
}

export interface SourceSpan {
  start: number; // char offset into the normalized text
  end: number;
}

export interface ParsedSubsection {
  marker: string; // "(א)", "(1)", ...
  text: string;
}

export interface ParsedSection {
  sectionNumber: string; // "1", "2", "1א", ...
  sectionLabel: string; // "סעיף 1"
  heading: string | null; // inline heading if present
  bodyText: string;
  headingPath: readonly HeadingPathNode[]; // enclosing chapter/subchapter
  ordinal: number; // 0-based order in the document
  subsections: readonly ParsedSubsection[];
  references: readonly string[]; // raw cross-reference strings found
  sectionType: "definitions" | "transitional" | "commencement" | "amendment" | "general";
  sourceSpan: SourceSpan;
  contentHash: string;
}

export interface ParsedLaw {
  lawTitle: string | null;
  hebrewYear: string | null; // "התש\"י-1950"
  sections: readonly ParsedSection[];
  scheduleCount: number;
}

const hash = (s: string): string => createHash("sha256").update(s.normalize("NFC")).digest("hex");

// ---- structural patterns -------------------------------------------------
// Section start: a number (optionally with a Hebrew-letter suffix like 1א) then
// a dot, at line start. Handles "1.", "12.", "1א.", "2 .".
const SECTION_RE = /^\s*(\d+[א-ת]{0,2})\s*\.\s+(.*)$/;
// Chapter: "פרק א'" / "פרק ראשון" (optionally ": heading")
const CHAPTER_RE = /^\s*פרק\s+([^\s:]+)\s*:?\s*(.*)$/;
// Subchapter: "סימן א'"
const SUBCHAPTER_RE = /^\s*סימן\s+([^\s:]+)\s*:?\s*(.*)$/;
// Schedule/appendix: "תוספת" / "תוספת ראשונה"
const SCHEDULE_RE = /^\s*תוספת(?:\s+[^\s:]+)?\s*:?\s*(.*)$/;
// Subsection markers at line start: (א) (ב) ... or (1) (2) ...
const SUBSECTION_RE = /^\s*\(([א-ת]{1,2}|\d{1,3})\)\s+(.*)$/;
// Law title line: "חוק ... , התש..-YYYY" or "פקודת ..."
const TITLE_RE = /^(?:\s*)((?:חוק|פקודת|תקנות)\s+.+?,\s*(הת[א-ת"׳]+-\d{4}))\s*$/;

// cross references
const REF_SECTION_RE = /סעיף(?:ים)?\s+\d+[א-ת]{0,2}/g;
const REF_LAW_RE = /(?:לפי|על\s+פי|בהתאם\s+ל)\s*(?:חוק|פקודת|תקנות)\s+[^,.\n]+/g;

function classifySection(heading: string | null, body: string): ParsedSection["sectionType"] {
  const h = (heading ?? "") + " " + body.slice(0, 60);
  if (/הגדרות/.test(h)) return "definitions";
  if (/הוראות\s+מעבר/.test(h)) return "transitional";
  if (/^\s*תחילה|תחילתו\s+של\s+חוק/.test(h)) return "commencement";
  if (/תיקון\s+(?:מס'|חוק)/.test(h)) return "amendment";
  return "general";
}

function extractRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const m of text.matchAll(REF_SECTION_RE)) refs.add(m[0].trim());
  for (const m of text.matchAll(REF_LAW_RE)) refs.add(m[0].trim().replace(/\s+/g, " "));
  return [...refs];
}

function splitSubsections(body: string): ParsedSubsection[] {
  const lines = body.split("\n");
  const subs: ParsedSubsection[] = [];
  let current: ParsedSubsection | null = null;
  for (const line of lines) {
    const m = line.match(SUBSECTION_RE);
    if (m) {
      if (current) subs.push(current);
      current = { marker: `(${m[1]})`, text: m[2].trim() };
    } else if (current) {
      current.text = `${current.text}\n${line}`.trim();
    }
  }
  if (current) subs.push(current);
  return subs;
}

/**
 * Parse a consolidated Hebrew statute. `normalizedText` should already be
 * NFC-normalized (use parser/hebrew-normalize). Returns ordered sections with
 * hierarchy, spans, and hashes.
 */
export function parseLegislation(normalizedText: string): ParsedLaw {
  const lines = normalizedText.split("\n");
  const offsets: number[] = [];
  {
    let o = 0;
    for (const l of lines) { offsets.push(o); o += l.length + 1; }
  }

  let lawTitle: string | null = null;
  let hebrewYear: string | null = null;
  const path: HeadingPathNode[] = []; // current chapter/subchapter stack
  let scheduleCount = 0;

  interface Pending { section: ParsedSection; bodyLines: string[]; startLine: number; }
  const out: ParsedSection[] = [];
  let pending: Pending | null = null;

  const flush = (endLine: number) => {
    if (!pending) return;
    const body = pending.bodyLines.join("\n").trim();
    const s = pending.section;
    s.bodyText = body;
    s.subsections = splitSubsections(body);
    s.references = extractRefs(body);
    s.sectionType = classifySection(s.heading, body);
    s.sourceSpan = { start: offsets[pending.startLine], end: offsets[Math.min(endLine, offsets.length - 1)] };
    s.contentHash = hash(`${s.sectionNumber}|${s.heading ?? ""}|${body}`);
    out.push(s);
    pending = null;
  };

  lines.forEach((line, i) => {
    if (!lawTitle) {
      const t = line.match(TITLE_RE);
      if (t) { lawTitle = t[1].trim(); hebrewYear = t[2]; return; }
    }
    const chap = line.match(CHAPTER_RE);
    const subchap = line.match(SUBCHAPTER_RE);
    const sched = line.match(SCHEDULE_RE);
    const sec = line.match(SECTION_RE);

    if (chap && !sec) {
      flush(i);
      // a chapter resets the subchapter level
      const idx = path.findIndex((p) => p.kind === "chapter");
      if (idx >= 0) path.length = idx;
      path.push({ kind: "chapter", number: chap[1], heading: chap[2].trim() });
      return;
    }
    if (subchap && !sec) {
      flush(i);
      const idx = path.findIndex((p) => p.kind === "subchapter");
      if (idx >= 0) path.length = idx;
      path.push({ kind: "subchapter", number: subchap[1], heading: subchap[2].trim() });
      return;
    }
    if (sched && !sec) {
      flush(i);
      scheduleCount += 1;
      path.length = 0;
      path.push({ kind: "schedule", number: null, heading: line.trim() });
      return;
    }
    if (sec) {
      flush(i);
      const number = sec[1];
      const rest = sec[2].trim();
      // heading heuristic: a short lead phrase ending with a period/colon before
      // the substantive text, common in Israeli statutes ("2. הגדרות.")
      let heading: string | null = null;
      let firstBody = rest;
      const hMatch = rest.match(/^([^.]{1,40})[.׃]\s+(.*)$/);
      if (hMatch && hMatch[1].split(/\s+/).length <= 6) { heading = hMatch[1].trim(); firstBody = hMatch[2]; }
      else if (rest.length <= 40 && !/[.,]/.test(rest)) { heading = rest; firstBody = ""; }
      pending = {
        section: {
          sectionNumber: number,
          sectionLabel: `סעיף ${number}`,
          heading,
          bodyText: "",
          headingPath: path.map((p) => ({ ...p })),
          ordinal: out.length,
          subsections: [],
          references: [],
          sectionType: "general",
          sourceSpan: { start: 0, end: 0 },
          contentHash: "",
        },
        bodyLines: firstBody ? [firstBody] : [],
        startLine: i,
      };
      return;
    }
    // continuation line
    if (pending) pending.bodyLines.push(line);
  });
  flush(lines.length - 1);

  return { lawTitle, hebrewYear, sections: out, scheduleCount };
}
