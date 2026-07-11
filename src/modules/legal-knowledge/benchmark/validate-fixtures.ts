/**
 * Fixture + source-registry validation CLI (npm run legal:fixtures:validate /
 * legal:sources:validate). Local files only; exits non-zero on any failure.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { SupremeDecisionsAdapter } from "../ingestion/adapters/supreme-decisions/adapter.ts";

async function validateFixtures(): Promise<number> {
  const adapter = new SupremeDecisionsAdapter();
  const items = await adapter.discover();
  let failures = 0;
  for (const item of items) {
    const { doc, validation } = await adapter.mapToUnifiedSchema(item);
    const flags: string[] = [];
    if (!validation.valid) flags.push(...validation.errors);
    if (!doc.isSynthetic) flags.push("not marked synthetic");
    if (!doc.provenance.isFixture) flags.push("not marked fixture");
    if (flags.length) {
      failures++;
      console.log(`✗ ${item.externalId}: ${flags.join("; ")}`);
    } else {
      console.log(`✓ ${item.externalId} (${doc.documentType}) warnings=${validation.warnings.length}`);
    }
  }
  console.log(`fixtures: ${items.length - failures}/${items.length} valid`);
  return failures;
}

function validateSourceRegistry(): number {
  const p = path.join(process.cwd(), "docs", "legal-knowledge", "LAWME_LEGAL_SOURCE_REGISTRY.records.json");
  const records = JSON.parse(readFileSync(p, "utf8")) as Array<Record<string, unknown>>;
  let failures = 0;
  const ids = new Set<string>();
  for (const r of records) {
    const id = String(r.source_id ?? "");
    const flags: string[] = [];
    if (!/^LSR-\d{3}$/.test(id)) flags.push("bad source_id");
    if (ids.has(id)) flags.push("duplicate source_id");
    ids.add(id);
    if (!r.name_en) flags.push("missing name_en");
    if (!r.url) flags.push("missing url");
    if (!["P0","P1","P2","P3","Restricted","License-needed","Research-only"].includes(String(r.priority_recommendation))) flags.push("bad priority");
    if (!["confirmed","open_license","requires_permission","restricted","unknown"].includes(String(r.rag_permission))) flags.push(`bad rag_permission: ${r.rag_permission}`);
    if (!["url_opened","partial","search_result_only"].includes(String(r.verified))) flags.push("bad verified");
    if (flags.length) { failures++; console.log(`✗ ${id}: ${flags.join("; ")}`); }
  }
  console.log(`source registry: ${records.length - failures}/${records.length} records valid`);
  return failures;
}

const mode = process.argv[2] ?? "fixtures";
if (mode === "fixtures") {
  validateFixtures().then((f) => process.exit(f === 0 ? 0 : 1));
} else if (mode === "sources") {
  process.exit(validateSourceRegistry() === 0 ? 0 : 1);
} else {
  console.error(`unknown mode: ${mode} (use: fixtures | sources)`);
  process.exit(2);
}
