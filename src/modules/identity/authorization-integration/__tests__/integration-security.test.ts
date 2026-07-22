/** Slice 0.8.4 — integration security invariants (tests 61–64). Static guards. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const IDENTITY = join(import.meta.dirname, "..", "..");
const REPO = join(IDENTITY, "..", "..", "..");
const read = (abs: string) => readFileSync(abs, "utf8");
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
}

const LOADER_DIR = join(IDENTITY, "infrastructure");
const INTEGRATION_DIR = join(IDENTITY, "authorization-integration");

test("61: fact loaders + integration never use the service-role client or read its secret", () => {
  for (const dir of [LOADER_DIR, INTEGRATION_DIR]) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
      const code = codeOnly(read(join(dir, f)));
      assert.ok(!/serviceClient/.test(code), `${f} uses serviceClient`);
      assert.ok(!/service_role|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET/.test(code), `${f} references a service-role secret`);
    }
  }
});

test("62: the migrated protected reads obtain the authenticated (RLS) client", () => {
  const authzLoader = read(join(REPO, "src/modules/matter/view/authorized-matter-loader.ts"));
  assert.ok(/AuthDb/.test(authzLoader), "matter reads are typed on the authenticated client");
  const page = read(join(REPO, "src/app/(os)/matters/page.tsx"));
  assert.ok(page.includes("getServerAuthClient"), "the list page uses the authenticated client");
});

test("63/64: migrated routes/loaders contain NO role/ownership/confidentiality branches", () => {
  const files = [
    "src/app/(os)/matters/page.tsx",
    "src/app/(os)/matters/[id]/page.tsx",
    "src/modules/matter/view/authorized-matter-loader.ts",
    "src/modules/matter/intake/authorized-draft.ts",
  ];
  const forbidden = [/\brole\s*===/, /=== *"owner"/, /=== *"admin"/, /\.canApprove\b/, /\.canReview\b/, /confidentiality\s*===/, /if\s*\(\s*isOwner/, /is_org_admin/];
  for (const rel of files) {
    const code = codeOnly(read(join(REPO, rel)));
    for (const re of forbidden) assert.ok(!re.test(code), `${rel} has a local authorization branch: ${re}`);
  }
});
