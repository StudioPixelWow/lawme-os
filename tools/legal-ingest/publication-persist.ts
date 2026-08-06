#!/usr/bin/env node
/**
 * Emit idempotent SQL to persist the official publication pilot to dev:
 *   - Law entities        → legalai.canonical_entities (entity_type='Law', metadata_only)
 *   - Publication rows     → legalai.law_publications
 *   - Amendment-graph edges→ legalai.law_publication_edges
 *
 * ON CONFLICT DO NOTHING everywhere → re-running is a no-op (idempotency).
 * Publications are NEVER marked published and consolidation_status stays
 * 'non_consolidated_publication'. Writes SQL to stdout for review + MCP exec.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const pilot = JSON.parse(readFileSync(join(root, "artifacts", "knesset-official-publication-pilot.json"), "utf8"));
const rawData = JSON.parse(readFileSync(join(here, "_publication-pilot-data.json"), "utf8"));
const openBookById = new Map<number, boolean>(rawData.laws.map((l: { id: number; openBook: boolean }) => [l.id, l.openBook]));

const q = (s: unknown): string => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const d = (s: unknown): string => (s ? `'${String(s)}'::date` : "NULL");

const lawRows: string[] = [];
const pubRows: string[] = [];
const edgeRows: string[] = [];

for (const law of pilot.laws) {
  const ob = openBookById.get(law.israelLawId) === true;
  lawRows.push(
    `(${[
      q(law.canonicalId), q("Law"), q("knesset_legislation_api"), q("knesset"),
      q("GetLegislationLawItem"), q(String(law.israelLawId)),
      q(`https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/GetLegislationLawItem?ItemId=${law.israelLawId}`),
      q(String(law.israelLawId)), q("api"), q("legis-pub-1"), q("legis-pub-map-1"),
      "0.95", q(law.canonicalId), q(law.canonicalId), q("metadata_only"), "1", q("validated"),
      `'${JSON.stringify({ title: law.title, validity: law.validity, hasOpenBookConsolidation: law.hasOpenBookConsolidation, hasOfficialConsolidation: false }).replace(/'/g, "''")}'::jsonb`,
      `'{}'::jsonb`, `'${JSON.stringify({ openBook: ob }).replace(/'/g, "''")}'::jsonb`,
      q(law.title), q("he"), "false",
    ].join(",")})`,
  );

  for (const doc of law.documents) {
    const ob2 = ob ? "community_consolidated" : "none";
    pubRows.push(
      `(${[
        q(doc.canonicalId), q(doc.lawCanonicalId), q(String(doc.israelLawId)), q(doc.itemId),
        q(doc.amendmentEventId), q(doc.docType), q(doc.correctionNumber), q(doc.correctionType),
        q(doc.title), q(doc.publicationSeries), q(doc.magazineNumber), q(doc.pageNumber),
        d(doc.publicationDate), String(doc.chainIndex), q(doc.pdfUrl),
        q(doc.contentLevel), q(doc.consolidationStatus), q(doc.authorityLevel),
        q("unknown"), q(ob2), q("statutory_exemption_sec6"), q("validated"), "false",
        q(doc.pdfUrl),
      ].join(",")})`,
    );
  }
  for (const e of law.relationships) {
    edgeRows.push(`(${[q(e.type), q(e.from), q(e.to), q(e.evidence)].join(",")})`);
  }
}

const sql = [
  "insert into legalai.canonical_entities (canonical_id,entity_type,source_platform,source_publisher,source_dataset,source_resource,source_url,external_record_id,extraction_method,parser_version,mapping_version,confidence,content_hash,raw_record_hash,content_level,version_number,version_status,fields,extracted_metadata,source_extras,primary_text,primary_text_language,tombstoned) values",
  lawRows.join(",\n"),
  "on conflict (canonical_id) do nothing;",
  "",
  "insert into legalai.law_publications (publication_canonical_id,law_canonical_id,israel_law_id,publication_item_id,amendment_event_id,publication_type,correction_number,correction_type,title,publication_series,publication_number,publication_page,publication_date,chain_index,pdf_url,content_level,consolidation_status,authority_level,effective_date_status,openbook_status,license_basis,version_status,published,source_url) values",
  pubRows.join(",\n"),
  "on conflict (publication_canonical_id) do nothing;",
  "",
  "insert into legalai.law_publication_edges (edge_type,from_id,to_id,evidence) values",
  edgeRows.join(",\n"),
  "on conflict (edge_type,from_id,to_id) do nothing;",
].join("\n");

process.stdout.write(sql + "\n");
process.stderr.write(`laws=${lawRows.length} publications=${pubRows.length} edges=${edgeRows.length}\n`);
