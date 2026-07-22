/** Slice 0.8.3 — immutability + purity invariants (tests 75–80). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authorizeMatter } from "../matter-policy.ts";
import { ACTOR, caps, matterFacts, userActor } from "./_support.ts";

test("75: policy facts are not mutated", () => {
  const facts = matterFacts({ ownerProfileId: ACTOR, actorMatterMembership: { membershipId: "m", profileId: ACTOR, active: true } });
  const before = JSON.stringify(facts);
  authorizeMatter(userActor({ capabilities: caps("matters.read") }), "matter.read", facts);
  assert.equal(JSON.stringify(facts), before);
});

test("76: the ActorContext is not mutated", () => {
  const actor = userActor({ capabilities: caps("matters.read") });
  const before = JSON.stringify(actor, (_k, v) => (v instanceof Set ? [...v] : v));
  authorizeMatter(actor, "matter.read", matterFacts({ ownerProfileId: ACTOR }));
  const after = JSON.stringify(actor, (_k, v) => (v instanceof Set ? [...v] : v));
  assert.equal(after, before);
});

test("77: repeated calls with identical inputs are deterministic", () => {
  const actor = userActor({ capabilities: caps("matters.read"), correlationId: "00000000-0000-4000-8000-00000000c077" });
  const facts = matterFacts({ confidentiality: "privileged" }); // a denial path
  assert.deepEqual(authorizeMatter(actor, "matter.read", facts), authorizeMatter(actor, "matter.read", facts));
});

test("78/79: policy modules import no framework/DB/network (React/Next/Supabase/fs/net)", () => {
  const dir = join(import.meta.dirname, "..");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 9, "expected the full policy module set");
  const forbidden =
    /\b(?:import|export)\b[^\n;]*\bfrom\s+["'][^"']*(?:react|next\/|next"|@supabase|supabase|node:fs|node:net|node:dns|\bpg\b|firebase)["']?/i;
  for (const f of files) {
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      assert.ok(!forbidden.test(line), `${f} has a forbidden import: ${line.trim()}`);
    }
  }
});

test("80: policy modules stay within the identity boundary (no cross-module or alias imports)", () => {
  const dir = join(import.meta.dirname, "..");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const importFrom = /\bfrom\s+["']([^"']+)["']/;
  for (const f of files) {
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      const m = importFrom.exec(line);
      if (!m) continue;
      const spec = m[1];
      // only local (./x) and identity-root (../x) relative imports are allowed
      assert.ok(spec.startsWith("./") || spec.startsWith("../"), `${f} imports a non-relative module: ${spec}`);
      assert.ok(!spec.startsWith("../../"), `${f} escapes the identity module: ${spec}`);
      assert.ok(!spec.startsWith("@/"), `${f} uses a path alias: ${spec}`);
    }
  }
});
