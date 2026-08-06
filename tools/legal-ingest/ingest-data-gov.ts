#!/usr/bin/env node
/**
 * CLI: data.gov.il Tier-1 ingestion pilot (dataset-configurable).
 *   npm run legal:ingest:data-gov -- --dataset=ararim --pilot
 *   npm run legal:ingest:data-gov -- --dataset=mishmoret --pilot
 *   npm run legal:ingest:data-gov -- --dataset=judgments --pilot
 *   npm run legal:ingest:data-gov -- --dataset=ararim --live   (operator machine)
 */
import { parseArgs, runDataGovPilot } from "../../src/modules/legal-ai-israel/ingestion/cli.ts";

const opts = parseArgs(process.argv.slice(2));
if (!opts.dataset) {
  process.stderr.write("usage: --dataset=ararim|mishmoret|judgments [--pilot|--live]\n");
  process.exit(1);
}
process.stdout.write(
  opts.live
    ? `[data-gov] LIVE mode — CKAN datastore + Supabase for ${opts.dataset}\n`
    : `[data-gov] PILOT mode — bundled fixtures, in-memory store for ${opts.dataset} (offline)\n`,
);
const res = await runDataGovPilot(opts);
process.exit(res.stopped && res.stopReason && res.stopReason.startsWith("access_blocked") ? 2 : 0);
