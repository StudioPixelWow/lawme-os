/**
 * Fixture seeding CLI — `npm run legal:fixtures:seed:dev` (Epic 2, Phase 9).
 *
 * SAFETY GATES (all mandatory):
 *  1. explicit environment assertion: LAWME_SEED_ENV=development
 *  2. SUPABASE_URL must contain the approved dev ref (production REFUSED)
 *  3. SUPABASE_SECRET_KEY must be present (server-side only, never printed)
 *  4. idempotent: deterministic UUIDs + upserts — re-running is a no-op
 *  5. never prints secrets; never labels fixtures as verified/official
 *
 * `--emit-sql <dir>` mode: writes idempotent SQL batches instead of
 * executing (used to seed through a reviewed SQL channel, e.g. MCP).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildSeedRows, SEED_PARSER_VERSION } from "./fixture-rows.ts";
import { APPROVED_DEV_PROJECT_REF, createRepositories } from "../repositories/index.ts";
import type { Repositories } from "../repositories/types.ts";

const sq = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const js = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

export async function emitSeedSql(dir: string): Promise<string[]> {
  const rows = await buildSeedRows();
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const write = (name: string, sql: string) => {
    const p = path.join(dir, name);
    writeFileSync(p, sql);
    files.push(p);
  };

  write("seed-01-sources-documents.sql", [
    "-- LawME POC fixture seed 1/4 — sources + documents (idempotent)",
    ...rows.sources.map((s) =>
      `insert into public.legal_sources (id, registry_code, name_en, name_he, url, category, trust_tier, priority, rag_permission, access_policy, is_active)\n` +
      `values ('${s.id}', ${sq(s.registryCode)}, ${sq(s.nameEn)}, ${sq(s.nameHe)}, ${sq(s.url)}, ${sq(s.category)}, ${s.trustTier}, ${sq(s.priority)}, ${sq(s.ragPermission)}, ${sq(s.accessPolicy)}, ${s.isActive})\n` +
      `on conflict (registry_code) do update set name_en = excluded.name_en, notes = 'POC fixture channel';`),
    ...rows.documents.map((d) =>
      `insert into public.legal_documents (id, organization_id, source_id, document_type, authority_type, verification_status, title, title_he, case_number_raw, case_number_normalized, procedure_code, court, legal_domains, document_date, version_date, effective_date, language, canonical_source_url, license_status, storage_policy, latest_version)\n` +
      `values ('${d.id}', null, '${d.sourceId}', ${sq(d.documentType)}, ${sq(d.authorityType)}, ${sq(d.verificationStatus)}, ${sq(d.title)}, ${sq(d.titleHe)}, ${sq(d.caseNumberRaw)}, ${sq(d.caseNumberNormalized)}, ${sq(d.procedureCode)}, ${sq(d.court)}, ${js(d.legalDomains)}, ${sq(d.documentDate)}, ${sq(d.versionDate)}, ${sq(d.effectiveDate)}, ${sq(d.language)}, ${sq(d.canonicalSourceUrl)}, 'synthetic_fixture', 'store_full', 1)\n` +
      `on conflict (id) do update set title = excluded.title, legal_domains = excluded.legal_domains;`),
    ...rows.versions.map((v) =>
      `insert into public.legal_document_versions (id, document_id, version, content_hash, parser_version)\n` +
      `values ('${v.id}', '${v.documentId}', ${v.version}, ${sq(v.contentHash)}, ${sq(v.parserVersion)})\n` +
      `on conflict (id) do update set content_hash = excluded.content_hash, parser_version = excluded.parser_version;`),
  ].join("\n\n"));

  write("seed-02-text.sql", [
    "-- LawME POC fixture seed 2/4 — extracted text (idempotent)",
    ...rows.texts.map((t) =>
      `insert into public.legal_document_text (version_id, extracted_text, normalized_text, extraction_method, extraction_confidence, ocr_status, language, warnings)\n` +
      `values ('${t.versionId}', ${sq(t.extractedText)}, ${sq(t.normalizedText)}, ${sq(t.extractionMethod)}, ${t.extractionConfidence}, ${sq(t.ocrStatus)}, ${sq(t.language)}, ${js(t.warnings)})\n` +
      `on conflict (version_id) do update set normalized_text = excluded.normalized_text, extraction_method = excluded.extraction_method;`),
  ].join("\n\n"));

  write("seed-03-sections-fetches.sql", [
    "-- LawME POC fixture seed 3/4 — sections (anchors) + fetch provenance (idempotent)",
    ...rows.sections.map((s) =>
      `insert into public.legal_document_sections (id, version_id, section_index, kind, anchor_key, heading_path, page_number, char_start, char_end, content)\n` +
      `values ('${s.id}', '${s.versionId}', ${s.sectionIndex}, ${sq(s.kind)}, ${sq(s.anchorKey)}, ${sq(s.headingPath)}, ${s.pageNumber ?? "null"}, ${s.charStart}, ${s.charEnd}, ${sq(s.content)})\n` +
      `on conflict (version_id, anchor_key) do update set content = excluded.content, char_start = excluded.char_start, char_end = excluded.char_end;`),
    ...rows.fetches.map((f) =>
      `insert into public.legal_source_fetches (id, source_id, document_id, url, http_status, content_type, sha256, outcome, retrieval_method, parser_version)\n` +
      `values ('${f.id}', '${f.sourceId}', '${f.documentId}', ${sq(f.url)}, null, 'text/html', ${sq(f.sha256)}, 'fixture', 'fixture', ${sq(f.parserVersion)})\n` +
      `on conflict (id) do nothing;`),
  ].join("\n\n"));

  // embeddings are the bulkiest — split into their own file(s)
  const embStatements = rows.embeddings.map((e) =>
    `insert into public.legal_embeddings (version_id, chunk_index, anchor_key, model, model_version, dims, embedding, embedding_norm)\n` +
    `values ('${e.versionId}', ${e.chunkIndex}, ${sq(e.anchorKey)}, ${sq(e.model)}, ${sq(e.modelVersion)}, ${e.dims}, '[${e.values.join(",")}]'::extensions.vector, ${e.norm})\n` +
    `on conflict (version_id, model, model_version, chunk_index) do update set embedding = excluded.embedding, status = 'current';`);
  const half = Math.ceil(embStatements.length / 2);
  write("seed-04a-embeddings.sql", ["-- LawME POC fixture seed 4a/4 — mock embeddings (idempotent)", ...embStatements.slice(0, half)].join("\n\n"));
  write("seed-04b-embeddings.sql", ["-- LawME POC fixture seed 4b/4 — mock embeddings (idempotent)", ...embStatements.slice(half)].join("\n\n"));

  write("seed-05-audit.sql", [
    "-- LawME POC fixture seed 5 — audit record of the seeding action",
    `insert into public.audit_events (organization_id, actor, actor_role, event_type, object_type, object_id, payload)\n` +
    `values (null, null, 'service', 'poc_fixtures.seeded', 'legal_documents', null, ${js({ documents: rows.documents.length, sections: rows.sections.length, embeddings: rows.embeddings.length, parserVersion: SEED_PARSER_VERSION, synthetic: true })});`,
  ].join("\n\n"));

  return files;
}

export async function seedThroughRepositories(repos: Repositories): Promise<{ documents: number; sections: number; embeddings: number }> {
  const rows = await buildSeedRows();
  const ctx = { organizationId: null, actorProfileId: null, correlationId: `seed-${SEED_PARSER_VERSION}` };

  for (const s of rows.sources) {
    const r = await repos.sources.upsertSourceAsIngestionService(s, ctx);
    if (!r.ok) throw new Error(`seed source failed: ${r.error.detail ?? r.error.message}`);
  }
  const sourceIdByCode = new Map<string, string>();
  for (const s of rows.sources) {
    const got = await repos.sources.getSourceByRegistryCode(s.registryCode);
    if (got.ok) sourceIdByCode.set(s.registryCode, got.data.id);
  }
  for (const d of rows.documents) {
    const src = sourceIdByCode.get("LSR-038");
    const r = await repos.documents.createCanonicalDocument({ ...d, sourceId: src ?? d.sourceId }, ctx);
    if (!r.ok && r.error.code !== "conflict") throw new Error(`seed doc failed: ${r.error.detail ?? r.error.message}`);
  }
  for (const v of rows.versions) {
    const r = await repos.documents.createDocumentVersion(v, ctx);
    if (!r.ok && r.error.code !== "conflict") throw new Error(`seed version failed: ${r.error.detail ?? r.error.message}`);
  }
  for (const t of rows.texts) {
    const r = await repos.documents.saveExtractedText(t, ctx);
    if (!r.ok) throw new Error(`seed text failed: ${r.error.detail ?? r.error.message}`);
  }
  const byVersion = new Map<string, typeof rows.sections>();
  for (const s of rows.sections) {
    const list = byVersion.get(s.versionId) ?? [];
    list.push(s);
    byVersion.set(s.versionId, list);
  }
  let sections = 0;
  for (const [versionId, list] of byVersion) {
    const r = await repos.documents.saveSections(versionId, list, ctx);
    if (!r.ok) throw new Error(`seed sections failed: ${r.error.detail ?? r.error.message}`);
    sections += r.ok ? r.data : 0;
  }
  const embByVersion = new Map<string, typeof rows.embeddings>();
  for (const e of rows.embeddings) {
    const list = embByVersion.get(e.versionId) ?? [];
    list.push(e);
    embByVersion.set(e.versionId, list);
  }
  let embeddings = 0;
  for (const [versionId, list] of embByVersion) {
    const r = await repos.documents.saveEmbeddings(versionId, list, ctx);
    if (!r.ok) throw new Error(`seed embeddings failed: ${r.error.detail ?? r.error.message}`);
    embeddings += list.length;
  }
  await repos.audit.appendAuditEvent({
    organizationId: null, actor: null, actorRole: "service",
    eventType: "poc_fixtures.seeded", objectType: "legal_documents", objectId: null,
    payload: { documents: rows.documents.length, sections, embeddings, parserVersion: SEED_PARSER_VERSION, synthetic: true },
  }, ctx);

  return { documents: rows.documents.length, sections, embeddings };
}

/* ── CLI ── */
const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  (async () => {
    const emitIdx = process.argv.indexOf("--emit-sql");
    if (emitIdx > -1) {
      const dir = process.argv[emitIdx + 1] ?? ".poc-runs/seed-sql";
      const files = await emitSeedSql(dir);
      console.log(`emitted ${files.length} idempotent SQL files:`);
      files.forEach((f) => console.log("  " + f));
      return;
    }

    // GATE 1: explicit environment assertion
    if (process.env.LAWME_SEED_ENV !== "development") {
      console.error("REFUSED: set LAWME_SEED_ENV=development to confirm the target environment.");
      process.exit(2);
    }
    // GATE 2+3: dev project only + secret present (value never printed)
    const url = process.env.SUPABASE_URL ?? "";
    if (!url.includes(APPROVED_DEV_PROJECT_REF)) {
      console.error(`REFUSED: SUPABASE_URL must point at the approved development project (${APPROVED_DEV_PROJECT_REF}).`);
      process.exit(2);
    }
    if (!process.env.SUPABASE_SECRET_KEY) {
      console.error("REFUSED: SUPABASE_SECRET_KEY is not set (server-side env only — never commit it).");
      process.exit(2);
    }

    const repos = createRepositories();
    if (repos.kind !== "supabase") {
      console.error("REFUSED: repositories did not initialize in supabase mode.");
      process.exit(2);
    }
    const result = await seedThroughRepositories(repos);
    console.log(`seeded (idempotent): ${result.documents} documents, ${result.sections} sections, ${result.embeddings} embeddings`);
  })().catch((e) => {
    console.error("seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
