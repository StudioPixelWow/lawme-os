#!/usr/bin/env node
/**
 * LawME environment health check — read-only, secret-safe.
 * Verifies names, files and tooling. NEVER prints secret values,
 * never connects with privileged credentials, never mutates anything.
 * Run: npm run env:check
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

let failures = 0;
const ok = (label) => console.log(`  ✓ ${label}`);
const warn = (label) => console.log(`  ⚠ ${label}`);
const fail = (label) => {
  failures += 1;
  console.log(`  ✗ ${label}`);
};

console.log("\nLawME environment check\n");

/* ── Node version ── */
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) ok(`Node ${process.versions.node} (>=20)`);
else fail(`Node ${process.versions.node} — requires >= 20`);

/* ── required folders & files ── */
for (const p of [
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "src/app",
  "src/design-system",
  "src/modules",
  "supabase/config.toml",
  "supabase/migrations",
  "src/types/database.types.ts",
  ".env.example",
  ".mcp.json",
  "docs/design-system/LAWME_DESIGN_BIBLE.md",
]) {
  if (existsSync(p)) ok(p);
  else fail(`missing: ${p}`);
}

/* ── package installation & scripts ── */
if (existsSync("node_modules/next")) ok("node_modules installed");
else fail("node_modules missing — run npm install");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const s of ["dev", "build", "lint", "typecheck", "db:types", "env:check"]) {
  if (pkg.scripts?.[s]) ok(`script: ${s}`);
  else fail(`missing script: ${s}`);
}

/* ── git remote ── */
try {
  const remote = execSync("git remote get-url origin", {
    encoding: "utf8",
  }).trim();
  if (remote.includes("StudioPixelWow/lawme-os"))
    ok("git remote → StudioPixelWow/lawme-os");
  else warn(`git remote is ${remote}`);
} catch {
  warn("git remote not readable (not a git checkout?)");
}

/* ── env var NAMES (presence only — values are never read out) ── */
const requiredNow = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const envLocal = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";
for (const name of requiredNow) {
  const inShell = Boolean(process.env[name]);
  const inFile = new RegExp(`^${name}=.+`, "m").test(envLocal);
  if (inShell || inFile) ok(`env name present: ${name}`);
  else warn(`env name not set yet: ${name} (needed once Supabase wiring begins)`);
}

/* ── NEXT_PUBLIC_ safety: no server secret carries the public prefix ── */
const forbiddenPublic = envLocal
  .split("\n")
  .filter((l) => /^NEXT_PUBLIC_.*(SERVICE_ROLE|SECRET|TOKEN|PASSWORD)/i.test(l));
if (forbiddenPublic.length === 0) ok("no server secrets under NEXT_PUBLIC_");
else fail("server-only secret name found with NEXT_PUBLIC_ prefix!");

/* ── tracked-secret sweep (names only) ── */
try {
  const tracked = execSync("git ls-files", { encoding: "utf8" });
  const suspicious = tracked
    .split("\n")
    .filter((f) => /^\.env($|\.)/.test(f) || /\.pem$/.test(f) || /service.?role/i.test(f));
  if (suspicious.length === 0) ok("no env/secret files tracked in git");
  else fail(`tracked secret-like files: ${suspicious.join(", ")}`);
} catch {
  warn("git not available for tracked-file sweep");
}

/* ── Vercel link (optional, local only) ── */
if (existsSync(".vercel/project.json")) ok(".vercel link present (local)");
else warn(".vercel link not pulled locally (run `vercel link` when needed)");

console.log(
  failures === 0
    ? "\nEnvironment check passed.\n"
    : `\nEnvironment check finished with ${failures} failure(s).\n`,
);
process.exit(failures === 0 ? 0 : 1);
