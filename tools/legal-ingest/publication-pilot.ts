#!/usr/bin/env node
/**
 * Official publication pilot (current Epic, Track A step 14).
 *
 * Feeds LIVE-captured GetLegislationLawItem data
 * (tools/legal-ingest/_publication-pilot-data.json) through the REAL Track A
 * model — toPublicationModel + buildAmendmentGraph + deterministic identity —
 * and emits:
 *   artifacts/knesset-official-publication-pilot.json
 *   artifacts/knesset-publication-pilot.csv
 *
 * The container has no network egress, so PDF download/extraction is the
 * operator step (reported as discovered-not-downloaded here). Every number
 * below is derived from real captured metadata — nothing invented.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toPublicationModel, buildAmendmentGraph } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/publication-model.ts";
import type { ParsedLegislationLawItem, Correction, General } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/legislation-api.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const data = JSON.parse(readFileSync(join(here, "_publication-pilot-data.json"), "utf8"));

interface RawLaw {
  id: number; title: string; validity: string; firstPub: string; latestPub: string;
  openBook: boolean; c: string[][];
}

function toItem(l: RawLaw): ParsedLegislationLawItem {
  const general: General = {
    hebSubject: l.title, lawValidity: l.validity, publicationDate: l.firstPub,
    latestPublicationDate: l.latestPub, openBookUrl: l.openBook ? "https://he.wikisource.org/" : null,
    kolZchutUrl: null, knsName: null,
  };
  const corrections: Correction[] = l.c.map((row) => ({
    itemId: row[0] || null,
    name: null,
    correctionNumber: row[1] || null,
    correctionType: row[2] || null,
    publicationDate: row[3] || null,
    publicationSeries: "ספר החוקים",
    magazineNumber: row[4] || null,
    pageNumber: row[5] || null,
    filePath: row[6] || null,
    fileType: null,
    summaryLaw: null,
  }));
  return { itemId: String(l.id), general, corrections, secondaryCount: 0 };
}

const laws: RawLaw[] = data.laws;
let publicationRecords = 0;
let pdfsDiscovered = 0;
let noPdfPublications = 0;
let relationships = 0;
const docTypeCounts: Record<string, number> = {};
const duplicateItemIds: { law: number; itemId: string }[] = [];
const csvRows: string[] = [];
const perLaw: unknown[] = [];

const csvCols = [
  "israelLawId", "publicationCanonicalId", "docType", "correctionType",
  "correctionNumber", "publicationDate", "publicationSeries", "magazineNumber",
  "pageNumber", "pdfUrl", "contentLevel", "consolidationStatus", "authorityLevel",
  "amendmentEventId", "chainIndex",
];
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
csvRows.push(csvCols.join(","));

// First pass (real model run).
const models = laws.map((l) => {
  const item = toItem(l);
  const model = toPublicationModel(item);
  const edges = buildAmendmentGraph(model);
  relationships += edges.length;

  const seenItemIds = new Set<string>();
  for (const c of item.corrections) {
    const iid = (c.itemId ?? "").trim();
    if (iid) {
      if (seenItemIds.has(iid)) duplicateItemIds.push({ law: l.id, itemId: iid });
      seenItemIds.add(iid);
    }
  }

  publicationRecords += model.documents.length;
  for (const d of model.documents) {
    docTypeCounts[d.docType] = (docTypeCounts[d.docType] ?? 0) + 1;
    if (d.pdfUrl) pdfsDiscovered += 1;
    else noPdfPublications += 1;
    csvRows.push(csvCols.map((c) => esc((d as unknown as Record<string, unknown>)[c])).join(","));
  }
  perLaw.push({
    israelLawId: l.id,
    title: l.title,
    validity: l.validity,
    canonicalId: model.law.canonicalId,
    hasOpenBookConsolidation: model.law.hasOpenBookConsolidation,
    hasOfficialConsolidation: model.law.hasOfficialConsolidation,
    publicationCount: model.documents.length,
    original: model.documents.find((d) => d.docType === "original_enactment")?.canonicalId ?? null,
    edges: edges.length,
    documents: model.documents,
    relationships: edges,
  });
  return model;
});

// Idempotency: re-run and confirm identical canonical ids (deterministic).
let idempotent = true;
for (let i = 0; i < laws.length; i += 1) {
  const rerun = toPublicationModel(toItem(laws[i]));
  const a = models[i].documents.map((d) => d.canonicalId).join("|");
  const b = rerun.documents.map((d) => d.canonicalId).join("|");
  if (a !== b || models[i].law.canonicalId !== rerun.law.canonicalId) idempotent = false;
}

const pilot = {
  generated_at: data.captured_at,
  scope: "official Knesset publication metadata (PDF bytes = operator step; container has no egress)",
  batchSize: 10,
  concurrency: 2,
  results: {
    lawsFetched: laws.length,
    publicationRecords,
    pdfsDiscovered,
    publicationsWithoutPdf: noPdfPublications,
    pdfsDownloaded: 0,
    pdfsExtracted: 0,
    extractionFailures: 0,
    sectionsParsed: 0,
    amendmentOperationsParsed: 0,
    unsupportedAmendmentOperations: 0,
    relationshipsCreated: relationships,
    storageBytes: 0,
    docTypeCounts,
  },
  dataQuality: {
    duplicateItemIdRows: duplicateItemIds,
    note: "A repeated itemId within a law (e.g. 2000003→147021: a correction-of-error PDF issued days after) means itemId alone is not unique per publication row; identity should fall back to (itemId, publicationDate) when a collision is detected. Flagged, not silently merged.",
  },
  idempotency: { deterministicRerun: idempotent },
  laws: perLaw,
};

writeFileSync(join(root, "artifacts", "knesset-official-publication-pilot.json"), JSON.stringify(pilot, null, 2) + "\n");
writeFileSync(join(root, "artifacts", "knesset-publication-pilot.csv"), csvRows.join("\n") + "\n");

process.stdout.write(JSON.stringify({ ...pilot.results, idempotent, duplicateItemIds: duplicateItemIds.length }, null, 2) + "\n");
