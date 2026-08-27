import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkToCanonicalSource, createLegalaiLegislationAdapter, NON_CONSOLIDATED_DISCLOSURE_HE,
  type PublishedChunkRow, type PublicationTitleRow,
} from "../legalai-legislation-adapter.ts";

const row: PublishedChunkRow = {
  law_canonical_id: "knesset:2000123",
  section_canonical_id: "Section:knesset:publication:100094:abc",
  document_version_id: "knesset:publication:100094",
  section_number: "2",
  heading_path: "חוק לדוגמה › סעיף 2",
  text: "מעסיק ימסור לעובד הודעה בכתב על תנאי העבודה.",
  source_url: "https://fs.knesset.gov.il/x.PDF",
  chunk_index: 0,
};
const title: PublicationTitleRow = {
  publication_canonical_id: "knesset:publication:100094",
  title: "חוק הודעה לעובד", israel_law_id: "2000123",
  publication_series: "ספר החוקים", publication_number: "2500", publication_date: "2010-01-01",
};

test("chunkToCanonicalSource maps to a verified, usable legislation source", () => {
  const s = chunkToCanonicalSource(row, title, ["הודעה", "עובד", "irrelevant"]);
  assert.equal(s.sourceKind, "legislation");
  assert.equal(s.verification, "verified");
  assert.equal(s.usableForClaim, true);
  assert.equal(s.bindingClass, "binding");
  assert.equal(s.url, "https://fs.knesset.gov.il/x.PDF");
  assert.equal(s.sectionHe, "סעיף 2");
  assert.ok(s.citationHe.includes("חוק הודעה לעובד"));
  assert.ok(s.citationHe.includes("סעיף 2"));
  assert.ok(s.recordId.endsWith("#0"));
  // mandatory non-consolidated disclosure carried
  assert.ok(s.limitationsHe.includes(NON_CONSOLIDATED_DISCLOSURE_HE));
  // matched terms are the query terms actually present in the chunk
  assert.deepEqual([...s.matchedTerms].sort(), ["הודעה", "עובד"].sort());
});

test("missing title degrades gracefully to a generic legislation label", () => {
  const s = chunkToCanonicalSource(row, undefined, []);
  assert.equal(s.titleHe, "חקיקה רשמית");
  assert.ok(s.verification === "verified"); // published rows are still served
});

test("adapter is always wired (available) and inert without a DB client/env", async () => {
  const saved = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SECRET_KEY };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
  try {
    const a = createLegalaiLegislationAdapter();
    assert.equal(a.available, true);
    assert.equal(a.kind, "legislation");
    const r = await a.search({ id: "p", sourceId: a.id, sourceKind: "legislation", queryTerms: ["עובד"], topics: [], sections: [], refIds: [], filters: { authorityPreference: "balanced", courtLevels: [], dateFromISO: null, dateToISO: null, onlyVerified: false }, rationaleHe: "" });
    assert.equal(r.matchedCount, 0);
    assert.equal(r.sources.length, 0);
    assert.ok(r.notesHe.length >= 1); // explains DB not available
  } finally {
    if (saved.u) process.env.SUPABASE_URL = saved.u;
    if (saved.k) process.env.SUPABASE_SECRET_KEY = saved.k;
  }
});
