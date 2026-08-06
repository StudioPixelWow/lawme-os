#!/usr/bin/env node
/**
 * CLI: Knesset OData ingestion pilot.
 *   npm run legal:ingest:knesset -- --pilot     (offline, bundled fixtures)
 *   npm run legal:ingest:knesset -- --live       (real API, operator machine)
 */
import { parseArgs, runKnessetPilot } from "../../src/modules/legal-ai-israel/ingestion/cli.ts";

const opts = parseArgs(process.argv.slice(2));
process.stdout.write(
  opts.live
    ? "[knesset] LIVE mode — real Knesset OData + Supabase (requires network + creds)\n"
    : "[knesset] PILOT mode — bundled fixtures, in-memory store (offline)\n",
);
const res = await runKnessetPilot(opts);
process.exit(res.stopped && res.stopReason && res.stopReason.startsWith("access_blocked") ? 2 : 0);
