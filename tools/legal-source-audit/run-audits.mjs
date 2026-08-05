#!/usr/bin/env node
/**
 * LEGAL AI ISRAEL — Legal Source Audit Runner (operator CLI).
 *
 * Runs the already-built LegalSourceAuditEngine against the seed registry using
 * the guarded transport (SSRF, timeout, redirect/size limits, ONE retry on
 * 5xx/network only, NEVER on 4xx; 403/429 → fail closed, no bypass). It performs
 * a small, bounded number of requests per source, downloads NO judgments, and
 * never crawls. Outputs real, evidence-backed reports + a ranked list + an
 * idempotent UPSERT SQL artifact to populate the dev registry.
 *
 * Usage:
 *   npm run legal:sources:audit -- --all
 *   npm run legal:sources:audit -- --category=official_government
 *   npm run legal:sources:audit -- --source=judgments.org.il
 *   npm run legal:sources:audit -- --limit=10 --only-pending
 */
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { LegalSourceAuditEngine } from "../../src/modules/legal-ai-israel/source-audit/audit-engine.ts";
import { createGuardedFetchTransport } from "../../src/modules/legal-ai-israel/source-audit/transport.ts";
import { SEED_SOURCES } from "../../src/modules/legal-ai-israel/source-audit/seeds.ts";
import { computeScores, classifyVerdict } from "../../src/modules/legal-ai-israel/source-audit/scoring.ts";
import { canBuildCollector } from "../../src/modules/legal-ai-israel/source-audit/collector-gate.ts";
import { generateAuditReport, reportFilename } from "../../src/modules/legal-ai-israel/source-audit/report.ts";
import { normalizedDomain } from "../../src/modules/legal-ai-israel/source-audit/url.ts";

const arg = (n, d) => { const p = process.argv.find((a) => a.startsWith(`${n}=`)); return p ? p.split("=").slice(1).join("=") : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sqlLit = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sqlBool = (v) => (v ? "true" : "false");
const sqlNum = (v) => (v === null || v === undefined || Number.isNaN(v) ? "null" : String(v));

function selectSeeds() {
  let seeds = [...SEED_SOURCES];
  const cat = arg("--category", null);
  const src = arg("--source", null);
  const limit = Number(arg("--limit", "0"));
  if (cat) seeds = seeds.filter((s) => s.sourceType === cat);
  if (src) seeds = seeds.filter((s) => normalizedDomain(s.url) === src || s.url.includes(src));
  if (limit > 0) seeds = seeds.slice(0, limit);
  return seeds;
}

// Derive scores from real findings. Fields we did not verify (doc-level
// metadata, precise volume) stay 0/unknown — we never invent them.
function scoresFor(f) {
  const estDocs = f.sitemap.estimatedUrls > 0 ? f.sitemap.estimatedUrls : null;
  const coverage = estDocs ? Math.min(60, Math.round(Math.log10(estDocs) * 15)) : (f.sitemap.found ? 15 : 0);
  const access = accessScoreOf(f);
  const legal = legalClarityOf(f);
  // metadata/document quality require sample-doc parsing (not done in a bounded
  // audit) → left at 0 and flagged as "not established" in the report.
  return computeScores({ coverage, access, metadata: 0, document: 0, legal });
}
function accessScoreOf(f) {
  let s = 0;
  if (f.api.hasApi) s += 30;
  if (f.feed.hasRss || f.feed.hasAtom) s += 10;
  if (f.sitemap.found) s += 15;
  if (f.search.hasPublicSearch) s += 10;
  if (f.reachable && !f.requiresLogin) s += 15;
  if (!f.requiresCaptcha) s += 10;
  if (f.technicalAccessStatus === "open") s += 10;
  else if (f.technicalAccessStatus === "partially_open" || f.technicalAccessStatus === "rate_limited") s += 5;
  if (f.technicalAccessStatus === "waf_blocked" || f.technicalAccessStatus === "robots_disallowed") s = Math.min(s, 15);
  return Math.max(0, Math.min(100, s));
}
function legalClarityOf(f) {
  const s = f.legalReuseStatus;
  if (s === "open_license" || s === "public_reuse_allowed") return 100;
  if (s === "commercial_permission_required" || s === "written_permission_required") return 55;
  if (s === "personal_use_only") return 30;
  if (s === "automated_access_prohibited" || s === "restricted") return 10;
  return 0;
}

function collectorStatusFor(verdict) {
  if (verdict === "BLOCKED") return "blocked";
  if (verdict === "ASK") return "permission_required";
  if (verdict === "OPEN") return "ready_to_build";
  return "audit_required"; // REVIEW
}

function sourceRecordFor(seed, f, scores) {
  return {
    name: seed.name, normalizedDomain: f.normalizedDomain, sourceType: seed.sourceType,
    auditStatus: f.auditStatus, accessStatus: f.accessStatus,
    technicalAccessStatus: f.technicalAccessStatus, legalReuseStatus: f.legalReuseStatus,
    collectorStatus: "audit_required", requiresLogin: f.requiresLogin, requiresCaptcha: f.requiresCaptcha,
    requiresWrittenPermission: f.legalReuseStatus === "written_permission_required",
    robotsDisallowsRelevantPaths: f.robots.disallowsRelevantPaths, auditConfidence: f.auditConfidence,
    recommendedAccessMethod: f.recommendedAccessMethod, hasDocumentedPermission: false, scores,
  };
}

async function main() {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const runDate = startedAt.slice(0, 10);
  const seeds = selectSeeds();
  const transport = createGuardedFetchTransport({
    userAgent: "LawMeLegalResearch/1.0 (+audit; contact configured)",
    timeoutMs: 9000, maxRedirects: 3, maxResponseBytes: 4_000_000,
  });
  const engine = new LegalSourceAuditEngine(transport, () => new Date().toISOString());

  console.log(`== Legal Source Audit run ${runId} ==`);
  console.log(`seeds: ${seeds.length} | started: ${startedAt}`);

  // Preflight: probe neutral control hosts. If THESE fail, our network position
  // (not the sources) is blocked — verdicts become UNDETERMINED so we never
  // defame a source as BLOCKED based on our own egress restriction.
  const control1 = await transport.get("https://example.com/");
  const control2 = await transport.get("https://www.wikipedia.org/");
  const ok = (r) => r.status !== null && r.status >= 200 && r.status < 400;
  const auditorBlocked = !ok(control1) && !ok(control2);
  if (auditorBlocked) {
    console.log(`\n!! AUDITOR NETWORK BLOCKED — control probes failed (example.com=${control1.status}, wikipedia=${control2.status}).`);
    console.log(`   This environment blocks outbound HTTP. Verdicts → UNDETERMINED. Run this CLI from an`);
    console.log(`   unblocked network (operator machine / allowlisted IP) for a representative ranking.\n`);
  } else {
    console.log(`control probes ok — auditor network is open.\n`);
  }

  await mkdir("docs/source-audits", { recursive: true });
  await mkdir("artifacts", { recursive: true });

  const rows = [];
  let idx = 0;
  for (const seed of seeds) {
    idx += 1;
    process.stdout.write(`[${idx}/${seeds.length}] ${seed.name} (${normalizedDomain(seed.url)}) … `);
    let f;
    try {
      f = await engine.audit({ url: seed.url });
    } catch (e) {
      console.log(`ERROR ${String(e.message ?? e)}`);
      continue;
    }
    // When our own network is blocked, don't attribute the block to the source:
    // neutralize the tech/access/audit fields to 'unknown'/'incomplete'.
    if (auditorBlocked) {
      f.technicalAccessStatus = "unknown"; f.accessStatus = "unknown";
      f.auditStatus = "incomplete"; f.requiresCaptcha = false; f.requiresLogin = false;
    }
    const scores = scoresFor(f);
    const verdict = auditorBlocked ? "UNDETERMINED" : classifyVerdict(f, false);
    const record = sourceRecordFor(seed, f, scores);
    const gate = canBuildCollector(record);
    const collectorStatus = auditorBlocked ? "audit_required" : collectorStatusFor(verdict);
    console.log(`${verdict} | tech=${f.technicalAccessStatus} legal=${f.legalReuseStatus} priority=${scores.priorityScore} reqs=${f.requestCount}`);

    // per-source report
    const md = generateAuditReport({ name: seed.name, findings: f, scores, verdict, gate });
    await writeFile(reportFilename(f.normalizedDomain), md);

    rows.push({ seed, f, scores, verdict, collectorStatus, gate });
    await sleep(1500); // polite spacing between sources
  }

  // ---- ranked list ----
  const ranked = [...rows].sort((a, b) => b.scores.priorityScore - a.scores.priorityScore);
  const group = (v) => ranked.filter((r) => r.verdict === v);

  const rankMd = [];
  rankMd.push(`# Ranked Legal Sources — audit run ${runDate}`);
  rankMd.push(`\nRun id: ${runId} · audited ${rows.length}/${seeds.length} seeds · started ${startedAt}`);
  rankMd.push(`\n> Verdicts reflect what the audit runner observed from its network position. A 403 here means the source blocked THIS server-side request (fail-closed, no bypass); it may still be reachable via an owner-provisioned path.`);
  rankMd.push(`\n| Rank | Source | Domain | Type | Owner | Verdict | Tech | Legal Reuse | Collector | Est.Docs | Coverage | Access | MetaQ | DocQ | Legal | Priority | Access Method | Required Action | Audited |`);
  rankMd.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  ranked.forEach((r, i) => {
    const f = r.f, s = r.scores;
    const est = f.sitemap.estimatedUrls > 0 ? `~${f.sitemap.estimatedUrls}` : "n/e";
    const action = r.gate.allowed ? "build-ready" : (r.gate.requiredActions[0] ?? "—");
    rankMd.push(`| ${i + 1} | ${r.seed.name} | ${f.normalizedDomain} | ${r.seed.sourceType} | ${r.seed.ownerType} | ${r.verdict} | ${f.technicalAccessStatus} | ${f.legalReuseStatus} | ${r.collectorStatus} | ${est} | ${s.coverageScore} | ${s.accessScore} | ${s.metadataQualityScore} | ${s.documentQualityScore} | ${s.legalClarityScore} | ${s.priorityScore} | ${f.recommendedAccessMethod ?? "—"} | ${action} | ${runDate} |`);
  });
  if (auditorBlocked) rankMd.push(`\n> ⚠️ AUDITOR NETWORK BLOCKED this run — all verdicts are **UNDETERMINED**. Re-run the CLI from an unblocked network for real OPEN/ASK/BLOCKED/REVIEW results.`);
  rankMd.push(`\n## UNDETERMINED — Auditor Network Blocked\n${group("UNDETERMINED").map((r) => `- ${r.seed.name} (${r.f.normalizedDomain})`).join("\n") || "- none"}`);
  rankMd.push(`\n## OPEN — Ready to Build\n${group("OPEN").map((r) => `- ${r.seed.name} (${r.f.normalizedDomain}) — priority ${r.scores.priorityScore}`).join("\n") || "- none"}`);
  rankMd.push(`\n## ASK — Permission Required\n${group("ASK").map((r) => `- ${r.seed.name} (${r.f.normalizedDomain})`).join("\n") || "- none"}`);
  rankMd.push(`\n## BLOCKED — Do Not Use\n${group("BLOCKED").map((r) => `- ${r.seed.name} (${r.f.normalizedDomain}) — ${r.f.technicalAccessStatus}`).join("\n") || "- none"}`);
  rankMd.push(`\n## REVIEW — Manual Legal Review\n${group("REVIEW").map((r) => `- ${r.seed.name} (${r.f.normalizedDomain}) — ${r.f.legalReuseStatus}`).join("\n") || "- none"}`);
  await writeFile("docs/source-audits/ranked-legal-sources.md", rankMd.join("\n") + "\n");

  // ---- JSON + CSV ----
  const jsonRows = ranked.map((r, i) => ({
    rank: i + 1, source: r.seed.name, domain: r.f.normalizedDomain, sourceType: r.seed.sourceType,
    ownerType: r.seed.ownerType, verdict: r.verdict, technicalStatus: r.f.technicalAccessStatus,
    legalReuseStatus: r.f.legalReuseStatus, collectorStatus: r.collectorStatus,
    estimatedDocuments: r.f.sitemap.estimatedUrls || null, ...r.scores,
    recommendedAccessMethod: r.f.recommendedAccessMethod, requiredAction: r.gate.requiredActions[0] ?? null,
    auditConfidence: r.f.auditConfidence, httpStatus: r.f.httpStatus, lastAudited: runDate,
  }));
  await writeFile("artifacts/legal-source-ranking.json", JSON.stringify({ runId, startedAt, rows: jsonRows }, null, 2));
  const csvHead = "rank,source,domain,sourceType,ownerType,verdict,technicalStatus,legalReuseStatus,collectorStatus,estimatedDocuments,coverageScore,accessScore,metadataQualityScore,documentQualityScore,legalClarityScore,priorityScore,recommendedAccessMethod,requiredAction,lastAudited";
  const csvRows = jsonRows.map((r) => [r.rank, r.source, r.domain, r.sourceType, r.ownerType, r.verdict, r.technicalStatus, r.legalReuseStatus, r.collectorStatus, r.estimatedDocuments ?? "", r.coverageScore, r.accessScore, r.metadataQualityScore, r.documentQualityScore, r.legalClarityScore, r.priorityScore, r.recommendedAccessMethod ?? "", (r.requiredAction ?? "").replace(/,/g, ";"), r.lastAudited].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  await writeFile("artifacts/legal-source-ranking.csv", [csvHead, ...csvRows].join("\n") + "\n");

  // ---- collector build queue (top OPEN) ----
  const openTop = group("OPEN").slice(0, 10);
  const q = [`# Collector Build Queue (top OPEN) — ${runDate}`, `\nRun ${runId}. Do NOT build yet — this is the prioritized queue.`];
  if (openTop.length === 0) q.push(`\n_No source reached OPEN in this run (see BLOCKED/REVIEW). Resolve access/permission first._`);
  openTop.forEach((r, i) => {
    q.push(`\n## ${i + 1}. ${r.seed.name} (${r.f.normalizedDomain})`);
    q.push(`- Priority: ${r.scores.priorityScore} · Estimated documents: ${r.f.sitemap.estimatedUrls || "not established"}`);
    q.push(`- Access method: ${r.f.recommendedAccessMethod ?? "—"} · Collector type: ${r.f.api.hasApi ? "api" : r.f.sitemap.found ? "sitemap" : "html_search"}`);
    q.push(`- Parser complexity: ${r.f.cms === "wordpress" ? "medium (label-anchored)" : "unknown"} · Dedup: sha256 + case-number+date`);
    q.push(`- Known risks: ${r.f.technicalAccessStatus !== "open" ? r.f.technicalAccessStatus : "structure drift"}`);
    q.push(`- Definition of Done: collector passes audit gate, dedup verified, fail-closed on block, sample ingest reviewed.`);
  });
  await writeFile("docs/source-audits/collector-build-queue.md", q.join("\n") + "\n");

  // ---- run summary ----
  const withApi = rows.filter((r) => r.f.api.hasApi).length;
  const withSitemap = rows.filter((r) => r.f.sitemap.found).length;
  const withFeed = rows.filter((r) => r.f.feed.hasRss || r.f.feed.hasAtom).length;
  const withPdf = rows.filter((r) => r.f.sitemap.likelyPdfUrls > 0).length;
  const wafBlocked = rows.filter((r) => r.f.technicalAccessStatus === "waf_blocked").length;
  const estTotal = rows.reduce((n, r) => n + (r.f.sitemap.estimatedUrls || 0), 0);
  const estOpen = group("OPEN").reduce((n, r) => n + (r.f.sitemap.estimatedUrls || 0), 0);
  const sum = [
    `# Audit Run Summary — ${runDate}`, ``, `Run id: ${runId} · started ${startedAt}`, ``,
    `- Total seeds: ${seeds.length}`, `- Audited: ${rows.length}`,
    `- Completed: ${rows.filter((r) => r.f.auditStatus === "completed").length}`,
    `- Incomplete: ${rows.filter((r) => r.f.auditStatus === "incomplete").length}`,
    `- Manual review required: ${rows.filter((r) => r.f.auditStatus === "manual_review_required").length}`,
    `- Failed: ${rows.filter((r) => r.f.auditStatus === "failed").length}`, ``,
    `- UNDETERMINED (auditor network blocked): ${group("UNDETERMINED").length}`,
    `- OPEN: ${group("OPEN").length}`, `- ASK: ${group("ASK").length}`,
    `- BLOCKED: ${group("BLOCKED").length}`, `- REVIEW: ${group("REVIEW").length}`, ``,
    `- Estimated total documents (sitemap-derived, sampled): ~${estTotal}`,
    `- Estimated OPEN documents: ~${estOpen}`,
    `- Sources with APIs: ${withApi}`, `- Sources with sitemaps: ${withSitemap}`,
    `- Sources with feeds: ${withFeed}`, `- Sources with likely direct PDFs: ${withPdf}`,
    `- Sources requiring permission (ASK): ${group("ASK").length}`,
    `- Sources blocked by WAF/403: ${wafBlocked}`, ``,
    `## Top OPEN candidates`, (openTop.map((r, i) => `${i + 1}. ${r.seed.name} (${r.f.normalizedDomain}) — priority ${r.scores.priorityScore}`).join("\n") || "_none_"), ``,
    `## Limitation`,
    auditorBlocked
      ? `AUDITOR NETWORK BLOCKED this run: control probes to example.com/wikipedia.org failed, so this environment blocks ALL outbound HTTP. No source could be reached, so every verdict is UNDETERMINED — NOT a judgment about any source. Re-run \`npm run legal:sources:audit -- --all\` from the operator machine (or an allowlisted IP) for a representative ranking.`
      : `Verdicts reflect the audit runner's network position. A 403 is recorded fail-closed; the same source may be reachable from an allowlisted/owner-provisioned path. Document-level metadata & precise volume were not established (no sample-doc parsing in a bounded audit) → those scores are 0 and marked "not established".`,
  ];
  await writeFile(`docs/source-audits/audit-run-${runDate}.md`, sum.join("\n") + "\n");

  // ---- idempotent UPSERT SQL (populate dev registry + evidence) ----
  const sqlLines = [
    `-- Legal source audit results — run ${runId} (${startedAt})`,
    `-- Idempotent: updates legalai.legal_sources by code; inserts evidence.`,
    `-- Apply to DEV only. No destructive statements.`, ``,
    `insert into legalai.ingestion_runs (id, run_type, status, started_at, completed_at, metadata)`,
    `values ('${runId}', 'source_audit', 'succeeded', '${startedAt}', now(), '{"tool":"run-audits"}'::jsonb)`,
    `on conflict (id) do nothing;`, ``,
  ];
  for (const r of rows) {
    const f = r.f, s = r.scores;
    const code = codeFor(r.seed);
    sqlLines.push(`-- ${r.seed.name} → ${r.verdict}`);
    sqlLines.push(`update legalai.legal_sources set
  normalized_domain=${sqlLit(f.normalizedDomain)}, owner_type=${sqlLit(r.seed.ownerType)},
  access_status=${sqlLit(f.accessStatus)}, technical_access_status=${sqlLit(f.technicalAccessStatus)},
  legal_reuse_status=${sqlLit(f.legalReuseStatus)}, collector_status=${sqlLit(r.collectorStatus)},
  audit_status=${sqlLit(f.auditStatus)}, audit_confidence=${sqlNum(f.auditConfidence)},
  requires_login=${sqlBool(f.requiresLogin)}, requires_captcha=${sqlBool(f.requiresCaptcha)},
  robots_status=${sqlLit(f.robots.found ? "found" : "not_found")}, has_api=${sqlBool(f.api.hasApi)},
  has_sitemap=${sqlBool(f.sitemap.found)}, has_rss=${sqlBool(f.feed.hasRss)}, has_atom=${sqlBool(f.feed.hasAtom)},
  has_public_search=${sqlBool(f.search.hasPublicSearch)}, estimated_sitemap_urls=${sqlNum(f.sitemap.estimatedUrls || null)},
  coverage_score=${sqlNum(s.coverageScore)}, access_score=${sqlNum(s.accessScore)},
  metadata_quality_score=${sqlNum(s.metadataQualityScore)}, document_quality_score=${sqlNum(s.documentQualityScore)},
  legal_clarity_score=${sqlNum(s.legalClarityScore)}, priority_score=${sqlNum(s.priorityScore)},
  recommended_access_method=${sqlLit(f.recommendedAccessMethod)}, last_audited_at=now(), last_successful_access_at=${f.reachable ? "now()" : "null"}
where code=${sqlLit(code)};`);
    for (const e of f.evidence) {
      sqlLines.push(`insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '${runId}', ${sqlLit(e.evidenceType)}, ${sqlLit(e.url)}, ${sqlNum(e.statusCode)}, ${sqlLit(e.contentHash)}, ${sqlLit(e.summary)}, ${sqlLit(e.observedAt)}
  from legalai.legal_sources where code=${sqlLit(code)};`);
    }
    sqlLines.push("");
  }
  await writeFile("artifacts/legal-source-audit-upsert.sql", sqlLines.join("\n"));

  console.log(`\n== summary ==`);
  console.log(`OPEN ${group("OPEN").length} | ASK ${group("ASK").length} | BLOCKED ${group("BLOCKED").length} | REVIEW ${group("REVIEW").length}`);
  console.log(`reports: docs/source-audits/*.md | ranking: docs/source-audits/ranked-legal-sources.md`);
  console.log(`artifacts: artifacts/legal-source-ranking.{json,csv} + legal-source-audit-upsert.sql`);
  process.exit(0);
}

// Map a seed to a stable registry code (matches Phase-1 seeded codes where known).
function codeFor(seed) {
  const known = {
    "supremedecisions.court.gov.il": "supreme_court",
    "data.gov.il": "data_gov_il",
    "judgments.org.il": "judgments_org_il",
    "court.gov.il": "net_hamishpat",
    "gov.il": "gov_il_legal",
  };
  const dom = normalizedDomain(seed.url);
  return known[dom] ?? dom.replace(/[^a-z0-9]+/gi, "_");
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
