#!/usr/bin/env node
/**
 * Legislation ingest emitter (demonstration).
 *
 * Parses a Hebrew statute through the real section parser + chunker and emits
 * SQL to persist Section canonical entities + legal_chunks (with FTS) to dev.
 *
 * IMPORTANT: the input text here is a STRUCTURAL DEMONSTRATION statute, not an
 * authoritative law. Knesset OData exposes no full law text (KNS_DocumentIsraelLaw
 * is empty — see docs/ingestion/knesset-full-legislation-qualification.md), so
 * the authoritative corpus awaits the Knesset legislation-web collector. This
 * proves the Section→chunk→FTS→retrieval machinery on the real dev schema.
 */
import { parseLegislation } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-parser.ts";
import { chunkLaw } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-chunker.ts";
import { normalizeHebrewLegalText } from "../../src/modules/legal-ai-israel/parser/hebrew-normalize.ts";
import { createHash } from "node:crypto";

const LAW_ID = "Law:demo:privacy-structure-1";
const NOW = "2026-08-06T00:00:00.000Z";
const q = (s: string | null): string => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const jb = (o: unknown): string => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const hash = (s: string): string => createHash("sha256").update(s).digest("hex");

// Structural demonstration statute (NOT authoritative). Mirrors real Israeli
// statutory structure: title, chapters, sections, definitions, subsections.
const TEXT = `חוק הגנת הדוגמה (מבנה חקיקה לצורכי RAG), התשפ"ה-2025

פרק א': פרשנות

1. מטרה
מטרתו של חוק זה לקבוע מבנה חקיקה לדוגמה לצורך בדיקת שכבת האחזור המשפטית.

2. הגדרות.
בחוק זה -
(א) "אדם" - יחיד או תאגיד;
(ב) "רשות מוסמכת" - רשות שמונתה לפי סעיף 5.

פרק ב': סמכויות

5. מינוי רשות מוסמכת
השר ימנה רשות מוסמכת לביצוע חוק זה בהתאם להוראות פרק זה, ורשאי לקבוע את סמכויותיה.

6. הוראות מעבר
הוראות חוק זה יחולו גם על עניין שהיה תלוי ועומד ערב תחילתו של חוק זה.
`;

const sectionId = (n: string): string => `Section:law_section:${hash(`${LAW_ID}|${n}`).slice(0, 10)}`;

const law = parseLegislation(normalizeHebrewLegalText(TEXT).normalizedText);
const chunks = chunkLaw(law, { maxChars: 900, lawId: LAW_ID, documentVersionId: "dv1", sectionId: (s) => sectionId(s.sectionNumber) });

const src = "https://main.knesset.gov.il/Activity/Legislation/Laws (demonstration)";
const prov = { note: "structural demonstration statute — not authoritative", sourcePlatform: "knesset_legislation_web" };

// Section canonical entities
const secTuples = law.sections.map((s) => {
  const cid = sectionId(s.sectionNumber);
  const fields = {
    sectionNumber: s.sectionNumber, heading: s.heading, sectionType: s.sectionType,
    headingPath: s.headingPath.map((h) => `${h.kind}:${h.number ?? ""}:${h.heading}`),
    ordinal: s.ordinal, sectionLabel: s.sectionLabel,
    sourceSpanStart: s.sourceSpan.start, sourceSpanEnd: s.sourceSpan.end,
    lawCanonicalId: LAW_ID, valid_from: null, valid_to: null,
  };
  return `(${[
    q(cid), q("Section"), q("knesset_legislation_web"), q("knesset"), q("demo_law"), q("demo_law"),
    q(src), q(`${LAW_ID}:${s.sectionNumber}`), q(NOW), q(NOW), q("html"), q("legis-section-1"),
    q("legis-map-1"), "0.9", q(s.contentHash), q(hash(s.bodyText)), q("full_text"), "1", q("quarantined"),
    jb(fields), jb({}), jb({ non_authoritative_demo: true }), q(s.bodyText), q("he"), "false",
  ].join(",")})`;
});

// legal_chunks with FTS
const chunkTuples = chunks.map((c) =>
  `(${[q(LAW_ID), q(c.sectionId), q(c.documentVersionId), q(c.sectionNumber), q(c.headingPath),
     String(c.ordinal), String(c.chunkIndex), q(c.text), `to_tsvector('simple', ${q(c.text)})`,
     String(c.sourceSpanStart), String(c.sourceSpanEnd), String(c.tokenCount), q(c.contentHash),
     q("he"), q(src), q("non_authoritative_demo"), "false"].join(",")})`);

const sql = [
  "insert into legalai.canonical_entities (canonical_id,entity_type,source_platform,source_publisher,source_dataset,source_resource,source_url,external_record_id,first_seen_at,last_verified_at,extraction_method,parser_version,mapping_version,confidence,content_hash,raw_record_hash,content_level,version_number,version_status,fields,extracted_metadata,source_extras,primary_text,primary_text_language,tombstoned) values",
  secTuples.join(",\n"),
  "on conflict (canonical_id) do nothing;",
  "",
  "insert into legalai.legal_chunks (law_canonical_id,section_canonical_id,document_version_id,section_number,heading_path,ordinal,chunk_index,text,text_search,source_span_start,source_span_end,token_count,content_hash,language,source_url,license_status,published) values",
  chunkTuples.join(",\n"),
  "on conflict (section_canonical_id,chunk_index) do nothing;",
].join("\n");

process.stdout.write(sql + "\n");
process.stderr.write(`sections=${law.sections.length} chunks=${chunks.length}\n`);
void prov;
