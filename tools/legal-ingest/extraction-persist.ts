#!/usr/bin/env node
/**
 * Emit an idempotent UPDATE to write live PDF fetch + extraction results onto
 * legalai.law_publications (Epic steps 4-5, 8). Sets the SHA-256 (binary),
 * size/content-type/fetched_at, page count, extraction method/version/
 * confidence, ocr_used, raw_text_hash, content_level=full_text. Low-coverage
 * documents (< 0.8 text-layer coverage) are marked version_status='quarantined'
 * (not published); the rest 'validated'. Deterministic → re-run is a no-op.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "_pdf-extraction-2026-08-06.json"), "utf8"));
const QUARANTINE_BELOW = 0.8;

const rows: string[] = data.rows.map((r: [string, string, string, number, number, number, number, number]) => {
  const [pid, sha, textHash, size, pages, , coverage] = r;
  const status = coverage < QUARANTINE_BELOW ? "quarantined" : "validated";
  return `('knesset:publication:${pid}','${sha}','${textHash}',${size},${pages},${coverage},'${status}')`;
});

const sql = `update legalai.law_publications p set
  pdf_sha256 = v.sha,
  pdf_size_bytes = v.size,
  pdf_content_type = 'application/pdf',
  pdf_fetched_at = now(),
  page_count = v.pages,
  extraction_method = '${data.extraction_method}',
  extraction_version = '${data.extraction_version}',
  extraction_confidence = v.coverage,
  ocr_used = false,
  raw_text_hash = v.text_hash,
  content_level = 'full_text',
  version_status = v.status,
  last_verified_at = now(),
  provenance = jsonb_set(p.provenance, '{extraction}', jsonb_build_object('method','${data.extraction_method}','version','${data.extraction_version}','coverage',v.coverage,'fetched_at','${data.extracted_at}'))
from (values
${rows.join(",\n")}
) as v(pub_id, sha, text_hash, size, pages, coverage, status)
where p.publication_canonical_id = v.pub_id;`;

process.stdout.write(sql + "\n");
process.stderr.write(`updates=${rows.length}\n`);
