import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { validateManifest, canonicalIdFor, hostOf } from "../manifest.ts";
import type { ImportManifest } from "../manifest.ts";
import { StatuteImportAdapter } from "../../adapters/import/adapter.ts";
import { runIngest } from "../ingest-command.ts";

const FIX = path.join(process.cwd(), "src", "modules", "legal-knowledge", "ingestion", "import", "fixtures");

const goodEntry = {
  sourceId: "X1", documentType: "legislation" as const, titleHe: "חוק בדיקה",
  file: "sample-statute.txt", contentType: "text/plain" as const, publisherHe: "כנסת",
  canonicalSourceUrl: "https://main.knesset.gov.il/x", fullTextDecision: "allow_full_text_dev_poc" as const,
  legalTopic: "severance", versionState: "current" as const,
};

test("manifest host allowlist rejects unknown hosts", () => {
  const m: ImportManifest = { manifestVersion: "1", createdBy: "t", entries: [{ ...goodEntry, canonicalSourceUrl: "https://evil.example.com/x" }] };
  const r = validateManifest(m);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.messageHe.includes("רשימת ההיתר")));
});

test("full-text decision requires primary-law type", () => {
  const m: ImportManifest = { manifestVersion: "1", createdBy: "t", entries: [{ ...goodEntry, documentType: "guidance" }] };
  assert.equal(validateManifest(m).valid, false);
});

test("secondary source may never be full text", () => {
  const m: ImportManifest = { manifestVersion: "1", createdBy: "t", entries: [{ ...goodEntry, documentType: "secondary", publisherHe: "כל זכות", file: undefined }] };
  assert.equal(validateManifest(m).valid, false);
});

test("duplicate source ids are rejected", () => {
  const m: ImportManifest = { manifestVersion: "1", createdBy: "t", entries: [goodEntry, goodEntry] };
  assert.ok(validateManifest(m).errors.some((e) => e.messageHe.includes("כפול")));
});

test("hostOf parses hosts", () => {
  assert.equal(hostOf("https://www.gov.il/he/x"), "www.gov.il");
});

test("canonicalId is stable and version-aware", () => {
  const a = canonicalIdFor({ ...goodEntry, titleHe: "חוק פיצויי פיטורים, התשכ\"ג-1963" });
  const b = canonicalIdFor({ ...goodEntry, titleHe: "חוק פיצויי פיטורים" });
  assert.equal(a, b);
  const hist = canonicalIdFor({ ...goodEntry, versionState: "historical", effectiveDate: "1990-01-01" });
  assert.ok(hist.includes("@1990-01-01"));
});

test("import adapter: full-text statute produces real sections, no synthetic marker", async () => {
  const adapter = new StatuteImportAdapter(goodEntry, FIX);
  const [item] = await adapter.discover();
  const res = await adapter.mapToUnifiedSchema(item);
  assert.equal(res.doc.isSynthetic, false);
  assert.equal(res.doc.storagePolicy, "store_full");
  assert.equal(res.doc.verificationStatus, "verified_primary");
  assert.equal(res.doc.licenseStatus, "public_domain_official");
  assert.ok(res.sections.length >= 3, `expected sections, got ${res.sections.length}`);
  // anchors valid: content length equals char range
  for (const s of res.sections) assert.equal(s.content.length, s.charEnd - s.charStart);
});

test("import adapter: guidance is metadata-only (no body)", async () => {
  const g = { ...goodEntry, sourceId: "G1", documentType: "guidance" as const, fullTextDecision: "allow_metadata_only" as const, file: undefined };
  const adapter = new StatuteImportAdapter(g, FIX);
  const [item] = await adapter.discover();
  const res = await adapter.mapToUnifiedSchema(item);
  assert.equal(res.doc.rawContent, null);
  assert.equal(res.sections.length, 0);
  assert.equal(res.doc.storagePolicy, "store_extract");
});

test("ingest command dry-run over the fixture manifest classifies correctly", async () => {
  const r = await runIngest({ manifestDir: FIX, dryRun: true, metadataOnly: false, maxDocs: 100, write: false });
  assert.equal(r.mode, "dry_run");
  assert.equal(r.manifestValid, true, JSON.stringify(r.refusals));
  assert.equal(r.totals.entries, 3);
  assert.equal(r.totals.fullText, 1);
  assert.equal(r.totals.metadataOnly, 1);
  assert.equal(r.totals.pointerOnly, 1);
  assert.ok(r.totals.sectionsGenerated >= 3);
  assert.equal(r.wrote, false);
});

test("ingest command refuses when count exceeds max", async () => {
  const r = await runIngest({ manifestDir: FIX, dryRun: true, metadataOnly: false, maxDocs: 1, write: false });
  assert.ok(r.refusals.some((x) => x.includes("exceeds max")));
});

test("ingest command --write refuses without development env + dev project ref", async () => {
  const r = await runIngest({ manifestDir: FIX, dryRun: false, metadataOnly: false, maxDocs: 100, write: true, env: { APP_ENV: "production", SUPABASE_URL: "https://prod.supabase.co" } });
  assert.ok(r.refusals.some((x) => x.includes("APP_ENV")));
  assert.ok(r.refusals.some((x) => x.toLowerCase().includes("dev project") || x.includes("production")));
  assert.equal(r.wrote, false);
});

test("metadata-only mode downgrades full-text entries", async () => {
  const r = await runIngest({ manifestDir: FIX, dryRun: true, metadataOnly: true, maxDocs: 100, write: false });
  assert.equal(r.totals.fullText, 0);
  assert.equal(r.totals.metadataOnly, 2); // statute downgraded + guidance
});
