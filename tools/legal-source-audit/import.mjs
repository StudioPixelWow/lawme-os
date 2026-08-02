#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — audit-artifact import.
 * Validates an audit artifact, prints a summary + a SUGGESTED collector mode,
 * and NEVER enables a collector or changes source access status. Applying a
 * suggestion is a separate, explicit administrator operation.
 *
 * Usage: node tools/legal-source-audit/import.mjs --path artifacts/.../audit.json
 */
import { readFile } from "node:fs/promises";
import { parseAuditArtifact } from "../../src/modules/legal-ai-israel/audit/schema.ts";
import { suggestFromAudit } from "../../src/modules/legal-ai-israel/audit/import.ts";

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

async function main() {
  const path = arg("--path");
  if (!path) { console.error("usage: --path <audit.json>"); process.exit(1); }
  const json = JSON.parse(await readFile(path, "utf8"));
  const parsed = parseAuditArtifact(json);
  if (!parsed.ok) {
    console.error("INVALID audit artifact:");
    for (const e of parsed.errors) console.error("  -", e);
    process.exit(2);
  }
  const s = suggestFromAudit(parsed.value);
  console.log(s.summaryHe);
  console.log("");
  console.log("— suggestion only. NOT applied. Administrator must explicitly approve:");
  for (const f of s.requiresAdminApprovalFor) console.log("   *", f);
  console.log("");
  console.log("Collector enablement remains a separate explicit operation.");
}

main().catch((e) => { console.error(e); process.exit(1); });
