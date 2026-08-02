#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — data.gov.il DISCOVERY PILOT (operator-run, dry-run).
 *
 * Runs on the operator's network. It DISCOVERS legal-relevant datasets on
 * data.gov.il via the public CKAN API and reports what exists + their licenses.
 * It does NOT write to the database and (in the default discovery mode) does NOT
 * download resource bodies — it answers the open question "does data.gov.il hold
 * legal datasets worth ingesting?" before we commit to a full collector.
 *
 * Usage:
 *   node tools/legal-ingest/pilot-data-gov.mjs               # discovery only (safe)
 *   node tools/legal-ingest/pilot-data-gov.mjs --pages 2     # scan 2 pages
 */
import { createDataGovIlDiscoveryCollector } from "../../src/modules/legal-ai-israel/collector/adapters/data-gov-il.ts";

function arg(name, def) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def; }

async function main() {
  const maxPages = Number(arg("--pages", "1"));
  const c = createDataGovIlDiscoveryCollector();

  console.log("== data.gov.il audit ==");
  const audit = await c.audit();
  console.log(JSON.stringify(audit, null, 2));
  if (audit.decision === "NO_GO") { console.log("audit NO_GO — stopping."); return; }

  console.log("\n== legal-dataset discovery ==");
  let cursor = undefined;
  let total = 0;
  const licenses = new Map();
  for (let page = 0; page < maxPages; page++) {
    // polite pacing between API calls
    if (page > 0) await new Promise((r) => setTimeout(r, 4000));
    const batch = await c.discover(cursor);
    for (const item of batch.items) {
      const meta = await c.fetchMetadata(item);
      const ds = meta.raw;
      const lic = ds.license_title ?? ds.license_id ?? "(none)";
      licenses.set(lic, (licenses.get(lic) ?? 0) + 1);
      total += 1;
      console.log(`- ${ds.title ?? ds.name}  |  license: ${lic}  |  resources: ${(ds.resources ?? []).length}  |  ${item.url}`);
      await new Promise((r) => setTimeout(r, 4000));
    }
    console.log(`  (window ${batch.windowLabel})`);
    if (!batch.nextCursor) break;
    cursor = batch.nextCursor;
  }

  console.log(`\n== summary ==`);
  console.log(`legal-relevant datasets seen: ${total}`);
  console.log(`licenses:`, Object.fromEntries(licenses));
  console.log(`\nNOTE: discovery only — nothing downloaded or written to the DB.`);
  console.log(`If relevant datasets with an open license exist above, tell Claude and`);
  console.log(`he'll build the full ingest for those specific datasets.`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
