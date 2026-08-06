#!/usr/bin/env node
/**
 * Run the REAL container parsers over live-extracted sample text and emit
 * idempotent SQL: Section entities (canonical_entities) + legal_chunks (gated,
 * published=false) for original enactments, and amendment_operations for
 * amendments. Demonstrates the full parse→persist path on real official text.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { normalizeHebrewLegalText } from "../../src/modules/legal-ai-israel/parser/hebrew-normalize.ts";
import { parseLegislation } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-parser.ts";
import { chunkLaw } from "../../src/modules/legal-ai-israel/ingestion/legislation/section-chunker.ts";
import { parseAmendmentOperations } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/amendment-operations.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const data = JSON.parse(readFileSync(join(here, "_extract-sample.json"), "utf8"));
const PARSER_VERSION = "legis-section-1+amendops-1";

const q = (s: unknown): string => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const hash10 = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 10);
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

const secTuples: string[] = [];
const chunkTuples: string[] = [];
const opTuples: string[] = [];
let sections = 0, chunks = 0;
const ops = { parsed: 0, needs_review: 0, unsupported: 0 };

for (const s of data.samples) {
  const norm = normalizeHebrewLegalText(s.text).normalizedText;
  const lawCid = `knesset:${s.lawId}`;
  if (s.kind === "original_enactment") {
    const law = parseLegislation(norm);
    const secId = (n: string) => `Section:knesset:${s.lawId}:${hash10(n)}`;
    for (const sec of law.sections) {
      sections += 1;
      const cid = secId(sec.sectionNumber);
      const fields = { sectionNumber: sec.sectionNumber, heading: sec.heading, sectionType: sec.sectionType, ordinal: sec.ordinal, lawCanonicalId: lawCid, publicationCanonicalId: `knesset:publication:${s.pubId}` };
      secTuples.push(`(${[
        q(cid), q("Section"), q("knesset_legislation_pdf"), q("knesset"), q("sefer_hachukim"), q(s.pubId),
        q(`https://fs.knesset.gov.il (pub ${s.pubId})`), q(`${lawCid}:${sec.sectionNumber}`), q("file_parse"),
        q("legis-section-1"), q("legis-pub-map-1"), "0.9", q(sec.contentHash), q(sha(sec.bodyText)),
        q("full_text"), "1", q("validated"), `'${JSON.stringify(fields).replace(/'/g, "''")}'::jsonb`, "'{}'::jsonb",
        `'${JSON.stringify({ source: "official_pdf_extraction" }).replace(/'/g, "''")}'::jsonb`, q(sec.bodyText), q("he"), "false",
      ].join(",")})`);
    }
    const cks = chunkLaw(law, { maxChars: 900, lawId: lawCid, documentVersionId: `pub:${s.pubId}`, sectionId: (sec) => secId(sec.sectionNumber) });
    for (const c of cks) {
      chunks += 1;
      chunkTuples.push(`(${[q(lawCid), q(c.sectionId), q(c.documentVersionId), q(c.sectionNumber), q(c.headingPath),
        String(c.ordinal), String(c.chunkIndex), q(c.text), `to_tsvector('simple', ${q(c.text)})`,
        String(c.sourceSpanStart), String(c.sourceSpanEnd), String(c.tokenCount), q(c.contentHash),
        q("he"), q(`https://fs.knesset.gov.il (pub ${s.pubId})`), q("statutory_exemption_sec6"), "false"].join(",")})`);
    }
  } else {
    const parsed = parseAmendmentOperations(norm);
    for (const op of parsed) {
      ops[op.status] += 1;
      opTuples.push(`(${[q(`knesset:publication:${s.pubId}`), q(`knesset:${s.lawId}`), q(op.targetSection),
        q(op.opType), q(op.status), op.confidence.toFixed(2), q(op.evidence),
        String(op.sourceSpan.start), String(op.sourceSpan.end), q(PARSER_VERSION)].join(",")})`);
    }
  }
}

const sql: string[] = [];
if (secTuples.length) {
  sql.push("insert into legalai.canonical_entities (canonical_id,entity_type,source_platform,source_publisher,source_dataset,source_resource,source_url,external_record_id,extraction_method,parser_version,mapping_version,confidence,content_hash,raw_record_hash,content_level,version_number,version_status,fields,extracted_metadata,source_extras,primary_text,primary_text_language,tombstoned) values",
    secTuples.join(",\n"), "on conflict (canonical_id) do nothing;", "");
}
if (chunkTuples.length) {
  sql.push("insert into legalai.legal_chunks (law_canonical_id,section_canonical_id,document_version_id,section_number,heading_path,ordinal,chunk_index,text,text_search,source_span_start,source_span_end,token_count,content_hash,language,source_url,license_status,published) values",
    chunkTuples.join(",\n"), "on conflict (section_canonical_id,chunk_index) do nothing;", "");
}
if (opTuples.length) {
  sql.push("insert into legalai.amendment_operations (publication_canonical_id,target_law_id,target_section,operation_type,status,confidence,evidence,source_span_start,source_span_end,parser_version) values",
    opTuples.join(",\n"), "on conflict (publication_canonical_id,source_span_start,operation_type) do nothing;");
}

process.stdout.write(sql.join("\n") + "\n");
process.stderr.write(`sections=${sections} chunks=${chunks} ops=${JSON.stringify(ops)}\n`);
void root;
