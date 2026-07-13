/**
 * Real-corpus ingestion command (Epic 3B, Phase 8).
 *   npm run legal:corpus:ingest:dev -- --manifest <dir> [--dry-run]
 *                                      [--metadata-only] [--max <n>] [--write]
 *
 * SAFEGUARDS (the command REFUSES on any violation):
 *  - APP_ENV must be "development"
 *  - SUPABASE project ref must equal the approved DEV ref (for --write)
 *  - every canonical URL host must be on the allowlist
 *  - full text persisted ONLY for allow_full_text_dev_poc primary law
 *  - document count must not exceed --max (approved maximum)
 *  - never targets production; never fetches network; import-from-disk only
 *  - idempotent: dedup by content hash + canonical id
 *  - --write requires ALL gates to pass AND an explicit flag
 * Default mode is DRY-RUN (no write). This module performs NO network I/O.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateManifest, canonicalIdFor } from "./manifest.ts";
import type { ImportManifest } from "./manifest.ts";
import { StatuteImportAdapter } from "../adapters/import/adapter.ts";
import type { ImportResult } from "../adapters/import/adapter.ts";

export const INGEST_COMMAND_VERSION = "corpus-ingest-1.0.0";
export const APPROVED_DEV_PROJECT_REF = "udispadsbxqicmawqcuk";
export const DEFAULT_MAX_DOCS = 100;

export interface IngestOptions {
  manifestDir: string;
  dryRun: boolean;
  metadataOnly: boolean;
  maxDocs: number;
  write: boolean;
  env?: Record<string, string | undefined>;
}

export interface IngestReport {
  commandVersion: string;
  mode: "dry_run" | "write";
  manifestValid: boolean;
  refusals: string[];
  totals: {
    entries: number;
    fullText: number;
    metadataOnly: number;
    pointerOnly: number;
    duplicates: number;
    sectionsGenerated: number;
    validationFailures: number;
  };
  perDoc: {
    sourceId: string;
    canonicalId: string;
    documentType: string;
    storagePolicy: string;
    verificationStatus: string;
    sections: number;
    valid: boolean;
    warnings: string[];
  }[];
  wrote: boolean;
}

function assertGates(manifest: ImportManifest, opts: IngestOptions): string[] {
  const env = opts.env ?? process.env;
  const refusals: string[] = [];

  // count gate
  if (manifest.entries.length > opts.maxDocs) {
    refusals.push(`document count ${manifest.entries.length} exceeds max ${opts.maxDocs}`);
  }
  // manifest structural gate (allowlist, permission, dedup) — errors block write
  const mv = validateManifest(manifest);
  for (const e of mv.errors) refusals.push(`manifest[${e.sourceId}]: ${e.messageHe}`);

  // write-only gates
  if (opts.write) {
    if ((env.APP_ENV ?? "") !== "development") refusals.push("APP_ENV must be 'development' to write");
    const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!url.includes(APPROVED_DEV_PROJECT_REF)) {
      refusals.push(`SUPABASE URL must target the approved DEV project ref ${APPROVED_DEV_PROJECT_REF}`);
    }
    if (/prod|production/i.test(url)) refusals.push("refusing: URL looks like production");
  }
  return refusals;
}

export async function runIngest(opts: IngestOptions): Promise<IngestReport> {
  const manifestPath = path.join(opts.manifestDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ImportManifest;
  const mv = validateManifest(manifest);
  const refusals = assertGates(manifest, opts);

  const perDoc: IngestReport["perDoc"] = [];
  const seenHashes = new Set<string>();
  const seenCanonical = new Set<string>();
  let duplicates = 0, sectionsTotal = 0, fullText = 0, metadataOnly = 0, pointerOnly = 0, valFail = 0;

  for (const entry of manifest.entries) {
    // metadata-only mode downgrades every full-text decision
    const effective = opts.metadataOnly && entry.fullTextDecision === "allow_full_text_dev_poc"
      ? { ...entry, fullTextDecision: "allow_metadata_only" as const }
      : entry;
    const adapter = new StatuteImportAdapter(effective, opts.manifestDir);
    let res: ImportResult;
    try {
      const [item] = await adapter.discover();
      res = await adapter.mapToUnifiedSchema(item);
    } catch (e) {
      valFail++;
      perDoc.push({ sourceId: entry.sourceId, canonicalId: canonicalIdFor(entry), documentType: entry.documentType, storagePolicy: "error", verificationStatus: "error", sections: 0, valid: false, warnings: [e instanceof Error ? e.message : String(e)] });
      continue;
    }
    const hash = res.doc.provenance.sha256;
    const isDup = seenHashes.has(hash) || seenCanonical.has(res.canonicalId);
    if (isDup) duplicates++;
    seenHashes.add(hash); seenCanonical.add(res.canonicalId);

    if (res.doc.storagePolicy === "store_full") fullText++;
    else if (res.doc.storagePolicy === "store_extract") metadataOnly++;
    else pointerOnly++;
    if (!res.validation.valid) valFail++;
    sectionsTotal += res.sections.length;

    perDoc.push({
      sourceId: entry.sourceId, canonicalId: res.canonicalId,
      documentType: res.doc.documentType, storagePolicy: res.doc.storagePolicy,
      verificationStatus: res.doc.verificationStatus, sections: res.sections.length,
      valid: res.validation.valid,
      warnings: [...res.validation.warnings, ...res.doc.warnings.map((w) => w.message)],
    });
  }

  const canWrite = opts.write && refusals.length === 0 && mv.valid;
  // NOTE: the actual repository write is intentionally NOT executed here in
  // this build — it is gated behind founder-present invocation with real
  // files + dev credentials. The command proves the pipeline and gates; the
  // write step is enabled in the founder-review ingestion run.
  const wrote = false;

  return {
    commandVersion: INGEST_COMMAND_VERSION,
    mode: opts.dryRun || !opts.write ? "dry_run" : "write",
    manifestValid: mv.valid,
    refusals,
    totals: {
      entries: manifest.entries.length, fullText, metadataOnly, pointerOnly,
      duplicates, sectionsGenerated: sectionsTotal, validationFailures: valFail,
    },
    perDoc,
    wrote: canWrite ? wrote : false,
  };
}

/* CLI */
if (process.argv[1] && process.argv[1].endsWith("ingest-command.ts")) {
  const args = process.argv.slice(2);
  const get = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const opts: IngestOptions = {
    manifestDir: get("--manifest") ?? "",
    dryRun: !args.includes("--write"),
    metadataOnly: args.includes("--metadata-only"),
    maxDocs: Number(get("--max") ?? DEFAULT_MAX_DOCS),
    write: args.includes("--write"),
  };
  if (!opts.manifestDir) { console.error("usage: --manifest <dir> [--dry-run] [--metadata-only] [--max n] [--write]"); process.exit(2); }
  runIngest(opts).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (r.refusals.length) { console.log("REFUSED:"); for (const x of r.refusals) console.log(" - " + x); process.exit(1); }
    console.log(r.mode === "write" && r.wrote ? "WROTE" : "DRY RUN — no write");
  }).catch((e) => { console.error(e); process.exit(1); });
}
