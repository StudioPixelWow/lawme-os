/**
 * Legal Intelligence POC — end-to-end test suite (node --test).
 * Covers: fixture ingestion, schema validation, extraction, anchors,
 * lexical + mock-vector retrieval, ranking, citation verification,
 * structured answer generation. No network, no database, no API keys.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SupremeDecisionsAdapter } from "../ingestion/adapters/supreme-decisions/adapter.ts";
import { extractDocument } from "../extraction/extract.ts";
import { MockEmbeddingProvider, cosineSimilarity } from "../embeddings/mock-provider.ts";
import { createAnchor, extractQuote, findBrokenAnchors, matchQuote, validateAnchor } from "../citations/anchors.ts";
import { loadPocCorpus } from "../corpus/load.ts";
import { LexicalIndex } from "../retrieval/lexical.ts";
import { hybridSearch } from "../retrieval/hybrid.ts";
import { runResearch } from "../research/engine.ts";
import { ANSWER_LABEL, buildStructuredAnswer } from "../research/answer.ts";
import { recordRun } from "../observability/run-log.ts";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const corpusPromise = loadPocCorpus();

test("adapter: discovers the full fixture set (small, bounded)", async () => {
  const adapter = new SupremeDecisionsAdapter();
  const items = await adapter.discover();
  assert.ok(items.length >= 10 && items.length <= 30, `unexpected fixture count ${items.length}`);
});

test("adapter: every fixture maps to a VALID unified document with provenance", async () => {
  const adapter = new SupremeDecisionsAdapter();
  for (const item of await adapter.discover()) {
    const { doc, validation } = await adapter.mapToUnifiedSchema(item);
    assert.equal(validation.valid, true, `${item.externalId}: ${validation.errors.join("; ")}`);
    assert.equal(doc.isSynthetic, true, "POC fixtures must be marked synthetic");
    assert.equal(doc.provenance.isFixture, true);
    assert.equal(doc.provenance.retrievalMethod, "fixture");
    assert.match(doc.provenance.sha256, /^[0-9a-f]{64}$/);
    assert.equal(doc.verificationStatus, "unverified", "fixtures must not claim verified status");
    assert.equal(doc.authorityType, "unknown", "authority derives only at verification");
  }
});

test("adapter: judgments get normalized case numbers", async () => {
  const corpus = await corpusPromise;
  const judgments = corpus.documents.filter((d) => d.doc.documentType === "judgment");
  assert.ok(judgments.length >= 5);
  for (const j of judgments) {
    assert.ok(j.doc.caseNumberNormalized, `${j.id} missing normalized case number`);
  }
});

test("extraction: HTML fixtures produce anchored blocks with valid offsets", async () => {
  const corpus = await corpusPromise;
  for (const d of corpus.documents) {
    assert.equal(d.extraction.ok, true, `${d.id} extraction failed`);
    assert.ok(d.extraction.blocks.length >= 2, `${d.id} too few blocks`);
    assert.equal(d.extraction.language, "he");
    for (const b of d.extraction.blocks) {
      const slice = d.extraction.normalizedText.slice(b.charStart, b.charEnd);
      assert.equal(slice, b.text, `${d.id}#${b.anchorKey} offsets do not match text`);
    }
    const keys = new Set(d.extraction.blocks.map((b) => b.anchorKey));
    assert.equal(keys.size, d.extraction.blocks.length, `${d.id} anchor keys not unique`);
  }
});

test("extraction: script injection is stripped, never extracted", async () => {
  const hostile = `<h1>כותרת</h1><script>fetch("https://evil.example/x")</script><p onload="alert(1)">פסקה תמימה</p>`;
  const result = await extractDocument(hostile, "text/html");
  assert.equal(result.ok, true);
  assert.ok(!result.normalizedText.includes("fetch("), "script content leaked into text");
  assert.ok(!result.normalizedText.includes("alert"), "handler content leaked into text");
  assert.ok(result.warnings.length > 0, "expected sanitization warnings");
});

test("extraction: PDF without text layer requests OCR, does not auto-run it", async () => {
  // %PDF header with no text objects — parses as empty
  const fakePdf = "%PDF-1.4\n%%EOF";
  const result = await extractDocument(fakePdf, "application/pdf");
  assert.equal(result.ok, false);
  assert.ok(["pending", "failed"].includes(result.ocrStatus), `unexpected ocrStatus ${result.ocrStatus}`);
});

test("chunking: chunks preserve anchors and respect the size budget", async () => {
  const corpus = await corpusPromise;
  for (const d of corpus.documents) {
    assert.ok(d.chunks.length >= 1);
    for (const c of d.chunks) {
      assert.ok(c.text.length <= 1200 + 1200, "chunk grossly exceeds budget");
      assert.ok(d.extraction.blocks.some((b) => b.anchorKey === c.anchorKey), "chunk anchor must exist");
    }
  }
});

test("mock embeddings: deterministic + similar texts score higher", async () => {
  const provider = new MockEmbeddingProvider();
  const [a1, a2, b] = await provider.embed([
    "פיצויי פיטורים לעובדת שפוטרה",
    "פיצויי פיטורים לעובד שפוטר",
    "דיני מקרקעין ורישום בית משותף",
  ]);
  const [a1again] = await provider.embed(["פיצויי פיטורים לעובדת שפוטרה"]);
  assert.deepEqual(a1.values, a1again.values, "not deterministic");
  assert.ok(cosineSimilarity(a1, a2) > cosineSimilarity(a1, b), "similarity ordering wrong");
});

test("citation anchors: create, validate, quote-extract, detect broken", async () => {
  const corpus = await corpusPromise;
  const d = corpus.documents[0];
  const block = d.extraction.blocks.find((b) => b.kind === "paragraph")!;
  const anchor = createAnchor({
    documentId: d.id,
    versionHash: d.doc.provenance.sha256,
    anchorKey: block.anchorKey,
    extraction: d.extraction,
    sourceUrl: d.doc.canonicalSourceUrl,
    retrievedAt: d.doc.provenance.retrievedAt,
    isFixture: true,
  });
  assert.equal(validateAnchor(anchor, d.extraction), true);
  const quote = extractQuote(anchor, d.extraction);
  assert.equal(quote, block.text);

  const partial = block.text.slice(0, Math.min(25, block.text.length));
  assert.equal(matchQuote(partial, anchor, d.extraction).matched, true);
  assert.equal(matchQuote("טקסט שאינו קיים במסמך כלל", anchor, d.extraction).matched, false);

  const broken = findBrokenAnchors([anchor], d.extraction, "0".repeat(64));
  assert.equal(broken.length, 1, "version change must break anchors");
});

test("lexical retrieval: severance query hits severance documents first", async () => {
  const corpus = await corpusPromise;
  const index = LexicalIndex.build(corpus);
  const hits = index.search(["פיצויי פיטורים", "הרעה מוחשית"]);
  assert.ok(hits.length > 0);
  const topDocs = hits.slice(0, 4).map((h) => h.documentId);
  assert.ok(
    topDocs.includes("fx-judg-004") || topDocs.includes("fx-leg-001") || topDocs.includes("fx-sec-001"),
    `unexpected top docs: ${topDocs.join(",")}`,
  );
});

test("hybrid retrieval: filters work and score breakdown is complete", async () => {
  const corpus = await corpusPromise;
  const index = LexicalIndex.build(corpus);
  const ranked = await hybridSearch({
    corpus, index,
    queryTerms: ["שעות נוספות", "נטל ההוכחה"],
    filters: { documentTypes: ["judgment"] },
    limit: 5,
  });
  assert.ok(ranked.length > 0);
  for (const r of ranked) {
    const doc = corpus.documents.find((d) => d.id === r.documentId)!;
    assert.equal(doc.doc.documentType, "judgment", "type filter violated");
    for (const k of ["lexical", "vector", "authority", "trust", "freshness", "final"] as const) {
      assert.equal(typeof r.score[k], "number");
    }
  }
  assert.equal(ranked[0].documentId, "fx-judg-003", "overtime judgment should rank first");
});

test("hybrid retrieval: diversification caps passages per document", async () => {
  const corpus = await corpusPromise;
  const index = LexicalIndex.build(corpus);
  const ranked = await hybridSearch({
    corpus, index, queryTerms: ["פיצויי פיטורים"], limit: 10, maxPerDocument: 2,
  });
  const counts = new Map<string, number>();
  for (const r of ranked) counts.set(r.documentId, (counts.get(r.documentId) ?? 0) + 1);
  for (const [docId, n] of counts) assert.ok(n <= 2, `${docId} appears ${n} times`);
});

test("research engine: full pipeline returns cited evidence + explanation", async () => {
  const corpus = await corpusPromise;
  const result = await runResearch(corpus, {
    question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?",
    legalDomain: "labor",
    authorityPreference: "binding_first",
  });
  assert.ok(result.evidence.length > 0, "no evidence returned");
  assert.ok(result.expansions.length > 0, "controlled expansion did not fire");
  for (const e of result.evidence) {
    assert.ok(e.citation.includes("פסקה"), "citation must include anchor");
    assert.ok(e.anchor.anchorKey);
    assert.ok(e.retrievedAt);
    assert.ok(e.warnings.includes("fixture content — not legal authority"));
  }
  assert.ok(result.warnings.some((w) => w.includes("סינתטי")), "synthetic-corpus warning missing");
  const topDoc = result.evidence[0];
  assert.ok(["fx-judg-001", "fx-leg-001"].includes(topDoc.documentId) || topDoc.authorityClass === "legislation",
    `unexpected top evidence ${topDoc.documentId}`);
});

test("research engine: no supporting source → explicit missing-source notice", async () => {
  const corpus = await corpusPromise;
  const result = await runResearch(corpus, {
    question: "מהי סמכות בית הדין הרבני בענייני ירושת קיבוץ בשנות החמישים?",
    legalDomain: "labor",
  });
  if (result.evidence.length === 0) {
    assert.ok(result.missingSourceNotice, "missing-source notice required");
  } else {
    // if weak matches slipped in, every one must carry warnings
    for (const e of result.evidence) assert.ok(e.warnings.length > 0);
  }
});

test("structured answer: labeled, extractive, citation-bound, gap-honest", async () => {
  const corpus = await corpusPromise;
  const research = await runResearch(corpus, {
    question: "האם עובד שהתפטר בגלל הפחתת שכר זכאי לפיצויי פיטורים?",
    legalDomain: "labor",
  });
  const answer = buildStructuredAnswer(research);
  assert.equal(answer.label, ANSWER_LABEL);
  for (const claim of answer.extractiveFindings) {
    assert.ok(claim.citations.length > 0, "claim without citation");
    assert.ok(["secondary_supported", "unverified", "unresolved"].includes(claim.label));
    // extractive discipline: the claim text must exist verbatim in the corpus
    const doc = corpus.documents.find((d) => d.id === claim.documentIds[0])!;
    assert.ok(doc.extraction.normalizedText.includes(claim.text.split("\n")[0]), "claim is not extractive");
  }
  assert.ok(answer.gaps.length > 0, "gaps must be disclosed");
  assert.ok(answer.warnings.some((w) => w.includes("extractive")), "extractive warning missing");
});

test("observability: run recorder writes JSONL and rejects secret-like payloads", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "poc-runs-"));
  try {
    const file = recordRun({
      kind: "research", timestamp: new Date().toISOString(),
      engineVersion: "t", modelProvider: "mock", parserVersion: "t",
      query: "שאלה", sourceAdapters: ["LSR-038"], documentsRetrieved: 3,
      rankScores: [0.5], citationsReturned: 3, verificationStatus: ["unverified"],
      warnings: [], failures: [], benchmarkResult: null,
    }, dir);
    assert.ok(readFileSync(file, "utf8").includes('"kind":"research"'));
    assert.throws(() => recordRun({
      kind: "research", timestamp: new Date().toISOString(),
      engineVersion: "t", modelProvider: "mock", parserVersion: "t",
      query: "Bearer abcdefghijklmnopqrstuvwxyz012345", sourceAdapters: [],
      documentsRetrieved: 0, rankScores: [], citationsReturned: 0,
      verificationStatus: [], warnings: [], failures: [], benchmarkResult: null,
    }, dir), /secret/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
