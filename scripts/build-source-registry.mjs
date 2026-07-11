#!/usr/bin/env node
/** Merge research JSONs into the master legal source registry (MD + CSV).
 *  Read-only inputs; writes only docs/legal-knowledge/ registry files. */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = "docs/legal-knowledge/research";
const OUT = "docs/legal-knowledge";
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();

const REQUIRED = [
  "name_he","name_en","url","publisher","category","subcategory","legal_domains",
  "primary_or_secondary","official","access","commercial","historical_coverage",
  "content_types","full_text","metadata_availability","search_available",
  "api_available","api_type","feeds","formats","bulk_download","auth_required",
  "paywall","captcha","robots_policy","terms_status","license_status",
  "rag_permission","update_frequency","last_observed_update","hebrew_quality",
  "stability","reliability_score","authority_score","legal_risk",
  "technical_difficulty","priority_recommendation","recommended_ingestion",
  "verified","example_documents","notes",
];

let all = [];
const problems = [];
for (const f of files) {
  const arr = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  if (!Array.isArray(arr)) { problems.push(`${f}: not an array`); continue; }
  arr.forEach((r, i) => {
    for (const k of REQUIRED)
      if (!(k in r)) problems.push(`${f}[${i}] (${r.name_en ?? "?"}): missing ${k}`);
    r._source_file = f;
  });
  all = all.concat(arr);
}

/* dedupe by normalized URL (keep first, merge notes) */
const norm = (u) => String(u ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
const seen = new Map();
const merged = [];
let dupes = 0;
for (const r of all) {
  const key = norm(r.url);
  if (key && seen.has(key)) {
    const prev = seen.get(key);
    prev.notes = `${prev.notes ?? ""} | ALSO covered by ${r._source_file}: ${String(r.notes ?? "").slice(0, 160)}`;
    dupes++;
    continue;
  }
  if (key) seen.set(key, r);
  merged.push(r);
}

/* assign IDs + registry-level fields */
merged.forEach((r, i) => {
  r.source_id = `LSR-${String(i + 1).padStart(3, "0")}`;
  r.owner = "LawME (founder)";
  r.validation_source = r._source_file;
  r.current_integration_status =
    norm(r.url).startsWith("kolzchut.org.il") ? "connected (MCP)" : "not integrated";
  r.last_reviewed = "2026-07-11";
  delete r._source_file;
});

/* CSV */
const COLS = ["source_id", ...REQUIRED, "current_integration_status", "owner", "validation_source", "last_reviewed"];
const esc = (v) => {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "unknown" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [COLS.join(","), ...merged.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n");
writeFileSync(path.join(OUT, "LAWME_LEGAL_SOURCE_REGISTRY.csv"), "﻿" + csv);

/* stats */
const count = (fn) => merged.filter(fn).length;
const stats = {
  total: merged.length,
  dupes_merged: dupes,
  problems: problems.length,
  by_category: {},
  primary: count((r) => String(r.primary_or_secondary).startsWith("primary")),
  secondary: count((r) => String(r.primary_or_secondary).includes("secondary")),
  commercial: count((r) => r.category === "F-commercial" || r.commercial === true || r.commercial === "yes"),
  api_or_feed: count((r) => (r.api_available === true || r.api_available === "yes") || (r.feeds && !["none","unknown",null].includes(r.feeds))),
  permission_required: count((r) => ["requires_permission","License-needed"].includes(r.rag_permission) || r.priority_recommendation === "License-needed"),
  restricted: count((r) => r.access === "restricted" || r.priority_recommendation === "Restricted"),
  p0: merged.filter((r) => r.priority_recommendation === "P0").map((r) => `${r.source_id} ${r.name_en}`),
  p1: merged.filter((r) => r.priority_recommendation === "P1").map((r) => `${r.source_id} ${r.name_en}`),
};
for (const r of merged) stats.by_category[r.category] = (stats.by_category[r.category] ?? 0) + 1;
writeFileSync(path.join(OUT, "registry-stats.json"), JSON.stringify(stats, null, 2));
writeFileSync(path.join(OUT, "LAWME_LEGAL_SOURCE_REGISTRY.records.json"), JSON.stringify(merged, null, 2));

console.log(`merged=${merged.length} dupes=${dupes} schema_problems=${problems.length}`);
if (problems.length) console.log(problems.slice(0, 12).join("\n"));
console.log("categories:", JSON.stringify(stats.by_category));
console.log(`P0=${stats.p0.length} P1=${stats.p1.length} api_or_feed=${stats.api_or_feed}`);
