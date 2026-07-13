import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Architectural boundary guards (Epic 4.1).
 * Enforce the approved dependency model:
 *   - Dino must not import Matter
 *   - Matter must not import Dino
 *   - Shared intelligence core must not import any domain orchestrator
 * These are structural invariants; if a future PR violates them, this fails.
 */

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function importsMatching(file: string, needle: string): boolean {
  const src = readFileSync(file, "utf8");
  // match `from "...needle..."` and dynamic import("...needle...")
  const re = new RegExp(`(from|import)\\s*\\(?\\s*["'][^"']*${needle}[^"']*["']`, "g");
  return re.test(src);
}

const ROOT = process.cwd();
const DINO = join(ROOT, "src/modules/dino");
const MATTER = join(ROOT, "src/modules/matter");
const INTELLIGENCE = join(ROOT, "src/modules/intelligence");

test("Dino does not import Matter", () => {
  const offenders = tsFiles(DINO).filter((f) => importsMatching(f, "modules/matter"));
  assert.deepEqual(offenders, [], `Dino files importing Matter: ${offenders.join(", ")}`);
});

test("Matter does not import Dino", () => {
  const offenders = tsFiles(MATTER).filter((f) => importsMatching(f, "modules/dino"));
  assert.deepEqual(offenders, [], `Matter files importing Dino: ${offenders.join(", ")}`);
});

test("Shared intelligence core imports no domain orchestrator", () => {
  const domains = ["modules/dino", "modules/matter", "modules/legal-knowledge"];
  const offenders: string[] = [];
  for (const f of tsFiles(INTELLIGENCE)) {
    if (f.includes("__tests__")) continue; // tests may import domains to check them
    for (const d of domains) {
      if (importsMatching(f, d)) offenders.push(`${f} -> ${d}`);
    }
  }
  assert.deepEqual(offenders, [], `Shared core importing domains: ${offenders.join(", ")}`);
});

test("Matter and Dino both DO import the shared intelligence core (adoption check)", () => {
  const matterAdopts = tsFiles(MATTER).some((f) => importsMatching(f, "intelligence/core"));
  const dinoAdopts = tsFiles(DINO).some((f) => importsMatching(f, "intelligence/core"));
  assert.ok(matterAdopts, "Matter should consume the shared core");
  assert.ok(dinoAdopts, "Dino should consume the shared core");
});
