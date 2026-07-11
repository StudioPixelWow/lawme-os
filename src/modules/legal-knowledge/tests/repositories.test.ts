/**
 * Epic 2 test suite — repository layer, seeding, DB-backed research slice,
 * dev-interface gating. In-memory implementation runs everywhere;
 * Supabase integration tests run ONLY when dev credentials are present in
 * the environment (skipped otherwise — never required for CI).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createInMemoryRepositories } from "../repositories/in-memory.ts";
import { assertDevelopmentProject } from "../repositories/index.ts";
import type { OrgContext } from "../repositories/types.ts";
import { buildSeedRows, deterministicUuid } from "../seed/fixture-rows.ts";
import { seedThroughRepositories } from "../seed/seed-fixtures.ts";
import { runDbResearch } from "../research/engine-db.ts";
import { isDevInterfaceEnabled } from "../../../app/dev/legal-intelligence/gate.ts";

const svc: OrgContext = { organizationId: null, actorProfileId: null, correlationId: "test-svc" };
const orgA: OrgContext = { organizationId: "org-a", actorProfileId: "user-a", correlationId: "test-a" };
const orgB: OrgContext = { organizationId: "org-b", actorProfileId: "user-b", correlationId: "test-b" };

test("seed rows: deterministic ids across builds (idempotency foundation)", async () => {
  const [a, b] = await Promise.all([buildSeedRows(), buildSeedRows()]);
  assert.equal(a.documents.length, 13);
  assert.deepEqual(a.documents.map((d) => d.id), b.documents.map((d) => d.id));
  assert.deepEqual(a.sections.map((s) => s.id), b.sections.map((s) => s.id));
  assert.equal(deterministicUuid("x", "y"), deterministicUuid("x", "y"));
  assert.notEqual(deterministicUuid("x", "y"), deterministicUuid("x", "z"));
  // uuid shape
  assert.match(a.documents[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("seed rows: fixtures stay synthetic and never verified/official", async () => {
  const rows = await buildSeedRows();
  for (const d of rows.documents) {
    assert.equal(d.licenseStatus, "synthetic_fixture");
    assert.equal(d.verificationStatus, "unverified");
    assert.equal(d.authorityType, "unknown");
    assert.equal(d.organizationId, null);
  }
});

test("in-memory seeding is idempotent (re-seed → same counts)", async () => {
  const repos = createInMemoryRepositories();
  const first = await seedThroughRepositories(repos);
  const second = await seedThroughRepositories(repos);
  assert.deepEqual(first, second);
  assert.equal(repos.store.documents.size, 13);
  assert.equal([...repos.store.sections.values()].flat().length, first.sections);
});

test("repository org-context: cross-tenant reads/writes are denied", async () => {
  const repos = createInMemoryRepositories();
  await seedThroughRepositories(repos);

  // private doc for org A (created with org A context)
  const rows = await buildSeedRows();
  const privateDoc = { ...rows.documents[0], id: deterministicUuid("private", "a-doc"), organizationId: "org-a", canonicalSourceUrl: null, licenseStatus: "firm_private" };
  const created = await repos.documents.createCanonicalDocument(privateDoc, orgA);
  assert.equal(created.ok, true);

  // org B cannot read it
  const asB = await repos.documents.getDocument(privateDoc.id, orgB);
  assert.equal(asB.ok, false);
  if (!asB.ok) assert.equal(asB.error.code, "not_found");

  // org B cannot create into org A
  const forged = await repos.documents.createCanonicalDocument({ ...privateDoc, id: deterministicUuid("private", "forged") }, orgB);
  assert.equal(forged.ok, false);

  // both can read the global corpus
  const globalDoc = rows.documents[0];
  const asA = await repos.documents.getDocument(globalDoc.id, orgA);
  const asB2 = await repos.documents.getDocument(globalDoc.id, orgB);
  assert.equal(asA.ok, true);
  assert.equal(asB2.ok, true);
});

test("research repo: sessions are org-scoped end-to-end", async () => {
  const repos = createInMemoryRepositories();
  const session = await repos.research.createResearchSession(
    { organizationId: "org-a", createdBy: "user-a", matterRef: null, title: "בדיקה" }, orgA);
  assert.equal(session.ok, true);
  if (!session.ok) return;

  // org B cannot read A's session
  const asB = await repos.research.getResearchSession(session.data.id, orgB);
  assert.equal(asB.ok, false);

  // org B cannot attach a query to A's session
  const forged = await repos.research.addResearchQuery({
    sessionId: session.data.id, queryText: "x", normalizedQuery: "x",
    expansion: [], filters: {}, engineVersion: "t",
  }, orgB);
  assert.equal(forged.ok, false);

  // no org context at all → forbidden
  const noOrg = await repos.research.createResearchSession(
    { organizationId: "org-a", createdBy: "user-a", matterRef: null, title: "x" }, svc);
  assert.equal(noOrg.ok, false);
});

test("audit: payloads with secrets or oversized bodies are rejected; events recorded", async () => {
  const repos = createInMemoryRepositories();
  const bad = await repos.audit.appendAuditEvent({
    organizationId: null, actor: null, actorRole: "service",
    eventType: "x", objectType: null, objectId: null,
    payload: { t: "Bearer abcdefghijklmnopqrstuvwxyz0123456789" },
  }, svc);
  assert.equal(bad.ok, false);

  const big = await repos.audit.appendAuditEvent({
    organizationId: null, actor: null, actorRole: "service",
    eventType: "x", objectType: null, objectId: null,
    payload: { body: "א".repeat(9000) }, // document bodies do not belong in audit logs
  }, svc);
  assert.equal(big.ok, false);

  await seedThroughRepositories(repos);
  assert.ok(repos.store.auditEvents.some((e) => e.eventType === "poc_fixtures.seeded"));
});

test("pagination: deterministic ordering and clamping", async () => {
  const repos = createInMemoryRepositories();
  await seedThroughRepositories(repos);
  const p1 = await repos.documents.listDocuments(svc, undefined, { limit: 5, offset: 0 });
  const p2 = await repos.documents.listDocuments(svc, undefined, { limit: 5, offset: 5 });
  assert.equal(p1.ok && p1.data.length, 5);
  assert.equal(p2.ok && p2.data.length, 5);
  if (p1.ok && p2.ok) {
    const ids = new Set([...p1.data, ...p2.data].map((d) => d.id));
    assert.equal(ids.size, 10, "pages must not overlap");
  }
  const clamped = await repos.documents.listDocuments(svc, undefined, { limit: 5000, offset: -3 });
  assert.equal(clamped.ok && clamped.data.length <= 100, true);
});

test("DB-backed research slice (in-memory repos): evidence, anchors, decomposition, honesty", async () => {
  const repos = createInMemoryRepositories();
  await seedThroughRepositories(repos);
  const result = await runDbResearch(repos, {
    question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?",
    legalDomain: "labor",
    authorityPreference: "binding_first",
  });
  assert.ok(result.evidence.length > 0, "no evidence");
  for (const e of result.evidence) {
    assert.ok(e.anchor.anchorKey);
    assert.ok(e.citation.includes("פסקה"));
    for (const k of ["lexical", "vector", "authority", "trust", "freshness", "final"] as const) {
      assert.equal(typeof e.scoreBreakdown[k], "number");
    }
    assert.ok(e.warnings.includes("fixture content — not legal authority"));
  }
  assert.ok(result.warnings.some((w) => w.includes("סינתטי")));
  assert.ok(result.warnings.some((w) => w.includes("Mock")), "mock-embedding honesty warning missing");
  assert.equal(result.persisted, null, "no persistence without org context");
  // diversification
  const counts = new Map<string, number>();
  for (const e of result.evidence) counts.set(e.documentId, (counts.get(e.documentId) ?? 0) + 1);
  for (const [, n] of counts) assert.ok(n <= 2);
});

test("DB-backed research: org context persists session + query + results", async () => {
  const repos = createInMemoryRepositories();
  await seedThroughRepositories(repos);
  const result = await runDbResearch(repos, {
    question: "האם מגיע גמול שעות נוספות בלי דוחות נוכחות?",
    organizationId: "org-a", actorProfileId: "user-a",
    legalDomain: "labor",
  });
  assert.ok(result.persisted, "expected persistence with org context");
  if (result.persisted) {
    const session = await repos.research.getResearchSession(result.persisted.sessionId, orgA);
    assert.equal(session.ok, true);
    const forbidden = await repos.research.getResearchSession(result.persisted.sessionId, orgB);
    assert.equal(forbidden.ok, false, "cross-tenant session leak");
  }
});

test("research honesty: no supporting source → explicit notice", async () => {
  const repos = createInMemoryRepositories();
  await seedThroughRepositories(repos);
  const result = await runDbResearch(repos, {
    question: "דיני ספנות בין-כוכבית ומשפט החלל הקנייני",
    legalDomain: "labor",
  });
  if (result.evidence.length === 0) {
    assert.ok(result.missingSourceNotice, "missing-source notice required");
  } else {
    for (const e of result.evidence) assert.ok(e.warnings.length > 0);
  }
});

test("dev interface gate: production is blocked without explicit flag", () => {
  assert.equal(isDevInterfaceEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isDevInterfaceEnabled({ NODE_ENV: "test" }), true);
  assert.equal(isDevInterfaceEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isDevInterfaceEnabled({ NODE_ENV: "production", LAWME_DEV_TOOLS: "1" }), true);
  assert.equal(isDevInterfaceEnabled({ NODE_ENV: "production", LAWME_DEV_TOOLS: "0" }), false);
});

test("production-refusal guard: foreign Supabase URLs are rejected", () => {
  assert.doesNotThrow(() => assertDevelopmentProject("https://udispadsbxqicmawqcuk.supabase.co"));
  assert.throws(() => assertDevelopmentProject("https://some-production-ref.supabase.co"), /REFUSED/);
});

/* ── Supabase integration (runs ONLY with dev credentials in env) ── */
const hasDevCreds =
  !!process.env.SUPABASE_URL?.includes("udispadsbxqicmawqcuk") && !!process.env.SUPABASE_SECRET_KEY;

test("supabase integration: seeded corpus retrievable with anchors", { skip: !hasDevCreds }, async () => {
  const { createRepositories } = await import("../repositories/index.ts");
  const repos = createRepositories();
  assert.equal(repos.kind, "supabase");
  const result = await runDbResearch(repos, {
    question: "התפטרות עקב הרעת תנאים — פיצויי פיטורים",
    legalDomain: "labor",
  });
  assert.ok(result.evidence.length > 0);
  assert.equal(result.repositoryKind, "supabase");
  for (const e of result.evidence) assert.ok(e.anchor.anchorKey.length > 0);
});
